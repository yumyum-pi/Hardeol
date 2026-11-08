import { createMemo, createSignal, For, onMount, Show } from 'solid-js';
import { createStore } from 'solid-js/store';
import { api } from '../../../api/client';
import { SchemaField, FormView, ActionType, FormFieldConfig, Section } from '../../../types/collection';
import { useParams, useNavigate } from '@solidjs/router';
import { FieldRowState } from './form-view-field-row';
import { FormViewSection, FormViewSectionGroup } from './form-view-section';

const defaultFieldState = (order: number): FieldRowState => ({
  visible: true,
  order,
  label: '',
  placeholder: '',
  helpText: '',
  readOnly: false,
  defaultValue: '',
  width: 'full',
});

export function FormViewEditor() {
  const params = useParams();
  const navigate = useNavigate();
  const collectionName = () => params.name ?? '';
  const formID = () => params.formID ?? '';

  const isEdit = createMemo(() => formID() !== 'new');

  const [editingView, setEditingView] = createSignal<FormView | null>(null);
  const [viewName, setViewName] = createSignal('');
  const [actionType, setActionType] = createSignal<ActionType>('ALL');
  const [isDefault, setIsDefault] = createSignal(false);
  const [validationProfileId, setValidationProfileId] = createSignal<number | null>(null);
  const [fieldConfigs, setFieldConfigs] = createStore<Record<string, FieldRowState>>({});
  const [tableColumnConfigs, setTableColumnConfigs] = createStore<Record<string, Record<string, FieldRowState>>>({});
  const [expandedTableFields, setExpandedTableFields] = createStore<Record<string, boolean>>({});
  const [error, setError] = createSignal<string | null>(null);

  // Available fields (excluding 'id' since it's system-managed)
  const [availableFields, SetAvailableFrields] = createSignal<SchemaField[]>([])
  const [collectionSections, setCollectionSections] = createSignal<Section[]>([])

  onMount(async () => {
    const id = await fetchCollection()

    if (id != -1) {
      if (isEdit()) {
        fetchFormView()
      } else {
        initializeFieldsForCreate()
      }
    }
  })
  const fetchCollection = async () => {
    const response = await api.getCollectionSchema(collectionName());
    if (response.data) {
      SetAvailableFrields(response.data.fields.filter(f => f.name !== 'id'))
      setCollectionSections(response.data.sections ?? [])
      return response.data.id
    }
    return -1;
  }

  const fetchFormView = async () => {
    const response = await api.getFormViewByID(collectionName(), formID());
    if (response.data && response.data.id) {
      setEditingView(response.data)
      setViewName(response.data.name)
      setActionType(response.data.action_type)
      setIsDefault(response.data.is_default)
      setValidationProfileId(response.data.validation_profile_id ?? null)
      initializeFieldsForEdit(response.data)
    } else {
      initializeFieldsForCreate()
    };
  }

  const initializeFieldsForEdit = (view: FormView) => {
    const initial: Record<string, FieldRowState> = {};
    const tableInitial: Record<string, Record<string, FieldRowState>> = {};

    availableFields().forEach((f, idx) => {
      const viewField = view.fields.find(vf => vf.name === f.name);
      initial[f.name] = {
        visible: viewField?.visible ?? true,
        order: viewField?.order ?? idx,
        label: viewField?.label ?? '',
        placeholder: viewField?.placeholder ?? '',
        helpText: viewField?.help_text ?? '',
        readOnly: viewField?.read_only ?? false,
        defaultValue: viewField?.default_value ?? '',
        width: viewField?.width ?? 'full',
      };

      if (f.type === 'TABLE') {
        const columnStates: Record<string, FieldRowState> = {};
        (f.table_fields ?? []).forEach((col, colIdx) => {
          const viewColumn = viewField?.table_fields?.find(vc => vc.name === col.name);
          columnStates[col.name] = {
            visible: viewColumn?.visible ?? true,
            order: viewColumn?.order ?? colIdx,
            label: viewColumn?.label ?? '',
            placeholder: viewColumn?.placeholder ?? '',
            helpText: viewColumn?.help_text ?? '',
            readOnly: viewColumn?.read_only ?? false,
            defaultValue: viewColumn?.default_value ?? '',
            width: viewColumn?.width ?? 'full',
          };
        });
        tableInitial[f.name] = columnStates;
      }
    });

    for (const [key, value] of Object.entries(initial)) {
      setFieldConfigs(key, value);
    }
    for (const [key, value] of Object.entries(tableInitial)) {
      setTableColumnConfigs(key, value);
    }
  };

  const initializeFieldsForCreate = () => {
    const initial: Record<string, FieldRowState> = {};
    const tableInitial: Record<string, Record<string, FieldRowState>> = {};

    availableFields().forEach((f, idx) => {
      initial[f.name] = defaultFieldState(idx);

      if (f.type === 'TABLE') {
        const columnStates: Record<string, FieldRowState> = {};
        (f.table_fields ?? []).forEach((col, colIdx) => {
          columnStates[col.name] = defaultFieldState(colIdx);
        });
        tableInitial[f.name] = columnStates;
      }
    });

    for (const [key, value] of Object.entries(initial)) {
      setFieldConfigs(key, value);
    }
    for (const [key, value] of Object.entries(tableInitial)) {
      setTableColumnConfigs(key, value);
    }
  };

  const moveField = (fieldName: string, direction: 'up' | 'down') => {
    const fields = availableFields();
    const currentOrder = fieldConfigs[fieldName]?.order ?? 0;
    const newOrder = direction === 'up' ? currentOrder - 1 : currentOrder + 1;

    // Find the field that has the target order
    const swapField = fields.find(f => (fieldConfigs[f.name]?.order ?? 0) === newOrder);

    if (swapField) {
      setFieldConfigs(swapField.name, 'order', currentOrder);
    }
    setFieldConfigs(fieldName, 'order', newOrder);
  };

  const sortedAvailableFields = () => {
    return [...availableFields()].sort((a, b) => {
      const orderA = fieldConfigs[a.name]?.order ?? 0;
      const orderB = fieldConfigs[b.name]?.order ?? 0;
      return orderA - orderB;
    });
  };

  // Group fields by their collection section, mirroring the collection schema
  // editor's layout. Fields with no section (or an orphaned section_id) are
  // merged into the first section, matching how the schema editor treats them.
  const groupedSections = createMemo<FormViewSectionGroup[]>(() => {
    const sortedSections = [...collectionSections()].sort((a, b) => a.order - b.order);
    const sectionIdToIndex = new Map<number, number>();
    sortedSections.forEach((s, idx) => {
      if (s.id !== undefined) sectionIdToIndex.set(s.id, idx);
    });

    const sectionFields: SchemaField[][] = sortedSections.map(() => []);
    const unsectioned: SchemaField[] = [];

    sortedAvailableFields().forEach(f => {
      const idx = f.section_id != null ? sectionIdToIndex.get(f.section_id) : undefined;
      if (idx !== undefined) {
        sectionFields[idx].push(f);
      } else {
        unsectioned.push(f);
      }
    });

    if (sortedSections.length === 0) {
      return unsectioned.length > 0 ? [{ id: null, name: 'Fields', fields: unsectioned }] : [];
    }

    return sortedSections.map((s, idx) => ({
      id: s.id ?? null,
      name: s.name,
      fields: idx === 0 ? [...sectionFields[0], ...unsectioned] : sectionFields[idx],
    }));
  });

  const toggleTableExpanded = (fieldName: string) => {
    setExpandedTableFields(fieldName, !(expandedTableFields[fieldName] ?? false));
  };

  const updateTableColumn = <K extends keyof FieldRowState>(fieldName: string, columnName: string, key: K, value: FieldRowState[K]) => {
    setTableColumnConfigs(fieldName, columnName, key, value as never);
  };

  const moveTableColumn = (fieldName: string, columnName: string, direction: 'up' | 'down') => {
    const field = availableFields().find(f => f.name === fieldName);
    const columns = field?.table_fields ?? [];
    const columnConfigs = tableColumnConfigs[fieldName] ?? {};
    const currentOrder = columnConfigs[columnName]?.order ?? 0;
    const newOrder = direction === 'up' ? currentOrder - 1 : currentOrder + 1;

    const swapColumn = columns.find(c => (columnConfigs[c.name]?.order ?? 0) === newOrder);
    if (swapColumn) {
      setTableColumnConfigs(fieldName, swapColumn.name, 'order', currentOrder);
    }
    setTableColumnConfigs(fieldName, columnName, 'order', newOrder);
  };

  async function handleSave() {
    setError(null);
    const name = viewName().trim();
    if (!name) {
      setError('View name is required');
      return;
    }

    const fields: FormFieldConfig[] = [];
    for (const [fieldName, config] of Object.entries(fieldConfigs)) {
      const schemaField = availableFields().find(f => f.name === fieldName);

      const fieldConfig: FormFieldConfig = {
        name: fieldName,
        order: config.order,
        visible: config.visible,
        label: config.label || undefined,
        placeholder: config.placeholder || undefined,
        help_text: config.helpText || undefined,
        read_only: config.readOnly,
        default_value: config.defaultValue || undefined,
        width: config.width,
      };

      if (schemaField?.type === 'TABLE') {
        const columns = Object.entries(tableColumnConfigs[fieldName] ?? {})
          .map(([columnName, colConfig]): FormFieldConfig => ({
            name: columnName,
            order: colConfig.order,
            visible: colConfig.visible,
            label: colConfig.label || undefined,
            placeholder: colConfig.placeholder || undefined,
            help_text: colConfig.helpText || undefined,
            read_only: colConfig.readOnly,
            default_value: colConfig.defaultValue || undefined,
            width: colConfig.width,
          }))
          .sort((a, b) => a.order - b.order);

        if (columns.length > 0) {
          fieldConfig.table_fields = columns;
        }
      }

      fields.push(fieldConfig);
    }

    if (!fields.some(f => f.visible)) {
      setError('At least one field must be visible');
      return;
    }

    fields.sort((a, b) => a.order - b.order);

    const viewData = {
      name,
      action_type: actionType(),
      fields,
      is_default: isDefault(),
      validation_profile_id: validationProfileId(),
    };

    let response;
    if (isEdit()) {
      const view = editingView();
      if (!view?.id) return;
      response = await api.updateFormView(collectionName(), view.id, viewData);
    } else {
      response = await api.createFormView(collectionName(), viewData);
    }

    if (response.error) {
      setError(response.error);
    } else {
      navigate(`/collection/${collectionName()}/form-views`);
    }
  }

  return (
    <div class="form-view-manager-modal">
      <Show when={error()}>
        <div class="error-banner">{error()}</div>
      </Show>

      <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
        <div class="form-row">
          <div class="form-group" style="flex: 1;">
            <label>View Name</label>
            <input
              type="text"
              value={viewName()}
              onInput={(e) => setViewName(e.currentTarget.value)}
              placeholder="e.g., Quick Create Form"
            />
          </div>

          <div class="form-group">
            <label>Applies To</label>
            <select
              value={actionType()}
              onChange={(e) => setActionType(e.currentTarget.value as ActionType)}
            >
              <option value="ALL">Both Create & Update</option>
              <option value="CREATE">Create Only</option>
              <option value="UPDATE">Update Only</option>
            </select>
          </div>

        </div>

        <div class="form-group">
          <label class="checkbox-label">
            <input
              type="checkbox"
              checked={isDefault()}
              onChange={(e) => setIsDefault(e.currentTarget.checked)}
            />
            Set as default for {actionType() === 'ALL' ? 'all forms' : actionType().toLowerCase() + ' forms'}
          </label>
        </div>

        <For each={groupedSections()}>
          {(group) => (
            <FormViewSection
              group={group}
              fieldConfigs={fieldConfigs}
              onUpdateField={(fieldName, key, value) => setFieldConfigs(fieldName, key, value as never)}
              moveField={moveField}
              expandedTableFields={expandedTableFields}
              toggleTableExpanded={toggleTableExpanded}
              tableColumnConfigs={tableColumnConfigs}
              onUpdateTableColumn={updateTableColumn}
              moveTableColumn={moveTableColumn}
            />
          )}
        </For>

        <details class="advanced-config">
          <summary>Advanced Field Options</summary>
          <div class="advanced-fields">
            <For each={sortedAvailableFields()}>
              {(field) => (
                <Show when={fieldConfigs[field.name]?.visible}>
                  <div class="advanced-field-row">
                    <span class="advanced-field-name">{field.name}</span>
                    <div class="advanced-field-inputs">
                      <div class="form-group">
                        <label>Help Text</label>
                        <input
                          type="text"
                          value={fieldConfigs[field.name]?.helpText ?? ''}
                          onInput={(e) => setFieldConfigs(field.name, 'helpText', e.currentTarget.value)}
                          placeholder="Help text shown below field"
                        />
                      </div>
                      <div class="form-group">
                        <label>Default Value</label>
                        <input
                          type="text"
                          value={fieldConfigs[field.name]?.defaultValue ?? ''}
                          onInput={(e) => setFieldConfigs(field.name, 'defaultValue', e.currentTarget.value)}
                          placeholder="Default value for new records"
                        />
                      </div>
                    </div>
                  </div>
                </Show>
              )}
            </For>
          </div>
        </details>

        <div class="form-actions">
          <button type="submit" class="btn btn-primary">
            {!isEdit() ? 'Create Form View' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
