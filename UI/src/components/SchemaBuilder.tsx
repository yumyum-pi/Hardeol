import { createSignal, For, Show } from 'solid-js';
import { createStore, produce } from 'solid-js/store';
import { api, Collection } from '../api/client';

type FieldType = 'TEXT' | 'NUMBER' | 'BOOL' | 'EMAIL' | 'URL' | 'DATE' | 'SELECT' | 'JSON';

interface Field {
  name: string;
  type: FieldType;
  required: boolean;
  select_options?: string[];
  select_options_text?: string; // Raw input text for editing
}

interface SchemaBuilderProps {
  onSave: () => void;
  onCancel: () => void;
  collection?: Collection; // If provided, we're in edit mode
}

export function SchemaBuilder(props: SchemaBuilderProps) {
  const isEditMode = () => !!props.collection;

  // Initialize from collection if in edit mode
  const initialFields = (): Field[] => {
    if (props.collection) {
      // Filter out the id field - it's auto-managed
      return props.collection.fields
        .filter((f) => f.name !== 'id')
        .map((f) => ({
          name: f.name,
          type: f.type,
          required: f.required,
          select_options: f.select_options,
          select_options_text: (f.select_options || []).join(', '),
        }));
    }
    return [{ name: '', type: 'TEXT', required: false }];
  };

  const [name, setName] = createSignal(props.collection?.name || '');
  const [fields, setFields] = createStore<Field[]>(initialFields());
  const [error, setError] = createSignal<string | null>(null);
  const [saving, setSaving] = createSignal(false);
  const [showRemovalWarning, setShowRemovalWarning] = createSignal(false);

  const addField = () => {
    setFields(produce((f) => f.push({ name: '', type: 'TEXT', required: false })));
  };

  const removeField = (index: number) => {
    // In edit mode, show warning about data loss if removing an existing field
    if (isEditMode() && props.collection) {
      const fieldName = fields[index].name;
      const existingField = props.collection.fields.find((f) => f.name === fieldName);
      if (existingField) {
        setShowRemovalWarning(true);
      }
    }
    setFields(produce((f) => f.splice(index, 1)));
  };

 const nameTransformer = (input:string):string => { 
	if (input.length == 0) {
		return "";
	}

const diff = 97-65;

	let newString = ""	
	let char = ""

	for (let i = 0; i < input.length; i++) {
		char = input[i];
		switch(true) {
			// check if char is space
			case char == ' ' : {
				newString += '_';
				break;
			}

			// check if char is small case
			case char >= 'a' && char <='z': {
				newString +=char;
				break;
			}
			case char >= 'A' && char <='Z': {
				newString += String.fromCharCode(char.charCodeAt(0) + diff);
				break;
			}
			case char == '_' : {
				newString += '_';
				break;
			}
			
			default: { break; }

		}
	}
return newString;
 }

  const updateField = (index: number, key: keyof Field, value: string | boolean) => {
    setFields(index, key, value as never);
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!name().trim()) {
      setError('Collection name is required');
      return;
    }

    const validFields = fields.filter((f) => f.name.trim());
    if (validFields.length === 0) {
      setError('At least one field is required');
      return;
    }

    setSaving(true);

    const fieldData = validFields.map((f) => {
      // Parse select_options from text if available
      let selectOptions = f.select_options;
      if (f.type === 'SELECT' && f.select_options_text) {
        selectOptions = f.select_options_text.split(',').map(s => s.trim()).filter(Boolean);
      }
      return {
        name: f.name.trim(),
        type: f.type,
        required: f.required,
        ...(f.type === 'SELECT' && selectOptions && selectOptions.length > 0 ? { select_options: selectOptions } : {}),
      };
    });

    let response;
    if (isEditMode()) {
      response = await api.updateCollection(name().trim(), {
        fields: fieldData,
      });
    } else {
      response = await api.createCollection({
        name: name().trim(),
        fields: fieldData,
      });
    }

    setSaving(false);

    if (response.error) {
      setError(response.error);
    } else {
      props.onSave();
    }
  };

  return (
    <div class="schema-builder">
      <header class="page-header">
        <div class="header-left">
          <button class="btn btn-text" onClick={props.onCancel}>
            &larr; Cancel
          </button>
          <h2>{isEditMode() ? `Edit Collection: ${props.collection?.name}` : 'New Collection'}</h2>
        </div>
      </header>

      <Show when={error()}>
        <div class="error-banner">{error()}</div>
      </Show>

      <Show when={showRemovalWarning()}>
        <div class="warning-banner">
          Warning: Removing fields will permanently delete the data in those columns.
          <button class="btn btn-sm" onClick={() => setShowRemovalWarning(false)}>Dismiss</button>
        </div>
      </Show>

      <form onSubmit={handleSubmit} class="schema-form">
        <div class="form-section">
          <h3>Collection Details</h3>
          <div class="form-group">
            <label>Name</label>
            <input
              type="text"
              placeholder="e.g., users, posts, products"
              value={name()}
              onInput={(e) => setName(e.currentTarget.value)}
              pattern="^[a-zA-Z][a-zA-Z0-9_]*$"
              title="Must start with letter, alphanumeric and underscore only"
              disabled={isEditMode()}
            />
            <span class="form-hint">
              {isEditMode()
                ? 'Collection name cannot be changed.'
                : 'Must start with a letter. Only letters, numbers, and underscores.'}
            </span>
          </div>
        </div>

        <div class="form-section">
          <div class="section-header">
            <h3>Fields</h3>
            <button type="button" class="btn btn-sm" onClick={addField}>
              + Add Field
            </button>
          </div>

          <div class="fields-list">
            <For each={fields}>
              {(field, index) => (
                <div class="field-row">
                  <div class="field-inputs">
                    <input
                      type="text"
                      placeholder="Field name"
                      value={field.name}
                      onInput={(e) =>{

			const n = nameTransformer(e.currentTarget.value)
                        updateField(index(), 'name', n)
}
                      }
                      class="field-name-input"
                    />
                    <select
                      value={field.type}
                      onChange={(e) =>
                        updateField(index(), 'type', e.currentTarget.value as FieldType)
                      }
                      class="field-type-select"
                    >
                      <option value="TEXT">TEXT</option>
                      <option value="NUMBER">NUMBER</option>
                      <option value="BOOL">BOOL</option>
                      <option value="EMAIL">EMAIL</option>
                      <option value="URL">URL</option>
                      <option value="DATE">DATE</option>
                      <option value="SELECT">SELECT</option>
                      <option value="JSON">JSON</option>
                    </select>

                    <Show when={field.type === 'SELECT'}>
                      <input
                        type="text"
                        placeholder="Options (comma-separated)"
                        value={field.select_options_text ?? ''}
                        onInput={(e) => {
                          updateField(index(), 'select_options_text', e.currentTarget.value);
                        }}
                        onBlur={(e) => {
                          const options = e.currentTarget.value.split(',').map(s => s.trim()).filter(Boolean);
                          updateField(index(), 'select_options', options as unknown as string);
                        }}
                        class="field-options-input"
                      />
                    </Show>

                    <label class="checkbox-label">
                      <input
                        type="checkbox"
                        checked={field.required}
                        onChange={(e) =>
                          updateField(index(), 'required', e.currentTarget.checked)
                        }
                      />
                      Required
                    </label>
                  </div>

                  <button
                    type="button"
                    class="btn btn-icon btn-danger"
                    onClick={() => removeField(index())}
                    disabled={fields.length === 1}
                    title="Remove field"
                  >
                    &times;
                  </button>
                </div>
              )}
            </For>
          </div>

          <p class="form-hint">
            An <code>id</code> field will be added automatically.
          </p>
        </div>

        <div class="form-actions">
          <button type="button" class="btn" onClick={props.onCancel}>
            Cancel
          </button>
          <button type="submit" class="btn btn-primary" disabled={saving()}>
            {saving()
              ? isEditMode()
                ? 'Saving...'
                : 'Creating...'
              : isEditMode()
                ? 'Save Changes'
                : 'Create Collection'}
          </button>
        </div>
      </form>
    </div>
  );
}
