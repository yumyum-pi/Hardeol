import { ApiResponse, Collection, CreateCollectionRequest, FormView, TableView, UpdateCollectionRequest, ValidationError, ValidationProfile } from "../types/collection";

const API_BASE = '/api';


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
