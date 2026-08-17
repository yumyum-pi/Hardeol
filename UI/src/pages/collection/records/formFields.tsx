import { createSignal, For, Match, Show, Switch } from "solid-js";
import { createStore } from "solid-js/store";
import { FormFieldWithConfig } from "../../../components/FieldInput";
import { Collection, FormActionType, FormFieldConfig, FormView, LineItem, SchemaField, Section, ValidationError } from "../../../types/collection";
import { getFieldErrors } from "../../../validation/validator";

type LineItemsTableProp = {
  field: SchemaField;
  isNewRecord: boolean;
  newLineItems: Record<string, LineItem[]>;
  lineItems: Record<string, LineItem[]>;

  addLineItem: (fieldName: string, isNewRecord: boolean) => void
  updateLineItem(name: string, index: number, key: string, value: unknown, isNewRecord: boolean): void;
  saveNewLineItem(name: string, index: number): void;
  deleteLineItem: (fieldName: string, index: number, isNewRecord: boolean) => void
}
const LineItemsTable = (props: LineItemsTableProp) => {
  const { field, isNewRecord, newLineItems, lineItems, addLineItem, updateLineItem, saveNewLineItem, deleteLineItem } = props;
  if (!field.table_fields || field.table_fields.length === 0) return null;

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
            <For each={field.table_fields}>
              {(tf) => <th>{tf.name}</th>}
            </For>
            <th class="line-item-actions">Actions</th>
          </tr>
        </thead>
        <tbody>
          <For each={items()}>
            {(item, index) => (
              <tr>
                <For each={field.table_fields}>
                  {(tf) => (
                    <td>
                      <Switch fallback={
                        <input
                          type="text"
                          value={String(item[tf.name] ?? '')}
                          onInput={(e) => updateLineItem(field.name, index(), tf.name, e.currentTarget.value, isNewRecord)}
                          onBlur={() => !isNewRecord && !item.id && saveNewLineItem(field.name, index())}
                        />
                      }>
                        <Match when={tf.type === 'NUMBER'}>
                          <input
                            type="number"
                            value={String(item[tf.name] ?? '')}
                            onInput={(e) => updateLineItem(field.name, index(), tf.name, Number(e.currentTarget.value), isNewRecord)}
                            onBlur={() => !isNewRecord && !item.id && saveNewLineItem(field.name, index())}
                          />
                        </Match>
                        <Match when={tf.type === 'BOOL'}>
                          <select
                            value={item[tf.name] ? 'true' : 'false'}
                            onChange={(e) => updateLineItem(field.name, index(), tf.name, e.currentTarget.value === 'true', isNewRecord)}
                          >
                            <option value="false">False</option>
                            <option value="true">True</option>
                          </select>
                        </Match>
                        <Match when={tf.type === 'SELECT'}>
                          <select
                            value={String(item[tf.name] ?? '')}
                            onChange={(e) => updateLineItem(field.name, index(), tf.name, e.currentTarget.value, isNewRecord)}
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
                          />
                        </Match>
                      </Switch>
                    </td>
                  )}
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
              <td colspan={field.table_fields.length + 1} class="add-line-item-row">
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
}
// Render form fields (for add/edit modals)
export const FormFields = (props: FormFieldProps) => {

  const [validationErrors, setValidationErrors] = createSignal<ValidationError[]>([]);
  const [collapsedSections, setCollapsedSections] = createStore<Record<number, boolean>>({});
  const {
    formData, setFormData, isNewRecord, getSections, getFieldsForSection, getTableFields, getActiveFormView, collection,
    lineItems, newLineItems, addLineItem, updateLineItem, deleteLineItem, saveNewLineItem,
  } = props;

  const toggleSection = (sectionId: number) => {
    setCollapsedSections(sectionId, !collapsedSections[sectionId]);
  };

  const sections = getSections();
  const hasTableFields = getTableFields().length > 0;

  const actionType: FormActionType = isNewRecord ? 'CREATE' : 'UPDATE';
  const activeView = getActiveFormView(actionType);

  // Get field config from the active form view
  const getFieldConfig = (fieldName: string): FormFieldConfig | null => {
    return activeView?.fields.find(f => f.name === fieldName) || null;
  };


  const getSortedFields = (fields: SchemaField[]): SchemaField[] => {

    if (!activeView) return fields;

    // Sort by form view order
    return [...fields].sort((a, b) => {
      const configA = activeView.fields.find(f => f.name === a.name);
      const configB = activeView.fields.find(f => f.name === b.name);
      const orderA = configA?.order ?? 999;
      const orderB = configB?.order ?? 999;
      return orderA - orderB;
    });
  };

  const isFieldVisible = (fieldName: string): boolean => {
    const config = getFieldConfig(fieldName);
    // If no config, field is visible by default
    return config?.visible ?? true;
  };


  const getFieldValidationErrors = (fieldName: string): ValidationError[] => {
    return getFieldErrors(validationErrors(), fieldName);
  };

  // If no sections, render flat list with form grid
  if (sections.length === 0) {
    const allFields = collection?.fields.filter(f => f.name !== 'id' && f.type !== 'TABLE') || [];
    const sortedFields = getSortedFields(allFields);
    const visibleFields = sortedFields.filter(f => isFieldVisible(f.name));

    return (
      <>
        <div class={activeView ? 'form-grid' : ''}>
          <For each={visibleFields}>
            {(field) => <FormFieldWithConfig field={field} formData={formData} setFormData={setFormData} isNewRecord={isNewRecord} getFieldValidationErrors={getFieldValidationErrors} />}
          </For>
        </div>
        <Show when={hasTableFields}>
          <For each={getTableFields()}>
            {(field) => (
              <LineItemsTable
                field={field}
                isNewRecord={isNewRecord}
                newLineItems={newLineItems}
                lineItems={lineItems}

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
  const sortedUnsectionedFields = getSortedFields(unsectionedFields);
  const visibleUnsectionedFields = sortedUnsectionedFields.filter(f => isFieldVisible(f.name));

  return (
    <div class="record-sections">
      <Show when={visibleUnsectionedFields.length > 0}>
        <div class="record-section">
          <div class="record-section-header">
            <h4 class="record-section-title">General</h4>
          </div>
          <div class={`record-section-content ${activeView ? 'form-grid' : ''}`}>
            <For each={visibleUnsectionedFields}>
              {(field) => <FormFieldWithConfig field={field} formData={formData} setFormData={setFormData} isNewRecord={isNewRecord} getFieldValidationErrors={getFieldValidationErrors} />}
            </For>
          </div>
        </div>
      </Show>

      <For each={sections}>
        {(section) => {
          const sectionFields = getFieldsForSection(section.id!).filter(f => f.type !== 'TABLE');
          const sortedSectionFields = getSortedFields(sectionFields);
          const visibleSectionFields = sortedSectionFields.filter(f => isFieldVisible(f.name));
          const isCollapsed = () => collapsedSections[section.id!];

          return (
            <Show when={visibleSectionFields.length > 0}>
              <div class="record-section">
                <div class="record-section-header" onClick={() => section.id && toggleSection(section.id)}>
                  <span class="collapse-icon">{isCollapsed() ? '>' : 'v'}</span>
                  <h4 class="record-section-title">{section.name}</h4>
                </div>
                <Show when={!isCollapsed()}>
                  <div class={`record-section-content ${activeView ? 'form-grid' : ''}`}>
                    <For each={visibleSectionFields}>
                      {(field) => <FormFieldWithConfig field={field} formData={formData} setFormData={setFormData} isNewRecord={isNewRecord} getFieldValidationErrors={getFieldValidationErrors} />}
                    </For>
                  </div>
                </Show>
              </div>
            </Show>
          );
        }}
      </For>

      {/* TABLE fields (always at the bottom) */}
      <Show when={hasTableFields}>
        <For each={getTableFields()}>
          {(field) => (
            <LineItemsTable
              field={field}
              isNewRecord={isNewRecord}
              newLineItems={newLineItems}
              lineItems={lineItems}

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
