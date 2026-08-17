import { For, Show } from 'solid-js';
import { FormView } from '../types/collection';

interface FormViewSelectorProps {
  views: FormView[];
  selectedViewId: number | null;
  onSelect: (viewId: number | null) => void;
  onManage?: () => void;
}

export function FormViewSelector(props: FormViewSelectorProps) {
  return (
    <div class="form-view-selector">
      <select
        class="form-view-select"
        value={props.selectedViewId ?? ''}
        onChange={(e) => {
          const val = e.currentTarget.value;
          props.onSelect(val === '' ? null : Number(val));
        }}
      >
        <option value="">Default Form</option>
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
          Manage
        </button>
      </Show>
    </div>
  );
}
