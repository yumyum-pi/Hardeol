
export interface Field {
  name: string;
  type: FieldType;
  required: boolean;
  select_options?: string[];
  select_options_text?: string;
  order?: number;
  table_fields?: Field[];
}
export type FieldKeys = keyof Field;

export interface SectionState {
  name: string;
  fields: Field[];
}

export type FormActionType = 'CREATE' | 'UPDATE';

export type FieldType = 'TEXT' | 'NUMBER' | 'BOOL' | 'EMAIL' | 'URL' | 'DATE' | 'SELECT' | 'JSON' | 'TABLE';

export interface SchemaField {
  id?: number;
  name: string;
  type: FieldType;
  required: boolean;
  select_options?: string[]; // For SELECT type
  collection_id?: number;
  section_id?: number | null; // Reference to section (from DB)
  section_index?: number | null; // Section index for creating/updating (frontend use)
  order?: number; // Field ordering within section
  table_fields?: SchemaField[]; // Nested fields for TABLE type
}

export interface Section {
  id?: number;
  collection_id?: number;
  name: string;
  order: number;
}

export interface Collection {
  id: number;
  name: string;
  fields: SchemaField[];
  sections?: Section[];
}

export interface ApiResponse<T> {
  status: number;
  data?: T;
  error?: string;
}

export interface CreateCollectionRequest {
  name: string;
  fields: Omit<SchemaField, 'id' | 'collection_id'>[];
  sections?: Omit<Section, 'id' | 'collection_id'>[];
}

export interface UpdateCollectionRequest {
  fields: Omit<SchemaField, 'id' | 'collection_id'>[];
  sections?: Omit<Section, 'id' | 'collection_id'>[];
}

export interface ViewField {
  name: string;
  order: number;
  css_class?: string;
}

export interface TableView {
  id?: number;
  name: string;
  collection_id?: number;
  fields: ViewField[];
  is_default: boolean;
}

export type ActionType = 'CREATE' | 'UPDATE' | 'ALL';
export type FieldWidth = 'full' | 'half' | 'third';

export interface FormFieldConfig {
  name: string;
  order: number;
  visible: boolean;
  label?: string;
  placeholder?: string;
  help_text?: string;
  read_only?: boolean;
  default_value?: string;
  width: FieldWidth;
}

export interface FormView {
  id?: number;
  name: string;
  collection_id?: number;
  action_type: ActionType;
  fields: FormFieldConfig[];
  is_default: boolean;
}

// Validation Types
export interface FieldRule {
  field_name: string;
  min_length?: number;
  max_length?: number;
  regex?: string;
  min?: number;
  max?: number;
  integer_only?: boolean;
  min_date?: string;
  max_date?: string;
  min_rows?: number;
  max_rows?: number;
  json_schema?: string;
  custom_expr?: string;
  error_message?: string;
}

export interface ConditionalRule {
  if_field: string;
  if_condition: 'filled' | 'empty' | 'equals' | 'not_equals';
  if_value?: string;
  then_field: string;
  then_condition: 'required' | 'filled' | 'empty';
  error_message?: string;
}

export interface SectionRule {
  section_id: number;
  min_fields_filled?: number;
  max_fields_filled?: number;
  conditions?: ConditionalRule[];
  custom_expr?: string;
  error_message?: string;
}

export interface CrossSectionCondition {
  if_section_id: number;
  if_field: string;
  if_condition: string;
  if_value?: string;
  then_section_id: number;
  then_field: string;
  then_condition: string;
  error_message?: string;
}

export interface CollectionRule {
  rule_type: 'uniqueness' | 'cross_section' | 'custom';
  unique_fields?: string[];
  cross_section_conditions?: CrossSectionCondition[];
  custom_expr?: string;
  error_message?: string;
}

export interface ValidationProfile {
  id?: number;
  name: string;
  collection_id?: number;
  action_type: ActionType;
  is_active: boolean;
  field_rules: FieldRule[];
  section_rules: SectionRule[];
  collection_rules: CollectionRule[];
}

export interface ValidationError {
  field?: string;
  section_id?: number | null;
  rule_type: 'field' | 'section' | 'collection';
  message: string;
  code: string;
}

export interface LineItem {
  id?: number;
  parent_id?: number;
  row_order?: number;
  [key: string]: unknown;
}
