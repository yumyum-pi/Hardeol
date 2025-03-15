package fields_test

import (
	"encoding/json"
	"reflect"
	"testing"
	"yumyum-pi/Hardeol/core/fields"
)

// TestSchemaFieldJSONMarshalling tests that a SchemaField with all fields set is marshalled correctly.
func TestSchemaFieldJSONMarshalling(t *testing.T) {
	field := fields.SchemaField{
		Name:     "email",
		Type:     "string",
		Required: true,
		Regex:    "^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$",
	}

	data, err := json.Marshal(field)
	if err != nil {
		t.Fatalf("Error marshalling SchemaField: %v", err)
	}

	expected := `{"name":"email","type":"string","regex":"^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$","required":true}`
	if string(data) != expected {
		t.Errorf("Expected JSON %s, got %s", expected, string(data))
	}
}

// TestSchemaFieldJSONOmitEmpty tests that an empty Regex field is omitted during marshalling.
func TestSchemaFieldJSONOmitEmpty(t *testing.T) {
	field := fields.SchemaField{
		Name:     "age",
		Type:     "number",
		Required: false,
		// Regex is empty so it should be omitted
	}

	data, err := json.Marshal(field)
	if err != nil {
		t.Fatalf("Error marshalling SchemaField: %v", err)
	}

	expected := `{"name":"age","type":"number","required":false}`
	if string(data) != expected {
		t.Errorf("Expected JSON %s, got %s", expected, string(data))
	}
}

// TestSchemaFieldJSONUnmarshal tests that a JSON string is correctly unmarshalled into a SchemaField.
func TestSchemaFieldJSONUnmarshal(t *testing.T) {
	jsonData := `{"name":"username","type":"string","required":true,"regex":"^\\w+$"}`
	var field fields.SchemaField
	if err := json.Unmarshal([]byte(jsonData), &field); err != nil {
		t.Fatalf("Error unmarshalling JSON into SchemaField: %v", err)
	}

	expected := fields.SchemaField{
		Name:     "username",
		Type:     "string",
		Required: true,
		Regex:    "^\\w+$",
	}

	if !reflect.DeepEqual(field, expected) {
		t.Errorf("Expected SchemaField %+v, got %+v", expected, field)
	}
}
