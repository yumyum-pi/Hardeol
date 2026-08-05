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
};
