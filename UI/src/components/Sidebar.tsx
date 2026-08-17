import { onMount, For } from 'solid-js';
import { A, useLocation } from '@solidjs/router';
import { Collection } from '../api/client';

interface SidebarProps {
  collections: Collection[];
  onRefresh: () => Promise<void>;
}

export function Sidebar(props: SidebarProps) {
  const location = useLocation();

  onMount(() => {
    props.onRefresh();
  });

  return (
    <aside class="sidebar">
      <div class="sidebar-header">
        <A href="/" class="logo-link">
          <h1 class="logo">Hardeol</h1>
        </A>
        <span class="version">v0.1.0</span>
      </div>

      <nav class="sidebar-nav">
        <div class="nav-section">
          <div class="nav-section-header">
            <span>Collections</span>
            <A href="/collection/new" class="btn-icon" title="New Collection">
              +
            </A>
          </div>

          <ul class="nav-list">
            <For each={props.collections} fallback={<li class="nav-empty">No collections</li>}>
              {(collection) => (
                <li>
                  <A
                    href={`/collection/${collection.name}`}
                    class="nav-item"
                    classList={{
                      active: location.pathname === `/collection/${collection.name}` ||
                        location.pathname.startsWith(`/collection/${collection.name}/`),
                    }}
                  >
                    <span class="nav-icon">&#9776;</span>
                    <span class="nav-label">{collection.name}</span>
                    <span class="nav-badge">{collection.fields.length - 1}</span>
                  </A>
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
