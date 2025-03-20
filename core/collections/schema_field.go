package collections

// SchemaField represents a single field in the dynamic schema.
type SchemaField struct {
	Name         string `json:"name"`
	Type         string `json:"type"`
	Regex        string `json:"regex,omitempty"` // optional regex validation
	Required     bool   `json:"required"`
	ID           int    `json:"id" gorm:"autoIncrement"`
	CollectionID int    `json:"collection_id"` // foreign key to the Collection
}

func NewSchemaField(name, fieldType string, required bool, regex string) *SchemaField {
	return &SchemaField{
		Name:     name,
		Type:     fieldType,
		Regex:    regex,
		Required: required,
	}
}
