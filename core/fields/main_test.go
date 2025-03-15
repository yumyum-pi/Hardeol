package fields_test

import (
	"fmt"
	"testing"
	"yumyum-pi/Hardeol/core/fields"
)

func TestInit(t *testing.T) {
	if len(fields.FieldMap) == 0 {
		t.Errorf("Fields not found\n")
	}
}

func TestCollection(t *testing.T) {
	tt := "TEXT"

	// create the field
	j := fields.FieldMap[tt]()

	j.SetName("test name")
	j.SetId("slajfklasjdfkl")
	j.SetValue("salkdfjlasdf")

	k, ok := j.(*fields.TEXT)
	if !ok {
		t.Errorf("Type assertion to *fields.TEXT failed")
	}
	fmt.Println(k)
}
