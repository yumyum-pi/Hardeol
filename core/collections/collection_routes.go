package collections

import (
	"encoding/json"
	"net/http"
	"yumyum-pi/Hardeol/core/database"
	"yumyum-pi/Hardeol/core/router"

	"gorm.io/gorm"
)

// TODO: Add an auth middleware only the admin should be able to view
func collectionsHandlerFunc() []crudRouterReturnType {
	return []crudRouterReturnType{
		{router.MethodGET, "/collection", collectionsHandleList},
		{router.MethodPOST, "/collection", collectionsHandleCreate},
		{router.MethodPUT, "/collection/:name", collectionsHandleUpdate},
	}
}

func collectionsHandleList(ctx *router.Ctx) {
	list := make([]Collection, 0)

	db := database.Get()
	res := db.Preload("Fields").Preload("Sections").Find(&list)
	if res.Error != nil {
		ctx.ResponseError(http.StatusInternalServerError, res.Error.Error())
		return
	}

	ctx.ResponseOk(http.StatusOK, list)
}

func collectionsHandleCreate(ctx *router.Ctx) {
	r := ctx.Request
	col := new(Collection)

	if err := json.NewDecoder(r.Body).Decode(col); err != nil {
		ctx.ResponseError(http.StatusBadRequest, "Invalid JSON input: "+err.Error())
		return
	}

	// validate collection name format
	if !IsValidCollectionName(col.Name) {
		ctx.ResponseError(http.StatusBadRequest, "Invalid collection name: must start with letter, contain only alphanumeric and underscore, max 64 chars")
		return
	}

	// validate field names and TABLE field nested fields
	for _, field := range col.Fields {
		if !IsValidFieldName(field.Name) {
			ctx.ResponseError(http.StatusBadRequest, "Invalid field name '"+field.Name+"': must start with letter, contain only letters, numbers, and underscores")
			return
		}
		// Validate nested TABLE fields
		if field.Type == FieldTable {
			for _, tableField := range field.TableFields {
				if !IsValidFieldName(tableField.Name) {
					ctx.ResponseError(http.StatusBadRequest, "Invalid table field name '"+tableField.Name+"': must start with letter, contain only letters, numbers, and underscores")
					return
				}
				// TABLE fields cannot be nested
				if tableField.Type == FieldTable {
					ctx.ResponseError(http.StatusBadRequest, "TABLE fields cannot be nested within TABLE fields")
					return
				}
			}
		}
	}

	// atomically check if name exists and reserve it (prevents TOCTOU race)
	if !CollectionNameAddIfNotExists(col.Name) {
		ctx.ResponseError(http.StatusBadRequest, "collection name is not unique")
		return
	}

	// check if the collection has id field
	hasID := false
	for i := range col.Fields {
		if col.Fields[i].Name == "id" {
			hasID = true
			break
		}
	}

	// only add default ID field if not already present
	if !hasID {
		id := DefaultIDSchemeField()
		col.Fields = append(col.Fields, id)
	}

	db := database.Get()

	// Create collection first (without fields and sections)
	colToCreate := Collection{
		Name: col.Name,
	}
	res := db.Create(&colToCreate)
	if res.Error != nil {
		CollectionNameDelete(col.Name)
		ctx.ResponseError(http.StatusInternalServerError, res.Error.Error())
		return
	}

	// Create sections and build index-to-ID mapping
	sectionIndexToID := make(map[int]int)
	for i, section := range col.Sections {
		section.CollectionID = colToCreate.ID
		section.Order = i
		if err := db.Create(&section).Error; err != nil {
			CollectionNameDelete(col.Name)
			ctx.ResponseError(http.StatusInternalServerError, err.Error())
			return
		}
		sectionIndexToID[i] = section.ID
	}

	// Map section_index to section_id for fields and create them
	for i := range col.Fields {
		col.Fields[i].CollectionID = colToCreate.ID
		if col.Fields[i].SectionIndex != nil {
			if sectionID, ok := sectionIndexToID[*col.Fields[i].SectionIndex]; ok {
				col.Fields[i].SectionID = &sectionID
			}
		}
		col.Fields[i].SectionIndex = nil // Clear the transient field
	}

	if err := db.Create(&col.Fields).Error; err != nil {
		CollectionNameDelete(col.Name)
		ctx.ResponseError(http.StatusInternalServerError, err.Error())
		return
	}

	// Reload the full collection
	var fullCol Collection
	db.Preload("Fields").Preload("Sections").First(&fullCol, colToCreate.ID)

	rb := router.Get()
	err := newCollectionRoutes(fullCol, db, rb)
	if err != nil {
		CollectionNameDelete(col.Name)
		ctx.ResponseError(http.StatusInternalServerError, err.Error())
		return
	}

	ctx.ResponseOk(http.StatusCreated, fullCol)
}

