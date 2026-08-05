import { createSignal, createEffect, For, Show, Switch, Match } from 'solid-js';
import { createStore, produce } from 'solid-js/store';
import { useParams, useNavigate, useSearchParams, A } from '@solidjs/router';
import { api, Collection, SchemaField, TableView, Section, FieldType } from '../api/client';
import { ViewSelector } from './ViewSelector';
import { ViewManager } from './ViewManager';

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
  const name = () => params.name;
  const [records, setRecords] = createSignal<Record<string, unknown>[]>([]);
  const [columns, setColumns] = createSignal<string[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);
  const [showAddForm, setShowAddForm] = createSignal(false);
  const [newRecord, setNewRecord] = createStore<Record<string, string>>({});
  const [collection, setCollection] = createSignal<Collection | null>(null);
  const [editingRecord, setEditingRecord] = createSignal<Record<string, unknown> | null>(null);
  const [editFormData, setEditFormData] = createStore<Record<string, string>>({});
  const [views, setViews] = createSignal<TableView[]>([]);
  const [selectedViewId, setSelectedViewId] = createSignal<number | null>(null);
  const [showViewManager, setShowViewManager] = createSignal(false);
  const [collapsedSections, setCollapsedSections] = createStore<Record<number, boolean>>({});

  // Line items state for TABLE fields
  const [lineItems, setLineItems] = createStore<Record<string, LineItem[]>>({});
  const [newLineItems, setNewLineItems] = createStore<Record<string, LineItem[]>>({});

  const fetchRecords = async () => {
    setLoading(true);
    setError(null);
    const response = await api.listRecords(name());
    if (response.error) {
      setError(response.error);
    } else {
      const data = response.data || [];
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

  // Render form fields (for add/edit modals)
  const renderFormFields = (
    formData: Record<string, string>,
    setFormData: (key: string, value: string) => void,
    isNewRecord: boolean = false
  ) => {
    const sections = getSections();
    const hasTableFields = getTableFields().length > 0;

    // If no sections, render flat list
    if (sections.length === 0) {
      return (
        <>
          <For each={collection()?.fields.filter(f => f.name !== 'id' && f.type !== 'TABLE') || []}>
            {(field) => (
              <div class="form-group">
                <label>{field.name}{field.required ? ' *' : ''}</label>
                {renderFieldInput(field, formData[field.name] || '', (v) => setFormData(field.name, v))}
              </div>
            )}
          </For>
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

    return (
      <div class="record-sections">
        {/* Unsectioned fields */}
        <Show when={unsectionedFields.length > 0}>
          <div class="record-section">
            <div class="record-section-header">
              <h4 class="record-section-title">General</h4>
            </div>
            <div class="record-section-content">
              <For each={unsectionedFields}>
                {(field) => (
                  <div class="form-group">
                    <label>{field.name}{field.required ? ' *' : ''}</label>
                    {renderFieldInput(field, formData[field.name] || '', (v) => setFormData(field.name, v))}
                  </div>
                )}
              </For>
            </div>
          </div>
        </Show>

        {/* Sectioned fields */}
        <For each={sections}>
          {(section) => {
            const sectionFields = getFieldsForSection(section.id!).filter(f => f.type !== 'TABLE');
            const isCollapsed = collapsedSections[section.id!];

            return (
              <Show when={sectionFields.length > 0}>
                <div class="record-section">
                  <div class="record-section-header" onClick={() => section.id && toggleSection(section.id)}>
                    <span class="collapse-icon">{isCollapsed ? '>' : 'v'}</span>
                    <h4 class="record-section-title">{section.name}</h4>
                  </div>
                  <Show when={!isCollapsed}>
                    <div class="record-section-content">
                      <For each={sectionFields}>
                        {(field) => (
                          <div class="form-group">
                            <label>{field.name}{field.required ? ' *' : ''}</label>
                            {renderFieldInput(field, formData[field.name] || '', (v) => setFormData(field.name, v))}
                          </div>
                        )}
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

  createEffect(() => {
    const currentName = name();
    if (currentName) {
      fetchRecords();
      fetchViews();
    }
  });

  return (
    <div class="collection-view">
      <header class="page-header">
        <div class="header-left">
          <A href="/" class="btn btn-text">
            &larr; Back
          </A>
          <h2>{name()}</h2>
        </div>
        <div class="header-actions">
          <ViewSelector
            views={views()}
            selectedViewId={selectedViewId()}
            onSelect={handleViewSelect}
            onManage={() => setShowViewManager(true)}
          />
          <Show when={collection()}>
            <A href={`/collection/${name()}/edit`} class="btn">
              Edit Schema
            </A>
          </Show>
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
          <div class="modal" onClick={(e) => e.stopPropagation()} style="max-width: 640px;">
            <h3>Add Record</h3>
            <form onSubmit={handleAddRecord}>
              {renderFormFields(newRecord, (k, v) => setNewRecord(k, v), true)}
              <div class="form-actions">
                <button type="button" class="btn" onClick={() => setShowAddForm(false)}>
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
        <div class="modal-overlay" onClick={() => setEditingRecord(null)}>
          <div class="modal" onClick={(e) => e.stopPropagation()} style="max-width: 640px;">
            <h3>Edit Record (ID: {editingRecord()?.id as number})</h3>
            <form onSubmit={handleEditRecord}>
              {renderFormFields(editFormData, (k, v) => setEditFormData(k, v), false)}
              <div class="form-actions">
                <button type="button" class="btn" onClick={() => setEditingRecord(null)}>
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
    </div>
  );
}
