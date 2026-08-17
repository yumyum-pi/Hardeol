import { For, Match, Show, Switch } from "solid-js";
import { FormFieldConfig, SchemaField, ValidationError } from "../types/collection"

type FieldInputWithConfig = {
  field: SchemaField,
  value: string,
  onChange: (value: string) => void,
  placeholder: string,
  readOnly: boolean
}

const FieldInputWithConfig = (
  props: FieldInputWithConfig
) => {
  const { field, value, onChange, placeholder = '', readOnly = false } = props;
  const fieldType = field.type;

  return (
    <Switch fallback={
      <input
        type="text"
        value={value}
        onInput={(e) => onChange(e.currentTarget.value)}
        placeholder={placeholder}
        disabled={readOnly}
      />
    }>
      <Match when={fieldType === 'NUMBER'}>
        <input
          type="number"
          value={value}
          onInput={(e) => onChange(e.currentTarget.value)}
          placeholder={placeholder}
          disabled={readOnly}
        />
      </Match>
      <Match when={fieldType === 'BOOL'}>
        <select
          value={value === 'true' || value === '1' ? 'true' : 'false'}
          onChange={(e) => onChange(e.currentTarget.value)}
          disabled={readOnly}
        >
          <option value="false">False</option>
          <option value="true">True</option>
        </select>
      </Match>
      <Match when={fieldType === 'SELECT'}>
        <select
          value={value}
          onChange={(e) => onChange(e.currentTarget.value)}
          disabled={readOnly}
        >
          <option value="">{placeholder || '-- Select --'}</option>
          <For each={field.select_options || []}>
            {(option) => <option value={option}>{option}</option>}
          </For>
        </select>
      </Match>
      <Match when={fieldType === 'DATE'}>
        <input
          type="date"
          value={value}
          onInput={(e) => onChange(e.currentTarget.value)}
          disabled={readOnly}
        />
      </Match>
      <Match when={fieldType === 'EMAIL'}>
        <input
          type="email"
          value={value}
          onInput={(e) => onChange(e.currentTarget.value)}
          placeholder={placeholder}
          disabled={readOnly}
        />
      </Match>
      <Match when={fieldType === 'URL'}>
        <input
          type="url"
          placeholder={placeholder || 'https://...'}
          value={value}
          onInput={(e) => onChange(e.currentTarget.value)}
          disabled={readOnly}
        />
      </Match>
      <Match when={fieldType === 'JSON'}>
        <textarea
          placeholder={placeholder || '{"key": "value"}'}
          value={value}
          onInput={(e) => onChange(e.currentTarget.value)}
          rows={3}
          disabled={readOnly}
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
  getFieldValidationErrors: (fileName: string) => ValidationError[];
}
export const FormFieldWithConfig = (props: FormFieldWithConfigProp) => {
  // Skip hidden fields
  if (props.config && !props.config.visible) return null;

  const label = props.config?.label || props.field.name;
  const placeholder = props.config?.placeholder || '';
  const helpText = props.config?.help_text || '';
  const isReadOnly = props.config?.read_only ?? false;
  const widthClass = props.config?.width ? `width-${props.config.width}` : 'width-full';

  // Apply default value for new records
  const fieldValue = props.formData[props.field.name] || (props.isNewRecord && props.config?.default_value) || '';

  const onUpdate = (v: string) => props.setFormData(props.field.name, v)
  // Get field validation errors
  const fieldErrors = props.getFieldValidationErrors(props.field.name);
  const hasError = fieldErrors.length > 0;

  return (
    <div class={`form-group ${widthClass} ${hasError ? 'has-error' : ''}`}>
      <label>{label}{props.field.required ? ' *' : ''}</label>
      <FieldInputWithConfig
        field={props.field}
        value={fieldValue}
        onChange={onUpdate}
        placeholder={placeholder}
        readOnly={isReadOnly}
      />
      <Show when={helpText && !hasError}>
        <div class="form-help-text">{helpText}</div>
      </Show>
      <Show when={hasError}>
        <For each={fieldErrors}>
          {(err) => <div class="field-error">{err.message}</div>}
        </For>
      </Show>
    </div>
  );
}
