package validation

import (
	"encoding/json"
	"fmt"
	"math"
	"regexp"
	"strings"
	"time"

	"gorm.io/gorm"
)

// ValidationError represents a single validation error
type ValidationError struct {
	Field     string `json:"field,omitempty"`
	SectionID *int   `json:"section_id,omitempty"`
	RuleType  string `json:"rule_type"` // "field", "section", "collection"
	Message   string `json:"message"`
	Code      string `json:"code"`
}

// ValidationResult represents the result of validation
type ValidationResult struct {
	Valid  bool              `json:"valid"`
	Errors []ValidationError `json:"errors"`
}

// ValidationErrors implements error interface for validation errors
type ValidationErrors struct {
	Errors []ValidationError
}

func (e *ValidationErrors) Error() string {
	if len(e.Errors) == 0 {
		return "validation failed"
	}
	var messages []string
	for _, err := range e.Errors {
		messages = append(messages, err.Message)
	}
	return strings.Join(messages, "; ")
}

// Profile represents a validation profile for validation
type Profile struct {
	FieldRules      []FieldRule
	SectionRules    []SectionRule
	CollectionRules []CollectionRule
}

// Field represents a schema field for validation
type Field struct {
	Name          string
	Type          string
	Required      bool
	SelectOptions []string
	SectionID     *int
}

// FieldRule represents validation rules for a field
type FieldRule struct {
	FieldName    string
	MinLength    *int
	MaxLength    *int
	Regex        *string
	Min          *float64
	Max          *float64
	IntegerOnly  bool
	MinDate      *string
	MaxDate      *string
	MinRows      *int
	MaxRows      *int
	JSONSchema   *string
	CustomExpr   *string
	ErrorMessage *string
}

// ConditionalRule represents a conditional dependency
type ConditionalRule struct {
	IfField       string
	IfCondition   string
	IfValue       *string
	ThenField     string
	ThenCondition string
	ErrorMessage  *string
}

// SectionRule represents validation rules for a section
type SectionRule struct {
	SectionID       int
	MinFieldsFilled *int
	MaxFieldsFilled *int
	Conditions      []ConditionalRule
	CustomExpr      *string
	ErrorMessage    *string
}

// CrossSectionCondition represents cross-section dependencies
type CrossSectionCondition struct {
	IfSectionID   int
	IfField       string
	IfCondition   string
	IfValue       *string
	ThenSectionID int
	ThenField     string
	ThenCondition string
	ErrorMessage  *string
}

// CollectionRule represents collection-wide validation rules
type CollectionRule struct {
	RuleType               string
	UniqueFields           []string
	CrossSectionConditions []CrossSectionCondition
	CustomExpr             *string
	ErrorMessage           *string
}

// ValidateRecord validates a record against a profile
func ValidateRecord(
	profile Profile,
	fields map[string]Field,
	data map[string]interface{},
	action string,
	collectionName string,
	db *gorm.DB,
) ValidationResult {
	var errors []ValidationError

	// Validate field rules
	fieldErrors := validateFieldRules(profile.FieldRules, fields, data)
	errors = append(errors, fieldErrors...)

	// Validate section rules
	sectionErrors := validateSectionRules(profile.SectionRules, fields, data)
	errors = append(errors, sectionErrors...)

	// Validate collection rules
	collectionErrors := validateCollectionRules(profile.CollectionRules, fields, data, collectionName, db)
	errors = append(errors, collectionErrors...)

	return ValidationResult{
		Valid:  len(errors) == 0,
		Errors: errors,
	}
}

func validateFieldRules(rules []FieldRule, fields map[string]Field, data map[string]interface{}) []ValidationError {
	var errors []ValidationError

	for _, rule := range rules {
		field, exists := fields[rule.FieldName]
		if !exists {
			continue
		}

		value := data[rule.FieldName]
		fieldErrors := validateField(rule, field, value, data)
		errors = append(errors, fieldErrors...)
	}

	return errors
}

