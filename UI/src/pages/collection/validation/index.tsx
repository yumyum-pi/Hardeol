import { createSignal, onMount, Show } from 'solid-js';
import { useParams, useNavigate } from '@solidjs/router';
import { api } from '../../../api/client';
import { useCollectionData } from '../../../hooks/useCollectionData';
import { ValidationProfile } from '../../../types/collection';
import { ValidationProfileManager } from '../../ValidationProfileManager';
import Header from '../../../components/header';

export function ValidationPage() {
  const params = useParams();
  const navigate = useNavigate();
  const name = () => params.name ?? '';

  const { collection, fetchCollection, getSections } = useCollectionData(name);
  const [profiles, setProfiles] = createSignal<ValidationProfile[]>([]);
  const [loading, setLoading] = createSignal(true);

  const fetchValidationProfiles = async () => {
    const response = await api.listValidationProfiles(name());
    if (response.data) setProfiles(response.data);
  };

  onMount(async () => {
    setLoading(true);
    await Promise.all([fetchCollection(), fetchValidationProfiles()]);
    setLoading(false);
  });

  const handleBack = () => navigate(`/collection/${name()}`);

  return (
    <div class="validation-page">
      <Header
        back={true}
        title={`Manage Validation: ${name()}`}
      />

      <Show when={!loading() && collection()}>
        <ValidationProfileManager
          collectionName={name()}
          schemaFields={collection()!.fields}
          sections={getSections()}
          profiles={profiles()}
          onClose={handleBack}
          onProfilesChanged={fetchValidationProfiles}
        />
      </Show>
    </div>
  );
}
