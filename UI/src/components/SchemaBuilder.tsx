import { createSignal, For, Show } from 'solid-js';
import { createStore, produce } from 'solid-js/store';
import { api, Collection } from '../api/client';

interface Field {
  name: string;
  type: 'TEXT' | 'NUMBER';
  required: boolean;
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

    const fieldData = validFields.map((f) => ({
      name: f.name.trim(),
      type: f.type,
      required: f.required,
    }));

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
                      onInput={(e) =>
                        updateField(index(), 'name', e.currentTarget.value)
                      }
                      class="field-name-input"
                    />

                    <select
                      value={field.type}
                      onChange={(e) =>
                        updateField(index(), 'type', e.currentTarget.value as 'TEXT' | 'NUMBER')
                      }
                      class="field-type-select"
                    >
                      <option value="TEXT">TEXT</option>
                      <option value="NUMBER">NUMBER</option>
                    </select>

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