func validateField(rule FieldRule, field Field, value interface{}, data map[string]interface{}) []ValidationError {
	var errors []ValidationError

	// Skip validation if value is empty and field is not required
	if isEmpty(value) && !field.Required {
		return errors
	}

	switch field.Type {
	case "TEXT", "EMAIL", "URL":
		errors = append(errors, validateTextRules(rule, value)...)
	case "NUMBER":
		errors = append(errors, validateNumberRules(rule, value)...)
	case "DATE":
		errors = append(errors, validateDateRules(rule, value)...)
	case "SELECT":
		errors = append(errors, validateSelectRules(field, value)...)
	case "JSON":
		errors = append(errors, validateJSONRules(rule, value)...)
	case "TABLE":
		errors = append(errors, validateTableRules(rule, value)...)
	}

	// Custom expression validation
	if rule.CustomExpr != nil && *rule.CustomExpr != "" {
		result, err := EvaluateExpression(*rule.CustomExpr, data, value)
		if err != nil {
			errors = append(errors, ValidationError{
				Field:    rule.FieldName,
				RuleType: "field",
				Message:  fmt.Sprintf("Expression error: %s", err.Error()),
				Code:     "EXPRESSION_ERROR",
			})
		} else if !result {
			msg := "Custom validation failed"
			if rule.ErrorMessage != nil {
				msg = *rule.ErrorMessage
			}
			errors = append(errors, ValidationError{
				Field:    rule.FieldName,
				RuleType: "field",
				Message:  msg,
				Code:     "CUSTOM_VALIDATION",
			})
		}
	}

	return errors
}

func validateTextRules(rule FieldRule, value interface{}) []ValidationError {
	var errors []ValidationError

	str, ok := toString(value)
	if !ok {
		return errors
	}

	if rule.MinLength != nil && len(str) < *rule.MinLength {
		msg := fmt.Sprintf("Must be at least %d characters", *rule.MinLength)
		if rule.ErrorMessage != nil {
			msg = *rule.ErrorMessage
		}
		errors = append(errors, ValidationError{
			Field:    rule.FieldName,
			RuleType: "field",
			Message:  msg,
			Code:     "MIN_LENGTH",
		})
	}

	if rule.MaxLength != nil && len(str) > *rule.MaxLength {
		msg := fmt.Sprintf("Must be at most %d characters", *rule.MaxLength)
		if rule.ErrorMessage != nil {
			msg = *rule.ErrorMessage
		}
		errors = append(errors, ValidationError{
			Field:    rule.FieldName,
			RuleType: "field",
			Message:  msg,
			Code:     "MAX_LENGTH",
		})
	}

	if rule.Regex != nil && *rule.Regex != "" {
		re, err := regexp.Compile(*rule.Regex)
		if err == nil && !re.MatchString(str) {
			msg := fmt.Sprintf("Must match pattern %s", *rule.Regex)
			if rule.ErrorMessage != nil {
				msg = *rule.ErrorMessage
			}
			errors = append(errors, ValidationError{
				Field:    rule.FieldName,
				RuleType: "field",
				Message:  msg,
				Code:     "REGEX",
			})
		}
	}

	return errors
}

func validateNumberRules(rule FieldRule, value interface{}) []ValidationError {
	var errors []ValidationError

	num, ok := toFloat64(value)
	if !ok {
		return errors
	}

	if rule.Min != nil && num < *rule.Min {
		msg := fmt.Sprintf("Must be at least %v", *rule.Min)
		if rule.ErrorMessage != nil {
			msg = *rule.ErrorMessage
		}
		errors = append(errors, ValidationError{
			Field:    rule.FieldName,
			RuleType: "field",
			Message:  msg,
			Code:     "MIN",
		})
	}

	if rule.Max != nil && num > *rule.Max {
		msg := fmt.Sprintf("Must be at most %v", *rule.Max)
		if rule.ErrorMessage != nil {
			msg = *rule.ErrorMessage
		}
		errors = append(errors, ValidationError{
			Field:    rule.FieldName,
			RuleType: "field",
			Message:  msg,
			Code:     "MAX",
		})
	}

	if rule.IntegerOnly && num != math.Trunc(num) {
		msg := "Must be a whole number"
		if rule.ErrorMessage != nil {
			msg = *rule.ErrorMessage
		}
		errors = append(errors, ValidationError{
			Field:    rule.FieldName,
			RuleType: "field",
			Message:  msg,
			Code:     "INTEGER_ONLY",
		})
	}

	return errors
}

