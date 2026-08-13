import { createSignal, For, Show } from 'solid-js';
import { createStore } from 'solid-js/store';
import { api, FormView, FormFieldConfig, SchemaField, ActionType, FieldWidth } from '../api/client';

interface FormViewManagerProps {
  collectionName: string;
  schemaFields: SchemaField[];
  views: FormView[];
  onClose: () => void;
  onViewsChanged: () => void;
}

interface FieldState {
  visible: boolean;
  order: number;
  label: string;
  placeholder: string;
  helpText: string;
  readOnly: boolean;
  defaultValue: string;
  width: FieldWidth;
}

export function FormViewManager(props: FormViewManagerProps) {
  const [editingView, setEditingView] = createSignal<FormView | null>(null);
  const [isCreating, setIsCreating] = createSignal(false);
  const [viewName, setViewName] = createSignal('');
  const [actionType, setActionType] = createSignal<ActionType>('ALL');
  const [isDefault, setIsDefault] = createSignal(false);
  const [fieldConfigs, setFieldConfigs] = createStore<Record<string, FieldState>>({});
  const [error, setError] = createSignal<string | null>(null);

  // Available fields (excluding 'id' since it's system-managed)
  const availableFields = () => props.schemaFields.filter(f => f.name !== 'id');

  const initializeFieldsForEdit = (view: FormView) => {
    const initial: Record<string, FieldState> = {};
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
    });
    for (const [key, value] of Object.entries(initial)) {
      setFieldConfigs(key, value);
    }
  };

  const initializeFieldsForCreate = () => {
    const initial: Record<string, FieldState> = {};
    availableFields().forEach((f, idx) => {
      initial[f.name] = {
        visible: true,
        order: idx,
        label: '',
        placeholder: '',
        helpText: '',
        readOnly: false,
        defaultValue: '',
        width: 'full',
      };
    });
    for (const [key, value] of Object.entries(initial)) {
      setFieldConfigs(key, value);
    }
  };

  const openCreate = () => {
    setEditingView(null);
    setIsCreating(true);
    setViewName('');
    setActionType('ALL');
    setIsDefault(false);
    initializeFieldsForCreate();
  };

  const openEdit = (view: FormView) => {
    setIsCreating(false);
    setEditingView(view);
    setViewName(view.name);
    setActionType(view.action_type);
    setIsDefault(view.is_default);
    initializeFieldsForEdit(view);
  };

  const closeForm = () => {
    setEditingView(null);
    setIsCreating(false);
    setError(null);
  };

  const handleSave = async () => {
    setError(null);
    const name = viewName().trim();
    if (!name) {
      setError('View name is required');
      return;
    }

    // Build fields array
    const fields: FormFieldConfig[] = [];
    for (const [fieldName, config] of Object.entries(fieldConfigs)) {
      fields.push({
        name: fieldName,
        order: config.order,
        visible: config.visible,
        label: config.label || undefined,
        placeholder: config.placeholder || undefined,
        help_text: config.helpText || undefined,
        read_only: config.readOnly,
        default_value: config.defaultValue || undefined,
        width: config.width,
      });
    }

    // Check at least one visible
    if (!fields.some(f => f.visible)) {
      setError('At least one field must be visible');
      return;
    }

    // Sort by order
    fields.sort((a, b) => a.order - b.order);

    const viewData = {
      name,
      action_type: actionType(),
      fields,
      is_default: isDefault(),
    };

    let response;
    if (isCreating()) {
      response = await api.createFormView(props.collectionName, viewData);
    } else {
      const view = editingView();
      if (!view?.id) return;
      response = await api.updateFormView(props.collectionName, view.id, viewData);
    }

    if (response.error) {
      setError(response.error);
    } else {
      closeForm();
      props.onViewsChanged();
    }
  };

  const handleDelete = async (view: FormView) => {
    if (!view.id) return;
    if (!confirm(`Delete form view "${view.name}"?`)) return;

    const response = await api.deleteFormView(props.collectionName, view.id);
    if (response.error) {
      setError(response.error);
    } else {
      props.onViewsChanged();
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

  const getActionTypeLabel = (at: ActionType) => {
    switch (at) {
      case 'CREATE': return 'Create Only';
      case 'UPDATE': return 'Update Only';
      case 'ALL': return 'Both';
    }
  };

  return (
    <div class="modal-overlay" onClick={props.onClose}>
      <div class="modal form-view-manager-modal" onClick={(e) => e.stopPropagation()}>
        <h3>Manage Form Views</h3>

        <Show when={error()}>
          <div class="error-banner">{error()}</div>
        </Show>

        <Show when={!isCreating() && !editingView()}>
          <div class="view-list">
            <Show when={props.views.length === 0}>
              <p class="empty-text">No saved form views yet</p>
            </Show>
            <For each={props.views}>
              {(view) => (
                <div class="view-item">
                  <span class="view-name">
                    {view.name}
                    <Show when={view.is_default}>
                      <span class="default-badge">Default</span>
                    </Show>
                  </span>
                  <span class="view-action-type">{getActionTypeLabel(view.action_type)}</span>
                  <span class="view-field-count">{view.fields.filter(f => f.visible).length} fields</span>
                  <div class="view-actions">
                    <button class="btn btn-sm" onClick={() => openEdit(view)}>
                      Edit
                    </button>
                    <button class="btn btn-danger btn-sm" onClick={() => handleDelete(view)}>
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </For>
          </div>

          <div class="form-actions">
            <button class="btn" onClick={props.onClose}>
              Close
            </button>
            <button class="btn btn-primary" onClick={openCreate}>
              + New Form View
            </button>
          </div>
        </Show>

        <Show when={isCreating() || editingView()}>
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

            <div class="form-group">
              <label>Field Configuration</label>
              <div class="field-config-table">
                <div class="field-config-header">
                  <span class="fc-visible">Show</span>
                  <span class="fc-name">Field</span>
                  <span class="fc-label">Label Override</span>
                  <span class="fc-placeholder">Placeholder</span>
                  <span class="fc-width">Width</span>
                  <span class="fc-readonly">Read-Only</span>
                  <span class="fc-order">Order</span>
                </div>
                <For each={sortedAvailableFields()}>
                  {(field, index) => (
                    <div class="field-config-row">
                      <span class="fc-visible">
                        <input
                          type="checkbox"
                          checked={fieldConfigs[field.name]?.visible ?? true}
                          onChange={(e) => setFieldConfigs(field.name, 'visible', e.currentTarget.checked)}
                        />
                      </span>
                      <span class="fc-name">{field.name}</span>
                      <span class="fc-label">
                        <input
                          type="text"
                          value={fieldConfigs[field.name]?.label ?? ''}
                          onInput={(e) => setFieldConfigs(field.name, 'label', e.currentTarget.value)}
                          placeholder={field.name}
                        />
                      </span>
                      <span class="fc-placeholder">
                        <input
                          type="text"
                          value={fieldConfigs[field.name]?.placeholder ?? ''}
                          onInput={(e) => setFieldConfigs(field.name, 'placeholder', e.currentTarget.value)}
                          placeholder="Placeholder..."
                        />
                      </span>
                      <span class="fc-width">
                        <select
                          value={fieldConfigs[field.name]?.width ?? 'full'}
                          onChange={(e) => setFieldConfigs(field.name, 'width', e.currentTarget.value as FieldWidth)}
                        >
                          <option value="full">Full</option>
                          <option value="half">Half</option>
                          <option value="third">Third</option>
                        </select>
                      </span>
                      <span class="fc-readonly">
                        <input
                          type="checkbox"
                          checked={fieldConfigs[field.name]?.readOnly ?? false}
                          onChange={(e) => setFieldConfigs(field.name, 'readOnly', e.currentTarget.checked)}
                        />
                      </span>
                      <span class="fc-order">
                        <div class="order-buttons">
                          <button
                            type="button"
                            class="btn btn-xs"
                            disabled={index() === 0}
                            onClick={() => moveField(field.name, 'up')}
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            class="btn btn-xs"
                            disabled={index() === sortedAvailableFields().length - 1}
                            onClick={() => moveField(field.name, 'down')}
                          >
                            ↓
                          </button>
                        </div>
                      </span>
                    </div>
                  )}
                </For>
              </div>
            </div>

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
              <button type="button" class="btn" onClick={closeForm}>
                Cancel
              </button>
              <button type="submit" class="btn btn-primary">
                {isCreating() ? 'Create Form View' : 'Save Changes'}
              </button>
            </div>
          </form>
        </Show>
      </div>
    </div>
  );
}
