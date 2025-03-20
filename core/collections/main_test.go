package collections_test

import (
	"fmt"
	"reflect"
	"strings"
	"testing"
	"yumyum-pi/Hardeol/core/collections"
	"yumyum-pi/Hardeol/core/database"
)

func TestNew(t *testing.T) {
	name := "testCollection"
	c := collections.New(name)
	if c.Name != name {
		t.Errorf("expected Names to be %q, got %q", name, c.Name)
	}
	if len(c.Fields) != 0 {
		t.Errorf("expected initial List length to be 0, got %d", len(c.Fields))
	}
}

func TestAddField(t *testing.T) {
	// Add a dummy field
	f := collections.NewSchemaField("DummyValue", "TEXT", true, "")
	c := collections.New("testcollections", *f)
	if len(c.Fields) != 1 {
		t.Errorf("expected Fields length to be 1 after adding a field, got %d", len(c.Fields))
	}
}

func TestCreateType(t *testing.T) {
	// Add a dummy field
	f := collections.NewSchemaField("DummyText", "TEXT", true, "")
	n := collections.NewSchemaField("DummyNumber", "NUMBER", true, "")
	c := collections.New("testcollections", *f, *n)
	if len(c.Fields) != 2 {
		t.Errorf("expected Fields length to be 1 after adding a field, got %d", len(c.Fields))
	}

	c.CreateType()
}

func TestCreate(t *testing.T) {
	f := collections.NewSchemaField("DummyText", "TEXT", true, "")
	n := collections.NewSchemaField("DummyNumber", "NUMBER", true, "")

	c := collections.New("testcollections", *f, *n)
	j := `
  {
  "DummyText": "hello world",
  "DummyNumber": 69
  }
  `
	testInput := struct {
		DummyText   string
		DummyNumber int
	}{
		DummyText:   "hello world",
		DummyNumber: 69,
	}
	myReader := strings.NewReader(j)

	k, err := c.Create(myReader)
	if err != nil {
		t.Errorf("unable to create: %s", err.Error())
	}

	fmt.Println(reflect.TypeOf(k))
	fmt.Println(reflect.TypeOf(testInput))
	if reflect.TypeOf(k) == reflect.TypeOf(testInput) {
		t.Errorf("values do not match.\nexpected:\n - %+v\ngot:\n - %+v\n", &testInput, k)
	}
}

func TestDBInit(t *testing.T) {
	database.InitSqlite()
	f := collections.NewSchemaField("DummyText", "TEXT", true, "")
	n := collections.NewSchemaField("DummyNumber", "NUMBER", true, "")

	c := collections.New("testcollections", *f, *n)

	err := c.DBInit()
	if err != nil {
		t.Error(err)
	}
}
