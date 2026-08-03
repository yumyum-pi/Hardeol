import { onMount, For } from 'solid-js';
import type { Collection, View } from '../App';

interface SidebarProps {
  collections: Collection[];
  currentView: View;
  onNavigate: (view: View) => void;
  onRefresh: () => Promise<void>;
}

export function Sidebar(props: SidebarProps) {
  onMount(() => {
    props.onRefresh();
  });

  return (
    <aside class="sidebar">
      <div class="sidebar-header">
        <h1 class="logo">Hardeol</h1>
        <span class="version">v0.1.0</span>
      </div>

      <nav class="sidebar-nav">
        <div class="nav-section">
          <div class="nav-section-header">
            <span>Collections</span>
            <button
              class="btn-icon"
              onClick={() => props.onNavigate({ type: 'new-collection' })}
              title="New Collection"
            >
              +
            </button>
          </div>

          <ul class="nav-list">
            <For each={props.collections} fallback={<li class="nav-empty">No collections</li>}>
              {(collection) => (
                <li>
                  <button
                    class="nav-item"
                    classList={{
                      active:
                        props.currentView.type === 'collection' &&
                        (props.currentView as { name: string }).name === collection.name,
                    }}
                    onClick={() =>
                      props.onNavigate({ type: 'collection', name: collection.name })
                    }
                  >
                    <span class="nav-icon">&#9776;</span>
                    <span class="nav-label">{collection.name}</span>
                    <span class="nav-badge">{collection.fields.length - 1}</span>
                  </button>
                </li>
              )}
            </For>
          </ul>
        </div>
      </nav>

      <div class="sidebar-footer">
        <button class="btn-text" onClick={props.onRefresh}>
          Refresh
        </button>
      </div>
    </aside>
  );
}
