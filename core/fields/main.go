package fields

// TODO: add validation structure
type Field interface {
	// note: the getters has an explicit "Get" prefix to avoid conflicts with their related field members

	// GetId returns the field id.
	GetId() string

	// SetId changes the field id.
	SetId(id string)

	// GetName returns the field name.
	GetName() string

	// SetName changes the field name.
	SetName(name string)

	// // GetSystem returns the field system flag state.
	// GetSystem() bool

	// // SetSystem changes the field system flag state.
	// SetSystem(system bool)

	// GetHidden returns the field hidden flag state.
	GetHidden() bool

	// SetHidden changes the field hidden flag state.
	SetHidden(hidden bool)

	// Type returns the unique type of the field.
	Type() string

	// ColumnType returns the DB column definition of the field.
	// ColumnType(app App) string
	SetValue(value string)

	// PrepareValue returns a properly formatted field value based on the provided raw one.
	//
	// This method is also called on record construction to initialize its default field value.
	// PrepareValue(record *Record, raw any) (any, error)

	// ValidateSettings validates the current field value associated with the provided record.
	// ValidateValue(ctx context.Context, app App, record *Record) error

	// ValidateSettings validates the current field settings.
	// ValidateSettings(ctx context.Context, app App, collection *Collection) error
}

type FieldFunc func() Field

var FieldMap = make(map[string]FieldFunc)
