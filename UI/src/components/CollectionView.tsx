import { createSignal, onMount, For, Show, JSX } from 'solid-js';
import { api, Collection, SchemaField } from '../api/client';

interface CollectionViewProps {
  name: string;
  onBack: () => void;
  onEditSchema?: (collection: Collection) => void;
}

export function CollectionView(props: CollectionViewProps) {
  const [records, setRecords] = createSignal<Record<string, unknown>[]>([]);
  const [columns, setColumns] = createSignal<string[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);
  const [showAddForm, setShowAddForm] = createSignal(false);
  const [newRecord, setNewRecord] = createSignal<Record<string, string>>({});
  const [collection, setCollection] = createSignal<Collection | null>(null);
  const [editingRecord, setEditingRecord] = createSignal<Record<string, unknown> | null>(null);
  const [editFormData, setEditFormData] = createSignal<Record<string, string>>({});

  const fetchRecords = async () => {
    setLoading(true);
    setError(null);
    const response = await api.listRecords(props.name);
    if (response.error) {
      setError(response.error);
    } else {
      const data = response.data || [];
      setRecords(data);
      // Fetch collection schema to get columns and store collection for editing
      const colResponse = await api.listCollections();
      const col = colResponse.data?.find(c => c.name === props.name);
      if (col) {
        setCollection(col);
        setColumns(col.fields.map(f => f.name));
      } else if (data.length > 0) {
        setColumns(Object.keys(data[0]));
      }
    }
    setLoading(false);
  };

  const handleAddRecord = async (e: Event) => {
    e.preventDefault();
    const data: Record<string, unknown> = {};

    // Convert string values to appropriate types based on field type
    for (const [key, value] of Object.entries(newRecord())) {
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
        case 'JSON':
          try {
            data[key] = value ? JSON.parse(value) : null;
          } catch {
            data[key] = value;
          }
          break;
        default:
          data[key] = value;
      }
    }

    const response = await api.createRecord(props.name, data);
    if (response.error) {
      setError(response.error);
    } else {
      setShowAddForm(false);
      setNewRecord({});
      await fetchRecords();
    }
  };

  const handleDelete = async (id: number | string) => {
    if (!confirm('Are you sure you want to delete this record?')) return;

    const response = await api.deleteRecord(props.name, id);
    if (response.error) {
      setError(response.error);
    } else {
      await fetchRecords();
    }
  };

  const openEditForm = (record: Record<string, unknown>) => {
    setEditingRecord(record);
    // Convert all values to strings for the form
    const formData: Record<string, string> = {};
    for (const [key, value] of Object.entries(record)) {
      if (key !== 'id') {
        formData[key] = String(value ?? '');
      }
    }
    setEditFormData(formData);
  };

  const handleEditRecord = async (e: Event) => {
    e.preventDefault();
    const record = editingRecord();
    if (!record) return;

    const data: Record<string, unknown> = {};

    // Convert string values to appropriate types based on field type
    for (const [key, value] of Object.entries(editFormData())) {
      const field = getField(key);
      const fieldType = field?.type || 'TEXT';

      switch (fieldType) {
        case 'NUMBER':
          data[key] = value === '' ? 0 : Number(value);
          break;
        case 'BOOL':
          data[key] = value === 'true' || value === '1';
          break;
        case 'JSON':
          try {
            data[key] = value ? JSON.parse(value) : null;
          } catch {
            data[key] = value;
          }
          break;
        default:
          data[key] = value;
      }
    }

    const response = await api.updateRecord(props.name, record.id as number, data);
    if (response.error) {
      setError(response.error);
    } else {
      setEditingRecord(null);
      setEditFormData({});
      await fetchRecords();
    }
  };

  // Get field definition by column name
  const getField = (columnName: string): SchemaField | undefined => {
    return collection()?.fields.find(f => f.name === columnName);
  };

  // Render appropriate input based on field type
  const renderInput = (
    column: string,
    value: string,
    onChange: (value: string) => void
  ): JSX.Element => {
    const field = getField(column);
    const fieldType = field?.type || 'TEXT';

    switch (fieldType) {
      case 'NUMBER':
        return (
          <input
            type="number"
            value={value}
            onInput={(e) => onChange(e.currentTarget.value)}
          />
        );
      case 'BOOL':
        return (
          <select
            value={value === 'true' || value === '1' ? 'true' : 'false'}
            onChange={(e) => onChange(e.currentTarget.value)}
          >
            <option value="false">False</option>
            <option value="true">True</option>
          </select>
        );
      case 'SELECT':
        return (
          <select
            value={value}
            onChange={(e) => onChange(e.currentTarget.value)}
          >
            <option value="">-- Select --</option>
            <For each={field?.select_options || []}>
              {(option) => <option value={option}>{option}</option>}
            </For>
          </select>
        );
      case 'DATE':
        return (
          <input
            type="date"
            value={value}
            onInput={(e) => onChange(e.currentTarget.value)}
          />
        );
      case 'EMAIL':
        return (
          <input
            type="email"
            value={value}
            onInput={(e) => onChange(e.currentTarget.value)}
          />
        );
      case 'URL':
        return (
          <input
            type="url"
            value={value}
            placeholder="https://..."
            onInput={(e) => onChange(e.currentTarget.value)}
          />
        );
      case 'JSON':
        return (
          <textarea
            value={value}
            placeholder='{"key": "value"}'
            onInput={(e) => onChange(e.currentTarget.value)}
            rows={3}
          />
        );
      default: // TEXT
        return (
          <input
            type="text"
            value={value}
            onInput={(e) => onChange(e.currentTarget.value)}
          />
        );
    }
  };

  onMount(fetchRecords);

  return (
    <div class="collection-view">
      <header class="page-header">
        <div class="header-left">
          <button class="btn btn-text" onClick={props.onBack}>
            &larr; Back
          </button>
          <h2>{props.name}</h2>
        </div>
        <div class="header-actions">
          <Show when={props.onEditSchema && collection()}>
            <button
              class="btn"
              onClick={() => props.onEditSchema?.(collection()!)}
            >
              Edit Schema
            </button>
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
                {(column) => (
                  <div class="form-group">
                    <label>{column}</label>
                    {renderInput(
                      column,
                      newRecord()[column] || '',
                      (value) => setNewRecord({ ...newRecord(), [column]: value })
                    )}
                  </div>
                )}
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
                {(column) => (
                  <div class="form-group">
                    <label>{column}</label>
                    {renderInput(
                      column,
                      editFormData()[column] || '',
                      (value) => setEditFormData({ ...editFormData(), [column]: value })
                    )}
                  </div>
                )}
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
                <For each={columns()}>
                  {(column) => <th>{column}</th>}
                </For>
                <th class="actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              <For each={records()}>
                {(record) => (
                  <tr>
                    <For each={columns()}>
                      {(column) => <td>{String(record[column] ?? '')}</td>}
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
    </div>
  );
}
