import { createSignal, onMount, Show } from 'solid-js';
import { useParams, useNavigate } from '@solidjs/router';
import { api } from '../../../api/client';
import { useCollectionData } from '../../../hooks/useCollectionData';
import { TableView } from '../../../types/collection';
import { ViewManager } from '../../ViewManager';

export function TableViewsPage() {
  const params = useParams();
  const navigate = useNavigate();
  const name = () => params.name ?? '';

  const { collection, fetchCollection } = useCollectionData(name);
  const [views, setViews] = createSignal<TableView[]>([]);
  const [loading, setLoading] = createSignal(true);

  const fetchViews = async () => {
    const response = await api.listViews(name());
    if (response.data) setViews(response.data);
  };

  onMount(async () => {
    setLoading(true);
    await Promise.all([fetchCollection(), fetchViews()]);
    setLoading(false);
  });

  const handleBack = () => navigate(`/collection/${name()}`);

  return (
    <div class="table-views-page">
      <header class="page-header">
        <div class="header-left">
          <button class="btn btn-text" onClick={handleBack}>
            &larr; Back
          </button>
          <h2>Manage Table Views: {name()}</h2>
        </div>
      </header>

      <Show when={!loading() && collection()}>
        <ViewManager
          collectionName={name()}
          schemaFields={collection()!.fields}
          views={views()}
          onClose={handleBack}
          onViewsChanged={fetchViews}
        />
      </Show>
    </div>
  );
}
