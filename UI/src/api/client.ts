const API_BASE = '/api';

export interface ApiResponse<T> {
  status: number;
  data?: T;
  error?: string;
}

export interface SchemaField {
  id?: number;
  name: string;
  type: 'TEXT' | 'NUMBER' | 'BOOL' | 'EMAIL' | 'URL' | 'DATE' | 'SELECT' | 'JSON';
  required: boolean;
  select_options?: string[]; // For SELECT type
  collection_id?: number;
}

export interface Collection {
  id: number;
  name: string;
  fields: SchemaField[];
}

export interface CreateCollectionRequest {
  name: string;
  fields: Omit<SchemaField, 'id' | 'collection_id'>[];
}

export interface UpdateCollectionRequest {
  fields: Omit<SchemaField, 'id' | 'collection_id'>[];
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
};
