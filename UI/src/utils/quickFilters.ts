import { FieldType, FilterOperator, FilterRule, SchemaField } from '../types/collection';

export type QuickFilterValue =
  | { kind: 'date_range'; from?: string; to?: string }
  | { kind: 'number_range'; min?: number; max?: number }
  | { kind: 'select'; value?: string }
  | { kind: 'text'; value?: string };

export type QuickFilterState = Record<string, QuickFilterValue>;

const QUICK_FILTERABLE_TYPES: FieldType[] = ['DATE', 'NUMBER', 'SELECT', 'TEXT', 'EMAIL', 'URL'];

export function isQuickFilterable(type: FieldType): boolean {
  return QUICK_FILTERABLE_TYPES.includes(type);
}

export function widgetKindForType(type: FieldType): QuickFilterValue['kind'] | null {
  switch (type) {
    case 'DATE':
      return 'date_range';
    case 'NUMBER':
      return 'number_range';
    case 'SELECT':
      return 'select';
    case 'TEXT':
    case 'EMAIL':
    case 'URL':
      return 'text';
    default:
      return null;
  }
}

// Pure translation: quick-filter widget state -> FilterRule[]. Fields not present in
// `fields` (e.g. left over from a since-switched-away-from view) are skipped defensively.
export function buildQuickFilterRules(fields: SchemaField[], values: QuickFilterState): FilterRule[] {
  const rules: FilterRule[] = [];
  const allowed = new Set(fields.map(f => f.name));

  for (const [fieldName, v] of Object.entries(values)) {
    if (!allowed.has(fieldName)) continue;

    switch (v.kind) {
      case 'date_range':
        if (v.from) rules.push({ field: fieldName, operator: 'gte' as FilterOperator, value: v.from });
        if (v.to) rules.push({ field: fieldName, operator: 'lte' as FilterOperator, value: v.to });
        break;
      case 'number_range':
        if (v.min !== undefined) rules.push({ field: fieldName, operator: 'gte' as FilterOperator, value: String(v.min) });
        if (v.max !== undefined) rules.push({ field: fieldName, operator: 'lte' as FilterOperator, value: String(v.max) });
        break;
      case 'select':
        if (v.value) rules.push({ field: fieldName, operator: 'equals' as FilterOperator, value: v.value });
        break;
      case 'text':
        if (v.value && v.value.trim()) rules.push({ field: fieldName, operator: 'contains' as FilterOperator, value: v.value.trim() });
        break;
    }
  }

  return rules;
}
