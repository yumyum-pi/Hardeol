import { createSignal, createEffect, For, Show, Switch, Match, onMount } from 'solid-js';
import { createStore, produce } from 'solid-js/store';
import { useParams, useNavigate, useSearchParams, A } from '@solidjs/router';
import { api, Collection, SchemaField, TableView, Section, FieldType, FormView, FormFieldConfig, ValidationProfile, ValidationError } from '../api/client';
import { ViewSelector } from './ViewSelector';
import { ViewManager } from './ViewManager';
import { FormViewSelector } from './FormViewSelector';
import { FormViewManager } from './FormViewManager';
import { ValidationProfileManager } from './ValidationProfileManager';
import { validateRecord, getFieldErrors, getCollectionErrors } from '../validation/validator';

interface LineItem {
  id?: number;
  parent_id?: number;
  row_order?: number;
  [key: string]: unknown;
}

export function CollectionView() {
  const params = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const name = () => params.name ?? '';
  const [records, setRecords] = createSignal<Record<string, unknown>[]>([]);
  const [columns, setColumns] = createSignal<string[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);
  const [isCollection, setIsCollection] = createSignal(false);
  const [showAddForm, setShowAddForm] = createSignal(false);
  const [newRecord, setNewRecord] = createStore<Record<string, string>>({});
  const [collection, setCollection] = createSignal<Collection | null>(null);
  const [editingRecord, setEditingRecord] = createSignal<Record<string, unknown> | null>(null);
  const [editFormData, setEditFormData] = createStore<Record<string, string>>({});
  const [views, setViews] = createSignal<TableView[]>([]);
  const [selectedViewId, setSelectedViewId] = createSignal<number | null>(null);
  const [showViewManager, setShowViewManager] = createSignal(false);
  const [collapsedSections, setCollapsedSections] = createStore<Record<number, boolean>>({});

  // Form view state
  const [formViews, setFormViews] = createSignal<FormView[]>([]);
  const [selectedCreateViewId, setSelectedCreateViewId] = createSignal<number | null>(null);
  const [selectedUpdateViewId, setSelectedUpdateViewId] = createSignal<number | null>(null);
  const [showFormViewManager, setShowFormViewManager] = createSignal(false);
  const [showOptionsMenu, setShowOptionsMenu] = createSignal(false);

  // Line items state for TABLE fields
  const [lineItems, setLineItems] = createStore<Record<string, LineItem[]>>({});
  const [newLineItems, setNewLineItems] = createStore<Record<string, LineItem[]>>({});

  // Validation state
  const [validationProfiles, setValidationProfiles] = createSignal<ValidationProfile[]>([]);
  const [validationErrors, setValidationErrors] = createSignal<ValidationError[]>([]);
  const [showValidationManager, setShowValidationManager] = createSignal(false);

  const fetchRecords = async () => {
    setLoading(true);
    setError(null);
    const response = await api.listRecords(name());
    if (response.error) {
      setError(response.error);
      setIsCollection(false)
    } else {
      const data = response.data || [];
      setIsCollection(true)
      setRecords(data);
      const colResponse = await api.listCollections();
      const col = colResponse.data?.find(c => c.name === name());
      if (col) {
        setCollection(col);
        // Filter out TABLE fields from columns (they're displayed separately)
        setColumns(col.fields.filter(f => f.type !== 'TABLE').map(f => f.name));
      } else if (data.length > 0) {
        setColumns(Object.keys(data[0]));
      }
    }
    setLoading(false);
  };

  const fetchViews = async () => {
    const response = await api.listViews(name());
    if (response.data) {
      setViews(response.data);
      const urlViewId = searchParams.view ? Number(searchParams.view) : null;
      if (urlViewId && response.data.some(v => v.id === urlViewId)) {
        setSelectedViewId(urlViewId);
      } else {
        const defaultView = response.data.find(v => v.is_default);
        if (defaultView?.id) {
          setSelectedViewId(defaultView.id);
          setSearchParams({ view: String(defaultView.id) });
        }
      }
    }
  };

  const handleViewSelect = (viewId: number | null) => {
    setSelectedViewId(viewId);
    if (viewId) {
      setSearchParams({ view: String(viewId) });
    } else {
      setSearchParams({ view: undefined });
    }
  };

  const fetchFormViews = async () => {
    const response = await api.listFormViews(name());
    if (response.data) {
      setFormViews(response.data);
      // Set default views for CREATE and UPDATE
      const createDefault = response.data.find(v => v.is_default && (v.action_type === 'CREATE' || v.action_type === 'ALL'));
      const updateDefault = response.data.find(v => v.is_default && (v.action_type === 'UPDATE' || v.action_type === 'ALL'));
      if (createDefault?.id) setSelectedCreateViewId(createDefault.id);
      if (updateDefault?.id) setSelectedUpdateViewId(updateDefault.id);
    }
  };

  const fetchValidationProfiles = async () => {
    const response = await api.listValidationProfiles(name());
    if (response.data) {
      setValidationProfiles(response.data);
    }
  };

  // Get active validation profiles for an action type
  const getActiveValidationProfiles = (actionType: 'CREATE' | 'UPDATE'): ValidationProfile[] => {
    return validationProfiles().filter(p =>
      p.is_active && (p.action_type === actionType || p.action_type === 'ALL')
    );
  };

  // Validate record data against active profiles
  const validateFormData = (formData: Record<string, string>, actionType: 'CREATE' | 'UPDATE'): ValidationError[] => {
    const col = collection();
    if (!col) return [];

    const profiles = getActiveValidationProfiles(actionType);
    if (profiles.length === 0) return [];

    // Build fields map
    const fieldsMap = new Map<string, SchemaField>();
    col.fields.forEach(f => fieldsMap.set(f.name, f));

    // Convert form data to proper types
    const data: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(formData)) {
      const field = fieldsMap.get(key);
      if (!field) {
        data[key] = value;
        continue;
      }
      switch (field.type) {
        case 'NUMBER':
          data[key] = value === '' ? 0 : Number(value);
          break;
        case 'BOOL':
          data[key] = value === 'true' || value === '1';
          break;
        default:
          data[key] = value;
      }
    }

    // Run validation against all active profiles
    let allErrors: ValidationError[] = [];
    for (const profile of profiles) {
      const result = validateRecord(
        {
          field_rules: profile.field_rules,
          section_rules: profile.section_rules,
          collection_rules: profile.collection_rules,
        },
        fieldsMap,
        data,
        actionType
      );
      allErrors = [...allErrors, ...result.errors];
    }

    return allErrors;
  };

  // Get field errors helper
  const getFieldValidationErrors = (fieldName: string): ValidationError[] => {
    return getFieldErrors(validationErrors(), fieldName);
  };

  // Get active form view for a given action type
  const getActiveFormView = (actionType: 'CREATE' | 'UPDATE'): FormView | null => {
    const viewId = actionType === 'CREATE' ? selectedCreateViewId() : selectedUpdateViewId();
    if (!viewId) return null;
    return formViews().find(v => v.id === viewId &&
      (v.action_type === actionType || v.action_type === 'ALL')) || null;
  };

  // Get field config from active form view
  const getFieldConfig = (fieldName: string, actionType: 'CREATE' | 'UPDATE'): FormFieldConfig | null => {
    const view = getActiveFormView(actionType);
    return view?.fields.find(f => f.name === fieldName) || null;
  };

  // Filter views by action type
  const getFormViewsForAction = (actionType: 'CREATE' | 'UPDATE') => {
    return formViews().filter(v => v.action_type === actionType || v.action_type === 'ALL');
  };

  const selectedView = () => views().find(v => v.id === selectedViewId());

  const displayColumns = () => {
    const view = selectedView();
    if (view && view.fields.length > 0) {
      const sortedFields = [...view.fields].sort((a, b) => a.order - b.order);
      // Filter out TABLE field columns
      const col = collection();
      if (col) {
        const tableFieldNames = col.fields.filter(f => f.type === 'TABLE').map(f => f.name);
        return sortedFields.filter(f => !tableFieldNames.includes(f.name)).map(f => f.name);
      }
      return sortedFields.map(f => f.name);
    }
    return columns();
  };

  const getColumnCssClass = (columnName: string): string => {
    const view = selectedView();
    if (view) {
      const field = view.fields.find(f => f.name === columnName);
      return field?.css_class || '';
    }
    return '';
  };

  // Get sections from collection
  const getSections = (): Section[] => {
    return collection()?.sections || [];
  };

  // Get fields for a specific section (null = unsectioned)
  const getFieldsForSection = (sectionId: number | null): SchemaField[] => {
    const col = collection();
    if (!col) return [];
    return col.fields.filter(f => {
      if (f.name === 'id') return false;
      if (sectionId === null) {
        return f.section_id === null || f.section_id === undefined;
      }
      return f.section_id === sectionId;
    });
  };

  // Get TABLE fields from collection
  const getTableFields = (): SchemaField[] => {
    return collection()?.fields.filter(f => f.type === 'TABLE') || [];
  };

  // Load line items for a record
  const loadLineItems = async (recordId: number) => {
    const tableFields = getTableFields();
    for (const field of tableFields) {
      const response = await api.listLineItems(name(), recordId, field.name);
      if (response.data) {
        setLineItems(field.name, response.data as LineItem[]);
      }
    }
  };

  // Toggle section collapse
  const toggleSection = (sectionId: number) => {
    setCollapsedSections(sectionId, !collapsedSections[sectionId]);
  };

  const handleAddRecord = async (e: Event) => {
    e.preventDefault();

    // Client-side validation first
    const errors = validateFormData(newRecord, 'CREATE');
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }
    setValidationErrors([]);

    const data: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(newRecord)) {
      if (key === 'id') continue;
      const field = getField(key);
      const fieldType = field?.type || 'TEXT';

      switch (fieldType) {
        case 'NUMBER':
          data[key] = value === '' ? 0 : Number(value);
          break;
        case 'BOOL':
          data[key] = value === 'true' || value === '1';
          break;
        default:
          data[key] = value;
      }
    }

    const response = await api.createRecord(name(), data);
    if (response.error) {
      setError(response.error);
    } else {
      const newRecordData = response.data;
      // Create line items for the new record
      if (newRecordData && newRecordData.id) {
        const tableFields = getTableFields();
        for (const field of tableFields) {
          const items = newLineItems[field.name] || [];
          for (const item of items) {
            if (Object.keys(item).some(k => k !== 'id' && k !== 'parent_id' && k !== 'row_order' && item[k])) {
              await api.createLineItem(name(), newRecordData.id as number, field.name, item);
            }
          }
        }
      }
      setShowAddForm(false);
      for (const key of Object.keys(newRecord)) {
        setNewRecord(key, undefined as unknown as string);
      }
      // Clear new line items
      for (const field of getTableFields()) {
        setNewLineItems(field.name, []);
      }
      await fetchRecords();
    }
  };

  const handleDelete = async (id: number | string) => {
    if (!confirm('Are you sure you want to delete this record?')) return;
    const response = await api.deleteRecord(name(), id);
    if (response.error) {
      setError(response.error);
    } else {
      await fetchRecords();
    }
  };

  const openEditForm = async (record: Record<string, unknown>) => {
    setEditingRecord(record);
    for (const [key, value] of Object.entries(record)) {
      if (key !== 'id') {
        setEditFormData(key, String(value ?? ''));
      }
    }
    // Load line items for this record
    if (record.id) {
      await loadLineItems(record.id as number);
    }
  };

  const handleEditRecord = async (e: Event) => {
    e.preventDefault();
    const record = editingRecord();
    if (!record) return;

    // Client-side validation first
    const errors = validateFormData(editFormData, 'UPDATE');
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }
    setValidationErrors([]);

    const data: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(editFormData)) {
      const field = getField(key);
      const fieldType = field?.type || 'TEXT';

      switch (fieldType) {
        case 'NUMBER':
          data[key] = value === '' ? 0 : Number(value);
          break;
        case 'BOOL':
          data[key] = value === 'true' || value === '1';
          break;
        default:
          data[key] = value;
      }
    }

    const response = await api.updateRecord(name(), record.id as number, data);
    if (response.error) {
      setError(response.error);
    } else {
      setEditingRecord(null);
      for (const key of Object.keys(editFormData)) {
        setEditFormData(key, undefined as unknown as string);
      }
      // Clear line items state
      for (const field of getTableFields()) {
        setLineItems(field.name, []);
      }
      await fetchRecords();
    }
  };

  const getField = (columnName: string): SchemaField | undefined => {
    return collection()?.fields.find(f => f.name === columnName);
  };

  // Line item handlers
  const addLineItem = (fieldName: string, isNewRecord: boolean = false) => {
    const field = getField(fieldName);
    if (!field || !field.table_fields) return;

    const newItem: LineItem = {};
    for (const tf of field.table_fields) {
      newItem[tf.name] = tf.type === 'NUMBER' ? 0 : tf.type === 'BOOL' ? false : '';
    }

    if (isNewRecord) {
      setNewLineItems(produce(items => {
        if (!items[fieldName]) items[fieldName] = [];
        items[fieldName].push(newItem);
      }));
    } else {
      setLineItems(produce(items => {
        if (!items[fieldName]) items[fieldName] = [];
        items[fieldName].push(newItem);
      }));
    }
  };

  const updateLineItem = async (fieldName: string, index: number, key: string, value: unknown, isNewRecord: boolean = false) => {
    if (isNewRecord) {
      setNewLineItems(fieldName, index, key, value);
    } else {
      setLineItems(fieldName, index, key, value);

      // Auto-save existing line items
      const item = lineItems[fieldName]?.[index];
      if (item?.id) {
        const recordId = editingRecord()?.id;
        if (recordId) {
          await api.updateLineItem(name(), recordId as number, fieldName, item.id, { [key]: value });
        }
      }
    }
  };

  const deleteLineItem = async (fieldName: string, index: number, isNewRecord: boolean = false) => {
    if (isNewRecord) {
      setNewLineItems(produce(items => {
        items[fieldName]?.splice(index, 1);
      }));
    } else {
      const item = lineItems[fieldName]?.[index];
      if (item?.id) {
        const recordId = editingRecord()?.id;
        if (recordId) {
          await api.deleteLineItem(name(), recordId as number, fieldName, item.id);
        }
      }
      setLineItems(produce(items => {
        items[fieldName]?.splice(index, 1);
      }));
    }
  };

  const saveNewLineItem = async (fieldName: string, index: number) => {
    const record = editingRecord();
    if (!record?.id) return;

    const item = lineItems[fieldName]?.[index];
    if (!item || item.id) return;

    const response = await api.createLineItem(name(), record.id as number, fieldName, item);
    if (response.data) {
      setLineItems(fieldName, index, response.data as LineItem);
    }
  };

  // Render field input
  const renderFieldInput = (
    field: SchemaField,
    value: string,
    onChange: (value: string) => void
  ) => {
    const fieldType = field.type;

    return (
      <Switch fallback={
        <input
          type="text"
          value={value}
          onInput={(e) => onChange(e.currentTarget.value)}
        />
      }>
        <Match when={fieldType === 'NUMBER'}>
          <input
            type="number"
            value={value}
            onInput={(e) => onChange(e.currentTarget.value)}
          />
        </Match>
        <Match when={fieldType === 'BOOL'}>
          <select
            value={value === 'true' || value === '1' ? 'true' : 'false'}
            onChange={(e) => onChange(e.currentTarget.value)}
          >
            <option value="false">False</option>
            <option value="true">True</option>
          </select>
        </Match>
        <Match when={fieldType === 'SELECT'}>
          <select
            value={value}
            onChange={(e) => onChange(e.currentTarget.value)}
          >
            <option value="">-- Select --</option>
            <For each={field.select_options || []}>
              {(option) => <option value={option}>{option}</option>}
            </For>
          </select>
        </Match>
        <Match when={fieldType === 'DATE'}>
          <input
            type="date"
            value={value}
            onInput={(e) => onChange(e.currentTarget.value)}
          />
        </Match>
        <Match when={fieldType === 'EMAIL'}>
          <input
            type="email"
            value={value}
            onInput={(e) => onChange(e.currentTarget.value)}
          />
        </Match>
        <Match when={fieldType === 'URL'}>
          <input
            type="url"
            placeholder="https://..."
            value={value}
            onInput={(e) => onChange(e.currentTarget.value)}
          />
        </Match>
        <Match when={fieldType === 'JSON'}>
          <textarea
            placeholder='{"key": "value"}'
            value={value}
            onInput={(e) => onChange(e.currentTarget.value)}
            rows={3}
          />
        </Match>
      </Switch>
    );
  };

  // Render line items table
  const renderLineItemsTable = (field: SchemaField, isNewRecord: boolean = false) => {
    if (!field.table_fields || field.table_fields.length === 0) return null;

    const items = isNewRecord ? (newLineItems[field.name] || []) : (lineItems[field.name] || []);

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
            <For each={items}>
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
            <Show when={items.length === 0}>
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

  // Render a single form field with form view config applied
  const renderFormFieldWithConfig = (
    field: SchemaField,
    formData: Record<string, string>,
    setFormData: (key: string, value: string) => void,
    isNewRecord: boolean
  ) => {
    const actionType = isNewRecord ? 'CREATE' : 'UPDATE';
    const config = getFieldConfig(field.name, actionType);

    // Skip hidden fields
    if (config && !config.visible) return null;

    const label = config?.label || field.name;
    const placeholder = config?.placeholder || '';
    const helpText = config?.help_text || '';
    const isReadOnly = config?.read_only ?? false;
    const widthClass = config?.width ? `width-${config.width}` : 'width-full';

    // Apply default value for new records
    const fieldValue = formData[field.name] || (isNewRecord && config?.default_value) || '';

    // Get field validation errors
    const fieldErrors = getFieldValidationErrors(field.name);
    const hasError = fieldErrors.length > 0;

    return (
      <div class={`form-group ${widthClass} ${hasError ? 'has-error' : ''}`}>
        <label>{label}{field.required ? ' *' : ''}</label>
        {renderFieldInputWithConfig(field, fieldValue, (v) => setFormData(field.name, v), placeholder, isReadOnly)}
        <Show when={helpText && !hasError}>
          <div class="form-help-text">{helpText}</div>
        </Show>
        <Show when={hasError}>
          <For each={fieldErrors}>
            {(err) => <div class="field-error">{err.message}</div>}
          </For>
        </Show>
      </div>
    );
  };

  // Render field input with placeholder and read-only support
  const renderFieldInputWithConfig = (
    field: SchemaField,
    value: string,
    onChange: (value: string) => void,
    placeholder: string = '',
    readOnly: boolean = false
  ) => {
    const fieldType = field.type;

    return (
      <Switch fallback={
        <input
          type="text"
          value={value}
          onInput={(e) => onChange(e.currentTarget.value)}
          placeholder={placeholder}
          disabled={readOnly}
        />
      }>
        <Match when={fieldType === 'NUMBER'}>
          <input
            type="number"
            value={value}
            onInput={(e) => onChange(e.currentTarget.value)}
            placeholder={placeholder}
            disabled={readOnly}
          />
        </Match>
        <Match when={fieldType === 'BOOL'}>
          <select
            value={value === 'true' || value === '1' ? 'true' : 'false'}
            onChange={(e) => onChange(e.currentTarget.value)}
            disabled={readOnly}
          >
            <option value="false">False</option>
            <option value="true">True</option>
          </select>
        </Match>
        <Match when={fieldType === 'SELECT'}>
          <select
            value={value}
            onChange={(e) => onChange(e.currentTarget.value)}
            disabled={readOnly}
          >
            <option value="">{placeholder || '-- Select --'}</option>
            <For each={field.select_options || []}>
              {(option) => <option value={option}>{option}</option>}
            </For>
          </select>
        </Match>
        <Match when={fieldType === 'DATE'}>
          <input
            type="date"
            value={value}
            onInput={(e) => onChange(e.currentTarget.value)}
            disabled={readOnly}
          />
        </Match>
        <Match when={fieldType === 'EMAIL'}>
          <input
            type="email"
            value={value}
            onInput={(e) => onChange(e.currentTarget.value)}
            placeholder={placeholder}
            disabled={readOnly}
          />
        </Match>
        <Match when={fieldType === 'URL'}>
          <input
            type="url"
            placeholder={placeholder || 'https://...'}
            value={value}
            onInput={(e) => onChange(e.currentTarget.value)}
            disabled={readOnly}
          />
        </Match>
        <Match when={fieldType === 'JSON'}>
          <textarea
            placeholder={placeholder || '{"key": "value"}'}
            value={value}
            onInput={(e) => onChange(e.currentTarget.value)}
            rows={3}
            disabled={readOnly}
          />
        </Match>
      </Switch>
    );
  };

  // Get fields sorted by form view order
  const getSortedFields = (fields: SchemaField[], isNewRecord: boolean): SchemaField[] => {
    const actionType = isNewRecord ? 'CREATE' : 'UPDATE';
    const view = getActiveFormView(actionType);

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

  // Check if a field should be visible based on form view config
  const isFieldVisible = (fieldName: string, isNewRecord: boolean): boolean => {
    const actionType = isNewRecord ? 'CREATE' : 'UPDATE';
    const config = getFieldConfig(fieldName, actionType);
    // If no config, field is visible by default
    return config?.visible ?? true;
  };

  // Render form fields (for add/edit modals)
  const renderFormFields = (
    formData: Record<string, string>,
    setFormData: (key: string, value: string) => void,
    isNewRecord: boolean = false
  ) => {
    const sections = getSections();
    const hasTableFields = getTableFields().length > 0;
    const actionType = isNewRecord ? 'CREATE' : 'UPDATE';
    const activeView = getActiveFormView(actionType);

    // If no sections, render flat list with form grid
    if (sections.length === 0) {
      const allFields = collection()?.fields.filter(f => f.name !== 'id' && f.type !== 'TABLE') || [];
      const sortedFields = getSortedFields(allFields, isNewRecord);
      const visibleFields = sortedFields.filter(f => isFieldVisible(f.name, isNewRecord));

      return (
        <>
          <div class={activeView ? 'form-grid' : ''}>
            <For each={visibleFields}>
              {(field) => renderFormFieldWithConfig(field, formData, setFormData, isNewRecord)}
            </For>
          </div>
          <Show when={hasTableFields}>
            <For each={getTableFields()}>
              {(field) => renderLineItemsTable(field, isNewRecord)}
            </For>
          </Show>
        </>
      );
    }

    // Render with sections
    const unsectionedFields = getFieldsForSection(null).filter(f => f.type !== 'TABLE');
    const sortedUnsectionedFields = getSortedFields(unsectionedFields, isNewRecord);
    const visibleUnsectionedFields = sortedUnsectionedFields.filter(f => isFieldVisible(f.name, isNewRecord));

    return (
      <div class="record-sections">
        {/* Unsectioned fields */}
        <Show when={visibleUnsectionedFields.length > 0}>
          <div class="record-section">
            <div class="record-section-header">
              <h4 class="record-section-title">General</h4>
            </div>
            <div class={`record-section-content ${activeView ? 'form-grid' : ''}`}>
              <For each={visibleUnsectionedFields}>
                {(field) => renderFormFieldWithConfig(field, formData, setFormData, isNewRecord)}
              </For>
            </div>
          </div>
        </Show>

        {/* Sectioned fields */}
        <For each={sections}>
          {(section) => {
            const sectionFields = getFieldsForSection(section.id!).filter(f => f.type !== 'TABLE');
            const sortedSectionFields = getSortedFields(sectionFields, isNewRecord);
            const visibleSectionFields = sortedSectionFields.filter(f => isFieldVisible(f.name, isNewRecord));
            const isCollapsed = collapsedSections[section.id!];

            return (
              <Show when={visibleSectionFields.length > 0}>
                <div class="record-section">
                  <div class="record-section-header" onClick={() => section.id && toggleSection(section.id)}>
                    <span class="collapse-icon">{isCollapsed ? '>' : 'v'}</span>
                    <h4 class="record-section-title">{section.name}</h4>
                  </div>
                  <Show when={!isCollapsed}>
                    <div class={`record-section-content ${activeView ? 'form-grid' : ''}`}>
                      <For each={visibleSectionFields}>
                        {(field) => renderFormFieldWithConfig(field, formData, setFormData, isNewRecord)}
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
            {(field) => renderLineItemsTable(field, isNewRecord)}
          </For>
        </Show>
      </div>
    );
  };
  onMount(() => {
    fetchRecords();
  });

  createEffect(() => {
    const currentName = name();
    const collection = isCollection();
    if (currentName && collection) {
      fetchRecords();
      fetchViews();
      fetchFormViews();
      fetchValidationProfiles();
    }
  });

  const NoCollectionView = () => {
    return (
      <div>No Collection Found</div>
    )
  }

  return (
    <div class="collection-view">
      <Show when={isCollection()} fallback={NoCollectionView()}>
        <header class="page-header">
          <div class="header-left">
            <A href="/" class="btn btn-text">
              {"back"}
            </A>
            <h2>{name()}</h2>
          </div>
          <div class="header-actions">
            <ViewSelector
              views={views()}
              selectedViewId={selectedViewId()}
              onSelect={handleViewSelect}
            />
            <div class="dropdown">
              <button class="btn" onClick={() => setShowOptionsMenu(!showOptionsMenu())}>
                Options
              </button>
              <Show when={showOptionsMenu()}>
                <div class="dropdown-menu" onClick={() => setShowOptionsMenu(false)}>
                  <button class="dropdown-item" onClick={() => setShowViewManager(true)}>
                    Manage Table Views
                  </button>
                  <button class="dropdown-item" onClick={() => setShowFormViewManager(true)}>
                    Manage Form Views
                  </button>
                  <button class="dropdown-item" onClick={() => setShowValidationManager(true)}>
                    Manage Validation
                  </button>
                  <Show when={collection()}>
                    <A href={`/collection/${name()}/edit`} class="dropdown-item">
                      Edit Schema
                    </A>
                  </Show>
                </div>
              </Show>
            </div>
            <button class="btn btn-primary" onClick={() => setShowAddForm(true)}>
              + Add Record
            </button>
          </div>
        </header>

        <Show when={error()}>
          <div class="error-banner">{error()}</div>
        </Show>

        <Show when={showAddForm()}>
          <div class="modal-overlay" onClick={() => setShowAddForm(false)}>
            <div class="modal" onClick={(e) => e.stopPropagation()} style="max-width: 720px;">
              <div class="modal-header-with-selector">
                <h3>Add Record</h3>
                <FormViewSelector
                  views={getFormViewsForAction('CREATE')}
                  selectedViewId={selectedCreateViewId()}
                  onSelect={setSelectedCreateViewId}
                />
              </div>
              <form onSubmit={handleAddRecord}>
                <Show when={validationErrors().length > 0 && getCollectionErrors(validationErrors()).length > 0}>
                  <div class="validation-error-banner">
                    <h4>Validation Errors</h4>
                    <ul class="validation-error-list">
                      <For each={getCollectionErrors(validationErrors())}>
                        {(err) => <li>{err.message}</li>}
                      </For>
                    </ul>
                  </div>
                </Show>
                {renderFormFields(newRecord, (k, v) => setNewRecord(k, v), true)}
                <div class="form-actions">
                  <button type="button" class="btn" onClick={() => { setShowAddForm(false); setValidationErrors([]); }}>
                    Cancel
                  </button>
                  <button type="submit" class="btn btn-primary">
                    Create
                  </button>
                </div>
              </form>
            </div>
          </div>
        </Show>

        <Show when={editingRecord()}>
          <div class="modal-overlay" onClick={() => { setEditingRecord(null); setValidationErrors([]); }}>
            <div class="modal" onClick={(e) => e.stopPropagation()} style="max-width: 720px;">
              <div class="modal-header-with-selector">
                <h3>Edit Record (ID: {editingRecord()?.id as number})</h3>
                <FormViewSelector
                  views={getFormViewsForAction('UPDATE')}
                  selectedViewId={selectedUpdateViewId()}
                  onSelect={setSelectedUpdateViewId}
                />
              </div>
              <form onSubmit={handleEditRecord}>
                <Show when={validationErrors().length > 0 && getCollectionErrors(validationErrors()).length > 0}>
                  <div class="validation-error-banner">
                    <h4>Validation Errors</h4>
                    <ul class="validation-error-list">
                      <For each={getCollectionErrors(validationErrors())}>
                        {(err) => <li>{err.message}</li>}
                      </For>
                    </ul>
                  </div>
                </Show>
                {renderFormFields(editFormData, (k, v) => setEditFormData(k, v), false)}
                <div class="form-actions">
                  <button type="button" class="btn" onClick={() => { setEditingRecord(null); setValidationErrors([]); }}>
                    Cancel
                  </button>
                  <button type="submit" class="btn btn-primary">
                    Save
                  </button>
                </div>
              </form>
            </div>
          </div>
        </Show>

        <Show when={loading()}>
          <div class="loading">Loading...</div>
        </Show>

        <Show when={!loading() && records().length === 0}>
          <div class="empty-state">
            <p>No records in this collection</p>
            <button class="btn btn-primary" onClick={() => setShowAddForm(true)}>
              Add your first record
            </button>
          </div>
        </Show>

        <Show when={!loading() && records().length > 0}>
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <For each={displayColumns()}>
                    {(column) => <th class={getColumnCssClass(column)}>{column}</th>}
                  </For>
                  <th class="actions-col">Actions</th>
                </tr>
              </thead>
              <tbody>
                <For each={records()}>
                  {(record) => (
                    <tr>
                      <For each={displayColumns()}>
                        {(column) => <td class={getColumnCssClass(column)}>{String(record[column] ?? '')}</td>}
                      </For>
                      <td class="actions-col">
                        <button
                          class="btn btn-sm"
                          onClick={() => openEditForm(record)}
                        >
                          Edit
                        </button>
                        <button
                          class="btn btn-danger btn-sm"
                          onClick={() => handleDelete(record.id as number)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </div>
        </Show>

        <Show when={showViewManager() && collection()}>
          <ViewManager
            collectionName={name()}
            schemaFields={collection()!.fields}
            views={views()}
            onClose={() => setShowViewManager(false)}
            onViewsChanged={() => {
              fetchViews();
              setShowViewManager(false);
            }}
          />
        </Show>

        <Show when={showFormViewManager() && collection()}>
          <FormViewManager
            collectionName={name()}
            schemaFields={collection()!.fields}
            views={formViews()}
            onClose={() => setShowFormViewManager(false)}
            onViewsChanged={() => {
              fetchFormViews();
              setShowFormViewManager(false);
            }}
          />
        </Show>

        <Show when={showValidationManager() && collection()}>
          <ValidationProfileManager
            collectionName={name()}
            schemaFields={collection()!.fields}
            sections={collection()!.sections || []}
            profiles={validationProfiles()}
            onClose={() => setShowValidationManager(false)}
            onProfilesChanged={() => {
              fetchValidationProfiles();
              setShowValidationManager(false);
            }}
          />
        </Show>
      </Show>
    </div>
  );
}