func validateDateRules(rule FieldRule, value interface{}) []ValidationError {
	var errors []ValidationError

	str, ok := toString(value)
	if !ok || str == "" {
		return errors
	}

	dateValue, err := time.Parse("2006-01-02", str)
	if err != nil {
		return errors
	}

	if rule.MinDate != nil && *rule.MinDate != "" {
		minDate, err := ParseDateExpression(*rule.MinDate)
		if err == nil && dateValue.Before(minDate) {
			msg := fmt.Sprintf("Must be on or after %s", minDate.Format("2006-01-02"))
			if rule.ErrorMessage != nil {
				msg = *rule.ErrorMessage
			}
			errors = append(errors, ValidationError{
				Field:    rule.FieldName,
				RuleType: "field",
				Message:  msg,
				Code:     "MIN_DATE",
			})
		}
	}

	if rule.MaxDate != nil && *rule.MaxDate != "" {
		maxDate, err := ParseDateExpression(*rule.MaxDate)
		if err == nil && dateValue.After(maxDate) {
			msg := fmt.Sprintf("Must be on or before %s", maxDate.Format("2006-01-02"))
			if rule.ErrorMessage != nil {
				msg = *rule.ErrorMessage
			}
			errors = append(errors, ValidationError{
				Field:    rule.FieldName,
				RuleType: "field",
				Message:  msg,
				Code:     "MAX_DATE",
			})
		}
	}

	return errors
}

func validateSelectRules(field Field, value interface{}) []ValidationError {
	var errors []ValidationError

	str, ok := toString(value)
	if !ok || str == "" {
		return errors
	}

	if len(field.SelectOptions) > 0 {
		found := false
		for _, opt := range field.SelectOptions {
			if opt == str {
				found = true
				break
			}
		}
		if !found {
			errors = append(errors, ValidationError{
				Field:    field.Name,
				RuleType: "field",
				Message:  "Invalid selection",
				Code:     "INVALID_OPTION",
			})
		}
	}

	return errors
}

func validateJSONRules(rule FieldRule, value interface{}) []ValidationError {
	var errors []ValidationError

	str, ok := toString(value)
	if !ok || str == "" {
		return errors
	}

	// Validate it's valid JSON
	var js interface{}
	if err := json.Unmarshal([]byte(str), &js); err != nil {
		errors = append(errors, ValidationError{
			Field:    rule.FieldName,
			RuleType: "field",
			Message:  "Invalid JSON format",
			Code:     "INVALID_JSON",
		})
	}

	// JSON Schema validation could be added here if needed

	return errors
}

func validateTableRules(rule FieldRule, value interface{}) []ValidationError {
	var errors []ValidationError

	rows, ok := value.([]interface{})
	if !ok {
		// Try to handle as JSON string
		str, strOk := value.(string)
		if strOk && str != "" {
			if err := json.Unmarshal([]byte(str), &rows); err != nil {
				return errors
			}
		} else {
			return errors
		}
	}

	rowCount := len(rows)

	if rule.MinRows != nil && rowCount < *rule.MinRows {
		msg := fmt.Sprintf("Must have at least %d rows", *rule.MinRows)
		if rule.ErrorMessage != nil {
			msg = *rule.ErrorMessage
		}
		errors = append(errors, ValidationError{
			Field:    rule.FieldName,
			RuleType: "field",
			Message:  msg,
			Code:     "MIN_ROWS",
		})
	}

	if rule.MaxRows != nil && rowCount > *rule.MaxRows {
		msg := fmt.Sprintf("Must have at most %d rows", *rule.MaxRows)
		if rule.ErrorMessage != nil {
			msg = *rule.ErrorMessage
		}
		errors = append(errors, ValidationError{
			Field:    rule.FieldName,
			RuleType: "field",
			Message:  msg,
			Code:     "MAX_ROWS",
		})
	}

	return errors
}

