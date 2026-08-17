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
  convertSectionToTable: (index: number) => void,
  removeSection(sectionIndex: number): void;

  isEditingTableField(arg0: any, arg1: number): unknown;

  addSectionField(sectionIndex: number): void;
  removeSectionField(arg0: any, arg1: number): unknown;
  updateSectionField(sectionIndex: number, arg1: number, key: any, value: any): unknown;


  removeTableField(sectionIndex: number, fieldIndex: number, index: number): void;
  updateTableField(sectionIndex: number, fieldIndex: number, index: number, key: string, value: unknown): void;
  addTableField(sectionIndex: number, fieldIndex: number): void;
}

export const SchemaSectionEditor = (props: SchemaSectionEditorProps) => {
  const [isFolded, setIsFolded] = createSignal(false);

  return <div class="form-section section-container">
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
        <label class="toggle-label" title="Convert section to a TABLE field">
          <input
            type="checkbox"
            checked={false}
            onChange={() => props.convertSectionToTable(props.sectionIndex)} />
          <span class="toggle-text">Table</span>
        </label>
        <button type="button" class="btn btn-sm" onClick={() => props.addSectionField(props.sectionIndex)}>
          + Add Field
        </button>
        <button type="button" class="btn btn-icon btn-danger btn-sm" onClick={() => props.removeSection(props.sectionIndex)} title="Remove section">
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
                canRemove={true}
                isTableField={false} />
              <Show when={props.isEditingTableField(props.sectionIndex, fieldIndex()) && field.type === 'TABLE'}>
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
