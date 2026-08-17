import { createSignal, onMount } from "solid-js";
import { Collection, api } from "../api/client";
import { Sidebar } from "../components/Sidebar";

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


export default Layout;
