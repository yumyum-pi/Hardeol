package collections

import (
	"database/sql/driver"
	"encoding/json"
)

// FieldRule represents validation rules for a specific field
type FieldRule struct {
	FieldName    string  `json:"field_name"`
	MinLength    *int    `json:"min_length,omitempty"`
	MaxLength    *int    `json:"max_length,omitempty"`
	Regex        *string `json:"regex,omitempty"`
	Min          *float64 `json:"min,omitempty"`
	Max          *float64 `json:"max,omitempty"`
	IntegerOnly  bool    `json:"integer_only,omitempty"`
	MinDate      *string `json:"min_date,omitempty"`
	MaxDate      *string `json:"max_date,omitempty"`
	MinRows      *int    `json:"min_rows,omitempty"`
	MaxRows      *int    `json:"max_rows,omitempty"`
	JSONSchema   *string `json:"json_schema,omitempty"`
	CustomExpr   *string `json:"custom_expr,omitempty"`
	ErrorMessage *string `json:"error_message,omitempty"`
}

// FieldRuleList is a custom type for storing FieldRule slices in SQLite as JSON
type FieldRuleList []FieldRule

// Value implements driver.Valuer for database serialization
func (f FieldRuleList) Value() (driver.Value, error) {
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
func (f *FieldRuleList) Scan(value interface{}) error {
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

// ConditionalRule represents a conditional dependency between fields
type ConditionalRule struct {
	IfField       string  `json:"if_field"`
	IfCondition   string  `json:"if_condition"`   // "filled", "empty", "equals", "not_equals"
	IfValue       *string `json:"if_value,omitempty"`
	ThenField     string  `json:"then_field"`
	ThenCondition string  `json:"then_condition"` // "required", "filled", "empty"
	ErrorMessage  *string `json:"error_message,omitempty"`
}

// SectionRule represents validation rules for a section
type SectionRule struct {
	SectionID        int               `json:"section_id"`
	MinFieldsFilled  *int              `json:"min_fields_filled,omitempty"`
	MaxFieldsFilled  *int              `json:"max_fields_filled,omitempty"`
	Conditions       []ConditionalRule `json:"conditions,omitempty"`
	CustomExpr       *string           `json:"custom_expr,omitempty"`
	ErrorMessage     *string           `json:"error_message,omitempty"`
}

// SectionRuleList is a custom type for storing SectionRule slices in SQLite as JSON
type SectionRuleList []SectionRule

// Value implements driver.Valuer for database serialization
func (s SectionRuleList) Value() (driver.Value, error) {
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
func (s *SectionRuleList) Scan(value interface{}) error {
	if value == nil {
		*s = nil
		return nil
	}
	var data []byte
	switch val := value.(type) {
	case []byte:
		data = val
	case string:
		data = []byte(val)
	}
	return json.Unmarshal(data, s)
}

// CrossSectionCondition represents dependencies between sections
type CrossSectionCondition struct {
	IfSectionID   int     `json:"if_section_id"`
	IfField       string  `json:"if_field"`
	IfCondition   string  `json:"if_condition"`
	IfValue       *string `json:"if_value,omitempty"`
	ThenSectionID int     `json:"then_section_id"`
	ThenField     string  `json:"then_field"`
	ThenCondition string  `json:"then_condition"`
	ErrorMessage  *string `json:"error_message,omitempty"`
}

// CollectionRule represents collection-wide validation rules
type CollectionRule struct {
	RuleType               string                  `json:"rule_type"` // "uniqueness", "cross_section", "custom"
	UniqueFields           []string                `json:"unique_fields,omitempty"`
	CrossSectionConditions []CrossSectionCondition `json:"cross_section_conditions,omitempty"`
	CustomExpr             *string                 `json:"custom_expr,omitempty"`
	ErrorMessage           *string                 `json:"error_message,omitempty"`
}

// CollectionRuleList is a custom type for storing CollectionRule slices in SQLite as JSON
type CollectionRuleList []CollectionRule

// Value implements driver.Valuer for database serialization
func (c CollectionRuleList) Value() (driver.Value, error) {
	if c == nil {
		return "[]", nil
	}
	data, err := json.Marshal(c)
	if err != nil {
		return nil, err
	}
	return string(data), nil
}

// Scan implements sql.Scanner for database deserialization
func (c *CollectionRuleList) Scan(value interface{}) error {
	if value == nil {
		*c = nil
		return nil
	}
	var data []byte
	switch val := value.(type) {
	case []byte:
		data = val
	case string:
		data = []byte(val)
	}
	return json.Unmarshal(data, c)
}

// ValidationProfile represents a saved validation profile configuration for a collection
type ValidationProfile struct {
	ID              int                `json:"id" gorm:"primaryKey;autoIncrement"`
	Name            string             `json:"name"`
	CollectionID    int                `json:"collection_id"`
	ActionType      ActionType         `json:"action_type"` // Reuse from form_view.go
	IsActive        bool               `json:"is_active"`
	FieldRules      FieldRuleList      `json:"field_rules" gorm:"type:TEXT"`
	SectionRules    SectionRuleList    `json:"section_rules" gorm:"type:TEXT"`
	CollectionRules CollectionRuleList `json:"collection_rules" gorm:"type:TEXT"`
}
