import { createSignal, createEffect, createMemo, For, Show, onMount } from 'solid-js';
import { useParams, useSearchParams, A } from '@solidjs/router';
import { api } from '../../../api/client';
import { TableView } from '../../../types/collection';
import { ViewSelector } from '../../ViewSelector';
import { useCollectionData } from '../../../hooks/useCollectionData';

export function CollectionView() {
  const params = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const name = () => params.name ?? '';

  const { collection, fetchCollection, getTableFields } = useCollectionData(name);

  const [records, setRecords] = createSignal<Record<string, unknown>[]>([]);
  const [columns, setColumns] = createSignal<string[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);
  const [isCollection, setIsCollection] = createSignal(false);
  const [views, setViews] = createSignal<TableView[]>([]);
  const [selectedViewId, setSelectedViewId] = createSignal<number | null>(null);
  const [showOptionsMenu, setShowOptionsMenu] = createSignal(false);

  const fetchRecords = async () => {
    setLoading(true);
    setError(null);
    const [recordsResponse] = await Promise.all([api.listRecords(name()), fetchCollection()]);
    if (recordsResponse.error) {
      setError(recordsResponse.error);
      setIsCollection(false);
    } else {
      const data = recordsResponse.data || [];
      setIsCollection(true);
      setRecords(data);
      if (collection()) {
        // Filter out TABLE fields from columns (they're displayed separately)
        setColumns(collection()!.fields.filter(f => f.type !== 'TABLE').map(f => f.name));
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

  const displayColumns = createMemo(() => {
    const view = selectedView();
    if (view && view.fields.length > 0) {
      const sortedFields = [...view.fields].sort((a, b) => a.order - b.order);
      // Filter out TABLE field columns
      const tableFieldNames = getTableFields().map(f => f.name);
      return sortedFields.filter(f => !tableFieldNames.includes(f.name)).map(f => f.name);
    }
    return columns();
  });

  // Column name -> css class, rebuilt only when the selected view changes
  const columnCssClasses = createMemo(() => {
    const view = selectedView();
    const map = new Map<string, string>();
    view?.fields.forEach(f => map.set(f.name, f.css_class || ''));
    return map;
  });

  const getColumnCssClass = (columnName: string): string => {
    return columnCssClasses().get(columnName) || '';
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

  onMount(() => {
    fetchRecords();
  });

  createEffect(() => {
    const currentName = name();
    const collectionLoaded = isCollection();
    if (currentName && collectionLoaded) {
      fetchRecords();
      fetchViews();
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
                  <A href={`/collection/${name()}/table-views`} class="dropdown-item">
                    Manage Table Views
                  </A>
                  <A href={`/collection/${name()}/form-views`} class="dropdown-item">
                    Manage Form Views
                  </A>
                  <A href={`/collection/${name()}/manage-validation`} class="dropdown-item">
                    Manage Validation
                  </A>
                  <Show when={collection()}>
                    <A href={`/collection/${name()}/edit-schema`} class="dropdown-item">
                      Edit Schema
                    </A>
                  </Show>
                </div>
              </Show>
            </div>
            <A href={`/collection/${name()}/records/new`} class="btn btn-primary">
              + Add Record
            </A>
          </div>
        </header>

        <Show when={error()}>
          <div class="error-banner">{error()}</div>
        </Show>

        <Show when={loading()}>
          <div class="loading">Loading...</div>
        </Show>

        <Show when={!loading() && records().length === 0}>
          <div class="empty-state">
            <p>No records in this collection</p>
            <A href={`/collection/${name()}/records/new`} class="btn btn-primary">
              Add your first record
            </A>
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
                        <A
                          class="btn btn-sm"
                          href={`/collection/${name()}/records/${record.id}/edit`}
                        >
                          Edit
                        </A>
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
      </Show>
    </div>
  );
}
