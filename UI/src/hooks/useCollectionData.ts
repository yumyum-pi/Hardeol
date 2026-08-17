import { createSignal, createMemo } from 'solid-js';
import { api } from '../api/client';
import { Collection, Section, SchemaField } from '../types/collection';

// Loads a collection by name and derives the schema helpers every
// collection-scoped page needs (fields map, sections, TABLE fields).
export function useCollectionData(name: () => string) {
  const [collection, setCollection] = createSignal<Collection | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);

  const fetchCollection = async () => {
    setLoading(true);
    setError(null);
    const response = await api.listCollections();
    if (response.error) {
      setError(response.error);
    } else {
      const col = response.data?.find(c => c.name === name());
      if (col) {
        setCollection(col);
      } else {
        setError(`Collection "${name()}" not found`);
      }
    }
    setLoading(false);
  };

  const fieldsMap = createMemo(() => {
    const map = new Map<string, SchemaField>();
    collection()?.fields.forEach(f => map.set(f.name, f));
    return map;
  });

  const getTableFields = (): SchemaField[] => {
    return collection()?.fields.filter(f => f.type === 'TABLE') || [];
  };

  const getSections = (): Section[] => {
    return collection()?.sections || [];
  };

  // Fields for a specific section (null = unsectioned)
  const getFieldsForSection = (sectionId: number | null): SchemaField[] => {
    const col = collection();
    if (!col) return [];
    return col.fields.filter(f => {
      if (f.name === 'id') return false;
      if (sectionId === null) {
        return f.section_id === null || f.section_id === undefined;
      }
      return f.section_id === sectionId;
    });
  };

  return {
    collection,
    fetchCollection,
    loading,
    error,
    fieldsMap,
    getTableFields,
    getSections,
    getFieldsForSection,
  };
}
