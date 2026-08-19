import { createSignal, createEffect, createMemo, on, Show, onMount, untrack } from 'solid-js';
import { useParams, A } from '@solidjs/router';
import { api } from '../../../api/client';
import { TableView } from '../../../types/collection';
import { useCollectionData } from '../../../hooks/useCollectionData';
import Header from '../../../components/header';
import CollectionTableView from '../../../components/table-view';
import { QuickFilterFieldConfig, QuickFilters } from '../../../components/quick-filters';
import { buildQuickFilterRules, isQuickFilterable, QuickFilterState, QuickFilterValue } from '../../../utils/quickFilters';

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

  const [selectedViewId, setSelectedViewId] = createSignal<number | null>(null);
  const [userSelectedView, setUserSelectedView] = createSignal(false);
  const [quickFilterValues, setQuickFilterValues] = createSignal<QuickFilterState>({});

  // Default to the collection's default view until the user picks one explicitly.
  createEffect(() => {
    if (!userSelectedView()) {
      const defaultView = views().find(v => v.is_default);
      setSelectedViewId(defaultView?.id ?? null);
    }
  });

  const handleSelectView = (viewId: number | null) => {
    setUserSelectedView(true);
    setSelectedViewId(viewId);
  };

  // Table-level filter: hidden, non-editable, baked into the selected view.
  const activeFilters = createMemo(() => views().find(v => v.id === selectedViewId())?.filters ?? []);

  // Fields eligible for a user-level quick-filter widget: explicitly enabled via the
  // selected view's `visible_filters` list (opt-in, admin-controlled — "All Fields"
  // mode has no view to hold this list, so it shows none, same as it has no "Show"
  // list for columns either).
  const quickFilterFieldConfigs = createMemo(() => {
    const view = views().find(v => v.id === selectedViewId());
    if (!view || !view.visible_filters || view.visible_filters.length === 0) return [];
    const schemaByName = new Map(collection()?.fields.map(f => [f.name, f]) ?? []);
    return [...view.visible_filters]
      .sort((a, b) => a.order - b.order)
      .map((vf): QuickFilterFieldConfig | null => {
        const field = schemaByName.get(vf.name);
        return field && isQuickFilterable(field.type) ? { field, cssClass: vf.css_class } : null;
      })
      .filter((c): c is QuickFilterFieldConfig => c !== null);
  });

  const quickFilterSchemaFields = createMemo(() => quickFilterFieldConfigs().map(c => c.field));

  const quickFilterRules = createMemo(() => buildQuickFilterRules(quickFilterSchemaFields(), quickFilterValues()));

  // AND-only merge: table-level filter first, user quick filters appended.
  const combinedFilters = createMemo(() => [...activeFilters(), ...quickFilterRules()]);

  const handleQuickFilterChange = (fieldName: string, value: QuickFilterValue | undefined) => {
    setQuickFilterValues(prev => {
      const next = { ...prev };
      if (value === undefined) {
        delete next[fieldName];
      } else {
        next[fieldName] = value;
      }
      return next;
    });
  };

  const fetchRecords = async () => {
    setLoading(true);
    setError(null);
    // untrack: combinedFilters is a derived memo (ultimately reads collection(), which
    // gets a fresh reference from every fetchCollection() call below); reading it
    // reactively here would make whichever effect calls fetchRecords() re-fire on
    // every fetch, causing an infinite refetch loop. Refetch timing is driven
    // explicitly by the effects below instead.
    const [recordsResponse] = await Promise.all([api.listRecords(name(), untrack(combinedFilters)), fetchCollection()]);
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

  // Switching views changes which fields are even visible, so a quick filter left
  // over from the previous view could silently reapply later (e.g. on "All Fields").
  createEffect(on(selectedViewId, () => {
    setQuickFilterValues({});
  }, { defer: true }));

  // Refetch whenever the user-controlled filter inputs change. Deliberately tracks
  // selectedViewId/quickFilterValues (stable signals) rather than the combinedFilters
  // memo itself — that memo transitively reads collection(), which gets a new object
  // reference on every fetch, so tracking it directly would refetch forever.
  createEffect(on([selectedViewId, quickFilterValues], () => {
    if (isCollection()) fetchRecords();
  }, { defer: true }));

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

        <Show when={isCollection()}>
          <QuickFilters
            fields={quickFilterFieldConfigs()}
            values={quickFilterValues()}
            onChange={handleQuickFilterChange}
            onClear={() => setQuickFilterValues({})}
          />
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
            selectedViewId={selectedViewId()}
            onSelectView={handleSelectView}
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
