package collections

import (
	"encoding/json"
	"fmt"
	"io"
	"reflect"
	"yumyum-pi/Hardeol/utils"

	"gorm.io/gorm"
)

type Collection struct {
	ID     int           `json:"id" gorm:"primaryKey;unique,autoIncrement"`
	Name   string        `json:"name" gorm:"unique"`
	Fields []SchemaField `json:"fields" gorm:"foreignKey:CollectionID;constraint:OnDelete:CASCADE;"`
}

// New function will create a new collection
func New(Name string, fs ...SchemaField) *Collection {
	id := DefaultIDSchemeField()
	fs = append(fs, id)
	c := Collection{
		Name:   Name,
		Fields: fs,
	}
	return &c
}

func (c *Collection) AddField(f SchemaField) {
	c.Fields = append(c.Fields, f)
}

func (c *Collection) CreateType() reflect.Type {
	f := make([]reflect.StructField, 0)
	// TODO: add  validation
	for i := range c.Fields {
		t := c.Fields[i].Type
		n := utils.CapFirstChar(c.Fields[i].Name)

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

func (c *Collection) DBInit(db *gorm.DB) error {
	t := c.CreateType()
	v := reflect.New(t).Interface()
	err := db.Table(c.Name).AutoMigrate(v)
	if err != nil {
		return err
	}
	return nil
}
