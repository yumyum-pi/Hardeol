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
	res := db.Preload("Fields").Find(&list)
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

	// validate field names
	for _, field := range col.Fields {
		if !IsValidFieldName(field.Name) {
			ctx.ResponseError(http.StatusBadRequest, "Invalid field name '"+field.Name+"': must start with letter, contain only letters, numbers, and underscores")
			return
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
	res := db.Create(col)
	if res.Error != nil {
		// rollback the name reservation on failure
		CollectionNameDelete(col.Name)
		ctx.ResponseError(http.StatusInternalServerError, res.Error.Error())
		return
	}

	rb := router.Get()
	err := newCollectionRoutes(*col, db, rb)
	if err != nil {
		// rollback on failure
		CollectionNameDelete(col.Name)
		ctx.ResponseError(http.StatusInternalServerError, err.Error())
		return
	}

	ctx.ResponseOk(http.StatusCreated, col)
}

// UpdateCollectionRequest represents the request body for updating a collection
type UpdateCollectionRequest struct {
	Fields []SchemaField `json:"fields"`
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

	// Validate field names
	for _, field := range req.Fields {
		if !IsValidFieldName(field.Name) {
			ctx.ResponseError(http.StatusBadRequest, "Invalid field name '"+field.Name+"': must start with letter, contain only letters, numbers, and underscores")
			return
		}
	}

	db := database.Get()

	// Fetch existing collection with fields
	var col Collection
	res := db.Preload("Fields").Where("name = ?", name).First(&col)
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

	// Compute schema diff
	diff := ComputeSchemaDiff(col.Fields, req.Fields)

	// If no changes, return early
	if diff.IsEmpty() {
		ctx.ResponseOk(http.StatusOK, col)
		return
	}

	// Execute migration in transaction
	err := db.Transaction(func(tx *gorm.DB) error {
		// Migrate the underlying data table
		if err := MigrateCollectionSchema(tx, col.Name, col.Fields, req.Fields, diff); err != nil {
			return err
		}

		// Delete old schema fields
		if err := tx.Where("collection_id = ?", col.ID).Delete(&SchemaField{}).Error; err != nil {
			return err
		}

		// Insert new schema fields
		for i := range req.Fields {
			req.Fields[i].CollectionID = col.ID
			req.Fields[i].ID = 0 // Reset ID to let DB auto-generate
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

	// Reload collection with updated fields
	res = db.Preload("Fields").First(&col, col.ID)
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
