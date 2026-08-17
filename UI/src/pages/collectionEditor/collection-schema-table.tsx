import { For, Show } from "solid-js";
import { Field } from "../../types/collection"
import { SchemaFieldEditor } from "./collection-editor-field";

type SchemaTableFieldEditorProps = {
  field: Field, sectionIndex: number,
  fieldIndex: number

  isTableFolded: boolean;

  removeTableField(sectionIndex: number, fieldIndex: number, index: number): void;
  updateTableField(sectionIndex: number, fieldIndex: number, index: number, key: string, value: unknown): void;
  addTableField(sectionIndex: number, fieldIndex: number): void;
}
export const SchemaTableFieldEditor = (props: SchemaTableFieldEditorProps) => {
  if (!props.field || props.field.type !== 'TABLE') return null;

  return (
    <div class="table-field-editor">
      <div class="table-field-header">
        <h4>Columns for "{props.field.name || 'Unnamed Table'}"</h4>
        <button type="button" class="btn btn-sm" onClick={() => props.addTableField(props.sectionIndex, props.fieldIndex)}>
          + Add Column
        </button>
      </div>
      <div class="table-fields-list">
        <For each={props.field.table_fields || []}>
          {(tableField, idx) => {
            return (
              <SchemaFieldEditor
                field={tableField}
                onUpdate={(key, value) => props.updateTableField(props.sectionIndex, props.fieldIndex, idx(), key, value)}
                onRemove={() => props.removeTableField(props.sectionIndex, props.fieldIndex, idx())}
                canRemove={(props.field.table_fields?.length || 0) > 1}
                isTableFolded={false}
              />
            );
          }
          }
        </For>
      </div>
      <Show when={!props.field.table_fields || props.field.table_fields.length === 0}>
        <p class="form-hint">No columns defined. Add at least one column.</p>
      </Show>
    </div>
  );
}

