import { createSignal, For, Show } from 'solid-js';
import { createStore } from 'solid-js/store';
import { api } from '../../../api/client';
import { FilterOperator, FilterRule, SchemaField, TableView, ViewField } from '../../../types/collection';
import { needsValue, OPERATOR_LABELS, OPERATORS_BY_TYPE } from '../../../utils/filters';
import { isQuickFilterable } from '../../../utils/quickFilters';
import "./table-view.css";

interface ViewManagerProps {
  collectionName: string;
  schemaFields: SchemaField[];
  views: TableView[];
  onClose: () => void;
  onViewsChanged: () => void;
}

export function TableViewManager(props: ViewManagerProps) {
  const [editingView, setEditingView] = createSignal<TableView | null>(null);
  const [isCreating, setIsCreating] = createSignal(false);
  const [viewName, setViewName] = createSignal('');
  const [isDefault, setIsDefault] = createSignal(false);
  const [selectedFields, setSelectedFields] = createStore<Record<string, { selected: boolean; order: number; cssClass: string }>>({});
  const [filterRules, setFilterRules] = createSignal<FilterRule[]>([]);
  const [visibleFilterFields, setVisibleFilterFields] = createStore<Record<string, { selected: boolean; order: number; cssClass: string }>>({});
  const [error, setError] = createSignal<string | null>(null);

  // Available fields (excluding 'id' since it's always included)
  const availableFields = () => props.schemaFields.filter(f => f.type !== 'TABLE');

  // Fields eligible to appear as a user-level quick-filter widget (same eligibility
  // rule as the listing page's quick-filter bar).
  const filterableFields = () => props.schemaFields.filter(f => isQuickFilterable(f.type));

  const fieldByName = (name: string) => props.schemaFields.find(f => f.name === name);

  const addFilterRule = () => {
    const first = availableFields()[0];
    if (!first) return;
    setFilterRules([...filterRules(), { field: first.name, operator: OPERATORS_BY_TYPE[first.type][0], value: '' }]);
  };

  const updateFilterRule = (index: number, updates: Partial<FilterRule>) => {
    setFilterRules(filterRules().map((rule, i) => (i === index ? { ...rule, ...updates } : rule)));
  };

  const handleFilterFieldChange = (index: number, fieldName: string) => {
    const field = fieldByName(fieldName);
    const operator = field ? OPERATORS_BY_TYPE[field.type][0] : 'equals';
    updateFilterRule(index, { field: fieldName, operator: operator as FilterOperator, value: '' });
  };

  const removeFilterRule = (index: number) => {
    setFilterRules(filterRules().filter((_, i) => i !== index));
  };

  const initializeFieldsForEdit = (view: TableView) => {
    // Reset all fields
    const initial: Record<string, { selected: boolean; order: number; cssClass: string }> = {};
    availableFields().forEach((f, idx) => {
      const viewField = view.fields.find(vf => vf.name === f.name);
      initial[f.name] = {
        selected: !!viewField,
        order: viewField?.order ?? idx,
        cssClass: viewField?.css_class ?? '',
      };
    });
    // Use batch update
    for (const [key, value] of Object.entries(initial)) {
      setSelectedFields(key, value);
    }
  };

  const initializeFieldsForCreate = () => {
    const initial: Record<string, { selected: boolean; order: number; cssClass: string }> = {};
    availableFields().forEach((f, idx) => {
      initial[f.name] = {
        selected: true,
        order: idx,
        cssClass: '',
      };
    });
    for (const [key, value] of Object.entries(initial)) {
      setSelectedFields(key, value);
    }
  };

  const initializeVisibleFiltersForEdit = (view: TableView) => {
    const initial: Record<string, { selected: boolean; order: number; cssClass: string }> = {};
    filterableFields().forEach((f, idx) => {
      const vf = view.visible_filters?.find(x => x.name === f.name);
      initial[f.name] = {
        selected: !!vf,
        order: vf?.order ?? idx,
        cssClass: vf?.css_class ?? '',
      };
    });
    for (const [key, value] of Object.entries(initial)) {
      setVisibleFilterFields(key, value);
    }
  };

  const initializeVisibleFiltersForCreate = () => {
    const initial: Record<string, { selected: boolean; order: number; cssClass: string }> = {};
    filterableFields().forEach((f, idx) => {
      initial[f.name] = {
        // Opt-in: unlike columns, quick filters default OFF until explicitly enabled.
        selected: false,
        order: idx,
        cssClass: '',
      };
    });
    for (const [key, value] of Object.entries(initial)) {
      setVisibleFilterFields(key, value);
    }
  };

  const openCreate = () => {
    setEditingView(null);
    setIsCreating(true);
    setViewName('');
    setIsDefault(false);
    setFilterRules([]);
    initializeFieldsForCreate();
    initializeVisibleFiltersForCreate();
  };

  const openEdit = (view: TableView) => {
    setIsCreating(false);
    setEditingView(view);
    setViewName(view.name);
    setIsDefault(view.is_default);
    setFilterRules(view.filters ? [...view.filters] : []);
    initializeFieldsForEdit(view);
    initializeVisibleFiltersForEdit(view);
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

    // Build fields array from selected fields
    const fields: ViewField[] = [];
    for (const [fieldName, config] of Object.entries(selectedFields)) {
      if (config.selected) {
        fields.push({
          name: fieldName,
          order: config.order,
          css_class: config.cssClass || undefined,
        });
      }
    }

    if (fields.length === 0) {
      setError('At least one field must be selected');
      return;
    }

    // Sort by order
    fields.sort((a, b) => a.order - b.order);

    // Build visible_filters array from selected quick-filter fields (zero is valid, unlike columns)
    const visibleFilters: ViewField[] = [];
    for (const [fieldName, config] of Object.entries(visibleFilterFields)) {
      if (config.selected) {
        visibleFilters.push({
          name: fieldName,
          order: config.order,
          css_class: config.cssClass || undefined,
        });
      }
    }
    visibleFilters.sort((a, b) => a.order - b.order);

    const viewData = {
      name,
      fields,
      is_default: isDefault(),
      filters: filterRules(),
      visible_filters: visibleFilters,
    };

    let response;
    if (isCreating()) {
      response = await api.createView(props.collectionName, viewData);
    } else {
      const view = editingView();
      if (!view?.id) return;
      response = await api.updateView(props.collectionName, view.id, viewData);
    }

    if (response.error) {
      setError(response.error);
    } else {
      closeForm();
      props.onViewsChanged();
    }
  };

  const handleDelete = async (view: TableView) => {
    if (!view.id) return;
    if (!confirm(`Delete view "${view.name}"?`)) return;

    const response = await api.deleteView(props.collectionName, view.id);
    if (response.error) {
      setError(response.error);
    } else {
      props.onViewsChanged();
    }
  };

  const moveField = (fieldName: string, direction: 'up' | 'down') => {
    const fields = availableFields();
    const currentOrder = selectedFields[fieldName]?.order ?? 0;
    const newOrder = direction === 'up' ? currentOrder - 1 : currentOrder + 1;

    // Find the field that has the target order
    const swapField = fields.find(f => (selectedFields[f.name]?.order ?? 0) === newOrder);

    if (swapField) {
      setSelectedFields(swapField.name, 'order', currentOrder);
    }
    setSelectedFields(fieldName, 'order', newOrder);
  };

  const sortedAvailableFields = () => {
    return [...availableFields()].sort((a, b) => {
      const orderA = selectedFields[a.name]?.order ?? 0;
      const orderB = selectedFields[b.name]?.order ?? 0;
      return orderA - orderB;
    });
  };

  const moveVisibleFilterField = (fieldName: string, direction: 'up' | 'down') => {
    const fields = filterableFields();
    const currentOrder = visibleFilterFields[fieldName]?.order ?? 0;
    const newOrder = direction === 'up' ? currentOrder - 1 : currentOrder + 1;

    const swapField = fields.find(f => (visibleFilterFields[f.name]?.order ?? 0) === newOrder);

    if (swapField) {
      setVisibleFilterFields(swapField.name, 'order', currentOrder);
    }
    setVisibleFilterFields(fieldName, 'order', newOrder);
  };

  const sortedFilterableFields = () => {
    return [...filterableFields()].sort((a, b) => {
      const orderA = visibleFilterFields[a.name]?.order ?? 0;
      const orderB = visibleFilterFields[b.name]?.order ?? 0;
      return orderA - orderB;
    });
  };

  return (
    <div class="split-view">
      <div class="view-manager-modal card non-click height-full">
        <Show when={error()}>
          <div class="error-banner">{error()}</div>
        </Show>

        <div class="view-list">
          <Show when={props.views.length === 0}>
            <p class="empty-text">No saved views yet</p>
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
                <span class="view-field-count">{view.fields.length} fields</span>
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
          <button class="btn btn-primary" onClick={openCreate}>
            + New View
          </button>
        </div>
      </div>
      <Show when={isCreating() || editingView()}>
        <form class="card non-click height-full" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
          <div class="form-group">
            <label>View Name</label>
            <input
              type="text"
              value={viewName()}
              onInput={(e) => setViewName(e.currentTarget.value)}
              placeholder="e.g., Summary View"
            />
          </div>

          <div class="form-group">
            <label class="checkbox-label">
              <input
                type="checkbox"
                checked={isDefault()}
                onChange={(e) => setIsDefault(e.currentTarget.checked)}
              />
              Set as default view
            </label>
          </div>

          <div class="form-group">
            <label>Fields</label>
            <div class="field-selector table-container collection">
              <table class='data-table'>
                <thead>
                  <tr>
                    <th>Show</th>
                    <th>Field</th>
                    <th>Type</th>
                    <th>Class</th>
                    <th>Arrange</th>
                  </tr></thead>
                <tbody>
                  <For each={sortedAvailableFields()}>
                    {(field, index) => (
                      <tr >
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedFields[field.name]?.selected ?? false}
                            onChange={(e) => setSelectedFields(field.name, 'selected', e.currentTarget.checked)}
                          />
                        </td>
                        <td>{field.name}</td>
                        <td>{field.type}</td>
                        <td>
                          <input
                            type="text"
                            class="css-class-input"
                            placeholder="CSS class"
                            value={selectedFields[field.name]?.cssClass ?? ''}
                            onInput={(e) => setSelectedFields(field.name, 'cssClass', e.currentTarget.value)}
                          />
                        </td>
                        <td class="order-buttons">
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
                        </td>
                      </tr>
                    )}
                  </For></tbody>
              </table>
            </div>
          </div>

          <div class="form-group">
            <label>Visible Filters</label>
            <div class="field-selector table-container collection">
              <table class='data-table'>
                <thead>
                  <tr>
                    <th>Show</th>
                    <th>Field</th>
                    <th>Class</th>
                    <th>Arrange</th>
                  </tr></thead>
                <tbody>
                  <For each={sortedFilterableFields()}>
                    {(field, index) => (
                      <tr>
                        <td>
                          <input
                            type="checkbox"
                            checked={visibleFilterFields[field.name]?.selected ?? false}
                            onChange={(e) => setVisibleFilterFields(field.name, 'selected', e.currentTarget.checked)}
                          />
                        </td>
                        <td>{field.name}</td>
                        <td>
                          <input
                            type="text"
                            class="css-class-input"
                            placeholder="CSS class"
                            value={visibleFilterFields[field.name]?.cssClass ?? ''}
                            onInput={(e) => setVisibleFilterFields(field.name, 'cssClass', e.currentTarget.value)}
                          />
                        </td>
                        <td class="order-buttons">
                          <button
                            type="button"
                            class="btn btn-xs"
                            disabled={index() === 0}
                            onClick={() => moveVisibleFilterField(field.name, 'up')}
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            class="btn btn-xs"
                            disabled={index() === sortedFilterableFields().length - 1}
                            onClick={() => moveVisibleFilterField(field.name, 'down')}
                          >
                            ↓
                          </button>
                        </td>
                      </tr>
                    )}
                  </For></tbody>
              </table>
            </div>
          </div>

          <div class="form-group">
            <label>Filters</label>
            <div class="field-selector table-container collection">
              <table class='data-table'>
                <thead>
                  <tr>
                    <th>Field</th>
                    <th>Operator</th>
                    <th>Value</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  <For each={filterRules()}>
                    {(rule, index) => {
                      const field = () => fieldByName(rule.field);
                      return (
                        <tr>
                          <td>
                            <select
                              value={rule.field}
                              onChange={(e) => handleFilterFieldChange(index(), e.currentTarget.value)}
                            >
                              <For each={availableFields()}>
                                {(f) => <option value={f.name}>{f.name}</option>}
                              </For>
                            </select>
                          </td>
                          <td>
                            <select
                              value={rule.operator}
                              onChange={(e) => updateFilterRule(index(), { operator: e.currentTarget.value as FilterOperator })}
                            >
                              <For each={field() ? OPERATORS_BY_TYPE[field()!.type] : []}>
                                {(op) => <option value={op}>{OPERATOR_LABELS[op]}</option>}
                              </For>
                            </select>
                          </td>
                          <td>
                            <Show when={needsValue(rule.operator)}>
                              <Show
                                when={field()?.type === 'BOOL'}
                                fallback={
                                  <Show
                                    when={field()?.type === 'SELECT'}
                                    fallback={
                                      <input
                                        type={field()?.type === 'NUMBER' ? 'number' : field()?.type === 'DATE' ? 'date' : 'text'}
                                        value={rule.value ?? ''}
                                        onInput={(e) => updateFilterRule(index(), { value: e.currentTarget.value })}
                                      />
                                    }
                                  >
                                    <select
                                      value={rule.value ?? ''}
                                      onChange={(e) => updateFilterRule(index(), { value: e.currentTarget.value })}
                                    >
                                      <option value="">Select...</option>
                                      <For each={field()?.select_options ?? []}>
                                        {(opt) => <option value={opt}>{opt}</option>}
                                      </For>
                                    </select>
                                  </Show>
                                }
                              >
                                <select
                                  value={rule.value ?? ''}
                                  onChange={(e) => updateFilterRule(index(), { value: e.currentTarget.value })}
                                >
                                  <option value="true">true</option>
                                  <option value="false">false</option>
                                </select>
                              </Show>
                            </Show>
                          </td>
                          <td>
                            <button type="button" class="btn btn-xs btn-danger" onClick={() => removeFilterRule(index())}>
                              Remove
                            </button>
                          </td>
                        </tr>
                      );
                    }}
                  </For>
                </tbody>
              </table>
            </div>
            <button type="button" class="btn btn-sm" onClick={addFilterRule}>
              + Add Filter
            </button>
          </div>

          <div class="form-actions">
            <button type="button" class="btn" onClick={closeForm}>
              Cancel
            </button>
            <button type="submit" class="btn btn-primary">
              {isCreating() ? 'Create View' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Show>
    </div>
  );
}
