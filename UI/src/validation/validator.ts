/**
 * Client-side validation matching the Go implementation.
 */

import {
  FieldRule,
  SectionRule,
  CollectionRule,
  ValidationError,
  ValidationResult,
  SchemaField,
  ConditionalRule,
} from '../api/client';
import { evaluateExpression, parseDateExpression } from './expression-evaluator';

interface ValidationProfile {
  field_rules: FieldRule[];
  section_rules: SectionRule[];
  collection_rules: CollectionRule[];
}

/**
 * Validate a record against a validation profile
 */
export function validateRecord(
  profile: ValidationProfile,
  fields: Map<string, SchemaField>,
  data: Record<string, unknown>,
  action: 'CREATE' | 'UPDATE'
): ValidationResult {
  const errors: ValidationError[] = [];

  // Validate field rules
  const fieldErrors = validateFieldRules(profile.field_rules, fields, data);
  errors.push(...fieldErrors);

  // Validate section rules
  const sectionErrors = validateSectionRules(profile.section_rules, fields, data);
  errors.push(...sectionErrors);

  // Validate collection rules (only custom and cross_section, uniqueness requires backend)
  const collectionErrors = validateCollectionRules(profile.collection_rules, fields, data);
  errors.push(...collectionErrors);

  return {
    valid: errors.length === 0,
    errors,
  };
}

function validateFieldRules(
  rules: FieldRule[],
  fields: Map<string, SchemaField>,
  data: Record<string, unknown>
): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const rule of rules) {
    const field = fields.get(rule.field_name);
    if (!field) continue;

    const value = data[rule.field_name];
    const fieldErrors = validateField(rule, field, value, data);
    errors.push(...fieldErrors);
  }

  return errors;
}

function validateField(
  rule: FieldRule,
  field: SchemaField,
  value: unknown,
  data: Record<string, unknown>
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Skip validation if value is empty and field is not required
  if (isEmpty(value) && !field.required) {
    return errors;
  }

  switch (field.type) {
    case 'TEXT':
    case 'EMAIL':
    case 'URL':
      errors.push(...validateTextRules(rule, value));
      break;
    case 'NUMBER':
      errors.push(...validateNumberRules(rule, value));
      break;
    case 'DATE':
      errors.push(...validateDateRules(rule, value));
      break;
    case 'SELECT':
      errors.push(...validateSelectRules(field, value));
      break;
    case 'JSON':
      errors.push(...validateJSONRules(rule, value));
      break;
    case 'TABLE':
      errors.push(...validateTableRules(rule, value));
      break;
  }

  // Custom expression validation
  if (rule.custom_expr) {
    try {
      const result = evaluateExpression(rule.custom_expr, data, value);
      if (!result) {
        errors.push({
          field: rule.field_name,
          rule_type: 'field',
          message: rule.error_message || 'Custom validation failed',
          code: 'CUSTOM_VALIDATION',
        });
      }
    } catch (err) {
      errors.push({
        field: rule.field_name,
        rule_type: 'field',
        message: `Expression error: ${err instanceof Error ? err.message : 'Unknown error'}`,
        code: 'EXPRESSION_ERROR',
      });
    }
  }

  return errors;
}

function validateTextRules(rule: FieldRule, value: unknown): ValidationError[] {
  const errors: ValidationError[] = [];
  const str = toString(value);

  if (rule.min_length !== undefined && str.length < rule.min_length) {
    errors.push({
      field: rule.field_name,
      rule_type: 'field',
      message: rule.error_message || `Must be at least ${rule.min_length} characters`,
      code: 'MIN_LENGTH',
    });
  }

  if (rule.max_length !== undefined && str.length > rule.max_length) {
    errors.push({
      field: rule.field_name,
      rule_type: 'field',
      message: rule.error_message || `Must be at most ${rule.max_length} characters`,
      code: 'MAX_LENGTH',
    });
  }

  if (rule.regex) {
    try {
      const re = new RegExp(rule.regex);
      if (!re.test(str)) {
        errors.push({
          field: rule.field_name,
          rule_type: 'field',
          message: rule.error_message || `Must match pattern ${rule.regex}`,
          code: 'REGEX',
        });
      }
    } catch {
      // Invalid regex, skip validation
    }
  }

  return errors;
}

