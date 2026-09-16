import { runPipeline } from '../core/pipeline/run-pipeline';
import { toUpsertOperations } from '../persist/bulk-upsert';
import { talabatAdapter } from '../providers/talabat/adapter';
import { extractResults } from '../raw/extract';

describe('Restaurants persist', () => {
  it('merges listing and menu streams before upserting', () => {
    const listings = [
      {
        payload: {
          results: [
            {
              area_name: 'Al Zaab',
              restaurant_name: 'Bombay Box listing',
              restaurant_url:
                'https://www.talabat.com/uae/restaurant/757815/bombay-box?aid=1468',
            },
          ],
        },
      },
    ];
    const menus = [
      {
        payload: {
          results: [
            {
              id: 687548,
              outletCode: 757815,
              name: 'Bombay Box',
              rate: 4.4,
            },
          ],
        },
      },
    ];

    const result = runPipeline(
      {
        listings: extractResults(listings),
        menus: extractResults(menus),
      },
      talabatAdapter,
    );
    const ops = toUpsertOperations(result.restaurants, [
      'outletCode',
      'sourceProvider',
    ]);

    expect(result.restaurants).toHaveLength(1);
    expect(ops[0].updateOne.update.$set).toEqual(
      expect.objectContaining({
        outletCode: 757815,
        name: 'Bombay Box',
        hasMenu: true,
        areaIds: [1468],
      }),
    );
  });
});
