import { FieldType, FilterOperator } from '../types/collection';

export const OPERATORS_BY_TYPE: Record<FieldType, FilterOperator[]> = {
  TEXT: ['equals', 'not_equals', 'contains', 'not_contains', 'starts_with', 'is_empty', 'is_not_empty'],
  EMAIL: ['equals', 'not_equals', 'contains', 'not_contains', 'starts_with', 'is_empty', 'is_not_empty'],
  URL: ['equals', 'not_equals', 'contains', 'not_contains', 'starts_with', 'is_empty', 'is_not_empty'],
  JSON: ['equals', 'not_equals', 'contains', 'not_contains', 'starts_with', 'is_empty', 'is_not_empty'],
  NUMBER: ['equals', 'not_equals', 'gt', 'gte', 'lt', 'lte', 'is_empty', 'is_not_empty'],
  DATE: ['equals', 'not_equals', 'gt', 'gte', 'lt', 'lte', 'is_empty', 'is_not_empty'],
  BOOL: ['equals', 'is_empty', 'is_not_empty'],
  SELECT: ['equals', 'not_equals', 'is_empty', 'is_not_empty'],
  TABLE: [],
};

export const OPERATOR_LABELS: Record<FilterOperator, string> = {
  equals: 'is',
  not_equals: 'is not',
  contains: 'contains',
  not_contains: 'does not contain',
  starts_with: 'starts with',
  gt: '>',
  gte: '>=',
  lt: '<',
  lte: '<=',
  is_empty: 'is empty',
  is_not_empty: 'is not empty',
};

export function needsValue(operator: FilterOperator): boolean {
  return operator !== 'is_empty' && operator !== 'is_not_empty';
}
