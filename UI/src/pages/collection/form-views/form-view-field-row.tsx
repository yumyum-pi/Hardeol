import { Show } from 'solid-js';
import { SchemaField, FieldWidth } from '../../../types/collection';

export interface FieldRowState {
  visible: boolean;
  order: number;
  label: string;
  placeholder: string;
  helpText: string;
  readOnly: boolean;
  defaultValue: string;
  width: FieldWidth;
}

type FormViewFieldRowProps = {
  field: SchemaField;
  config: FieldRowState | undefined;
  onUpdate: <K extends keyof FieldRowState>(key: K, value: FieldRowState[K]) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  showColumnsToggle?: boolean;
  isColumnsExpanded?: boolean;
  onToggleColumns?: () => void;
};

// Render a single field row in a form view's field configuration table.
// Reused for both top-level schema fields and TABLE field columns.
export function FormViewFieldRow(props: FormViewFieldRowProps) {
  return (
    <div class="field-config-row">
      <span class="fc-visible">
        <input
          type="checkbox"
          checked={props.config?.visible ?? true}
          onChange={(e) => props.onUpdate('visible', e.currentTarget.checked)}
        />
      </span>
      <span class="fc-name">{props.field.name}</span>
      <span class="fc-label">
        <input
          type="text"
          value={props.config?.label ?? ''}
          onInput={(e) => props.onUpdate('label', e.currentTarget.value)}
          placeholder={props.field.name}
        />
      </span>
      <span class="fc-placeholder">
        <input
          type="text"
          value={props.config?.placeholder ?? ''}
          onInput={(e) => props.onUpdate('placeholder', e.currentTarget.value)}
          placeholder="Placeholder..."
        />
      </span>
      <span class="fc-width">
        <select
          value={props.config?.width ?? 'full'}
          onChange={(e) => props.onUpdate('width', e.currentTarget.value as FieldWidth)}
        >
          <option value="full">Full</option>
          <option value="half">Half</option>
          <option value="third">Third</option>
        </select>
      </span>
      <span class="fc-readonly">
        <input
          type="checkbox"
          checked={props.config?.readOnly ?? false}
          onChange={(e) => props.onUpdate('readOnly', e.currentTarget.checked)}
        />
      </span>
      <span class="fc-order">
        <div class="order-buttons">
          <button type="button" class="btn btn-xs" disabled={!props.canMoveUp} onClick={props.onMoveUp}>
            ↑
          </button>
          <button type="button" class="btn btn-xs" disabled={!props.canMoveDown} onClick={props.onMoveDown}>
            ↓
          </button>
        </div>
      </span>
      <span class="fc-columns">
        <Show when={props.showColumnsToggle}>
          <button type="button" class="btn btn-xs" onClick={props.onToggleColumns}>
            {props.isColumnsExpanded ? 'Hide Columns' : 'Edit Columns'}
          </button>
        </Show>
      </span>
    </div>
  );
}
