import { toUpsertOperations } from './bulk-upsert';

describe('toUpsertOperations', () => {
  it('builds upsert filters from the unique keys', () => {
    expect(
      toUpsertOperations(
        [{ locationId: 1468, name: 'Al Zaab', sourceProvider: 'talabat' }],
        ['locationId', 'sourceProvider'],
      ),
    ).toEqual([
      {
        updateOne: {
          filter: { locationId: 1468, sourceProvider: 'talabat' },
          update: {
            $set: {
              locationId: 1468,
              name: 'Al Zaab',
              sourceProvider: 'talabat',
            },
          },
          upsert: true,
        },
      },
    ]);
  });
});
