import { For, Show } from 'solid-js';
import { TableView } from '../types/collection';

interface ViewSelectorProps {
  views: TableView[];
  selectedViewId: number | null;
  onSelect: (viewId: number | null) => void;
  onManage?: () => void;
}

export function ViewSelector(props: ViewSelectorProps) {
  return (
    <div class="view-selector">
      <select
        class="view-select"
        value={props.selectedViewId ?? ''}
        onChange={(e) => {
          const val = e.currentTarget.value;
          props.onSelect(val === '' ? null : Number(val));
        }}
      >
        <option value="">All Fields</option>
        <For each={props.views}>
          {(view) => (
            <option value={view.id}>
              {view.name}
              {view.is_default ? ' (Default)' : ''}
            </option>
          )}
        </For>
      </select>
      <Show when={props.onManage}>
        <button class="btn btn-sm" onClick={props.onManage}>
          Manage Views
        </button>
      </Show>
    </div>
  );
}
