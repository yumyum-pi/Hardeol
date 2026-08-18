import { createSignal, createEffect, Show, onMount } from 'solid-js';
import { useParams, A } from '@solidjs/router';
import { api } from '../../../api/client';
import { TableView } from '../../../types/collection';
import { useCollectionData } from '../../../hooks/useCollectionData';
import Header from '../../../components/header';
import CollectionTableView from '../../../components/table-view';

export function CollectionView() {
  const params = useParams();
  const name = () => params.name ?? '';

  const { collection, fetchCollection, getTableFields } = useCollectionData(name);

  const [records, setRecords] = createSignal<Record<string, unknown>[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);
  const [isCollection, setIsCollection] = createSignal(false);
  const [views, setViews] = createSignal<TableView[]>([]);
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
    }
    setLoading(false);
  };

  const fetchViews = async () => {
    const response = await api.listViews(name());
    if (response.data) {
      setViews(response.data);
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
        <Header
          back={true}
          title={name()}
        >
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
        </Header>
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
          <CollectionTableView
            views={views()}
            getTableFields={getTableFields()}
            collection={collection()}
            records={records()}
            actionFn={(index) => {
              const record = records()[index];
              return (
                <>
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
                </>
              );
            }}
          />
        </Show>
      </Show>
    </div>
  );
}
