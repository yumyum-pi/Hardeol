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
	Name      string
	ID        [8]byte
	List      []fields.Field
	tableName string
}

func New(Name string, fs ...fields.Field) *Collection {
	tableName := utils.ToSnakeUnsafe(Name)
	c := Collection{
		Name:      Name,
		List:      fs,
		tableName: tableName,
	}
	copy(c.ID[:], utils.RandName(8))
	return &c
}

func (c *Collection) TableName() string {
	return c.tableName
}

func (c *Collection) AddField(f fields.Field) {
	c.List = append(c.List, f)
}

func (c *Collection) CreateType() reflect.Type {
	f := make([]reflect.StructField, 0)
	for i := range c.List {
		t := c.List[i].Type()
		n := c.List[i].GetName()

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
	err := db.Table(c.tableName).AutoMigrate(v)
	if err != nil {
		return err
	}

	return nil
}
