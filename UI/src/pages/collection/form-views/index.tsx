import { createSignal, For, onMount, Show } from 'solid-js';
import { useParams, useNavigate } from '@solidjs/router';
import { api } from '../../../api/client';
import { ActionType, FormView } from '../../../types/collection';
import Header from '../../../components/header';

export function FormViewsPage() {
  const params = useParams();
  const navigate = useNavigate();
  const name = () => params.name ?? '';

  const [views, setViews] = createSignal<FormView[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);

  const fetchFormViews = async () => {
    const response = await api.listFormViews(name());
    if (response.data) setViews(response.data);
  };


  onMount(async () => {
    setLoading(true);
    await Promise.all([fetchFormViews()]);
    setLoading(false);
  });


  const getActionTypeLabel = (at: ActionType) => {
    switch (at) {
      case 'CREATE': return 'Create Only';
      case 'UPDATE': return 'Update Only';
      case 'ALL': return 'Both';
    }
  };

  function openEdit(viewID: number): void {
    navigate(`/collection/${name()}/form-views/${viewID}`)
  }

  function openCreate(): void {
    navigate(`/collection/${name()}/form-views/new`)
  }

  const handleDelete = async (view: FormView) => {
    if (!view.id) return;
    if (!confirm(`Delete form view "${view.name}"?`)) return;

    const response = await api.deleteFormView(name(), view.id);
    if (response.error) {
      setError(response.error);
    } else {
      fetchFormViews();
    }
  };

  return (
    <div class="form-views-page">
      <Header
        back={true}
        title={`Manage Form Views: ${name()}`}
      >

        <div class="form-actions">
          <button class="btn btn-primary" onClick={openCreate}>
            + New Form View
          </button>
        </div>
      </Header>

      <Show when={!loading()}>
        <div class=" view-list">
          <Show when={error()}>
            <div class="error-banner">{error()}</div>
          </Show>
          <Show when={views().length === 0}>
            <p class="empty-text">No saved form views yet</p>
          </Show>
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Form Name</th>
                  <th> Default</th>
                  <th>Action Type</th>
                  <th>Field Count</th>
                  <th class="">Actions</th>
                </tr>
              </thead>
              <tbody>
                <For each={views()}>
                  {(view) => (
                    <tr >
                      <td >
                        {view.name}
                      </td>
                      <td>
                        <Show when={view.is_default}>
                          <span class="default-badge">Default</span>
                        </Show>
                      </td>
                      <td >{getActionTypeLabel(view.action_type)}</td>
                      <td >{view.fields.filter(f => f.visible).length} fields</td>
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
