package fields

type TEXT struct {
	value    string
	id       string
	name     string
	isHidden bool
}

func NewText(name string, value string) TEXT {
	return TEXT{
		name:     name,
		value:    name,
		id:       "asdfasd",
		isHidden: false,
	}
}

func (t *TEXT) GetId() string {
	return t.id
}

func (t *TEXT) SetId(id string) {
	t.id = id
}

func (t *TEXT) Type() string {
	return "TEXT"
}

func (t *TEXT) GetHidden() bool {
	return t.isHidden
}

func (t *TEXT) SetHidden(isHidden bool) {
	t.isHidden = isHidden
}

func (t *TEXT) GetName() string {
	return t.name
}

func (t *TEXT) SetName(name string) {
	t.name = name
}

func (t *TEXT) GetValue() string {
	return t.value
}

func (t *TEXT) SetValue(value string) {
	t.value = value
}

func init() {
	FieldMap["TEXT"] = func() Field {
		return &TEXT{}
	}
}
