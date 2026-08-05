import { createSignal, onMount, Show } from 'solid-js';
import { Route, useNavigate, useParams } from '@solidjs/router';
import { Sidebar } from './components/Sidebar';
import { CollectionList } from './components/CollectionList';
import { CollectionView } from './components/CollectionView';
import { SchemaBuilder } from './components/SchemaBuilder';
import { api } from './api/client';

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

// Page components
function HomePage() {
  const [collections, setCollections] = createSignal<Collection[]>([]);
  const navigate = useNavigate();

  const refreshCollections = async () => {
    const response = await api.listCollections();
    if (response.data) {
      setCollections(response.data);
    }
  };

  onMount(refreshCollections);

  return (
    <CollectionList
      collections={collections}
      onRefresh={refreshCollections}
      onSelect={(name) => navigate(`/collection/${name}`)}
      onNewCollection={() => navigate('/new')}
    />
  );
}

function CollectionPage() {
  const params = useParams();
  const navigate = useNavigate();

  return (
    <CollectionView
      name={params.name}
      onBack={() => navigate('/')}
      onEditSchema={(collection) => navigate(`/collection/${collection.name}/edit`)}
    />
  );
}

function NewCollectionPage() {
  const navigate = useNavigate();

  return (
    <SchemaBuilder
      onSave={() => navigate('/')}
      onCancel={() => navigate('/')}
    />
  );
}

function EditCollectionPage() {
  const params = useParams();
  const navigate = useNavigate();
  const [collection, setCollection] = createSignal<Collection | null>(null);

  onMount(async () => {
    const response = await api.listCollections();
    const col = response.data?.find(c => c.name === params.name);
    if (col) setCollection(col);
  });

  return (
    <Show when={collection()}>
      <SchemaBuilder
        collection={collection()!}
        onSave={() => navigate(`/collection/${params.name}`)}
        onCancel={() => navigate(`/collection/${params.name}`)}
      />
    </Show>
  );
}

// Layout component
function Layout(props: { children?: any }) {
  const [collections, setCollections] = createSignal<Collection[]>([]);

  const refreshCollections = async () => {
    const response = await api.listCollections();
    if (response.data) {
      setCollections(response.data);
    }
  };

  onMount(refreshCollections);

  return (
    <div class="app">
      <Sidebar
        collections={collections()}
        onRefresh={refreshCollections}
      />
      <main class="main-content">
        {props.children}
      </main>
    </div>
  );
}

function App() {
  return (
    <>
      <Route path="/" component={HomePage} />
      <Route path="/collection/:name" component={CollectionPage} />
      <Route path="/new" component={NewCollectionPage} />
      <Route path="/collection/:name/edit" component={EditCollectionPage} />
    </>
  );
}

export default App;
