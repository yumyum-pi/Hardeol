import { createSignal, onMount, Show } from 'solid-js';
import { useParams, useNavigate } from '@solidjs/router';
import { api } from '../../../api/client';
import { useCollectionData } from '../../../hooks/useCollectionData';
import { FormView } from '../../../types/collection';
import { FormViewManager } from './FormViewManager';

export function FormViewsPage() {
  const params = useParams();
  const navigate = useNavigate();
  const name = () => params.name ?? '';

  const { collection, fetchCollection } = useCollectionData(name);
  const [views, setViews] = createSignal<FormView[]>([]);
  const [loading, setLoading] = createSignal(true);

  const fetchFormViews = async () => {
    const response = await api.listFormViews(name());
    if (response.data) setViews(response.data);
  };

  onMount(async () => {
    setLoading(true);
    await Promise.all([fetchCollection(), fetchFormViews()]);
    setLoading(false);
  });

  const handleBack = () => navigate(`/collection/${name()}`);

  return (
    <div class="form-views-page">
      <header class="page-header">
        <div class="header-left">
          <button class="btn btn-text" onClick={handleBack}>
            &larr; Back
          </button>
          <h2>Manage Form Views: {name()}</h2>
        </div>
      </header>

      <Show when={!loading() && collection()}>
        <FormViewManager
          collectionName={name()}
          schemaFields={collection()!.fields}
          views={views()}
          onClose={handleBack}
          onViewsChanged={fetchFormViews}
        />
      </Show>
    </div>
  );
}
