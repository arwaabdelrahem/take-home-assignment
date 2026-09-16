const NUMERIC_STRING = /^-?\d+(\.\d+)?$/;

function normalizeValue(value: unknown): unknown {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') {
      return undefined;
    }
    if (NUMERIC_STRING.test(trimmed)) {
      return Number(trimmed);
    }
    return trimmed;
  }

  if (Array.isArray(value)) {
    return value.map(normalizeValue);
  }

  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value)) {
      const normalized = normalizeValue(nested);
      if (normalized !== undefined) {
        result[key] = normalized;
      }
    }
    return result;
  }

  return value;
}

/**
 * Clean validated records: trim strings, drop blanks, coerce numeric strings.
 * Pure: same input always produces the same output, and the input is not mutated.
 */
export function normalizeRecords<T>(records: T[]): T[] {
  return records.map((record) => normalizeValue(record) as T);
}
