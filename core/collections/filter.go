package collections

import (
	"fmt"
	"strconv"

	"gorm.io/gorm"
)

// allowedOperatorsForType returns the set of FilterOperator values permitted for a field type.
func allowedOperatorsForType(t SchemaFieldType) map[FilterOperator]bool {
	switch t {
	case FieldNumber, FieldDate:
		return map[FilterOperator]bool{
			OpEquals: true, OpNotEquals: true,
			OpGT: true, OpGTE: true, OpLT: true, OpLTE: true,
			OpIsEmpty: true, OpIsNotEmpty: true,
		}
	case FieldBool:
		return map[FilterOperator]bool{
			OpEquals: true, OpIsEmpty: true, OpIsNotEmpty: true,
		}
	case FieldSelect:
		return map[FilterOperator]bool{
			OpEquals: true, OpNotEquals: true, OpIsEmpty: true, OpIsNotEmpty: true,
		}
	default: // TEXT, EMAIL, URL, JSON
		return map[FilterOperator]bool{
			OpEquals: true, OpNotEquals: true,
			OpContains: true, OpNotContains: true, OpStartsWith: true,
			OpIsEmpty: true, OpIsNotEmpty: true,
		}
	}
}

// ApplyFilters chains one db.Where(...) per rule (GORM ANDs successive Where calls),
// after validating each rule's field against the collection's own schema (the
// SQL-injection safety boundary: field names are only interpolated after this
// whitelist check succeeds) and its operator against the field's type.
func ApplyFilters(db *gorm.DB, fields []SchemaField, filters []FilterRule) (*gorm.DB, error) {
	fieldByName := make(map[string]SchemaField, len(fields))
	for _, f := range fields {
		if f.Type == FieldTable {
			continue
		}
		fieldByName[f.Name] = f
	}

	for _, rule := range filters {
		field, ok := fieldByName[rule.Field]
		if !ok {
			return nil, fmt.Errorf("unknown filter field: %s", rule.Field)
		}

		allowed := allowedOperatorsForType(field.Type)
		if !allowed[rule.Operator] {
			return nil, fmt.Errorf("operator %q is not allowed for field %q", rule.Operator, rule.Field)
		}

		var err error
		db, err = applyRule(db, field, rule)
		if err != nil {
			return nil, err
		}
	}

	return db, nil
}

func applyRule(db *gorm.DB, field SchemaField, rule FilterRule) (*gorm.DB, error) {
	col := field.Name

	switch rule.Operator {
	case OpIsEmpty:
		return db.Where(fmt.Sprintf("(%s IS NULL OR %s = '')", col, col)), nil
	case OpIsNotEmpty:
		return db.Where(fmt.Sprintf("(%s IS NOT NULL AND %s != '')", col, col)), nil
	}

	value, err := coerceValue(field.Type, rule.Value)
	if err != nil {
		return nil, fmt.Errorf("invalid value for field %q: %w", rule.Field, err)
	}

	switch rule.Operator {
	case OpEquals:
		return db.Where(fmt.Sprintf("%s = ?", col), value), nil
	case OpNotEquals:
		return db.Where(fmt.Sprintf("%s != ?", col), value), nil
	case OpContains:
		return db.Where(fmt.Sprintf("%s LIKE ?", col), fmt.Sprintf("%%%v%%", value)), nil
	case OpNotContains:
		return db.Where(fmt.Sprintf("%s NOT LIKE ?", col), fmt.Sprintf("%%%v%%", value)), nil
	case OpStartsWith:
		return db.Where(fmt.Sprintf("%s LIKE ?", col), fmt.Sprintf("%v%%", value)), nil
	case OpGT:
		return db.Where(fmt.Sprintf("%s > ?", col), value), nil
	case OpGTE:
		return db.Where(fmt.Sprintf("%s >= ?", col), value), nil
	case OpLT:
		return db.Where(fmt.Sprintf("%s < ?", col), value), nil
	case OpLTE:
		return db.Where(fmt.Sprintf("%s <= ?", col), value), nil
	}

	return nil, fmt.Errorf("unsupported operator: %s", rule.Operator)
}

// coerceValue converts a FilterRule's wire-format string value to the Go type
// appropriate for the field being filtered, so it binds correctly via GORM's `?`.
func coerceValue(t SchemaFieldType, raw string) (interface{}, error) {
	switch t {
	case FieldNumber:
		v, err := strconv.ParseFloat(raw, 64)
		if err != nil {
			return nil, fmt.Errorf("expected a number, got %q", raw)
		}
		return v, nil
	case FieldBool:
		v, err := strconv.ParseBool(raw)
		if err != nil {
			return nil, fmt.Errorf("expected a boolean, got %q", raw)
		}
		return v, nil
	default: // TEXT, EMAIL, URL, JSON, DATE, SELECT — plain string comparison
		return raw, nil
	}
}