// UpdateCollectionRequest represents the request body for updating a collection
type UpdateCollectionRequest struct {
	Fields   []SchemaField `json:"fields"`
	Sections []Section     `json:"sections"`
}

func collectionsHandleUpdate(ctx *router.Ctx) {
	// Get collection name from URL params
	name := ctx.GetParam("name")
	if name == "" {
		ctx.ResponseError(http.StatusBadRequest, "collection name is required")
		return
	}

	// Parse request body
	var req UpdateCollectionRequest
	if err := json.NewDecoder(ctx.Request.Body).Decode(&req); err != nil {
		ctx.ResponseError(http.StatusBadRequest, "Invalid JSON input: "+err.Error())
		return
	}

	// Validate field names and TABLE field nested fields
	for _, field := range req.Fields {
		if !IsValidFieldName(field.Name) {
			ctx.ResponseError(http.StatusBadRequest, "Invalid field name '"+field.Name+"': must start with letter, contain only letters, numbers, and underscores")
			return
		}
		// Validate nested TABLE fields
		if field.Type == FieldTable {
			for _, tableField := range field.TableFields {
				if !IsValidFieldName(tableField.Name) {
					ctx.ResponseError(http.StatusBadRequest, "Invalid table field name '"+tableField.Name+"': must start with letter, contain only letters, numbers, and underscores")
					return
				}
				// TABLE fields cannot be nested
				if tableField.Type == FieldTable {
					ctx.ResponseError(http.StatusBadRequest, "TABLE fields cannot be nested within TABLE fields")
					return
				}
			}
		}
	}

	db := database.Get()

	// Fetch existing collection with fields and sections
	var col Collection
	res := db.Preload("Fields").Preload("Sections").Where("name = ?", name).First(&col)
	if res.Error != nil {
		ctx.ResponseError(http.StatusNotFound, "collection not found")
		return
	}

	// Ensure ID field is preserved - check if new fields have id, if not add it
	hasID := false
	for i := range req.Fields {
		if req.Fields[i].Name == "id" {
			hasID = true
			break
		}
	}
	if !hasID {
		id := DefaultIDSchemeField()
		req.Fields = append(req.Fields, id)
	}

	// Compute schema diff (excluding TABLE fields from diff since they're in separate tables)
	diff := ComputeSchemaDiff(col.Fields, req.Fields)

	// Execute migration in transaction
	err := db.Transaction(func(tx *gorm.DB) error {
		// Migrate the underlying data table (handles non-TABLE fields)
		if !diff.IsEmpty() {
			if err := MigrateCollectionSchema(tx, col.Name, col.Fields, req.Fields, diff); err != nil {
				return err
			}
		}

		// Handle TABLE field child tables
		if err := migrateTableFields(tx, col, req.Fields); err != nil {
			return err
		}

		// Delete old sections
		if err := tx.Where("collection_id = ?", col.ID).Delete(&Section{}).Error; err != nil {
			return err
		}

		// Create new sections and build index-to-ID mapping
		sectionIndexToID := make(map[int]int)
		if len(req.Sections) > 0 {
			for i := range req.Sections {
				req.Sections[i].CollectionID = col.ID
				req.Sections[i].ID = 0 // Reset ID to let DB auto-generate
				req.Sections[i].Order = i
				if err := tx.Create(&req.Sections[i]).Error; err != nil {
					return err
				}
				sectionIndexToID[i] = req.Sections[i].ID
			}
		}

		// Delete old schema fields
		if err := tx.Where("collection_id = ?", col.ID).Delete(&SchemaField{}).Error; err != nil {
			return err
		}

		// Map section_index to section_id for fields and create them
		for i := range req.Fields {
			req.Fields[i].CollectionID = col.ID
			req.Fields[i].ID = 0 // Reset ID to let DB auto-generate
			if req.Fields[i].SectionIndex != nil {
				if sectionID, ok := sectionIndexToID[*req.Fields[i].SectionIndex]; ok {
					req.Fields[i].SectionID = &sectionID
				}
			}
			req.Fields[i].SectionIndex = nil // Clear the transient field
		}
		if err := tx.Create(&req.Fields).Error; err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		ctx.ResponseError(http.StatusInternalServerError, err.Error())
		return
	}

	// Reload collection with updated fields and sections
	res = db.Preload("Fields").Preload("Sections").First(&col, col.ID)
	if res.Error != nil {
		ctx.ResponseError(http.StatusInternalServerError, res.Error.Error())
		return
	}

	// Re-register routes with updated schema
	rb := router.Get()
	if err := UpdateCollectionRoutes(col, db, rb); err != nil {
		ctx.ResponseError(http.StatusInternalServerError, err.Error())
		return
	}

	ctx.ResponseOk(http.StatusOK, col)
}

// migrateTableFields handles creating/updating/deleting child tables for TABLE fields
func migrateTableFields(db *gorm.DB, col Collection, newFields []SchemaField) error {
	// Get existing TABLE fields
	oldTableFields := make(map[string]SchemaField)
	for _, field := range col.Fields {
		if field.Type == FieldTable {
			oldTableFields[field.Name] = field
		}
	}

	// Get new TABLE fields
	newTableFields := make(map[string]SchemaField)
	for _, field := range newFields {
		if field.Type == FieldTable {
			newTableFields[field.Name] = field
		}
	}

	// Create new TABLE field child tables
	for name, field := range newTableFields {
		childTableName := col.GetChildTableName(name)
		if _, exists := oldTableFields[name]; !exists {
			// New TABLE field - create child table
			if err := createChildTable(db, childTableName, field); err != nil {
				return err
			}
		} else {
			// Existing TABLE field - migrate child table if needed
			if err := migrateChildTable(db, childTableName, oldTableFields[name], field); err != nil {
				return err
			}
		}
	}

	// Drop child tables for removed TABLE fields
	for name := range oldTableFields {
		if _, exists := newTableFields[name]; !exists {
			childTableName := col.GetChildTableName(name)
			if err := db.Exec("DROP TABLE IF EXISTS " + childTableName).Error; err != nil {
				return err
			}
		}
	}

	return nil
}

// createChildTable creates a child table for a TABLE field
func createChildTable(db *gorm.DB, tableName string, field SchemaField) error {
	columns := []string{
		"id INTEGER PRIMARY KEY AUTOINCREMENT",
		"parent_id INTEGER NOT NULL",
		"row_order INTEGER DEFAULT 0",
	}

	for _, f := range field.TableFields {
		sqlType := fieldTypeToSQLType(f.Type)
		colDef := "\"" + f.Name + "\" " + sqlType
		if f.Required {
			colDef += " NOT NULL"
		}
		columns = append(columns, colDef)
	}

	createSQL := "CREATE TABLE IF NOT EXISTS \"" + tableName + "\" (" +
		joinStrings(columns, ", ") + ")"
	return db.Exec(createSQL).Error
}

// migrateChildTable handles schema changes for child tables
func migrateChildTable(db *gorm.DB, tableName string, oldField, newField SchemaField) error {
	// Compute diff for nested fields
	diff := ComputeSchemaDiff(oldField.TableFields, newField.TableFields)
	if diff.IsEmpty() {
		return nil
	}

	if diff.RequiresTableRecreation() {
		// Need to recreate table
		tempTable := tableName + "_temp"

		// Create temp table with new schema
		if err := createChildTable(db, tempTable, newField); err != nil {
			return err
		}

		// Find preserved columns
		preservedColumns := []string{"id", "parent_id", "row_order"}
		oldNames := make(map[string]bool)
		for _, f := range oldField.TableFields {
			oldNames[f.Name] = true
		}
		for _, f := range newField.TableFields {
			if oldNames[f.Name] {
				preservedColumns = append(preservedColumns, f.Name)
			}
		}

		// Copy data
		columnList := joinStrings(preservedColumns, ", ")
		copySQL := "INSERT INTO \"" + tempTable + "\" (" + columnList + ") SELECT " + columnList + " FROM \"" + tableName + "\""
		if err := db.Exec(copySQL).Error; err != nil {
			return err
		}

		// Drop old table
		if err := db.Exec("DROP TABLE \"" + tableName + "\"").Error; err != nil {
			return err
		}

		// Rename temp table
		renameSQL := "ALTER TABLE \"" + tempTable + "\" RENAME TO \"" + tableName + "\""
		return db.Exec(renameSQL).Error
	}

	// Simple case: only additions
	for _, field := range diff.Added {
		sqlType := fieldTypeToSQLType(field.Type)
		defaultVal := fieldDefaultValue(field.Type)
		sql := "ALTER TABLE \"" + tableName + "\" ADD COLUMN \"" + field.Name + "\" " + sqlType + " DEFAULT " + defaultVal
		if err := db.Exec(sql).Error; err != nil {
			return err
		}
	}

	return nil
}

// joinStrings joins strings with a separator
func joinStrings(strs []string, sep string) string {
	if len(strs) == 0 {
		return ""
	}
	result := strs[0]
	for i := 1; i < len(strs); i++ {
		result += sep + strs[i]
	}
	return result
}
