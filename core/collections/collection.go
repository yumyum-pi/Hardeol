package collections

import (
	"encoding/json"
	"fmt"
	"io"
	"reflect"
	"yumyum-pi/Hardeol/core/database"
	"yumyum-pi/Hardeol/core/fields"
	"yumyum-pi/Hardeol/utils"
)

type Collection struct {
	Name   string         `json:"name"`
	Fields []fields.Field `json:"fields"`
}

func New(Name string, fs ...fields.Field) *Collection {
	c := Collection{
		Name:   Name,
		Fields: fs,
	}
	return &c
}

func (c *Collection) AddField(f fields.Field) {
	c.Fields = append(c.Fields, f)
}

func (c *Collection) CreateType() reflect.Type {
	f := make([]reflect.StructField, 0)
	for i := range c.Fields {
		t := c.Fields[i].Type()
		n := c.Fields[i].GetName()

		switch t {
		case "TEXT":
			f = append(f, reflect.StructField{
				Name: n,
				Type: reflect.TypeOf(""),
				Tag:  reflect.StructTag(fmt.Sprintf(`json:"%s"`, utils.ToSnakeUnsafe(n))),
			})
		case "NUMBER":
			f = append(f, reflect.StructField{
				Name: n,
				Type: reflect.TypeOf(0),
				Tag:  reflect.StructTag(fmt.Sprintf(`json:"%s"`, utils.ToSnakeUnsafe(n))),
			})
		}

	}
	t := reflect.StructOf(f)
	return t
}

func (c *Collection) Create(body io.Reader) (any, error) {
	t := c.CreateType()
	v := reflect.New(t).Interface()
	err := json.NewDecoder(body).Decode(&v)
	if err != nil {
		fmt.Println("Invalid input", err)
		return nil, err
	}
	// TODO: check validation
	return v, nil
}

func (c *Collection) DBInit() error {
	t := c.CreateType()
	v := reflect.New(t).Interface()
	db := database.Get()
	err := db.Table(c.Name).AutoMigrate(v)
	if err != nil {
		return err
	}

	return nil
}
