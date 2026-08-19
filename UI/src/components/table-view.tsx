import { createEffect, createMemo, createSignal, For, JSXElement, Show } from "solid-js";
import { Collection, SchemaField, TableView } from "../types/collection";

interface TableViewSelectorProps {
  views: TableView[];
  selectedViewId: number | null;
  onSelect: (viewId: number | null) => void;
  onManage?: () => void;
}

const TableViewSelector = (props: TableViewSelectorProps) => {
  return (
    <div class="view-selector">
      <select
        class="view-select"
        value={props.selectedViewId ?? ''}
        onChange={(e) => {
          const val = e.currentTarget.value;
          props.onSelect(val === '' ? null : Number(val));
        }}
      >
        <option value="">All Fields</option>
        <For each={props.views}>
          {(view) => (
            <option value={view.id}>
              {view.name}
              {view.is_default ? ' (Default)' : ''}
            </option>
          )}
        </For>
      </select>
      <Show when={props.onManage}>
        <button class="btn btn-sm" onClick={props.onManage}>
          Manage Views
        </button>
      </Show>
    </div>
  );
}

type CollectionTableViewProps = {
  views: TableView[];
  getTableFields: SchemaField[];
  collection: Collection | null;
  records: Record<string, unknown>[];
  actionFn: (index: number) => JSXElement;
}

const CollectionTableView = (props: CollectionTableViewProps) => {
  const [selectedViewId, setSelectedViewId] = createSignal<number | null>(null);
  const [userSelected, setUserSelected] = createSignal(false);

  // Default to the collection's default view until the user picks one explicitly.
  createEffect(() => {
    if (!userSelected()) {
      const defaultView = props.views.find(v => v.is_default);
      setSelectedViewId(defaultView?.id ?? null);
    }
  });

  const handleSelectView = (viewId: number | null) => {
    setUserSelected(true);
    setSelectedViewId(viewId);
  };

  const selectedView = () => props.views.find(v => v.id === selectedViewId());

  const displayColumns = createMemo(() => {
    const view = selectedView();
    if (view && view.fields.length > 0) {
      const sortedFields = [...view.fields].sort((a, b) => a.order - b.order);
      // Filter out TABLE field columns
      const tableFieldNames = props.getTableFields.map(f => f.name);
      return sortedFields.filter(f => !tableFieldNames.includes(f.name)).map(f => f.name);
    }
    return props.collection?.fields.filter(f => f.type !== 'TABLE').map(f => f.name) ?? [];
  });

  const columnCssClasses = createMemo(() => {
    const view = selectedView();
    const map = new Map<string, string>();
    view?.fields.forEach(f => map.set(f.name, f.css_class || ''));
    return map;
  });

  const getColumnCssClass = (columnName: string): string => {
    return columnCssClasses().get(columnName) || '';
  };

  return (
    <div>
      <div class="table-view-toolbar">
        <TableViewSelector
          views={props.views}
          selectedViewId={selectedViewId()}
          onSelect={handleSelectView}
        />
      </div>
      <div class="table-container collection">
        <table class="data-table">
          <thead>
            <tr>
              <For each={displayColumns()}>
                {(column) => <th class={getColumnCssClass(column)}>{column}</th>}
              </For>
              <th class="">Actions</th>
            </tr>
          </thead>
          <tbody>
            <For each={props.records}>
              {(record, index) => (
                <tr>
                  <For each={displayColumns()}>
                    {(column) => <td class={getColumnCssClass(column)}>{String(record[column] ?? '')}</td>}
                  </For>
                  <td class="actions-col">
                    {props.actionFn(index())}
                  </td>
                </tr>
              )}
            </For>
          </tbody>
        </table>
      </div>
    </div>
  )
}
export default CollectionTableView;
