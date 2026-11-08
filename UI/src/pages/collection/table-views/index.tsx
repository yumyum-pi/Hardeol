import { createSignal, For, onMount, Show } from 'solid-js';
import { useParams, useNavigate } from '@solidjs/router';
import { api } from '../../../api/client';
import { TableView } from '../../../types/collection';
import Header from '../../../components/header';

export function TableViewsPage() {
  const params = useParams();
  const navigate = useNavigate();
  const name = () => params.name ?? '';

  const [views, setViews] = createSignal<TableView[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);

  const fetchViews = async () => {
    const response = await api.listViews(name());
    if (response.data) setViews(response.data);
  };

  onMount(async () => {
    setLoading(true);
    await fetchViews();
    setLoading(false);
  });

  function openEdit(viewID: number): void {
    navigate(`/collection/${name()}/table-views/${viewID}`);
  }

  function openCreate(): void {
    navigate(`/collection/${name()}/table-views/new`);
  }

  const handleDelete = async (view: TableView) => {
    if (!view.id) return;
    if (!confirm(`Delete table view "${view.name}"?`)) return;

    const response = await api.deleteView(name(), view.id);
    if (response.error) {
      setError(response.error);
    } else {
      fetchViews();
    }
  };

  return (
    <div class="table-views-page">
      <Header
        back={true}
        title={`Manage Table Views: ${name()}`}
      >
        <div class="form-actions">
          <button class="btn btn-primary" onClick={openCreate}>
            + New Table View
          </button>
        </div>
      </Header>

      <Show when={!loading()}>
        <div class="view-list">
          <Show when={error()}>
            <div class="error-banner">{error()}</div>
          </Show>
          <Show when={views().length === 0}>
            <p class="empty-text">No saved table views yet</p>
          </Show>
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>View Name</th>
                  <th>Default</th>
                  <th>Field Count</th>
                  <th class="">Actions</th>
                </tr>
              </thead>
              <tbody>
                <For each={views()}>
                  {(view) => (
                    <tr>
                      <td>
                        {view.name}
                      </td>
                      <td>
                        <Show when={view.is_default}>
                          <span class="default-badge">Default</span>
                        </Show>
                      </td>
                      <td>{view.fields.length} fields</td>
                      <td class="view-actions">
                        <button class="btn btn-sm" onClick={() => openEdit(view.id!)}>
                          Edit
                        </button>
                        <button class="btn btn-danger btn-sm" onClick={() => handleDelete(view)}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </div>
        </div>
      </Show>
    </div>
  );
}
