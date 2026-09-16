export type CollectOption = {
  from: string;
  into: string;
};

export type DedupeOptions = {
  key: string;
  collect?: CollectOption;
};

function isMissingKey(value: unknown): boolean {
  return value === undefined || value === null;
}

function cloneRecord(record: Record<string, unknown>): Record<string, unknown> {
  return { ...record };
}

function collectedValues(
  record: Record<string, unknown>,
  from: string,
): unknown[] {
  const value = record[from];
  if (value === undefined || value === null) {
    return [];
  }
  return [value];
}

function applyCollect(
  record: Record<string, unknown>,
  collect: CollectOption,
): Record<string, unknown> {
  const result = cloneRecord(record);
  result[collect.into] = collectedValues(result, collect.from);
  delete result[collect.from];
  return result;
}

function mergeCollect(
  target: Record<string, unknown>,
  incoming: Record<string, unknown>,
  collect: CollectOption,
): void {
  const list = target[collect.into];
  const values = Array.isArray(list) ? list : [];
  for (const value of collectedValues(incoming, collect.from)) {
    if (!values.includes(value)) {
      values.push(value);
    }
  }
  target[collect.into] = values;
}

/**
 * Collapse records that share an identity key. First occurrence wins.
 * Records missing the key are kept. Optional collect merges extra values
 * into an array (e.g. areaId → areaIds).
 */
export function deduplicateRecords(
  records: Record<string, unknown>[],
  options: DedupeOptions,
): Record<string, unknown>[] {
  const result: Record<string, unknown>[] = [];
  const indexByKey = new Map<string, number>();

  for (const record of records) {
    const keyValue = record[options.key];
    if (isMissingKey(keyValue)) {
      result.push(cloneRecord(record));
      continue;
    }

    const key = String(keyValue);
    const existingIndex = indexByKey.get(key);

    if (existingIndex === undefined) {
      const copy = options.collect
        ? applyCollect(record, options.collect)
        : cloneRecord(record);
      indexByKey.set(key, result.length);
      result.push(copy);
      continue;
    }

    if (options.collect) {
      mergeCollect(result[existingIndex], record, options.collect);
    }
  }

  return result;
}
