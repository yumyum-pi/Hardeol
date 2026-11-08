import { createSignal, For, Show } from 'solid-js';
import { SchemaField } from '../../../types/collection';
import { FieldRowState, FormViewFieldRow } from './form-view-field-row';
import { FormViewTableColumns } from './form-view-table-columns';

export interface FormViewSectionGroup {
  id: number | null;
  name: string;
  fields: SchemaField[];
}

type FormViewSectionProps = {
  group: FormViewSectionGroup;
  fieldConfigs: Record<string, FieldRowState>;
  onUpdateField: <K extends keyof FieldRowState>(fieldName: string, key: K, value: FieldRowState[K]) => void;
  moveField: (fieldName: string, direction: 'up' | 'down') => void;

  expandedTableFields: Record<string, boolean>;
  toggleTableExpanded: (fieldName: string) => void;
  tableColumnConfigs: Record<string, Record<string, FieldRowState>>;
  onUpdateTableColumn: <K extends keyof FieldRowState>(fieldName: string, columnName: string, key: K, value: FieldRowState[K]) => void;
  moveTableColumn: (fieldName: string, columnName: string, direction: 'up' | 'down') => void;
};

// A collapsible section of fields, mirroring the collection schema editor's
// section layout, with a bulk show/hide-all toggle for the whole section.
export function FormViewSection(props: FormViewSectionProps) {
  const [isFolded, setIsFolded] = createSignal(false);

  const allVisible = () => props.group.fields.every(f => props.fieldConfigs[f.name]?.visible ?? true);

  const toggleAllVisible = (visible: boolean) => {
    props.group.fields.forEach(f => props.onUpdateField(f.name, 'visible', visible));
  };

  return (
    <div class="form-section">
      <div class="section-header-row">
        <div class="section-title-row" onClick={() => setIsFolded(v => !v)}>
          <span class="collapse-icon">{isFolded() ? '▶' : '▼'}</span>
          <span class="section-name-input-inline">{props.group.name}</span>
          <span class="field-count">({props.group.fields.length} fields)</span>
        </div>
        <div class="section-actions">
          <label class="checkbox-label" onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={allVisible()}
              onChange={(e) => toggleAllVisible(e.currentTarget.checked)}
            />
            Show section
          </label>
        </div>
      </div>

      <Show when={!isFolded()}>
        <div class="section-fields">
          <div class="field-config-table">
            <div class="field-config-header">
              <span class="fc-visible">Show</span>
              <span class="fc-name">Field</span>
              <span class="fc-label">Label Override</span>
              <span class="fc-placeholder">Placeholder</span>
              <span class="fc-width">Width</span>
              <span class="fc-readonly">Read-Only</span>
              <span class="fc-order">Order</span>
              <span class="fc-columns"></span>
            </div>
            <For each={props.group.fields}>
              {(field, index) => (
                <>
                  <FormViewFieldRow
                    field={field}
                    config={props.fieldConfigs[field.name]}
                    onUpdate={(key, value) => props.onUpdateField(field.name, key, value)}
                    onMoveUp={() => props.moveField(field.name, 'up')}
                    onMoveDown={() => props.moveField(field.name, 'down')}
                    canMoveUp={index() !== 0}
                    canMoveDown={index() !== props.group.fields.length - 1}
                    showColumnsToggle={field.type === 'TABLE'}
                    isColumnsExpanded={props.expandedTableFields[field.name] ?? false}
                    onToggleColumns={() => props.toggleTableExpanded(field.name)}
                  />
                  <Show when={field.type === 'TABLE' && (props.expandedTableFields[field.name] ?? false)}>
                    <FormViewTableColumns
                      field={field}
                      columnConfigs={props.tableColumnConfigs[field.name] ?? {}}
                      onUpdateColumn={(columnName, key, value) => props.onUpdateTableColumn(field.name, columnName, key, value)}
                      moveColumn={(columnName, direction) => props.moveTableColumn(field.name, columnName, direction)}
                    />
                  </Show>
                </>
              )}
            </For>
          </div>
          <Show when={props.group.fields.length === 0}>
            <p class="form-hint">No fields in this section.</p>
          </Show>
        </div>
      </Show>
    </div>
  );
}
