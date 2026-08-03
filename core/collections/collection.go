package collections

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"reflect"
	"yumyum-pi/Hardeol/utils"

	"gorm.io/gorm"
)

var (
	ErrNoValidFields   = errors.New("collection has no valid fields")
	ErrUnknownType     = errors.New("unknown field type")
	ErrEmptyCollection = errors.New("collection must have at least one field")
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
	t, _ := c.CreateTypeWithValidation()
	return t
}

// CreateTypeWithValidation creates a reflect.Type from collection fields with validation
func (c *Collection) CreateTypeWithValidation() (reflect.Type, error) {
	if len(c.Fields) == 0 {
		return nil, ErrEmptyCollection
	}

	f := make([]reflect.StructField, 0, len(c.Fields))
	for i := range c.Fields {
		fieldType := c.Fields[i].Type
		n := utils.CapFirstChar(c.Fields[i].Name)

		switch fieldType {
		case "TEXT", "EMAIL", "URL", "DATE", "SELECT":
			// All stored as strings
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
		case "BOOL":
			f = append(f, reflect.StructField{
				Name: n,
				Type: reflect.TypeOf(false),
				Tag:  reflect.StructTag(fmt.Sprintf(`json:"%s"`, utils.ToSnakeUnsafe(n))),
			})
		case "JSON":
			// Use interface{} for arbitrary JSON
			f = append(f, reflect.StructField{
				Name: n,
				Type: reflect.TypeOf((*interface{})(nil)).Elem(),
				Tag:  reflect.StructTag(fmt.Sprintf(`json:"%s"`, utils.ToSnakeUnsafe(n))),
			})
		default:
			return nil, fmt.Errorf("%w: %s", ErrUnknownType, fieldType)
		}
	}

	if len(f) == 0 {
		return nil, ErrNoValidFields
	}

	t := reflect.StructOf(f)
	return t, nil
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
	t, err := c.CreateTypeWithValidation()
	if err != nil {
		return err
	}
	v := reflect.New(t).Interface()
	err = db.Table(c.Name).AutoMigrate(v)
	if err != nil {
		return err
	}
	return nil
}
