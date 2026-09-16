import { runPipeline } from '../core/pipeline/run-pipeline';
import { toUpsertOperations } from '../persist/bulk-upsert';
import { talabatAdapter } from '../providers/talabat/adapter';
import { extractResults } from '../raw/extract';

describe('Locations persist', () => {
  it('runs the location pipeline and upserts projected records', () => {
    const raw = [
      {
        payload: {
          results: [
            {
              location_id: 1468,
              location_name: 'Al Zaab',
              location_slug: 'al-zaab',
            },
            { location_name: 'missing-id' },
          ],
        },
      },
    ];

    const result = runPipeline(
      { locations: extractResults(raw) },
      talabatAdapter,
    );
    const ops = toUpsertOperations(result.locations, [
      'locationId',
      'sourceProvider',
    ]);

    expect(result.locations).toHaveLength(1);
    expect(result.quarantined.locations).toHaveLength(1);
    expect(result.quarantined.locations[0].reason).toContain('location_id');
    expect(ops[0].updateOne.filter).toEqual({
      locationId: 1468,
      sourceProvider: 'talabat',
    });
  });
});
