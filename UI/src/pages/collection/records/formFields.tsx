import { For, Match, Show, Switch } from "solid-js";
import { createStore } from "solid-js/store";
import { FormFieldWithConfig } from "../../../components/FieldInput";
import { Collection, FormActionType, FormFieldConfig, FormView, LineItem, SchemaField, Section, ValidationError } from "../../../types/collection";
import { getFieldErrors } from "../../../validation/validator";

type LineItemsTableProp = {
  field: SchemaField;
  isNewRecord: boolean;
  newLineItems: Record<string, LineItem[]>;
  lineItems: Record<string, LineItem[]>;
  // Per-column config from the active form view, if any
  columnConfigs?: FormFieldConfig[];

  addLineItem: (fieldName: string, isNewRecord: boolean) => void
  updateLineItem(name: string, index: number, key: string, value: unknown, isNewRecord: boolean): void;
  saveNewLineItem(name: string, index: number): void;
  deleteLineItem: (fieldName: string, index: number, isNewRecord: boolean) => void
}
const LineItemsTable = (props: LineItemsTableProp) => {
  const { field, isNewRecord, newLineItems, lineItems, columnConfigs, addLineItem, updateLineItem, saveNewLineItem, deleteLineItem } = props;
  if (!field.table_fields || field.table_fields.length === 0) return null;

  const getColumnConfig = (columnName: string): FormFieldConfig | undefined => {
    return columnConfigs?.find(c => c.name === columnName);
  };

  const columns = (): SchemaField[] => {
    const allColumns = field.table_fields ?? [];
    if (!columnConfigs) return allColumns;

    return [...allColumns]
      .filter(tf => getColumnConfig(tf.name)?.visible ?? true)
      .sort((a, b) => {
        const orderA = getColumnConfig(a.name)?.order ?? 999;
        const orderB = getColumnConfig(b.name)?.order ?? 999;
        return orderA - orderB;
      });
  };

  const items = () => isNewRecord ? (newLineItems[field.name] || []) : (lineItems[field.name] || []);

  return (
    <div class="line-items-section">
      <div class="line-items-header">
        <h4>{field.name}</h4>
        <button type="button" class="btn btn-sm" onClick={() => addLineItem(field.name, isNewRecord)}>
          + Add Row
        </button>
      </div>
      <table class="line-items-table">
        <thead>
          <tr>
            <For each={columns()}>
              {(tf) => <th>{getColumnConfig(tf.name)?.label || tf.name}</th>}
            </For>
            <th class="line-item-actions">Actions</th>
          </tr>
        </thead>
        <tbody>
          <For each={items()}>
            {(item, index) => (
              <tr>
                <For each={columns()}>
                  {(tf) => {
                    const colConfig = getColumnConfig(tf.name);
                    const placeholder = colConfig?.placeholder || '';
                    const isReadOnly = colConfig?.read_only ?? false;
                    return (
                      <td>
                        <Switch fallback={
                          <input
                            type="text"
                            value={String(item[tf.name] ?? '')}
                            onInput={(e) => updateLineItem(field.name, index(), tf.name, e.currentTarget.value, isNewRecord)}
                            onBlur={() => !isNewRecord && !item.id && saveNewLineItem(field.name, index())}
                            placeholder={placeholder}
                            disabled={isReadOnly}
                          />
                        }>
                          <Match when={tf.type === 'NUMBER'}>
                            <input
                              type="number"
                              value={String(item[tf.name] ?? '')}
                              onInput={(e) => updateLineItem(field.name, index(), tf.name, Number(e.currentTarget.value), isNewRecord)}
                              onBlur={() => !isNewRecord && !item.id && saveNewLineItem(field.name, index())}
                              placeholder={placeholder}
                              disabled={isReadOnly}
                            />
                          </Match>
                          <Match when={tf.type === 'BOOL'}>
                            <select
                              value={item[tf.name] ? 'true' : 'false'}
                              onChange={(e) => updateLineItem(field.name, index(), tf.name, e.currentTarget.value === 'true', isNewRecord)}
                              disabled={isReadOnly}
                            >
                              <option value="false">False</option>
                              <option value="true">True</option>
                            </select>
                          </Match>
                          <Match when={tf.type === 'SELECT'}>
                            <select
                              value={String(item[tf.name] ?? '')}
                              onChange={(e) => updateLineItem(field.name, index(), tf.name, e.currentTarget.value, isNewRecord)}
                              disabled={isReadOnly}
                            >
                              <option value="">-- Select --</option>
                              <For each={tf.select_options || []}>
                                {(opt) => <option value={opt}>{opt}</option>}
                              </For>
                            </select>
                          </Match>
                          <Match when={tf.type === 'DATE'}>
                            <input
                              type="date"
                              value={String(item[tf.name] ?? '')}
                              onInput={(e) => updateLineItem(field.name, index(), tf.name, e.currentTarget.value, isNewRecord)}
                              onBlur={() => !isNewRecord && !item.id && saveNewLineItem(field.name, index())}
                              disabled={isReadOnly}
                            />
                          </Match>
                        </Switch>
                      </td>
                    );
                  }}
                </For>
                <td class="line-item-actions">
                  <button
                    type="button"
                    class="btn btn-icon btn-danger btn-sm"
                    onClick={() => deleteLineItem(field.name, index(), isNewRecord)}
                  >
                    &times;
                  </button>
                </td>
              </tr>
            )}
          </For>
          <Show when={items().length === 0}>
            <tr>
              <td colspan={columns().length + 1} class="add-line-item-row">
                <button type="button" class="btn btn-sm" onClick={() => addLineItem(field.name, isNewRecord)}>
                  + Add First Row
                </button>
              </td>
            </tr>
          </Show>
        </tbody>
      </table>
    </div>
  );
};


