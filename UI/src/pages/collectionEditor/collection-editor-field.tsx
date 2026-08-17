import { createSignal, For, Show } from "solid-js";
import { Field, FieldType } from "../../types/collection";
import NameTransformer from "../../utils/nameTransformer";

type SchemaEditorFieldProps = {
  field: Field,
  onUpdate: (key: keyof Field, value: unknown) => void,
  onRemove: () => void,
  canRemove: boolean,
  isTableField: boolean
}

// Render a single field row
export const SchemaFieldEditor = (props: SchemaEditorFieldProps) => {
  const [isFolded, setIsFolded] = createSignal(true);
  const fieldTypes: FieldType[] = props.isTableField
    ? ['TEXT', 'NUMBER', 'BOOL', 'EMAIL', 'URL', 'DATE', 'SELECT', 'JSON']
    : ['TEXT', 'NUMBER', 'BOOL', 'EMAIL', 'URL', 'DATE', 'SELECT', 'JSON', 'TABLE'];

  return (
    <div class={`field-row ${props.isTableField ? 'table-field-row' : ''}`}>
      <div class="field-inputs">
        <input
          type="text"
          placeholder="Field name"
          value={props.field.name}
          onInput={(e) => props.onUpdate('name', NameTransformer(e.currentTarget.value))}
          class="field-name-input"
        />
        <select
          value={props.field.type}
          onChange={(e) => {
            const newType = e.currentTarget.value as FieldType;
            props.onUpdate('type', newType);
            if (newType === 'TABLE' && (!props.field.table_fields || props.field.table_fields.length === 0)) {
              props.onUpdate('table_fields', [{ name: '', type: 'TEXT', required: false }]);
            }
          }}
          class="field-type-select"
        >
          <For each={fieldTypes}>
            {(type) => <option value={type}>{type}</option>}
          </For>
        </select>

        <Show when={props.field.type === 'SELECT'}>
          <input
            type="text"
            placeholder="Options (comma-separated)"
            value={props.field.select_options_text ?? ''}
            onInput={(e) => props.onUpdate('select_options_text', e.currentTarget.value)}
            onBlur={(e) => {
              const options = e.currentTarget.value.split(',').map(s => s.trim()).filter(Boolean);
              props.onUpdate('select_options', options);
            }}
            class="field-options-input"
          />
        </Show>

        <label class="checkbox-label">
          <input
            type="checkbox"
            checked={props.field.required}
            onChange={(e) => props.onUpdate('required', e.currentTarget.checked)}
          />
          Required
        </label>
      </div>

      <Show when={!props.isTableField && props.field.type === 'TABLE'}>
        <button
          type="button"
          class="btn btn-sm"
          onClick={() => setIsFolded(v => !v)}
        >
          {isFolded() ? 'Hide Columns' : 'Edit Columns'}
        </button>
      </Show>

      <button
        type="button"
        class="btn btn-icon btn-danger"
        onClick={props.onRemove}
        disabled={!props.canRemove}
        title="Remove field"
      >
        &times;
      </button>
    </div>
  );
};
