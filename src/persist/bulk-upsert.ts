export function toUpsertOperations(
  docs: Record<string, unknown>[],
  keys: string[],
) {
  return docs.map((doc) => ({
    updateOne: {
      filter: Object.fromEntries(keys.map((key) => [key, doc[key]])),
      update: { $set: doc },
      upsert: true,
    },
  }));
}
