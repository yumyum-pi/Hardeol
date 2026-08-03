package collections

import (
	"fmt"
	"strings"

	"gorm.io/gorm"
)

// SchemaFieldChange represents a field that has been modified
type SchemaFieldChange struct {
	OldField SchemaField
	NewField SchemaField
}

// SchemaDiff represents the differences between two schemas
type SchemaDiff struct {
	Added    []SchemaField
	Removed  []SchemaField
	Modified []SchemaFieldChange
}

// IsEmpty returns true if there are no changes
func (d SchemaDiff) IsEmpty() bool {
	return len(d.Added) == 0 && len(d.Removed) == 0 && len(d.Modified) == 0
}

// RequiresTableRecreation returns true if the changes require table recreation
// SQLite doesn't support DROP COLUMN or ALTER COLUMN, so we need to recreate the table
func (d SchemaDiff) RequiresTableRecreation() bool {
	return len(d.Removed) > 0 || len(d.Modified) > 0
}

// ComputeSchemaDiff computes the differences between old and new schema fields
func ComputeSchemaDiff(oldFields, newFields []SchemaField) SchemaDiff {
	diff := SchemaDiff{
		Added:    make([]SchemaField, 0),
		Removed:  make([]SchemaField, 0),
		Modified: make([]SchemaFieldChange, 0),
	}

	// Create maps for quick lookup
	oldMap := make(map[string]SchemaField)
	for _, f := range oldFields {
		oldMap[f.Name] = f
	}

	newMap := make(map[string]SchemaField)
	for _, f := range newFields {
		newMap[f.Name] = f
	}

	// Find added and modified fields
	for _, newField := range newFields {
		if oldField, exists := oldMap[newField.Name]; exists {
			// Check if field was modified (type or required changed)
			if oldField.Type != newField.Type || oldField.Required != newField.Required {
				diff.Modified = append(diff.Modified, SchemaFieldChange{
					OldField: oldField,
					NewField: newField,
				})
			}
		} else {
			// Field was added
			diff.Added = append(diff.Added, newField)
		}
	}

	// Find removed fields
	for _, oldField := range oldFields {
		if _, exists := newMap[oldField.Name]; !exists {
			diff.Removed = append(diff.Removed, oldField)
		}
	}

	return diff
}

// MigrateCollectionSchema handles database table migration based on schema diff
func MigrateCollectionSchema(db *gorm.DB, tableName string, oldFields, newFields []SchemaField, diff SchemaDiff) error {
	if diff.IsEmpty() {
		return nil
	}

	if diff.RequiresTableRecreation() {
		return recreateTable(db, tableName, oldFields, newFields)
	}

	// Simple case: only additions, use ALTER TABLE ADD COLUMN
	return addColumns(db, tableName, diff.Added)
}

// addColumns adds new columns to the table using ALTER TABLE
func addColumns(db *gorm.DB, tableName string, fields []SchemaField) error {
	for _, field := range fields {
		// Skip id field - it should already exist
		if field.Name == "id" {
			continue
		}

		sqlType := fieldTypeToSQLType(field.Type)
		defaultVal := fieldDefaultValue(field.Type)

		sql := fmt.Sprintf("ALTER TABLE %s ADD COLUMN %s %s DEFAULT %s",
			tableName, field.Name, sqlType, defaultVal)

		if err := db.Exec(sql).Error; err != nil {
			return fmt.Errorf("failed to add column %s: %w", field.Name, err)
		}
	}
	return nil
}

// recreateTable recreates the table with the new schema, preserving data in common columns
func recreateTable(db *gorm.DB, tableName string, oldFields, newFields []SchemaField) error {
	tempTable := tableName + "_temp_migration"

	// Find columns that exist in both old and new schema (to preserve data)
	preservedColumns := findPreservedColumns(oldFields, newFields)

	// Start transaction
	return db.Transaction(func(tx *gorm.DB) error {
		// 1. Create temp table with new schema
		if err := createTable(tx, tempTable, newFields); err != nil {
			return fmt.Errorf("failed to create temp table: %w", err)
		}

		// 2. Copy data from old table to temp table (only preserved columns)
		if len(preservedColumns) > 0 {
			columnList := strings.Join(preservedColumns, ", ")
			copySQL := fmt.Sprintf("INSERT INTO %s (%s) SELECT %s FROM %s",
				tempTable, columnList, columnList, tableName)
			if err := tx.Exec(copySQL).Error; err != nil {
				return fmt.Errorf("failed to copy data: %w", err)
			}
		}

		// 3. Drop old table
		dropSQL := fmt.Sprintf("DROP TABLE %s", tableName)
		if err := tx.Exec(dropSQL).Error; err != nil {
			return fmt.Errorf("failed to drop old table: %w", err)
		}

		// 4. Rename temp table to original name
		renameSQL := fmt.Sprintf("ALTER TABLE %s RENAME TO %s", tempTable, tableName)
		if err := tx.Exec(renameSQL).Error; err != nil {
			return fmt.Errorf("failed to rename table: %w", err)
		}

		return nil
	})
}

// createTable creates a new table with the given schema
func createTable(db *gorm.DB, tableName string, fields []SchemaField) error {
	var columns []string

	for _, field := range fields {
		sqlType := fieldTypeToSQLType(field.Type)
		colDef := fmt.Sprintf("%s %s", field.Name, sqlType)

		if field.Name == "id" {
			colDef += " PRIMARY KEY AUTOINCREMENT"
		} else if field.Required {
			colDef += " NOT NULL"
		}

		columns = append(columns, colDef)
	}

	createSQL := fmt.Sprintf("CREATE TABLE %s (%s)", tableName, strings.Join(columns, ", "))
	return db.Exec(createSQL).Error
}

// findPreservedColumns finds columns that exist in both old and new schemas
func findPreservedColumns(oldFields, newFields []SchemaField) []string {
	oldNames := make(map[string]bool)
	for _, f := range oldFields {
		oldNames[f.Name] = true
	}

	var preserved []string
	for _, f := range newFields {
		if oldNames[f.Name] {
			preserved = append(preserved, f.Name)
		}
	}
	return preserved
}

// fieldTypeToSQLType converts schema field type to SQLite type
func fieldTypeToSQLType(fieldType SchemaFieldType) string {
	switch fieldType {
	case FieldText:
		return "TEXT"
	case FieldNumber:
		return "INTEGER"
	default:
		return "TEXT"
	}
}

// fieldDefaultValue returns the default value for a field type
func fieldDefaultValue(fieldType SchemaFieldType) string {
	switch fieldType {
	case FieldNumber:
		return "0"
	default:
		return "''"
	}
}
