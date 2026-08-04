import { createSignal, createEffect, For, Show, Switch, Match } from 'solid-js';
import { createStore } from 'solid-js/store';
import { useParams, useNavigate, useSearchParams, A } from '@solidjs/router';
import { api, Collection, SchemaField, TableView } from '../api/client';
import { ViewSelector } from './ViewSelector';
import { ViewManager } from './ViewManager';

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

  const fetchRecords = async () => {
    setLoading(true);
    setError(null);
    const response = await api.listRecords(name());
    if (response.error) {
      setError(response.error);
    } else {
      const data = response.data || [];
      setRecords(data);
      // Fetch collection schema to get columns and store collection for editing
      const colResponse = await api.listCollections();
      const col = colResponse.data?.find(c => c.name === name());
      if (col) {
        setCollection(col);
        setColumns(col.fields.map(f => f.name));
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
      // If URL has view param, use it; otherwise use default view if exists
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

  // Get the currently selected view
  const selectedView = () => views().find(v => v.id === selectedViewId());

  // Get display columns based on selected view or all columns
  const displayColumns = () => {
    const view = selectedView();
    if (view && view.fields.length > 0) {
      // Sort by order and return field names
      const sortedFields = [...view.fields].sort((a, b) => a.order - b.order);
      return sortedFields.map(f => f.name);
    }
    return columns();
  };

  // Get CSS class for a column from the selected view
  const getColumnCssClass = (columnName: string): string => {
    const view = selectedView();
    if (view) {
      const field = view.fields.find(f => f.name === columnName);
      return field?.css_class || '';
    }
    return '';
  };

  const handleAddRecord = async (e: Event) => {
    e.preventDefault();
    const data: Record<string, unknown> = {};

    // Convert string values to appropriate types based on field type
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
          // TEXT, EMAIL, URL, DATE, SELECT, JSON - all stored as strings
          data[key] = value;
      }
    }

    const response = await api.createRecord(name(), data);
    if (response.error) {
      setError(response.error);
    } else {
      setShowAddForm(false);
      // Reset all fields
      for (const key of Object.keys(newRecord)) {
        setNewRecord(key, undefined as unknown as string);
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

  const openEditForm = (record: Record<string, unknown>) => {
    setEditingRecord(record);
    // Convert all values to strings for the form
    for (const [key, value] of Object.entries(record)) {
      if (key !== 'id') {
        setEditFormData(key, String(value ?? ''));
      }
    }
  };

  const handleEditRecord = async (e: Event) => {
    e.preventDefault();
    const record = editingRecord();
    if (!record) return;

    const data: Record<string, unknown> = {};

    // Convert string values to appropriate types based on field type
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
          // TEXT, EMAIL, URL, DATE, SELECT, JSON - all stored as strings
          data[key] = value;
      }
    }

    const response = await api.updateRecord(name(), record.id as number, data);
    if (response.error) {
      setError(response.error);
    } else {
      setEditingRecord(null);
      // Reset all fields
      for (const key of Object.keys(editFormData)) {
        setEditFormData(key, undefined as unknown as string);
      }
      await fetchRecords();
    }
  };

  // Get field definition by column name
  const getField = (columnName: string): SchemaField | undefined => {
    return collection()?.fields.find(f => f.name === columnName);
  };

  // Refetch when collection name changes
  createEffect(() => {
    const currentName = name(); // Track the name parameter
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
          <div class="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Add Record</h3>
            <form onSubmit={handleAddRecord}>
              <For each={columns().filter(c => c !== 'id')}>
                {(column) => {
                  const field = () => getField(column);
                  const fieldType = () => field()?.type || 'TEXT';
                  return (
                    <div class="form-group">
                      <label>{column}</label>
                      <Switch fallback={
                        <input
                          type="text"
                          value={newRecord[column] || ''}
                          onInput={(e) => setNewRecord(column, e.currentTarget.value)}
                        />
                      }>
                        <Match when={fieldType() === 'NUMBER'}>
                          <input
                            type="number"
                            value={newRecord[column] || ''}
                            onInput={(e) => setNewRecord(column, e.currentTarget.value)}
                          />
                        </Match>
                        <Match when={fieldType() === 'BOOL'}>
                          <select
                            value={newRecord[column] === 'true' || newRecord[column] === '1' ? 'true' : 'false'}
                            onChange={(e) => setNewRecord(column, e.currentTarget.value)}
                          >
                            <option value="false">False</option>
                            <option value="true">True</option>
                          </select>
                        </Match>
                        <Match when={fieldType() === 'SELECT'}>
                          <select
                            value={newRecord[column] || ''}
                            onChange={(e) => setNewRecord(column, e.currentTarget.value)}
                          >
                            <option value="">-- Select --</option>
                            <For each={field()?.select_options || []}>
                              {(option) => <option value={option}>{option}</option>}
                            </For>
                          </select>
                        </Match>
                        <Match when={fieldType() === 'DATE'}>
                          <input
                            type="date"
                            value={newRecord[column] || ''}
                            onInput={(e) => setNewRecord(column, e.currentTarget.value)}
                          />
                        </Match>
                        <Match when={fieldType() === 'EMAIL'}>
                          <input
                            type="email"
                            value={newRecord[column] || ''}
                            onInput={(e) => setNewRecord(column, e.currentTarget.value)}
                          />
                        </Match>
                        <Match when={fieldType() === 'URL'}>
                          <input
                            type="url"
                            placeholder="https://..."
                            value={newRecord[column] || ''}
                            onInput={(e) => setNewRecord(column, e.currentTarget.value)}
                          />
                        </Match>
                        <Match when={fieldType() === 'JSON'}>
                          <textarea
                            placeholder='{"key": "value"}'
                            value={newRecord[column] || ''}
                            onInput={(e) => setNewRecord(column, e.currentTarget.value)}
                            rows={3}
                          />
                        </Match>
                      </Switch>
                    </div>
                  );
                }}
              </For>
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
          <div class="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Edit Record (ID: {editingRecord()?.id as number})</h3>
            <form onSubmit={handleEditRecord}>
              <For each={columns().filter(c => c !== 'id')}>
                {(column) => {
                  const field = () => getField(column);
                  const fieldType = () => field()?.type || 'TEXT';
                  return (
                    <div class="form-group">
                      <label>{column}</label>
                      <Switch fallback={
                        <input
                          type="text"
                          value={editFormData[column] || ''}
                          onInput={(e) => setEditFormData(column, e.currentTarget.value)}
                        />
                      }>
                        <Match when={fieldType() === 'NUMBER'}>
                          <input
                            type="number"
                            value={editFormData[column] || ''}
                            onInput={(e) => setEditFormData(column, e.currentTarget.value)}
                          />
                        </Match>
                        <Match when={fieldType() === 'BOOL'}>
                          <select
                            value={editFormData[column] === 'true' || editFormData[column] === '1' ? 'true' : 'false'}
                            onChange={(e) => setEditFormData(column, e.currentTarget.value)}
                          >
                            <option value="false">False</option>
                            <option value="true">True</option>
                          </select>
                        </Match>
                        <Match when={fieldType() === 'SELECT'}>
                          <select
                            value={editFormData[column] || ''}
                            onChange={(e) => setEditFormData(column, e.currentTarget.value)}
                          >
                            <option value="">-- Select --</option>
                            <For each={field()?.select_options || []}>
                              {(option) => <option value={option}>{option}</option>}
                            </For>
                          </select>
                        </Match>
                        <Match when={fieldType() === 'DATE'}>
                          <input
                            type="date"
                            value={editFormData[column] || ''}
                            onInput={(e) => setEditFormData(column, e.currentTarget.value)}
                          />
                        </Match>
                        <Match when={fieldType() === 'EMAIL'}>
                          <input
                            type="email"
                            value={editFormData[column] || ''}
                            onInput={(e) => setEditFormData(column, e.currentTarget.value)}
                          />
                        </Match>
                        <Match when={fieldType() === 'URL'}>
                          <input
                            type="url"
                            placeholder="https://..."
                            value={editFormData[column] || ''}
                            onInput={(e) => setEditFormData(column, e.currentTarget.value)}
                          />
                        </Match>
                        <Match when={fieldType() === 'JSON'}>
                          <textarea
                            placeholder='{"key": "value"}'
                            value={editFormData[column] || ''}
                            onInput={(e) => setEditFormData(column, e.currentTarget.value)}
                            rows={3}
                          />
                        </Match>
                      </Switch>
                    </div>
                  );
                }}
              </For>
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
