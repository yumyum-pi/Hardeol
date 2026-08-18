import { createSignal, onMount, Show, For } from 'solid-js';
import { createStore, produce } from 'solid-js/store';
import { useParams, useNavigate } from '@solidjs/router';
import { api } from '../../../api/client';
import { useCollectionData } from '../../../hooks/useCollectionData';
import { FormView, LineItem, SchemaField, ValidationError, ValidationProfile } from '../../../types/collection';
import { validateRecord, getCollectionErrors } from '../../../validation/validator';
import { FormViewSelector } from '../../FormViewSelector';
import { FormFields } from './formFields';
import Header from '../../../components/header';

type ActionType = 'CREATE' | 'UPDATE';

// Convert a raw form string value to the type the backend expects for this field
const coerceFieldValue = (field: SchemaField | undefined, value: string): unknown => {
  switch (field?.type) {
    case 'NUMBER':
      return value === '' ? 0 : Number(value);
    case 'BOOL':
      return value === 'true' || value === '1';
    default:
      return value;
  }
};

// Page for both creating and editing a record, mirroring how CollectionEditor
// handles create/edit-schema with one component keyed off the route params.
export function RecordFormPage() {
  const params = useParams();
  const navigate = useNavigate();
  const name = () => params.name ?? '';
  const isEditMode = () => !!params.id;
  const actionType = (): ActionType => isEditMode() ? 'UPDATE' : 'CREATE';

  const { collection, fetchCollection, fieldsMap, getTableFields, getSections, getFieldsForSection } = useCollectionData(name);

  const [formData, setFormData] = createStore<Record<string, string>>({});
  const [lineItems, setLineItems] = createStore<Record<string, LineItem[]>>({});
  const [recordId, setRecordId] = createSignal<number | null>(null);

  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);
  const [saving, setSaving] = createSignal(false);
  const [validationErrors, setValidationErrors] = createSignal<ValidationError[]>([]);

  const [formViews, setFormViews] = createSignal<FormView[]>([]);
  const [selectedViewId, setSelectedViewId] = createSignal<number | null>(null);
  const [validationProfiles, setValidationProfiles] = createSignal<ValidationProfile[]>([]);

  const fetchFormViews = async () => {
    const response = await api.listFormViews(name());
    if (response.data) {
      setFormViews(response.data);
      const defaultView = response.data.find(v => v.is_default && (v.action_type === actionType() || v.action_type === 'ALL'));
      if (defaultView?.id) setSelectedViewId(defaultView.id);
    }
  };

  const fetchValidationProfiles = async () => {
    const response = await api.listValidationProfiles(name());
    if (response.data) setValidationProfiles(response.data);
  };

  const getActiveFormView = (at: ActionType): FormView | null => {
    const viewId = selectedViewId();
    if (!viewId) return null;
    return formViews().find(v => v.id === viewId && (v.action_type === at || v.action_type === 'ALL')) || null;
  };

  const getFormViewsForAction = (at: ActionType) => {
    return formViews().filter(v => v.action_type === at || v.action_type === 'ALL');
  };

  const validateFormData = (data: Record<string, string>): ValidationError[] => {
    const profiles = validationProfiles().filter(p =>
      p.is_active && (p.action_type === actionType() || p.action_type === 'ALL')
    );
    if (profiles.length === 0) return [];

    const coerced: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      coerced[key] = coerceFieldValue(fieldsMap().get(key), value);
    }

    let allErrors: ValidationError[] = [];
    for (const profile of profiles) {
      const result = validateRecord(
        {
          field_rules: profile.field_rules,
          section_rules: profile.section_rules,
          collection_rules: profile.collection_rules,
        },
        fieldsMap(),
        coerced,
        actionType()
      );
      allErrors = [...allErrors, ...result.errors];
    }
    return allErrors;
  };

  const loadLineItems = async (id: number) => {
    const tableFields = getTableFields();
    const responses = await Promise.all(tableFields.map(field => api.listLineItems(name(), id, field.name)));
    responses.forEach((response, i) => {
      if (response.data) setLineItems(tableFields[i].name, response.data as LineItem[]);
    });
  };

  onMount(async () => {
    setLoading(true);
    await Promise.all([fetchCollection(), fetchFormViews(), fetchValidationProfiles()]);

    if (isEditMode() && params.id) {
      const id = Number(params.id);
      const response = await api.listRecords(name());
      const record = response.data?.find(r => String(r.id) === params.id);
      if (record) {
        setRecordId(id);
        for (const [key, value] of Object.entries(record)) {
          if (key !== 'id') setFormData(key, String(value ?? ''));
        }
        await loadLineItems(id);
      } else {
        setError(`Record ${params.id} not found`);
      }
    }
    setLoading(false);
  });

  const getField = (columnName: string): SchemaField | undefined => fieldsMap().get(columnName);

  // Line item handlers — LineItemsTable's isNewRecord flag is ignored here since
  // this page is always exclusively one mode or the other for its whole lifetime.
  const addLineItem = (fieldName: string) => {
    const field = getField(fieldName);
    if (!field || !field.table_fields) return;

    const newItem: LineItem = {};
    for (const tf of field.table_fields) {
      newItem[tf.name] = tf.type === 'NUMBER' ? 0 : tf.type === 'BOOL' ? false : '';
    }
    setLineItems(produce(items => {
      if (!items[fieldName]) items[fieldName] = [];
      items[fieldName].push(newItem);
    }));
  };

  const updateLineItem = async (fieldName: string, index: number, key: string, value: unknown) => {
    setLineItems(fieldName, index, key, value);
    const item = lineItems[fieldName]?.[index];
    const id = recordId();
    if (isEditMode() && item?.id && id) {
      await api.updateLineItem(name(), id, fieldName, item.id, { [key]: value });
    }
  };

  const deleteLineItem = async (fieldName: string, index: number) => {
    const item = lineItems[fieldName]?.[index];
    const id = recordId();
    if (isEditMode() && item?.id && id) {
      await api.deleteLineItem(name(), id, fieldName, item.id);
    }
    setLineItems(produce(items => {
      items[fieldName]?.splice(index, 1);
    }));
  };

  const saveNewLineItem = async (fieldName: string, index: number) => {
    const id = recordId();
    if (!id) return;
    const item = lineItems[fieldName]?.[index];
    if (!item || item.id) return;
    const response = await api.createLineItem(name(), id, fieldName, item);
    if (response.data) setLineItems(fieldName, index, response.data as LineItem);
  };

  const handleCancel = () => navigate(`/collection/${name()}`);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();

    const errors = validateFormData(formData);
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }
    setValidationErrors([]);
    setSaving(true);

    const data: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(formData)) {
      if (key === 'id') continue;
      data[key] = coerceFieldValue(getField(key), value);
    }

    if (isEditMode()) {
      const id = recordId();
      if (!id) { setSaving(false); return; }
      const response = await api.updateRecord(name(), id, data);
      setSaving(false);
      if (response.error) {
        setError(response.error);
      } else {
        navigate(`/collection/${name()}`);
      }
    } else {
      const response = await api.createRecord(name(), data);
      if (response.error) {
        setSaving(false);
        setError(response.error);
        return;
      }
      const newRecordData = response.data;
      if (newRecordData && newRecordData.id) {
        const newId = newRecordData.id as number;
        const rowsToCreate = getTableFields().flatMap(field =>
          (lineItems[field.name] || [])
            .filter(item => Object.keys(item).some(k => k !== 'id' && k !== 'parent_id' && k !== 'row_order' && item[k]))
            .map(item => ({ fieldName: field.name, item }))
        );
        await Promise.all(rowsToCreate.map(({ fieldName, item }) => api.createLineItem(name(), newId, fieldName, item)));
      }
      setSaving(false);
      navigate(`/collection/${name()}`);
    }
  };

  return (
    <div class="record-form-page">
      <Header
        back={true}
        title={isEditMode() ? `Edit Record (ID: ${params.id})` : `Add Record: ${name()}`}
      >

        <FormViewSelector
          views={getFormViewsForAction(actionType())}
          selectedViewId={selectedViewId()}
          onSelect={setSelectedViewId}
        />
      </Header>

      <Show when={error()}>
        <div class="error-banner">{error()}</div>
      </Show>

      <Show when={validationErrors().length > 0 && getCollectionErrors(validationErrors()).length > 0}>
        <div class="validation-error-banner">
          <h4>Validation Errors</h4>
          <ul class="validation-error-list">
            <For each={getCollectionErrors(validationErrors())}>
              {(err) => <li>{err.message}</li>}
            </For>
          </ul>
        </div>
      </Show>

      <Show when={!loading() && collection()}>
        <form onSubmit={handleSubmit}>
          <FormFields
            formData={formData}
            setFormData={setFormData}
            isNewRecord={!isEditMode()}
            getSections={getSections}
            getFieldsForSection={getFieldsForSection}
            getTableFields={getTableFields}
            getActiveFormView={getActiveFormView}
            collection={collection()}
            lineItems={lineItems}
            newLineItems={lineItems}
            addLineItem={addLineItem}
            updateLineItem={updateLineItem}
            deleteLineItem={deleteLineItem}
            saveNewLineItem={saveNewLineItem}
          />
          <div class="form-actions">
            <button type="button" class="btn" onClick={handleCancel}>
              Cancel
            </button>
            <button type="submit" class="btn btn-primary" disabled={saving()}>
              {saving() ? 'Saving...' : isEditMode() ? 'Save Changes' : 'Create'}
            </button>
          </div>
        </form>
      </Show>
    </div>
  );
}
