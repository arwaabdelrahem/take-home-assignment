export type FieldMapping = { readonly [targetField: string]: string };

/**
 * Rename fields using a target → source dictionary.
 * Missing source keys are omitted. The input record is not mutated.
 */
export function mapFields(
  record: Record<string, unknown>,
  mapping: FieldMapping,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [targetField, sourceField] of Object.entries(mapping)) {
    if (!Object.prototype.hasOwnProperty.call(record, sourceField)) {
      continue;
    }
    const value = record[sourceField];
    if (value !== undefined) {
      result[targetField] = value;
    }
  }

  return result;
}

export function mapRecords(
  records: Record<string, unknown>[],
  mapping: FieldMapping,
): Record<string, unknown>[] {
  return records.map((record) => mapFields(record, mapping));
}
