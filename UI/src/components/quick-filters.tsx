import { For, Show } from 'solid-js';
import { SchemaField } from '../types/collection';
import { QuickFilterState, QuickFilterValue, widgetKindForType } from '../utils/quickFilters';

export interface QuickFilterFieldConfig {
  field: SchemaField;
  cssClass?: string;
}

interface QuickFiltersProps {
  fields: QuickFilterFieldConfig[];
  values: QuickFilterState;
  onChange: (fieldName: string, value: QuickFilterValue | undefined) => void;
  onClear: () => void;
}

const groupClass = (cssClass?: string) => ['quick-filter-group', cssClass].filter(Boolean).join(' ');

let textDebounceTimer: ReturnType<typeof setTimeout> | undefined;

export function QuickFilters(props: QuickFiltersProps) {
  const hasActive = () => Object.keys(props.values).length > 0;

  const handleTextInput = (fieldName: string, raw: string) => {
    clearTimeout(textDebounceTimer);
    textDebounceTimer = setTimeout(() => {
      props.onChange(fieldName, raw.trim() ? { kind: 'text', value: raw.trim() } : undefined);
    }, 300);
  };

  return (
    <Show when={props.fields.length > 0}>
      <div class="quick-filter-bar">
        <For each={props.fields}>
          {(config) => {
            const field = config.field;
            const kind = widgetKindForType(field.type);
            const value = () => props.values[field.name];

            if (kind === 'date_range') {
              const rangeValue = () => (value()?.kind === 'date_range' ? value() : undefined) as { kind: 'date_range'; from?: string; to?: string } | undefined;
              return (
                <div class={groupClass(config.cssClass)}>
                  <label>{field.name}</label>
                  <div class="quick-filter-range">
                    <input
                      type="date"
                      value={rangeValue()?.from ?? ''}
                      onChange={(e) => {
                        const from = e.currentTarget.value || undefined;
                        const to = rangeValue()?.to;
                        props.onChange(field.name, from || to ? { kind: 'date_range', from, to } : undefined);
                      }}
                    />
                    <span>to</span>
                    <input
                      type="date"
                      value={rangeValue()?.to ?? ''}
                      onChange={(e) => {
                        const to = e.currentTarget.value || undefined;
                        const from = rangeValue()?.from;
                        props.onChange(field.name, from || to ? { kind: 'date_range', from, to } : undefined);
                      }}
                    />
                  </div>
                </div>
              );
            }

            if (kind === 'number_range') {
              const rangeValue = () => (value()?.kind === 'number_range' ? value() : undefined) as { kind: 'number_range'; min?: number; max?: number } | undefined;
              return (
                <div class={groupClass(config.cssClass)}>
                  <label>{field.name}</label>
                  <div class="quick-filter-range">
                    <input
                      type="number"
                      placeholder="Min"
                      value={rangeValue()?.min ?? ''}
                      onChange={(e) => {
                        const raw = e.currentTarget.value;
                        const min = raw === '' ? undefined : Number(raw);
                        const max = rangeValue()?.max;
                        props.onChange(field.name, min !== undefined || max !== undefined ? { kind: 'number_range', min, max } : undefined);
                      }}
                    />
                    <span>to</span>
                    <input
                      type="number"
                      placeholder="Max"
                      value={rangeValue()?.max ?? ''}
                      onChange={(e) => {
                        const raw = e.currentTarget.value;
                        const max = raw === '' ? undefined : Number(raw);
                        const min = rangeValue()?.min;
                        props.onChange(field.name, min !== undefined || max !== undefined ? { kind: 'number_range', min, max } : undefined);
                      }}
                    />
                  </div>
                </div>
              );
            }

            if (kind === 'select') {
              const selectValue = () => {
                const v = value();
                return (v?.kind === 'select' ? v.value : undefined) ?? '';
              };
              return (
                <div class={groupClass(config.cssClass)}>
                  <label>{field.name}</label>
                  <select
                    value={selectValue()}
                    onChange={(e) => {
                      const v = e.currentTarget.value;
                      props.onChange(field.name, v ? { kind: 'select', value: v } : undefined);
                    }}
                  >
                    <option value="">Any</option>
                    <For each={field.select_options ?? []}>
                      {(opt) => <option value={opt}>{opt}</option>}
                    </For>
                  </select>
                </div>
              );
            }

            // text
            const textValue = () => {
              const v = value();
              return (v?.kind === 'text' ? v.value : undefined) ?? '';
            };
            return (
              <div class={groupClass(config.cssClass)}>
                <label>{field.name}</label>
                <input
                  type="text"
                  placeholder={`Search ${field.name}...`}
                  value={textValue()}
                  onInput={(e) => handleTextInput(field.name, e.currentTarget.value)}
                />
              </div>
            );
          }}
        </For>
        <Show when={hasActive()}>
          <button type="button" class="btn btn-sm quick-filter-clear" onClick={props.onClear}>
            Clear filters
          </button>
        </Show>
      </div>
    </Show>
  );
}

export default QuickFilters;
