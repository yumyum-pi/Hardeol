import { For, Show } from 'solid-js';
import { SchemaField } from '../../../types/collection';
import { FieldRowState, FormViewFieldRow } from './form-view-field-row';

type FormViewTableColumnsProps = {
  field: SchemaField;
  columnConfigs: Record<string, FieldRowState>;
  onUpdateColumn: <K extends keyof FieldRowState>(columnName: string, key: K, value: FieldRowState[K]) => void;
  moveColumn: (columnName: string, direction: 'up' | 'down') => void;
};

// Lists the nested columns (table_fields) of a TABLE-type schema field, letting
// each column get its own visibility/label/placeholder/width/read-only config
// just like a top-level field.
export function FormViewTableColumns(props: FormViewTableColumnsProps) {
  const columns = () => {
    return [...(props.field.table_fields ?? [])].sort((a, b) => {
      const orderA = props.columnConfigs[a.name]?.order ?? 0;
      const orderB = props.columnConfigs[b.name]?.order ?? 0;
      return orderA - orderB;
    });
  };

  return (
    <div class="table-field-editor">
      <div class="table-field-header">
        <h4>Columns for "{props.field.name}"</h4>
      </div>
      <div class="field-config-table">
        <For each={columns()}>
          {(column, index) => (
            <FormViewFieldRow
              field={column}
              config={props.columnConfigs[column.name]}
              onUpdate={(key, value) => props.onUpdateColumn(column.name, key, value)}
              onMoveUp={() => props.moveColumn(column.name, 'up')}
              onMoveDown={() => props.moveColumn(column.name, 'down')}
              canMoveUp={index() !== 0}
              canMoveDown={index() !== columns().length - 1}
            />
          )}
        </For>
      </div>
      <Show when={columns().length === 0}>
        <p class="form-hint">This TABLE field has no columns defined.</p>
      </Show>
    </div>
  );
}
