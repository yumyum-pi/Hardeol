import { createSignal, Show } from 'solid-js';
import { Sidebar } from './components/Sidebar';
import { CollectionList } from './components/CollectionList';
import { CollectionView } from './components/CollectionView';
import { SchemaBuilder } from './components/SchemaBuilder';

export type View =
  | { type: 'collections' }
  | { type: 'collection'; name: string }
  | { type: 'schema'; collection?: Collection }
  | { type: 'new-collection' }
  | { type: 'edit-collection'; collection: Collection };

export interface SchemaField {
  id?: number;
  name: string;
  type: 'TEXT' | 'NUMBER' | 'BOOL' | 'EMAIL' | 'URL' | 'DATE' | 'SELECT' | 'JSON';
  required: boolean;
  select_options?: string[];
  collection_id?: number;
}

export interface Collection {
  id: number;
  name: string;
  fields: SchemaField[];
}

function App() {
  const [currentView, setCurrentView] = createSignal<View>({ type: 'collections' });
  const [collections, setCollections] = createSignal<Collection[]>([]);

  const refreshCollections = async () => {
    const response = await fetch('/api/collection');
    const data = await response.json();
    if (data.status === 200) {
      setCollections(data.data || []);
    }
  };

  return (
    <div class="app">
      <Sidebar
        collections={collections()}
        onNavigate={setCurrentView}
        onRefresh={refreshCollections}
        currentView={currentView()}
      />

      <main class="main-content">
        <Show when={currentView().type === 'collections'}>
          <CollectionList
            collections={collections}
            onRefresh={refreshCollections}
            onSelect={(name) => setCurrentView({ type: 'collection', name })}
            onNewCollection={() => setCurrentView({ type: 'new-collection' })}
          />
        </Show>

        <Show when={currentView().type === 'collection'}>
          <CollectionView
            name={(currentView() as { type: 'collection'; name: string }).name}
            onBack={() => setCurrentView({ type: 'collections' })}
            onEditSchema={(collection) => setCurrentView({ type: 'edit-collection', collection })}
          />
        </Show>

        <Show when={currentView().type === 'new-collection'}>
          <SchemaBuilder
            onSave={async () => {
              await refreshCollections();
              setCurrentView({ type: 'collections' });
            }}
            onCancel={() => setCurrentView({ type: 'collections' })}
          />
        </Show>

        <Show when={currentView().type === 'edit-collection'}>
          <SchemaBuilder
            collection={(currentView() as { type: 'edit-collection'; collection: Collection }).collection}
            onSave={async () => {
              await refreshCollections();
              setCurrentView({ type: 'collections' });
            }}
            onCancel={() => setCurrentView({ type: 'collections' })}
          />
        </Show>
      </main>
    </div>
  );
}

export default App;