func validateSectionRules(rules []SectionRule, fields map[string]Field, data map[string]interface{}) []ValidationError {
	var errors []ValidationError

	for _, rule := range rules {
		// Get fields in this section
		sectionFields := make(map[string]Field)
		for name, field := range fields {
			if field.SectionID != nil && *field.SectionID == rule.SectionID {
				sectionFields[name] = field
			}
		}

		// Count filled fields
		filledCount := 0
		for name := range sectionFields {
			if !isEmpty(data[name]) {
				filledCount++
			}
		}

		// Min fields filled validation
		if rule.MinFieldsFilled != nil && filledCount < *rule.MinFieldsFilled {
			msg := fmt.Sprintf("At least %d fields must be filled", *rule.MinFieldsFilled)
			if rule.ErrorMessage != nil {
				msg = *rule.ErrorMessage
			}
			sectionID := rule.SectionID
			errors = append(errors, ValidationError{
				SectionID: &sectionID,
				RuleType:  "section",
				Message:   msg,
				Code:      "MIN_FIELDS_FILLED",
			})
		}

		// Max fields filled validation
		if rule.MaxFieldsFilled != nil && filledCount > *rule.MaxFieldsFilled {
			msg := fmt.Sprintf("At most %d fields can be filled", *rule.MaxFieldsFilled)
			if rule.ErrorMessage != nil {
				msg = *rule.ErrorMessage
			}
			sectionID := rule.SectionID
			errors = append(errors, ValidationError{
				SectionID: &sectionID,
				RuleType:  "section",
				Message:   msg,
				Code:      "MAX_FIELDS_FILLED",
			})
		}

		// Conditional rules
		for _, cond := range rule.Conditions {
			if checkCondition(cond.IfField, cond.IfCondition, cond.IfValue, data) {
				if !checkCondition(cond.ThenField, cond.ThenCondition, nil, data) {
					msg := fmt.Sprintf("When %s is %s, %s must be %s",
						cond.IfField, cond.IfCondition, cond.ThenField, cond.ThenCondition)
					if cond.ErrorMessage != nil {
						msg = *cond.ErrorMessage
					}
					sectionID := rule.SectionID
					errors = append(errors, ValidationError{
						Field:     cond.ThenField,
						SectionID: &sectionID,
						RuleType:  "section",
						Message:   msg,
						Code:      "CONDITIONAL",
					})
				}
			}
		}

		// Custom expression validation
		if rule.CustomExpr != nil && *rule.CustomExpr != "" {
			result, err := EvaluateExpression(*rule.CustomExpr, data, nil)
			if err != nil {
				sectionID := rule.SectionID
				errors = append(errors, ValidationError{
					SectionID: &sectionID,
					RuleType:  "section",
					Message:   fmt.Sprintf("Expression error: %s", err.Error()),
					Code:      "EXPRESSION_ERROR",
				})
			} else if !result {
				msg := "Section validation failed"
				if rule.ErrorMessage != nil {
					msg = *rule.ErrorMessage
				}
				sectionID := rule.SectionID
				errors = append(errors, ValidationError{
					SectionID: &sectionID,
					RuleType:  "section",
					Message:   msg,
					Code:      "CUSTOM_VALIDATION",
				})
			}
		}
	}

	return errors
}

