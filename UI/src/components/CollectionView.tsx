import { createSignal, onMount, For, Show } from 'solid-js';
import { api } from '../api/client';

interface CollectionViewProps {
  name: string;
  onBack: () => void;
}

export function CollectionView(props: CollectionViewProps) {
  const [records, setRecords] = createSignal<Record<string, unknown>[]>([]);
  const [columns, setColumns] = createSignal<string[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);
  const [showAddForm, setShowAddForm] = createSignal(false);
  const [newRecord, setNewRecord] = createSignal<Record<string, string>>({});

  const fetchRecords = async () => {
    setLoading(true);
    setError(null);
    const response = await api.listRecords(props.name);
    if (response.error) {
      setError(response.error);
    } else {
      const data = response.data || [];
      setRecords(data);
      if (data.length > 0) {
        setColumns(Object.keys(data[0]));
      } else {
        // Fetch collection schema to get columns
        const colResponse = await api.listCollections();
        const collection = colResponse.data?.find(c => c.name === props.name);
        if (collection) {
          setColumns(collection.fields.map(f => f.name));
        }
      }
    }
    setLoading(false);
  };

  const handleAddRecord = async (e: Event) => {
    e.preventDefault();
    const data: Record<string, unknown> = {};

    // Convert string values to appropriate types
    for (const [key, value] of Object.entries(newRecord())) {
      if (key === 'id') continue;
      // Try to parse as number
      const num = Number(value);
      data[key] = isNaN(num) ? value : num;
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
        <button class="btn btn-primary" onClick={() => setShowAddForm(true)}>
          + Add Record
        </button>
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
                    <input
                      type="text"
                      value={newRecord()[column] || ''}
                      onInput={(e) =>
                        setNewRecord({ ...newRecord(), [column]: e.currentTarget.value })
                      }
                    />
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
