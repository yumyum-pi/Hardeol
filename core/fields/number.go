package fields

import (
	"fmt"
	"strconv"
)

type NUMBER struct {
	value    int64
	id       string
	name     string
	isHidden bool
}

func (n *NUMBER) GetId() string {
	return n.id
}

func (n *NUMBER) SetId(id string) {
	n.id = id
}

func (n *NUMBER) Type() string {
	return "NUMBER"
}

func (n *NUMBER) GetHidden() bool {
	return n.isHidden
}

func (n *NUMBER) SetHidden(isHidden bool) {
	n.isHidden = isHidden
}

func (n *NUMBER) GetName() string {
	return n.name
}

func (n *NUMBER) SetName(name string) {
	n.name = name
}

func (n *NUMBER) GetValue() string {
	return fmt.Sprintf("%d", n.value)
}

func (n *NUMBER) SetValue(value string) {
	n.value, _ = strconv.ParseInt(value, 10, 64)
}

func init() {
	FieldMap["NUMBER"] = func() Field {
		return &NUMBER{}
	}
}