function validateNumberRules(rule: FieldRule, value: unknown): ValidationError[] {
  const errors: ValidationError[] = [];
  const num = toNumber(value);

  if (isNaN(num)) {
    return errors;
  }

  if (rule.min !== undefined && num < rule.min) {
    errors.push({
      field: rule.field_name,
      rule_type: 'field',
      message: rule.error_message || `Must be at least ${rule.min}`,
      code: 'MIN',
    });
  }

  if (rule.max !== undefined && num > rule.max) {
    errors.push({
      field: rule.field_name,
      rule_type: 'field',
      message: rule.error_message || `Must be at most ${rule.max}`,
      code: 'MAX',
    });
  }

  if (rule.integer_only && !Number.isInteger(num)) {
    errors.push({
      field: rule.field_name,
      rule_type: 'field',
      message: rule.error_message || 'Must be a whole number',
      code: 'INTEGER_ONLY',
    });
  }

  return errors;
}

function validateDateRules(rule: FieldRule, value: unknown): ValidationError[] {
  const errors: ValidationError[] = [];
  const str = toString(value);

  if (!str) return errors;

  const dateValue = new Date(str);
  if (isNaN(dateValue.getTime())) {
    return errors;
  }

  if (rule.min_date) {
    const minDate = parseDateExpression(rule.min_date);
    if (minDate && dateValue < minDate) {
      errors.push({
        field: rule.field_name,
        rule_type: 'field',
        message: rule.error_message || `Must be on or after ${minDate.toISOString().split('T')[0]}`,
        code: 'MIN_DATE',
      });
    }
  }

  if (rule.max_date) {
    const maxDate = parseDateExpression(rule.max_date);
    if (maxDate && dateValue > maxDate) {
      errors.push({
        field: rule.field_name,
        rule_type: 'field',
        message: rule.error_message || `Must be on or before ${maxDate.toISOString().split('T')[0]}`,
        code: 'MAX_DATE',
      });
    }
  }

  return errors;
}

function validateSelectRules(field: SchemaField, value: unknown): ValidationError[] {
  const errors: ValidationError[] = [];
  const str = toString(value);

  if (!str) return errors;

  if (field.select_options && field.select_options.length > 0) {
    if (!field.select_options.includes(str)) {
      errors.push({
        field: field.name,
        rule_type: 'field',
        message: 'Invalid selection',
        code: 'INVALID_OPTION',
      });
    }
  }

  return errors;
}

function validateJSONRules(rule: FieldRule, value: unknown): ValidationError[] {
  const errors: ValidationError[] = [];
  const str = toString(value);

  if (!str) return errors;

  try {
    JSON.parse(str);
  } catch {
    errors.push({
      field: rule.field_name,
      rule_type: 'field',
      message: 'Invalid JSON format',
      code: 'INVALID_JSON',
    });
  }

  return errors;
}

function validateTableRules(rule: FieldRule, value: unknown): ValidationError[] {
  const errors: ValidationError[] = [];

  let rows: unknown[] = [];
  if (Array.isArray(value)) {
    rows = value;
  } else if (typeof value === 'string' && value) {
    try {
      rows = JSON.parse(value);
    } catch {
      return errors;
    }
  }

  if (rule.min_rows !== undefined && rows.length < rule.min_rows) {
    errors.push({
      field: rule.field_name,
      rule_type: 'field',
      message: rule.error_message || `Must have at least ${rule.min_rows} rows`,
      code: 'MIN_ROWS',
    });
  }

  if (rule.max_rows !== undefined && rows.length > rule.max_rows) {
    errors.push({
      field: rule.field_name,
      rule_type: 'field',
      message: rule.error_message || `Must have at most ${rule.max_rows} rows`,
      code: 'MAX_ROWS',
    });
  }

  return errors;
}

