package collections

import (
	"database/sql/driver"
	"encoding/json"
)

// ViewField represents a single field configuration in a view
type ViewField struct {
	Name     string `json:"name"`
	Order    int    `json:"order"`
	CSSClass string `json:"css_class,omitempty"`
}

// ViewFieldList is a custom type for storing ViewField slices in SQLite as JSON
type ViewFieldList []ViewField

// Value implements driver.Valuer for database serialization
func (v ViewFieldList) Value() (driver.Value, error) {
	if v == nil {
		return "[]", nil
	}
	data, err := json.Marshal(v)
	if err != nil {
		return nil, err
	}
	return string(data), nil
}

// Scan implements sql.Scanner for database deserialization
func (v *ViewFieldList) Scan(value interface{}) error {
	if value == nil {
		*v = nil
		return nil
	}
	var data []byte
	switch val := value.(type) {
	case []byte:
		data = val
	case string:
		data = []byte(val)
	}
	return json.Unmarshal(data, v)
}

// TableView represents a saved view configuration for a collection
type TableView struct {
	ID             int            `json:"id" gorm:"primaryKey;autoIncrement"`
	Name           string         `json:"name"`
	CollectionID   int            `json:"collection_id"`
	Fields         ViewFieldList  `json:"fields" gorm:"type:TEXT"`
	IsDefault      bool           `json:"is_default"`
	Filters        FilterRuleList `json:"filters,omitempty" gorm:"type:TEXT"`
	VisibleFilters ViewFieldList  `json:"visible_filters,omitempty" gorm:"type:TEXT"`
}

// FilterOperator represents a comparison operator usable in a FilterRule
type FilterOperator string

const (
	OpEquals      FilterOperator = "equals"
	OpNotEquals   FilterOperator = "not_equals"
	OpContains    FilterOperator = "contains"
	OpNotContains FilterOperator = "not_contains"
	OpStartsWith  FilterOperator = "starts_with"
	OpGT          FilterOperator = "gt"
	OpGTE         FilterOperator = "gte"
	OpLT          FilterOperator = "lt"
	OpLTE         FilterOperator = "lte"
	OpIsEmpty     FilterOperator = "is_empty"
	OpIsNotEmpty  FilterOperator = "is_not_empty"
)

// FilterRule represents a single row-filtering condition on a table view
type FilterRule struct {
	Field    string         `json:"field"`
	Operator FilterOperator `json:"operator"`
	Value    string         `json:"value,omitempty"`
}

// FilterRuleList is a custom type for storing FilterRule slices in SQLite as JSON
type FilterRuleList []FilterRule

// Value implements driver.Valuer for database serialization
func (f FilterRuleList) Value() (driver.Value, error) {
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
func (f *FilterRuleList) Scan(value interface{}) error {
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
