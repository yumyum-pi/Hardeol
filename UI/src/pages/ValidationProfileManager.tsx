import { createSignal, For, Show } from 'solid-js';
import { createStore } from 'solid-js/store';
import { api } from '../api/client';
import {
  ValidationProfile,
  FieldRule,
  SectionRule,
  CollectionRule,
  SchemaField,
  Section,
  ActionType,
} from '../types/collection';

interface ValidationProfileManagerProps {
  collectionName: string;
  schemaFields: SchemaField[];
  sections: Section[];
  profiles: ValidationProfile[];
  onClose: () => void;
  onProfilesChanged: () => void;
}

interface FieldRuleState {
  enabled: boolean;
  min_length?: number;
  max_length?: number;
  regex?: string;
  min?: number;
  max?: number;
  integer_only: boolean;
  min_date?: string;
  max_date?: string;
  min_rows?: number;
  max_rows?: number;
  custom_expr?: string;
  error_message?: string;
}

export function ValidationProfileManager(props: ValidationProfileManagerProps) {
  const [editingProfile, setEditingProfile] = createSignal<ValidationProfile | null>(null);
  const [isCreating, setIsCreating] = createSignal(false);
  const [profileName, setProfileName] = createSignal('');
  const [actionType, setActionType] = createSignal<ActionType>('ALL');
  const [isActive, setIsActive] = createSignal(true);
  const [fieldRules, setFieldRules] = createStore<Record<string, FieldRuleState>>({});
  const [collectionRules, setCollectionRules] = createStore<CollectionRule[]>([]);
  const [error, setError] = createSignal<string | null>(null);
  const [activeTab, setActiveTab] = createSignal<'fields' | 'sections' | 'collection'>('fields');

  // Available fields (excluding 'id')
  const availableFields = () => props.schemaFields.filter(f => f.name !== 'id');

  const getFieldType = (fieldName: string) => {
    const field = props.schemaFields.find(f => f.name === fieldName);
    return field?.type || 'TEXT';
  };

  const initializeFieldRulesForEdit = (profile: ValidationProfile) => {
    const initial: Record<string, FieldRuleState> = {};
    availableFields().forEach(f => {
      const rule = profile.field_rules.find(r => r.field_name === f.name);
      initial[f.name] = {
        enabled: !!rule,
        min_length: rule?.min_length,
        max_length: rule?.max_length,
        regex: rule?.regex,
        min: rule?.min,
        max: rule?.max,
        integer_only: rule?.integer_only || false,
        min_date: rule?.min_date,
        max_date: rule?.max_date,
        min_rows: rule?.min_rows,
        max_rows: rule?.max_rows,
        custom_expr: rule?.custom_expr,
        error_message: rule?.error_message,
      };
    });
    for (const [key, value] of Object.entries(initial)) {
      setFieldRules(key, value);
    }
    setCollectionRules(profile.collection_rules || []);
  };

  const initializeFieldRulesForCreate = () => {
    const initial: Record<string, FieldRuleState> = {};
    availableFields().forEach(f => {
      initial[f.name] = {
        enabled: false,
        integer_only: false,
      };
    });
    for (const [key, value] of Object.entries(initial)) {
      setFieldRules(key, value);
    }
    setCollectionRules([]);
  };

  const openCreate = () => {
    setEditingProfile(null);
    setIsCreating(true);
    setProfileName('');
    setActionType('ALL');
    setIsActive(true);
    setActiveTab('fields');
    initializeFieldRulesForCreate();
  };

  const openEdit = (profile: ValidationProfile) => {
    setIsCreating(false);
    setEditingProfile(profile);
    setProfileName(profile.name);
    setActionType(profile.action_type);
    setIsActive(profile.is_active);
    setActiveTab('fields');
    initializeFieldRulesForEdit(profile);
  };

  const closeForm = () => {
    setEditingProfile(null);
    setIsCreating(false);
    setError(null);
  };

  const handleSave = async () => {
    setError(null);
    const name = profileName().trim();
    if (!name) {
      setError('Profile name is required');
      return;
    }

    // Build field rules array
    const fieldRulesArray: FieldRule[] = [];
    for (const [fieldName, config] of Object.entries(fieldRules)) {
      if (config.enabled) {
        const rule: FieldRule = {
          field_name: fieldName,
        };
        if (config.min_length !== undefined) rule.min_length = config.min_length;
        if (config.max_length !== undefined) rule.max_length = config.max_length;
        if (config.regex) rule.regex = config.regex;
        if (config.min !== undefined) rule.min = config.min;
        if (config.max !== undefined) rule.max = config.max;
        if (config.integer_only) rule.integer_only = config.integer_only;
        if (config.min_date) rule.min_date = config.min_date;
        if (config.max_date) rule.max_date = config.max_date;
        if (config.min_rows !== undefined) rule.min_rows = config.min_rows;
        if (config.max_rows !== undefined) rule.max_rows = config.max_rows;
        if (config.custom_expr) rule.custom_expr = config.custom_expr;
        if (config.error_message) rule.error_message = config.error_message;
        fieldRulesArray.push(rule);
      }
    }

    const profileData = {
      name,
      action_type: actionType(),
      is_active: isActive(),
      field_rules: fieldRulesArray,
      section_rules: [] as SectionRule[],
      collection_rules: collectionRules,
    };

    let response;
    if (isCreating()) {
      response = await api.createValidationProfile(props.collectionName, profileData);
    } else {
      const profile = editingProfile();
      if (!profile?.id) return;
      response = await api.updateValidationProfile(props.collectionName, profile.id, profileData);
    }

    if (response.error) {
      setError(response.error);
    } else {
      closeForm();
      props.onProfilesChanged();
    }
  };

  const handleDelete = async (profile: ValidationProfile) => {
    if (!profile.id) return;
    if (!confirm(`Delete validation profile "${profile.name}"?`)) return;

    const response = await api.deleteValidationProfile(props.collectionName, profile.id);
    if (response.error) {
      setError(response.error);
    } else {
      props.onProfilesChanged();
    }
  };

  const addUniquenessRule = () => {
    setCollectionRules([...collectionRules, {
      rule_type: 'uniqueness',
      unique_fields: [],
    }]);
  };

  const addCustomRule = () => {
    setCollectionRules([...collectionRules, {
      rule_type: 'custom',
      custom_expr: '',
    }]);
  };

  const removeCollectionRule = (index: number) => {
    setCollectionRules(collectionRules.filter((_, i) => i !== index));
  };

  const updateCollectionRule = (index: number, updates: Partial<CollectionRule>) => {
    setCollectionRules(index, { ...collectionRules[index], ...updates });
  };

  const toggleUniqueField = (ruleIndex: number, fieldName: string) => {
    const rule = collectionRules[ruleIndex];
    const fields = rule.unique_fields || [];
    if (fields.includes(fieldName)) {
      updateCollectionRule(ruleIndex, {
        unique_fields: fields.filter(f => f !== fieldName),
      });
    } else {
      updateCollectionRule(ruleIndex, {
        unique_fields: [...fields, fieldName],
      });
    }
  };

  const getActionTypeLabel = (at: ActionType) => {
    switch (at) {
      case 'CREATE': return 'Create Only';
      case 'UPDATE': return 'Update Only';
      case 'ALL': return 'Both';
    }
  };

  const renderFieldRuleEditor = (field: SchemaField) => {
    const fieldType = field.type;
    const config = fieldRules[field.name];
    if (!config) return null;

    return (
      <div class="field-rule-row">
        <div class="field-rule-header">
          <label class="checkbox-label">
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={(e) => setFieldRules(field.name, 'enabled', e.currentTarget.checked)}
            />
            <span class="field-rule-name">{field.name}</span>
            <span class="field-rule-type">{fieldType}</span>
          </label>
        </div>

        <Show when={config.enabled}>
          <div class="field-rule-options">
            {/* TEXT/EMAIL/URL rules */}
            <Show when={['TEXT', 'EMAIL', 'URL'].includes(fieldType)}>
              <div class="rule-option">
                <label>Min Length</label>
                <input
                  type="number"
                  min="0"
                  value={config.min_length ?? ''}
                  onInput={(e) => {
                    const val = e.currentTarget.value;
                    setFieldRules(field.name, 'min_length', val ? parseInt(val) : undefined);
                  }}
                />
              </div>
              <div class="rule-option">
                <label>Max Length</label>
                <input
                  type="number"
                  min="0"
                  value={config.max_length ?? ''}
                  onInput={(e) => {
                    const val = e.currentTarget.value;
                    setFieldRules(field.name, 'max_length', val ? parseInt(val) : undefined);
                  }}
                />
              </div>
              <div class="rule-option rule-option-wide">
                <label>Regex Pattern</label>
                <input
                  type="text"
                  value={config.regex ?? ''}
                  placeholder="e.g., ^[A-Z]+$"
                  onInput={(e) => setFieldRules(field.name, 'regex', e.currentTarget.value || undefined)}
                />
              </div>
            </Show>

            {/* NUMBER rules */}
            <Show when={fieldType === 'NUMBER'}>
              <div class="rule-option">
                <label>Min Value</label>
                <input
                  type="number"
                  value={config.min ?? ''}
                  onInput={(e) => {
                    const val = e.currentTarget.value;
                    setFieldRules(field.name, 'min', val ? parseFloat(val) : undefined);
                  }}
                />
              </div>
              <div class="rule-option">
                <label>Max Value</label>
                <input
                  type="number"
                  value={config.max ?? ''}
                  onInput={(e) => {
                    const val = e.currentTarget.value;
                    setFieldRules(field.name, 'max', val ? parseFloat(val) : undefined);
                  }}
                />
              </div>
              <div class="rule-option">
                <label class="checkbox-label">
                  <input
                    type="checkbox"
                    checked={config.integer_only}
                    onChange={(e) => setFieldRules(field.name, 'integer_only', e.currentTarget.checked)}
                  />
                  Integer Only
                </label>
              </div>
            </Show>

            {/* DATE rules */}
            <Show when={fieldType === 'DATE'}>
              <div class="rule-option">
                <label>Min Date</label>
                <input
                  type="text"
                  value={config.min_date ?? ''}
                  placeholder="e.g., now, now+7d, 2024-01-01"
                  onInput={(e) => setFieldRules(field.name, 'min_date', e.currentTarget.value || undefined)}
                />
              </div>
              <div class="rule-option">
                <label>Max Date</label>
                <input
                  type="text"
                  value={config.max_date ?? ''}
                  placeholder="e.g., now, now+30d"
                  onInput={(e) => setFieldRules(field.name, 'max_date', e.currentTarget.value || undefined)}
                />
              </div>
            </Show>

            {/* TABLE rules */}
            <Show when={fieldType === 'TABLE'}>
              <div class="rule-option">
                <label>Min Rows</label>
                <input
                  type="number"
                  min="0"
                  value={config.min_rows ?? ''}
                  onInput={(e) => {
                    const val = e.currentTarget.value;
                    setFieldRules(field.name, 'min_rows', val ? parseInt(val) : undefined);
                  }}
                />
              </div>
              <div class="rule-option">
                <label>Max Rows</label>
                <input
                  type="number"
                  min="0"
                  value={config.max_rows ?? ''}
                  onInput={(e) => {
                    const val = e.currentTarget.value;
                    setFieldRules(field.name, 'max_rows', val ? parseInt(val) : undefined);
                  }}
                />
              </div>
            </Show>

            {/* Custom expression for all types */}
            <div class="rule-option rule-option-wide">
              <label>Custom Expression</label>
              <input
                type="text"
                value={config.custom_expr ?? ''}
                placeholder='e.g., len(value) >= 5'
                onInput={(e) => setFieldRules(field.name, 'custom_expr', e.currentTarget.value || undefined)}
              />
            </div>

            <div class="rule-option rule-option-wide">
              <label>Error Message</label>
              <input
                type="text"
                value={config.error_message ?? ''}
                placeholder="Custom error message"
                onInput={(e) => setFieldRules(field.name, 'error_message', e.currentTarget.value || undefined)}
              />
            </div>
          </div>
        </Show>
      </div>
    );
  };

  return (
    <div class="modal-overlay" onClick={props.onClose}>
      <div class="modal validation-profile-manager-modal" onClick={(e) => e.stopPropagation()}>
        <h3>Manage Validation Profiles</h3>

        <Show when={error()}>
          <div class="error-banner">{error()}</div>
        </Show>

        <Show when={!isCreating() && !editingProfile()}>
          <div class="view-list">
            <Show when={props.profiles.length === 0}>
              <p class="empty-text">No validation profiles yet</p>
            </Show>
            <For each={props.profiles}>
              {(profile) => (
                <div class="view-item">
                  <span class="view-name">
                    {profile.name}
                    <Show when={profile.is_active}>
                      <span class="active-badge">Active</span>
                    </Show>
                  </span>
                  <span class="view-action-type">{getActionTypeLabel(profile.action_type)}</span>
                  <span class="view-field-count">
                    {profile.field_rules.length} field rules
                  </span>
                  <div class="view-actions">
                    <button class="btn btn-sm" onClick={() => openEdit(profile)}>
                      Edit
                    </button>
                    <button class="btn btn-danger btn-sm" onClick={() => handleDelete(profile)}>
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
              + New Profile
            </button>
          </div>
        </Show>

        <Show when={isCreating() || editingProfile()}>
          <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
            <div class="form-row">
              <div class="form-group" style="flex: 1;">
                <label>Profile Name</label>
                <input
                  type="text"
                  value={profileName()}
                  onInput={(e) => setProfileName(e.currentTarget.value)}
                  placeholder="e.g., Standard Validation"
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
                  checked={isActive()}
                  onChange={(e) => setIsActive(e.currentTarget.checked)}
                />
                Active
              </label>
            </div>

            <div class="validation-tabs">
              <button
                type="button"
                class={`tab-btn ${activeTab() === 'fields' ? 'active' : ''}`}
                onClick={() => setActiveTab('fields')}
              >
                Field Rules
              </button>
              <button
                type="button"
                class={`tab-btn ${activeTab() === 'collection' ? 'active' : ''}`}
                onClick={() => setActiveTab('collection')}
              >
                Collection Rules
              </button>
            </div>

            <Show when={activeTab() === 'fields'}>
              <div class="field-rules-container">
                <For each={availableFields()}>
                  {(field) => renderFieldRuleEditor(field)}
                </For>
              </div>
            </Show>

            <Show when={activeTab() === 'collection'}>
              <div class="collection-rules-container">
                <div class="rule-add-buttons">
                  <button type="button" class="btn btn-sm" onClick={addUniquenessRule}>
                    + Uniqueness Rule
                  </button>
                  <button type="button" class="btn btn-sm" onClick={addCustomRule}>
                    + Custom Rule
                  </button>
                </div>

                <For each={collectionRules}>
                  {(rule, index) => (
                    <div class="collection-rule-item">
                      <div class="collection-rule-header">
                        <span class="rule-type-badge">{rule.rule_type}</span>
                        <button
                          type="button"
                          class="btn btn-icon btn-danger btn-sm"
                          onClick={() => removeCollectionRule(index())}
                        >
                          &times;
                        </button>
                      </div>

                      <Show when={rule.rule_type === 'uniqueness'}>
                        <div class="uniqueness-fields">
                          <label>Unique field combination:</label>
                          <div class="field-checkboxes">
                            <For each={availableFields()}>
                              {(field) => (
                                <label class="checkbox-label">
                                  <input
                                    type="checkbox"
                                    checked={rule.unique_fields?.includes(field.name) || false}
                                    onChange={() => toggleUniqueField(index(), field.name)}
                                  />
                                  {field.name}
                                </label>
                              )}
                            </For>
                          </div>
                        </div>
                      </Show>

                      <Show when={rule.rule_type === 'custom'}>
                        <div class="form-group">
                          <label>Expression</label>
                          <input
                            type="text"
                            value={rule.custom_expr || ''}
                            placeholder="e.g., field('end_date') > field('start_date')"
                            onInput={(e) => updateCollectionRule(index(), { custom_expr: e.currentTarget.value })}
                          />
                        </div>
                      </Show>

                      <div class="form-group">
                        <label>Error Message</label>
                        <input
                          type="text"
                          value={rule.error_message || ''}
                          placeholder="Custom error message"
                          onInput={(e) => updateCollectionRule(index(), { error_message: e.currentTarget.value })}
                        />
                      </div>
                    </div>
                  )}
                </For>

                <Show when={collectionRules.length === 0}>
                  <p class="empty-text">No collection rules defined</p>
                </Show>
              </div>
            </Show>

            <div class="form-actions">
              <button type="button" class="btn" onClick={closeForm}>
                Cancel
              </button>
              <button type="submit" class="btn btn-primary">
                {isCreating() ? 'Create Profile' : 'Save Changes'}
              </button>
            </div>
          </form>
        </Show>
      </div>
    </div>
  );
}
