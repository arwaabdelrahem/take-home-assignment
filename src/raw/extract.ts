export function extractResults(docs: unknown[]): unknown[] {
  return docs.flatMap((doc) => {
    if (doc === null || typeof doc !== 'object') {
      return [doc];
    }

    const payload = (doc as { payload?: unknown }).payload;
    if (payload == null) {
      return [doc];
    }

    if (
      typeof payload === 'object' &&
      payload !== null &&
      Array.isArray((payload as { results?: unknown[] }).results)
    ) {
      return (payload as { results: unknown[] }).results;
    }

    return [payload];
  });
}
