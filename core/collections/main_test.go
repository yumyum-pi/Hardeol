package collections_test

import (
	"fmt"
	"reflect"
	"strings"
	"testing"
	"yumyum-pi/Hardeol/core/collections"
	"yumyum-pi/Hardeol/core/database"
	"yumyum-pi/Hardeol/core/fields"
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
	c := collections.New("testcollections")
	if len(c.Fields) != 0 {
		t.Errorf("expected Fields length to be 0 initially, got %d", len(c.Fields))
	}

	// Add a dummy field
	f := fields.TEXT{}
	f.SetName("DummyValue")
	c.AddField(&f)
	if len(c.Fields) != 1 {
		t.Errorf("expected Fields length to be 1 after adding a field, got %d", len(c.Fields))
	}
}

func TestCreateType(t *testing.T) {
	c := collections.New("testcollections")
	if len(c.Fields) != 0 {
		t.Errorf("expected Fields length to be 0 initially, got %d", len(c.Fields))
	}

	// Add a dummy field
	f := fields.TEXT{}
	f.SetName("DummyText")
	c.AddField(&f)
	// Add a dummy field
	n := fields.NUMBER{}
	n.SetName("DummyNumber")
	c.AddField(&n)
	if len(c.Fields) != 2 {
		t.Errorf("expected Fields length to be 1 after adding a field, got %d", len(c.Fields))
	}

	c.CreateType()
}

func TestCreate(t *testing.T) {
	c := collections.New("testcollections")
	f := fields.TEXT{}
	f.SetName("DummyText")
	c.AddField(&f)
	n := fields.NUMBER{}
	n.SetName("DummyNumber")
	c.AddField(&n)

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
	c := collections.New("testcollections")
	f := fields.TEXT{}
	f.SetName("DummyText")
	c.AddField(&f)
	n := fields.NUMBER{}
	n.SetName("DummyNumber")
	c.AddField(&n)

	err := c.DBInit()
	if err != nil {
		t.Error(err)
	}
}
