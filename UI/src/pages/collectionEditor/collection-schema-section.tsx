import { createSignal, For, Show } from "solid-js";
import { Field, SectionState } from "../../types/collection";
import { SchemaTableFieldEditor } from "./collection-schema-table";
import { SchemaFieldEditor } from "./collection-editor-field";

type SchemaSectionEditorProps = {
  sectionIndex: number,
  section: SectionState,

  moveSectionUp: (index: number) => void,
  moveSectionDown: (index: number) => void,

  isFirst: boolean,
  isLast: boolean

  updateSectionName: (index: number, name: string) => void;
  removeSection(sectionIndex: number): void;
  canRemoveSection: boolean;

  addSectionField(sectionIndex: number): void;
  removeSectionField(sectionIndex: number, fieldIndex: number): void;
  updateSectionField(sectionIndex: number, fieldIndex: number, key: keyof Field, value: unknown): void;

  removeTableField(sectionIndex: number, fieldIndex: number, index: number): void;
  updateTableField(sectionIndex: number, fieldIndex: number, index: number, key: keyof Field, value: unknown): void;
  addTableField(sectionIndex: number, fieldIndex: number): void;
}

export const SchemaSectionEditor = (props: SchemaSectionEditorProps) => {
  const [isFolded, setIsFolded] = createSignal(false);
  const [isTableFolded, setIsTableFolded] = createSignal(false);

  return <div class="form-section">
    <div class="section-header-row">
      <div class="section-drag-controls">
        <button type="button" class="btn btn-icon btn-sm" onClick={() => props.moveSectionUp(props.sectionIndex)} disabled={props.isFirst} title="Move up">
          &#8593;
        </button>
        <button type="button" class="btn btn-icon btn-sm" onClick={() => props.moveSectionDown(props.sectionIndex)} disabled={props.isLast} title="Move down">
          &#8595;
        </button>
      </div>
      <div class="section-title-row" onClick={() => setIsFolded(v => !v)}>
        <span class="collapse-icon">{isFolded() ? '▶' : '▼'}</span>
        <input
          type="text"
          value={props.section.name}
          onInput={(e) => props.updateSectionName(props.sectionIndex, e.currentTarget.value)}
          onClick={(e) => e.stopPropagation()}
          class="section-name-input-inline"
          placeholder="Section name" />
        <span class="field-count">({props.section.fields.length} fields)</span>
      </div>
      <div class="section-actions">
        <button type="button" class="btn btn-sm" onClick={() => props.addSectionField(props.sectionIndex)}>
          + Add Field
        </button>
        <button
          type="button"
          class="btn btn-icon btn-danger btn-sm"
          onClick={() => props.removeSection(props.sectionIndex)}
          disabled={!props.canRemoveSection}
          title={props.canRemoveSection ? 'Remove section' : 'At least one section is required'}
        >
          &times;
        </button>
      </div>
    </div>

    <Show when={!isFolded()}>
      <div class="section-fields">
        <For each={props.section.fields}>
          {(field, fieldIndex) => (
            <>
              <SchemaFieldEditor
                field={field}
                onUpdate={(key: keyof Field, value: unknown) => props.updateSectionField(props.sectionIndex, fieldIndex(), key, value)}
                onRemove={() => props.removeSectionField(props.sectionIndex, fieldIndex())}
                allowTableType={true}
                isTableFolded={isTableFolded()}
                toggleTableFolded={() => setIsTableFolded(v => !v)}
                canRemove={true}
              />
              <Show when={isTableFolded() && field.type === 'TABLE'}>
                {
                  <SchemaTableFieldEditor
                    field={field}
                    sectionIndex={props.sectionIndex}
                    fieldIndex={fieldIndex()}

                    removeTableField={props.removeTableField}
                    updateTableField={props.updateTableField}
                    addTableField={props.addTableField}

                  />
                }
              </Show>
            </>
          )}
        </For>
        <Show when={props.section.fields.length === 0}>
          <p class="form-hint">No fields in this section.</p>
        </Show>
      </div>
    </Show>
  </div>;
}
