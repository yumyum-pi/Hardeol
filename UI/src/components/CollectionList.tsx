import { onMount, For, Accessor } from 'solid-js';
import type { Collection } from '../App';

interface CollectionListProps {
  collections: Accessor<Collection[]>;
  onRefresh: () => Promise<void>;
  onSelect: (name: string) => void;
  onNewCollection: () => void;
}

export function CollectionList(props: CollectionListProps) {
  onMount(() => {
    props.onRefresh();
  });

  return (
    <div class="collection-list">
      <header class="page-header">
        <h2>Collections</h2>
        <button class="btn btn-primary" onClick={props.onNewCollection}>
          + New Collection
        </button>
      </header>

      <div class="card-grid">
        <For each={props.collections()} fallback={
          <div class="empty-state">
            <p>No collections yet</p>
            <button class="btn btn-primary" onClick={props.onNewCollection}>
              Create your first collection
            </button>
          </div>
        }>
          {(collection) => (
            <div class="card" onClick={() => props.onSelect(collection.name)}>
              <div class="card-header">
                <h3>{collection.name}</h3>
              </div>
              <div class="card-body">
                <p class="card-stat">
                  <span class="stat-value">{collection.fields.length - 1}</span>
                  <span class="stat-label">fields</span>
                </p>
              </div>
              <div class="card-footer">
                <ul class="field-list">
                  <For each={collection.fields.filter(f => f.name !== 'id').slice(0, 3)}>
                    {(field) => (
                      <li class="field-tag">
                        <span class="field-name">{field.name}</span>
                        <span class="field-type">{field.type}</span>
                      </li>
                    )}
                  </For>
                </ul>
              </div>
            </div>
          )}
        </For>
      </div>
    </div>
  );
}