function validateSectionRules(
  rules: SectionRule[],
  fields: Map<string, SchemaField>,
  data: Record<string, unknown>
): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const rule of rules) {
    // Get fields in this section
    const sectionFields: SchemaField[] = [];
    fields.forEach((field) => {
      if (field.section_id === rule.section_id) {
        sectionFields.push(field);
      }
    });

    // Count filled fields
    let filledCount = 0;
    for (const field of sectionFields) {
      if (!isEmpty(data[field.name])) {
        filledCount++;
      }
    }

    // Min fields filled validation
    if (rule.min_fields_filled !== undefined && filledCount < rule.min_fields_filled) {
      errors.push({
        section_id: rule.section_id,
        rule_type: 'section',
        message: rule.error_message || `At least ${rule.min_fields_filled} fields must be filled`,
        code: 'MIN_FIELDS_FILLED',
      });
    }

    // Max fields filled validation
    if (rule.max_fields_filled !== undefined && filledCount > rule.max_fields_filled) {
      errors.push({
        section_id: rule.section_id,
        rule_type: 'section',
        message: rule.error_message || `At most ${rule.max_fields_filled} fields can be filled`,
        code: 'MAX_FIELDS_FILLED',
      });
    }

    // Conditional rules
    if (rule.conditions) {
      for (const cond of rule.conditions) {
        if (checkCondition(cond.if_field, cond.if_condition, cond.if_value, data)) {
          if (!checkCondition(cond.then_field, cond.then_condition, undefined, data)) {
            errors.push({
              field: cond.then_field,
              section_id: rule.section_id,
              rule_type: 'section',
              message: cond.error_message || `When ${cond.if_field} is ${cond.if_condition}, ${cond.then_field} must be ${cond.then_condition}`,
              code: 'CONDITIONAL',
            });
          }
        }
      }
    }

    // Custom expression validation
    if (rule.custom_expr) {
      try {
        const result = evaluateExpression(rule.custom_expr, data, null);
        if (!result) {
          errors.push({
            section_id: rule.section_id,
            rule_type: 'section',
            message: rule.error_message || 'Section validation failed',
            code: 'CUSTOM_VALIDATION',
          });
        }
      } catch (err) {
        errors.push({
          section_id: rule.section_id,
          rule_type: 'section',
          message: `Expression error: ${err instanceof Error ? err.message : 'Unknown error'}`,
          code: 'EXPRESSION_ERROR',
        });
      }
    }
  }

  return errors;
}

function validateCollectionRules(
  rules: CollectionRule[],
  fields: Map<string, SchemaField>,
  data: Record<string, unknown>
): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const rule of rules) {
    switch (rule.rule_type) {
      case 'uniqueness':
        // Uniqueness validation requires database check, handled by backend
        break;

      case 'cross_section':
        if (rule.cross_section_conditions) {
          for (const cond of rule.cross_section_conditions) {
            if (checkCondition(cond.if_field, cond.if_condition, cond.if_value, data)) {
              if (!checkCondition(cond.then_field, cond.then_condition, undefined, data)) {
                errors.push({
                  field: cond.then_field,
                  rule_type: 'collection',
                  message: cond.error_message || `When ${cond.if_field} is ${cond.if_condition}, ${cond.then_field} must be ${cond.then_condition}`,
                  code: 'CROSS_SECTION_CONDITIONAL',
                });
              }
            }
          }
        }
        break;

      case 'custom':
        if (rule.custom_expr) {
          try {
            const result = evaluateExpression(rule.custom_expr, data, null);
            if (!result) {
              errors.push({
                rule_type: 'collection',
                message: rule.error_message || 'Collection validation failed',
                code: 'CUSTOM_VALIDATION',
              });
            }
          } catch (err) {
            errors.push({
              rule_type: 'collection',
              message: `Expression error: ${err instanceof Error ? err.message : 'Unknown error'}`,
              code: 'EXPRESSION_ERROR',
            });
          }
        }
        break;
    }
  }

  return errors;
}

function checkCondition(
  fieldName: string,
  condition: string,
  value: string | undefined,
  data: Record<string, unknown>
): boolean {
  const fieldValue = data[fieldName];

  switch (condition) {
    case 'filled':
    case 'required':
      return !isEmpty(fieldValue);
    case 'empty':
      return isEmpty(fieldValue);
    case 'equals':
      return value !== undefined && toString(fieldValue) === value;
    case 'not_equals':
      return value !== undefined && toString(fieldValue) !== value;
    default:
      return false;
  }
}

// Helper functions

function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

function toString(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  return String(value);
}

function toNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return parseFloat(value);
  return NaN;
}

/**
 * Get validation errors for a specific field
 */
export function getFieldErrors(
  errors: ValidationError[],
  fieldName: string
): ValidationError[] {
  return errors.filter((e) => e.field === fieldName && e.rule_type === 'field');
}

/**
 * Get validation errors for a specific section
 */
export function getSectionErrors(
  errors: ValidationError[],
  sectionId: number
): ValidationError[] {
  return errors.filter((e) => e.section_id === sectionId && e.rule_type === 'section');
}

/**
 * Get collection-level validation errors
 */
export function getCollectionErrors(errors: ValidationError[]): ValidationError[] {
  return errors.filter((e) => e.rule_type === 'collection');
}
