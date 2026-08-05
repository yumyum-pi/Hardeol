const API_BASE = '/api';

export interface ApiResponse<T> {
  status: number;
  data?: T;
  error?: string;
}

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

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

async function request<T>(
  endpoint: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });
    return await response.json();
  } catch (error) {
    return {
      status: 500,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export const api = {
  // Collections
  listCollections: () =>
    request<Collection[]>('/collection'),

  createCollection: (data: CreateCollectionRequest) =>
    request<Collection>('/collection', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateCollection: (name: string, data: UpdateCollectionRequest) =>
    request<Collection>(`/collection/${name}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Records
  listRecords: (collectionName: string) =>
    request<Record<string, unknown>[]>(`/collection/${collectionName}`),

  createRecord: (collectionName: string, data: Record<string, unknown>) =>
    request<Record<string, unknown>>(`/collection/${collectionName}`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateRecord: (collectionName: string, id: number | string, data: Record<string, unknown>) =>
    request<Record<string, unknown>>(`/collection/${collectionName}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteRecord: (collectionName: string, id: number | string) =>
    request<string>(`/collection/${collectionName}/${id}`, {
      method: 'DELETE',
    }),

  // Table Views
  listViews: (collectionName: string) =>
    request<TableView[]>(`/collection/${collectionName}/views`),

  createView: (collectionName: string, data: Omit<TableView, 'id' | 'collection_id'>) =>
    request<TableView>(`/collection/${collectionName}/views`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateView: (collectionName: string, viewId: number, data: Omit<TableView, 'id' | 'collection_id'>) =>
    request<TableView>(`/collection/${collectionName}/views/${viewId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteView: (collectionName: string, viewId: number) =>
    request<string>(`/collection/${collectionName}/views/${viewId}`, {
      method: 'DELETE',
    }),

  // Form Views
  listFormViews: (collectionName: string) =>
    request<FormView[]>(`/collection/${collectionName}/form-views`),

  createFormView: (collectionName: string, data: Omit<FormView, 'id' | 'collection_id'>) =>
    request<FormView>(`/collection/${collectionName}/form-views`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateFormView: (collectionName: string, viewId: number, data: Omit<FormView, 'id' | 'collection_id'>) =>
    request<FormView>(`/collection/${collectionName}/form-views/${viewId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteFormView: (collectionName: string, viewId: number) =>
    request<string>(`/collection/${collectionName}/form-views/${viewId}`, {
      method: 'DELETE',
    }),

  // Line Items (TABLE field child rows)
  listLineItems: (collectionName: string, recordId: number | string, fieldName: string) =>
    request<Record<string, unknown>[]>(`/collection/${collectionName}/${recordId}/${fieldName}`),

  createLineItem: (collectionName: string, recordId: number | string, fieldName: string, data: Record<string, unknown>) =>
    request<Record<string, unknown>>(`/collection/${collectionName}/${recordId}/${fieldName}`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateLineItem: (collectionName: string, recordId: number | string, fieldName: string, rowId: number | string, data: Record<string, unknown>) =>
    request<Record<string, unknown>>(`/collection/${collectionName}/${recordId}/${fieldName}/${rowId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteLineItem: (collectionName: string, recordId: number | string, fieldName: string, rowId: number | string) =>
    request<string>(`/collection/${collectionName}/${recordId}/${fieldName}/${rowId}`, {
      method: 'DELETE',
    }),

  // Validation Profiles
  listValidationProfiles: (collectionName: string) =>
    request<ValidationProfile[]>(`/collection/${collectionName}/validation-profiles`),

  createValidationProfile: (collectionName: string, data: Omit<ValidationProfile, 'id' | 'collection_id'>) =>
    request<ValidationProfile>(`/collection/${collectionName}/validation-profiles`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateValidationProfile: (collectionName: string, profileId: number, data: Omit<ValidationProfile, 'id' | 'collection_id'>) =>
    request<ValidationProfile>(`/collection/${collectionName}/validation-profiles/${profileId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteValidationProfile: (collectionName: string, profileId: number) =>
    request<string>(`/collection/${collectionName}/validation-profiles/${profileId}`, {
      method: 'DELETE',
    }),

  validateRecord: (collectionName: string, data: Record<string, unknown>, action: 'CREATE' | 'UPDATE', profileId?: number) =>
    request<ValidationResult>(`/collection/${collectionName}/validate`, {
      method: 'POST',
      body: JSON.stringify({ data, action, profile_id: profileId }),
    }),
};
