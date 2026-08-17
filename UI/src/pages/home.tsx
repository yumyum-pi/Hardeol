import { createSignal, onMount } from "solid-js";
import { api } from "../api/client";
import { Collection } from "../types/collection";
import { CollectionList } from "./CollectionList";

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
export default HomePage;
