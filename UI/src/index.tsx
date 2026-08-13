import { render } from 'solid-js/web';
import { Router, Route } from '@solidjs/router';
import { createSignal, onMount } from 'solid-js';
import { Sidebar } from './components/Sidebar';
import { CollectionList } from './pages/CollectionList';
import { CollectionView } from './pages/CollectionView';
import { CollectionEditor } from './pages/collectionEditor';
import { api, Collection } from './api/client';
import './styles/global.css';

// Layout component with sidebar
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

// Home page component
function HomePage() {
  const [collections, setCollections] = createSignal<Collection[]>([]);

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
    />
  );
}

const root = document.getElementById('root');

if (root) {
  render(() => (
    <Router root={Layout}>
      <Route path="/" component={HomePage} />
      <Route path="/collection/:name" component={CollectionView} />
      <Route path="/new" component={CollectionEditor} />
      <Route path="/collection/:name/edit" component={CollectionEditor} />
    </Router>
  ), root);
}
