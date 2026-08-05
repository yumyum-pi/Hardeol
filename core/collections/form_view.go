package collections

import (
	"database/sql/driver"
	"encoding/json"
)

// ActionType represents when a form view applies
type ActionType string

const (
	ActionCreate ActionType = "CREATE"
	ActionUpdate ActionType = "UPDATE"
	ActionAll    ActionType = "ALL"
)

// FormFieldConfig represents a single field configuration in a form view
type FormFieldConfig struct {
	Name         string  `json:"name"`
	Order        int     `json:"order"`
	Visible      bool    `json:"visible"`
	Label        *string `json:"label,omitempty"`
	Placeholder  *string `json:"placeholder,omitempty"`
	HelpText     *string `json:"help_text,omitempty"`
	ReadOnly     bool    `json:"read_only"`
	DefaultValue *string `json:"default_value,omitempty"`
	Width        string  `json:"width"` // "full", "half", "third"
}

// FormFieldList is a custom type for storing FormFieldConfig slices in SQLite as JSON
type FormFieldList []FormFieldConfig

// Value implements driver.Valuer for database serialization
func (f FormFieldList) Value() (driver.Value, error) {
	if f == nil {
		return "[]", nil
	}
	data, err := json.Marshal(f)
	if err != nil {
		return nil, err
	}
	return string(data), nil
}

// Scan implements sql.Scanner for database deserialization
func (f *FormFieldList) Scan(value interface{}) error {
	if value == nil {
		*f = nil
		return nil
	}
	var data []byte
	switch val := value.(type) {
	case []byte:
		data = val
	case string:
		data = []byte(val)
	}
	return json.Unmarshal(data, f)
}

// FormView represents a saved form view configuration for a collection
type FormView struct {
	ID           int           `json:"id" gorm:"primaryKey;autoIncrement"`
	Name         string        `json:"name"`
	CollectionID int           `json:"collection_id"`
	ActionType   ActionType    `json:"action_type"`
	Fields       FormFieldList `json:"fields" gorm:"type:TEXT"`
	IsDefault    bool          `json:"is_default"`
}