type FormFieldProps = {
  formData: Record<string, string>,
  setFormData: (key: string, value: string) => void,
  isNewRecord: boolean,
  getSections: () => Section[],
  getFieldsForSection: (sectionId: number | null) => SchemaField[],
  getTableFields: () => SchemaField[],
  getActiveFormView: (actionType: FormActionType) => FormView | null;
  collection: Collection | null;
  lineItems: Record<string, LineItem[]>;
  newLineItems: Record<string, LineItem[]>;
  addLineItem: (fieldName: string, isNewRecord: boolean) => void
  updateLineItem: (fieldName: string, index: number, key: string, value: unknown, isNewRecord: boolean) => void;
  deleteLineItem: (fieldName: string, index: number, isNewRecord: boolean) => void;
  saveNewLineItem: (fieldName: string, index: number) => void;
  validationErrors: ValidationError[];
  isFieldRequired: (fieldName: string) => boolean;
}
// Render form fields (for add/edit modals)
export const FormFields = (props: FormFieldProps) => {

  const [collapsedSections, setCollapsedSections] = createStore<Record<number, boolean>>({});
  const {
    formData, setFormData, isNewRecord, getSections, getFieldsForSection, getTableFields, getActiveFormView, collection,
    lineItems, newLineItems, addLineItem, updateLineItem, deleteLineItem, saveNewLineItem, isFieldRequired,
  } = props;

  const toggleSection = (sectionId: number) => {
    setCollapsedSections(sectionId, !collapsedSections[sectionId]);
  };

  const sections = getSections();

  const actionType: FormActionType = isNewRecord ? 'CREATE' : 'UPDATE';

  // A function, not a precomputed value: Solid components run their body once,
  // so re-reading getActiveFormView() fresh on every call (from within JSX,
  // the only place Solid tracks reads) is what makes switching the selected
  // form view actually update the rendered fields.
  const activeView = () => getActiveFormView(actionType);

  // Get field config from the active form view
  const getFieldConfig = (fieldName: string): FormFieldConfig | null => {
    return activeView()?.fields.find(f => f.name === fieldName) || null;
  };

  const isFieldVisible = (fieldName: string): boolean => {
    const config = getFieldConfig(fieldName);
    // If no config, field is visible by default
    return config?.visible ?? true;
  };

  const visibleTableFields = () => getTableFields().filter(f => isFieldVisible(f.name));

  const getSortedFields = (fields: SchemaField[]): SchemaField[] => {
    const view = activeView();
    if (!view) return fields;

    // Sort by form view order
    return [...fields].sort((a, b) => {
      const configA = view.fields.find(f => f.name === a.name);
      const configB = view.fields.find(f => f.name === b.name);
      const orderA = configA?.order ?? 999;
      const orderB = configB?.order ?? 999;
      return orderA - orderB;
    });
  };

  const getFieldValidationErrors = (fieldName: string): ValidationError[] => {
    return getFieldErrors(props.validationErrors, fieldName);
  };

  // If no sections, render flat list with form grid
  if (sections.length === 0) {
    const allFields = collection?.fields.filter(f => f.name !== 'id' && f.type !== 'TABLE') || [];
    const visibleFields = () => getSortedFields(allFields).filter(f => isFieldVisible(f.name));

    return (
      <>
        <div class={activeView() ? 'form-grid' : ''}>
          <For each={visibleFields()}>
            {(field) => <FormFieldWithConfig field={field} formData={formData} setFormData={setFormData} isNewRecord={isNewRecord} config={getFieldConfig(field.name) ?? undefined} isRequired={isFieldRequired(field.name)} getFieldValidationErrors={getFieldValidationErrors} />}
          </For>
        </div>
        <Show when={visibleTableFields().length > 0}>
          <For each={visibleTableFields()}>
            {(field) => (
              <LineItemsTable
                field={field}
                isNewRecord={isNewRecord}
                newLineItems={newLineItems}
                lineItems={lineItems}
                columnConfigs={getFieldConfig(field.name)?.table_fields}

                addLineItem={addLineItem}
                updateLineItem={updateLineItem}
                saveNewLineItem={saveNewLineItem}
                deleteLineItem={deleteLineItem}

              />)}
          </For>
        </Show>
      </>
    );
  }


  const unsectionedFields = getFieldsForSection(null).filter(f => f.type !== 'TABLE');
  const visibleUnsectionedFields = () => getSortedFields(unsectionedFields).filter(f => isFieldVisible(f.name));

  return (
    <div class="record-sections">
      <Show when={visibleUnsectionedFields().length > 0}>
        <div class="record-section">
          <div class="record-section-header">
            <h4 class="record-section-title">General</h4>
          </div>
          <div class={`record-section-content ${activeView() ? 'form-grid' : ''}`}>
            <For each={visibleUnsectionedFields()}>
              {(field) => <FormFieldWithConfig field={field} formData={formData} setFormData={setFormData} isNewRecord={isNewRecord} config={getFieldConfig(field.name) ?? undefined} isRequired={isFieldRequired(field.name)} getFieldValidationErrors={getFieldValidationErrors} />}
            </For>
          </div>
        </div>
      </Show>

      <For each={sections}>
        {(section) => {
          const sectionFields = getFieldsForSection(section.id!).filter(f => f.type !== 'TABLE');
          const visibleSectionFields = () => getSortedFields(sectionFields).filter(f => isFieldVisible(f.name));
          const isCollapsed = () => collapsedSections[section.id!];

          return (
            <Show when={visibleSectionFields().length > 0}>
              <div class="record-section">
                <div class="record-section-header" onClick={() => section.id && toggleSection(section.id)}>
                  <span class="collapse-icon">{isCollapsed() ? '>' : 'v'}</span>
                  <h4 class="record-section-title">{section.name}</h4>
                </div>
                <Show when={!isCollapsed()}>
                  <div class={`record-section-content ${activeView() ? 'form-grid' : ''}`}>
                    <For each={visibleSectionFields()}>
                      {(field) => <FormFieldWithConfig field={field} formData={formData} setFormData={setFormData} isNewRecord={isNewRecord} config={getFieldConfig(field.name) ?? undefined} isRequired={isFieldRequired(field.name)} getFieldValidationErrors={getFieldValidationErrors} />}
                    </For>
                  </div>
                </Show>
              </div>
            </Show>
          );
        }}
      </For>

      {/* TABLE fields (always at the bottom) */}
      <Show when={visibleTableFields().length > 0}>
        <For each={visibleTableFields()}>
          {(field) => (
            <LineItemsTable
              field={field}
              isNewRecord={isNewRecord}
              newLineItems={newLineItems}
              lineItems={lineItems}
              columnConfigs={getFieldConfig(field.name)?.table_fields}

              addLineItem={addLineItem}
              updateLineItem={updateLineItem}
              saveNewLineItem={saveNewLineItem}
              deleteLineItem={deleteLineItem}

            />
          )}
        </For>
      </Show>
    </div>
  );
};
