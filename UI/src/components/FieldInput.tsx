import { For, Match, Show, Switch } from "solid-js";
import { FormFieldConfig, SchemaField, ValidationError } from "../types/collection"

type FieldInputWithConfig = {
  field: SchemaField,
  value: string,
  onChange: (value: string) => void,
  placeholder: string,
  readOnly: boolean
}

// Each prop is read directly (never destructured into a const) so that
// changes driven by the active form view's config keep updating this
// input — Solid only tracks reads that happen inside JSX, not plain
// top-of-function destructuring.
const FieldInputWithConfig = (
  props: FieldInputWithConfig
) => {
  return (
    <Switch fallback={
      <input
        type="text"
        value={props.value}
        onInput={(e) => props.onChange(e.currentTarget.value)}
        placeholder={props.placeholder}
        disabled={props.readOnly}
      />
    }>
      <Match when={props.field.type === 'NUMBER'}>
        <input
          type="number"
          value={props.value}
          onInput={(e) => props.onChange(e.currentTarget.value)}
          placeholder={props.placeholder}
          disabled={props.readOnly}
        />
      </Match>
      <Match when={props.field.type === 'BOOL'}>
        <select
          value={props.value === 'true' || props.value === '1' ? 'true' : 'false'}
          onChange={(e) => props.onChange(e.currentTarget.value)}
          disabled={props.readOnly}
        >
          <option value="false">False</option>
          <option value="true">True</option>
        </select>
      </Match>
      <Match when={props.field.type === 'SELECT'}>
        <select
          value={props.value}
          onChange={(e) => props.onChange(e.currentTarget.value)}
          disabled={props.readOnly}
        >
          <option value="">{props.placeholder || '-- Select --'}</option>
          <For each={props.field.select_options || []}>
            {(option) => <option value={option}>{option}</option>}
          </For>
        </select>
      </Match>
      <Match when={props.field.type === 'DATE'}>
        <input
          type="date"
          value={props.value}
          onInput={(e) => props.onChange(e.currentTarget.value)}
          disabled={props.readOnly}
        />
      </Match>
      <Match when={props.field.type === 'EMAIL'}>
        <input
          type="email"
          value={props.value}
          onInput={(e) => props.onChange(e.currentTarget.value)}
          placeholder={props.placeholder}
          disabled={props.readOnly}
        />
      </Match>
      <Match when={props.field.type === 'URL'}>
        <input
          type="url"
          placeholder={props.placeholder || 'https://...'}
          value={props.value}
          onInput={(e) => props.onChange(e.currentTarget.value)}
          disabled={props.readOnly}
        />
      </Match>
      <Match when={props.field.type === 'JSON'}>
        <textarea
          placeholder={props.placeholder || '{"key": "value"}'}
          value={props.value}
          onInput={(e) => props.onChange(e.currentTarget.value)}
          rows={3}
          disabled={props.readOnly}
        />
      </Match>
    </Switch>
  );
};

type FormFieldWithConfigProp = {
  field: SchemaField,
  formData: Record<string, string>,
  setFormData: (key: string, value: string) => void,
  isNewRecord: boolean
  config?: FormFieldConfig;
  isRequired: boolean;
  getFieldValidationErrors: (fileName: string) => ValidationError[];
}
export const FormFieldWithConfig = (props: FormFieldWithConfigProp) => {
  return (
    <Show when={!props.config || props.config.visible}>
      <div class={`form-group width-${props.config?.width ?? 'full'} ${props.getFieldValidationErrors(props.field.name).length > 0 ? 'has-error' : ''}`}>
        <label>{props.config?.label || props.field.name}{props.isRequired ? ' *' : ''}</label>
        <FieldInputWithConfig
          field={props.field}
          value={props.formData[props.field.name] || (props.isNewRecord && props.config?.default_value) || ''}
          onChange={(v) => props.setFormData(props.field.name, v)}
          placeholder={props.config?.placeholder || ''}
          readOnly={props.config?.read_only ?? false}
        />
        <Show when={props.config?.help_text && props.getFieldValidationErrors(props.field.name).length === 0}>
          <div class="form-help-text">{props.config?.help_text}</div>
        </Show>
        <Show when={props.getFieldValidationErrors(props.field.name).length > 0}>
          <For each={props.getFieldValidationErrors(props.field.name)}>
            {(err) => <div class="field-error">{err.message}</div>}
          </For>
        </Show>
      </div>
    </Show>
  );
}
