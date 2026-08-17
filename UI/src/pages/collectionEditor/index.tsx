import { createSignal, For, Show, onMount } from 'solid-js';
import { createStore, produce } from 'solid-js/store';
import { useParams, useNavigate } from '@solidjs/router';
import { api } from '../../api/client';
import NameTransformer from '../../utils/nameTransformer';
import { Collection, Field, SectionState } from '../../types/collection';
import { SchemaSectionEditor } from './collection-schema-section';

export function CollectionEditor() {
  const params = useParams();
  const navigate = useNavigate();
  const [collection, setCollection] = createSignal<Collection | undefined>(undefined);
  const isEditMode = () => !!params.name;

  const [name, setName] = createSignal('');
  const [unsectionedFields, setUnsectionedFields] = createStore<Field[]>([]);
  const [sections, setSections] = createStore<SectionState[]>([]);
  const [error, setError] = createSignal<string | null>(null);
  const [saving, setSaving] = createSignal(false);
  const [showRemovalWarning, setShowRemovalWarning] = createSignal(false);
  const [editingTableField, setEditingTableField] = createSignal<{ sectionIndex: number | null; fieldIndex: number } | null>(null);

  onMount(async () => {
    if (params.name) {
      const response = await api.listCollections();
      const col = response.data?.find(c => c.name === params.name);
      if (col) {
        setCollection(col);
        setName(col.name);

        // Load sections - sort by order
        const sortedSections = [...(col.sections || [])].sort((a, b) => a.order - b.order);

        // Create a map from section_id to section_index
        const sectionIdToIndex = new Map<number, number>();
        sortedSections.forEach((s, idx) => {
          if (s.id !== undefined) {
            sectionIdToIndex.set(s.id, idx);
          }
        });

        // Group fields by section
        const sectionFields: Field[][] = sortedSections.map(() => []);
        const unsectioned: Field[] = [];

        col.fields
          .filter((f) => f.name !== 'id')
          .forEach((f) => {
            const field: Field = {
              name: f.name,
              type: f.type,
              required: f.required,
              select_options: f.select_options,
              select_options_text: (f.select_options || []).join(', '),
              order: f.order ?? 0,
              table_fields: f.table_fields?.map(tf => ({
                name: tf.name,
                type: tf.type,
                required: tf.required,
                select_options: tf.select_options,
                select_options_text: (tf.select_options || []).join(', '),
              })) || [],
            };

            if (f.section_id !== null && f.section_id !== undefined) {
              const sectionIdx = sectionIdToIndex.get(f.section_id);
              if (sectionIdx !== undefined) {
                sectionFields[sectionIdx].push(field);
              } else {
                unsectioned.push(field);
              }
            } else {
              unsectioned.push(field);
            }
          });

        // Set sections with their fields
        setSections(sortedSections.map((s, idx) => ({
          name: s.name,
          collapsed: false,
          fields: sectionFields[idx],
        })));

        setUnsectionedFields(unsectioned);
      }
    } else {
      // New collection - start with one empty field
      setUnsectionedFields([{ name: '', type: 'TEXT', required: false }]);
    }
  });


  // Section management
  const addSection = () => {
    setSections(produce((s) => s.push({
      name: `Section ${s.length + 1}`,
      collapsed: false,
      fields: [{ name: '', type: 'TEXT', required: false }]
    })));
  };

  const updateSectionName = (index: number, name: string) => {
    setSections(index, 'name', name);
  };

  const removeSection = (index: number) => {
    // Move fields from this section to unsectioned
    const sectionFields = sections[index].fields;
    setUnsectionedFields(produce((f) => f.push(...sectionFields)));
    setSections(produce((s) => s.splice(index, 1)));
  };


  const moveSectionUp = (index: number) => {
    if (index === 0) return;
    setSections(produce((s) => {
      const temp = s[index];
      s[index] = s[index - 1];
      s[index - 1] = temp;
    }));
  };

  const moveSectionDown = (index: number) => {
    if (index >= sections.length - 1) return;
    setSections(produce((s) => {
      const temp = s[index];
      s[index] = s[index + 1];
      s[index + 1] = temp;
    }));
  };

  const convertSectionToTable = (sectionIndex: number) => {
    const section = sections[sectionIndex];

    // Validation: Section must have at least 1 field with a name
    const validFields = section.fields.filter(f => f.name.trim());
    if (validFields.length === 0) {
      setError('Section must have at least one named field to convert to a table');
      return;
    }

    // Validation: No field in the section can be of type TABLE (tables can't nest)
    const hasNestedTable = validFields.some(f => f.type === 'TABLE');
    if (hasNestedTable) {
      setError('Cannot convert section containing TABLE fields (tables cannot be nested)');
      return;
    }

    // Create TABLE field from section
    const tableField: Field = {
      name: NameTransformer(section.name),
      type: 'TABLE',
      required: false,
      table_fields: validFields.map(f => ({
        name: f.name,
        type: f.type,
        required: f.required,
        select_options: f.select_options,
        select_options_text: f.select_options_text,
      })),
    };

    // Calculate the new field index before adding
    const newFieldIndex = unsectionedFields.length;

    // Add to unsectioned fields
    setUnsectionedFields(produce(f => f.push(tableField)));

    // Remove the section
    setSections(produce(s => s.splice(sectionIndex, 1)));

    // Auto-expand the table field editor to show the converted columns
    setEditingTableField({ sectionIndex: null, fieldIndex: newFieldIndex });
  };
  // Field management for section fields
  const addSectionField = (sectionIndex: number) => {
    setSections(sectionIndex, 'fields', produce((f) => f.push({ name: '', type: 'TEXT', required: false })));
  };

  const removeSectionField = (sectionIndex: number, fieldIndex: number) => {
    if (isEditMode() && collection()) {
      const fieldName = sections[sectionIndex].fields[fieldIndex].name;
      const existingField = collection()!.fields.find((f) => f.name === fieldName);
      if (existingField) {
        setShowRemovalWarning(true);
      }
    }
    setSections(sectionIndex, 'fields', produce((f) => f.splice(fieldIndex, 1)));
  };

  const updateSectionField = (sectionIndex: number, fieldIndex: number, key: keyof Field, value: unknown) => {
    setSections(sectionIndex, 'fields', fieldIndex, key, value as never);
  };

  // TABLE field nested fields management
  const addTableField = (sectionIndex: number | null, fieldIndex: number) => {
    if (sectionIndex === null) {
      setUnsectionedFields(produce((f) => {
        if (!f[fieldIndex].table_fields) {
          f[fieldIndex].table_fields = [];
        }
        f[fieldIndex].table_fields!.push({ name: '', type: 'TEXT', required: false });
      }));
    } else {
      setSections(sectionIndex, 'fields', produce((f) => {
        if (!f[fieldIndex].table_fields) {
          f[fieldIndex].table_fields = [];
        }
        f[fieldIndex].table_fields!.push({ name: '', type: 'TEXT', required: false });
      }));
    }
  };

  const removeTableField = (sectionIndex: number | null, fieldIndex: number, tableFieldIndex: number) => {
    if (sectionIndex === null) {
      setUnsectionedFields(produce((f) => {
        f[fieldIndex].table_fields?.splice(tableFieldIndex, 1);
      }));
    } else {
      setSections(sectionIndex, 'fields', produce((f) => {
        f[fieldIndex].table_fields?.splice(tableFieldIndex, 1);
      }));
    }
  };

  const updateTableField = (sectionIndex: number | null, fieldIndex: number, tableFieldIndex: number, key: keyof Field, value: unknown) => {
    if (sectionIndex === null) {
      setUnsectionedFields(produce((f) => {
        if (f[fieldIndex].table_fields && f[fieldIndex].table_fields![tableFieldIndex]) {
          (f[fieldIndex].table_fields![tableFieldIndex] as any)[key] = value;
        }
      }));
    } else {
      setSections(sectionIndex, 'fields', produce((f) => {
        if (f[fieldIndex].table_fields && f[fieldIndex].table_fields![tableFieldIndex]) {
          (f[fieldIndex].table_fields![tableFieldIndex] as any)[key] = value;
        }
      }));
    }
  };

  const isEditingTableField = (sectionIndex: number | null, fieldIndex: number) => {
    const editing = editingTableField();
    return editing && editing.sectionIndex === sectionIndex && editing.fieldIndex === fieldIndex;
  };


  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setError(null);

    if (!name().trim()) {
      setError('Collection name is required');
      return;
    }

    // Collect all valid fields
    const allFields: { field: Field; sectionIndex: number | null }[] = [];

    // Unsectioned fields
    unsectionedFields.filter(f => f.name.trim()).forEach(f => {
      allFields.push({ field: f, sectionIndex: null });
    });

    // Section fields
    sections.forEach((section, sectionIndex) => {
      section.fields.filter(f => f.name.trim()).forEach(f => {
        allFields.push({ field: f, sectionIndex });
      });
    });

    if (allFields.length === 0) {
      setError('At least one field is required');
      return;
    }

    // Validate TABLE fields have nested fields
    for (const { field } of allFields) {
      if (field.type === 'TABLE') {
        if (!field.table_fields || field.table_fields.filter(tf => tf.name.trim()).length === 0) {
          setError(`TABLE field "${field.name}" must have at least one column defined`);
          return;
        }
      }
    }

    setSaving(true);

    // Build field data
    const fieldData = allFields.map(({ field, sectionIndex }, idx) => {
      let selectOptions = field.select_options;
      if (field.type === 'SELECT' && field.select_options_text) {
        selectOptions = field.select_options_text.split(',').map(s => s.trim()).filter(Boolean);
      }

      const fieldObj: any = {
        name: field.name.trim(),
        type: field.type,
        required: field.required,
        section_index: sectionIndex,
        order: idx,
      };

      if (field.type === 'SELECT' && selectOptions && selectOptions.length > 0) {
        fieldObj.select_options = selectOptions;
      }

      if (field.type === 'TABLE' && field.table_fields) {
        fieldObj.table_fields = field.table_fields
          .filter(tf => tf.name.trim())
          .map(tf => {
            let tfSelectOptions = tf.select_options;
            if (tf.type === 'SELECT' && tf.select_options_text) {
              tfSelectOptions = tf.select_options_text.split(',').map(s => s.trim()).filter(Boolean);
            }
            return {
              name: tf.name.trim(),
              type: tf.type,
              required: tf.required,
              ...(tf.type === 'SELECT' && tfSelectOptions && tfSelectOptions.length > 0 ? { select_options: tfSelectOptions } : {}),
            };
          });
      }

      return fieldObj;
    });

    const sectionData = sections.map((s, idx) => ({
      name: s.name,
      order: idx,
    }));

    let response;
    if (isEditMode()) {
      response = await api.updateCollection(name().trim(), {
        fields: fieldData,
        sections: sectionData,
      });
    } else {
      response = await api.createCollection({
        name: name().trim(),
        fields: fieldData,
        sections: sectionData,
      });
    }

    setSaving(false);

    if (response.error) {
      setError(response.error);
    } else {
      navigate(isEditMode() ? `/collection/${name()}` : '/');
    }
  };

  const handleCancel = () => {
    navigate(isEditMode() ? `/collection/${params.name}` : '/');
  };


  return (
    <div class="schema-builder">
      <header class="page-header">
        <div class="header-left">
          <button class="btn btn-text" onClick={handleCancel}>
            &larr; Cancel
          </button>
          <h2>{isEditMode() ? `Edit Collection Schema: ${params.name}` : 'New Collection Schema'}</h2>
        </div>
      </header>

      <Show when={error()}>
        <div class="error-banner">{error()}</div>
      </Show>

      <Show when={showRemovalWarning()}>
        <div class="warning-banner">
          Warning: Removing fields will permanently delete the data in those columns.
          <button class="btn btn-sm" onClick={() => setShowRemovalWarning(false)}>Dismiss</button>
        </div>
      </Show>

      <form onSubmit={handleSubmit} class="schema-form">
        <div class="form-section">
          <h3>Collection Details</h3>
          <div class="form-group">
            <label>Name</label>
            <input
              type="text"
              placeholder="e.g., users, posts, products"
              value={name()}
              onInput={(e) => setName(NameTransformer(e.currentTarget.value))}
              pattern="^[a-zA-Z][a-zA-Z0-9_]*$"
              title="Must start with letter, alphanumeric and underscore only"
              disabled={isEditMode()}
            />
            <span class="form-hint">
              {isEditMode()
                ? 'Collection name cannot be changed.'
                : 'Must start with a letter. Only letters, numbers, and underscores.'}
            </span>
          </div>
        </div>


        {/* Sections with Fields */}
        <For each={sections}>
          {
            (section, sectionIndex) => (
              <SchemaSectionEditor
                sectionIndex={sectionIndex()}
                section={section}

                moveSectionUp={moveSectionUp}
                moveSectionDown={moveSectionDown}

                isFirst={sectionIndex() === 0}
                isLast={sectionIndex() === sections.length - 1}

                updateSectionName={updateSectionName}
                convertSectionToTable={convertSectionToTable}
                removeSection={removeSection}

                isEditingTableField={isEditingTableField}

                addSectionField={addSectionField}
                removeSectionField={removeSectionField}
                updateSectionField={updateSectionField}

                removeTableField={removeTableField}
                updateTableField={updateTableField}
                addTableField={addTableField}
              />
            )
          }
        </For>

        {/* Add Section Button */}
        <div class="add-section-container">
          <button type="button" class="btn btn-outline" onClick={addSection}>
            + Add Section
          </button>
        </div>

        <p class="form-hint">
          An <code>id</code> field will be added automatically.
        </p>

        <div class="form-actions">
          <button type="button" class="btn" onClick={handleCancel}>
            Cancel
          </button>
          <button type="submit" class="btn btn-primary" disabled={saving()}>
            {saving()
              ? isEditMode() ? 'Saving...' : 'Creating...'
              : isEditMode() ? 'Save Changes' : 'Create Collection'}
          </button>
        </div>
      </form>
    </div>
  );
}