func validateCollectionRules(rules []CollectionRule, fields map[string]Field, data map[string]interface{}, collectionName string, db *gorm.DB) []ValidationError {
	var errors []ValidationError

	for _, rule := range rules {
		switch rule.RuleType {
		case "uniqueness":
			if db != nil && len(rule.UniqueFields) > 0 {
				uniqueErrors := validateUniqueness(rule, data, collectionName, db)
				errors = append(errors, uniqueErrors...)
			}

		case "cross_section":
			for _, cond := range rule.CrossSectionConditions {
				if checkCondition(cond.IfField, cond.IfCondition, cond.IfValue, data) {
					if !checkCondition(cond.ThenField, cond.ThenCondition, nil, data) {
						msg := fmt.Sprintf("When %s is %s, %s must be %s",
							cond.IfField, cond.IfCondition, cond.ThenField, cond.ThenCondition)
						if cond.ErrorMessage != nil {
							msg = *cond.ErrorMessage
						}
						errors = append(errors, ValidationError{
							Field:    cond.ThenField,
							RuleType: "collection",
							Message:  msg,
							Code:     "CROSS_SECTION_CONDITIONAL",
						})
					}
				}
			}

		case "custom":
			if rule.CustomExpr != nil && *rule.CustomExpr != "" {
				result, err := EvaluateExpression(*rule.CustomExpr, data, nil)
				if err != nil {
					errors = append(errors, ValidationError{
						RuleType: "collection",
						Message:  fmt.Sprintf("Expression error: %s", err.Error()),
						Code:     "EXPRESSION_ERROR",
					})
				} else if !result {
					msg := "Collection validation failed"
					if rule.ErrorMessage != nil {
						msg = *rule.ErrorMessage
					}
					errors = append(errors, ValidationError{
						RuleType: "collection",
						Message:  msg,
						Code:     "CUSTOM_VALIDATION",
					})
				}
			}
		}
	}

	return errors
}

func validateUniqueness(rule CollectionRule, data map[string]interface{}, collectionName string, db *gorm.DB) []ValidationError {
	var errors []ValidationError

	// Build query to check for existing records with same values
	query := db.Table(collectionName)
	for _, fieldName := range rule.UniqueFields {
		value := data[fieldName]
		query = query.Where(fmt.Sprintf("%s = ?", fieldName), value)
	}

	// Exclude current record if updating (check for id in data)
	if id, hasID := data["id"]; hasID {
		query = query.Where("id != ?", id)
	}

	var count int64
	query.Count(&count)

	if count > 0 {
		msg := fmt.Sprintf("A record with this %s already exists", strings.Join(rule.UniqueFields, ", "))
		if rule.ErrorMessage != nil {
			msg = *rule.ErrorMessage
		}
		errors = append(errors, ValidationError{
			Field:    rule.UniqueFields[0],
			RuleType: "collection",
			Message:  msg,
			Code:     "UNIQUENESS_VIOLATION",
		})
	}

	return errors
}

func checkCondition(fieldName string, condition string, value *string, data map[string]interface{}) bool {
	fieldValue := data[fieldName]

	switch condition {
	case "filled", "required":
		return !isEmpty(fieldValue)
	case "empty":
		return isEmpty(fieldValue)
	case "equals":
		if value == nil {
			return false
		}
		str, ok := toString(fieldValue)
		return ok && str == *value
	case "not_equals":
		if value == nil {
			return false
		}
		str, ok := toString(fieldValue)
		return ok && str != *value
	default:
		return false
	}
}

// Helper functions

func isEmpty(value interface{}) bool {
	if value == nil {
		return true
	}
	switch v := value.(type) {
	case string:
		return strings.TrimSpace(v) == ""
	case []interface{}:
		return len(v) == 0
	case map[string]interface{}:
		return len(v) == 0
	default:
		return false
	}
}

func toString(value interface{}) (string, bool) {
	if value == nil {
		return "", true
	}
	switch v := value.(type) {
	case string:
		return v, true
	case float64:
		return fmt.Sprintf("%v", v), true
	case int:
		return fmt.Sprintf("%d", v), true
	case int64:
		return fmt.Sprintf("%d", v), true
	case bool:
		return fmt.Sprintf("%t", v), true
	default:
		return "", false
	}
}

func toFloat64(value interface{}) (float64, bool) {
	if value == nil {
		return 0, false
	}
	switch v := value.(type) {
	case float64:
		return v, true
	case float32:
		return float64(v), true
	case int:
		return float64(v), true
	case int64:
		return float64(v), true
	case int32:
		return float64(v), true
	case string:
		var f float64
		_, err := fmt.Sscanf(v, "%f", &f)
		return f, err == nil
	default:
		return 0, false
	}
}
