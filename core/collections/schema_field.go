package collections

import (
	"database/sql/driver"
	"encoding/json"
)

type SchemaFieldType string

// StringSlice is a custom type for storing string slices in SQLite as JSON
type StringSlice []string

// Value implements driver.Valuer for database serialization
func (s StringSlice) Value() (driver.Value, error) {
	if s == nil {
		return "[]", nil
	}
	data, err := json.Marshal(s)
	if err != nil {
		return nil, err
	}
	return string(data), nil
}

// Scan implements sql.Scanner for database deserialization
func (s *StringSlice) Scan(value interface{}) error {
	if value == nil {
		*s = nil
		return nil
	}
	var data []byte
	switch v := value.(type) {
	case []byte:
		data = v
	case string:
		data = []byte(v)
	}
	return json.Unmarshal(data, s)
}

const (
	FieldText   SchemaFieldType = "TEXT"
	FieldNumber SchemaFieldType = "NUMBER"
	FieldBool   SchemaFieldType = "BOOL"
	FieldEmail  SchemaFieldType = "EMAIL"
	FieldURL    SchemaFieldType = "URL"
	FieldDate   SchemaFieldType = "DATE"
	FieldSelect SchemaFieldType = "SELECT"
	FieldJSON   SchemaFieldType = "JSON"
)

// SchemaField represents a single field in the dynamic schema.
type SchemaField struct {
	Name          string          `json:"name"`
	Type          SchemaFieldType `json:"type"`
	Regex         string          `json:"regex,omitempty"`          // optional regex validation
	Required      bool            `json:"required"`
	SelectOptions StringSlice      `json:"select_options,omitempty" gorm:"type:TEXT"` // For SELECT type
	ID            int             `json:"id" gorm:"autoIncrement"`
	CollectionID  int             `json:"collection_id"` // foreign key to the Collection
}

func NewSchemaField(name, fieldType string, required bool, regex string) *SchemaField {
	return &SchemaField{
		Name:     name,
		Type:     SchemaFieldType(fieldType),
		Regex:    regex,
		Required: required,
	}
}

func DefaultIDSchemeField() SchemaField {
	return SchemaField{
		Name:     "id",
		Type:     FieldNumber,
		Required: false,
		// Regex is empty so it should be omitted
	}
}
