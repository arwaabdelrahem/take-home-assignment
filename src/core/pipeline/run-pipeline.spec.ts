import * as fs from 'fs';
import * as path from 'path';
import { talabatAdapter } from '../../providers/talabat/adapter';
import { runPipeline } from './run-pipeline';

type RawDoc = {
  payload?: {
    results?: unknown[];
  };
};

function loadRawDocs(filename: string): RawDoc[] {
  const file = path.join(process.cwd(), 'raw_data', filename);
  return JSON.parse(fs.readFileSync(file, 'utf8')) as RawDoc[];
}

function resultsFrom(docs: RawDoc[]): unknown[] {
  return docs.flatMap((doc) => doc.payload?.results ?? []);
}

function logPipelineResult(
  label: string,
  result: ReturnType<typeof runPipeline>,
) {
  console.log(`\n=== ${label} ===`);
  console.log('locations:', result.locations.length);
  console.log('restaurants:', result.restaurants.length);
  console.log('menuCategories:', result.menuCategories.length);
  console.log('menuItems:', result.menuItems.length);
  console.log('quarantined locations:', result.quarantined.locations.length);
  console.log('quarantined listings:', result.quarantined.listings.length);
  console.log('quarantined menus:', result.quarantined.menus.length);
  if (result.locations[0]) {
    console.log('location sample:', JSON.stringify(result.locations[0], null, 2));
  }
  if (result.restaurants[0]) {
    console.log(
      'restaurant sample:',
      JSON.stringify(result.restaurants[0], null, 2),
    );
  }
}

describe('runPipeline', () => {
  it('quarantines invalid records, deduplicates, and merges listing with menu', () => {
    const input = {
      locations: [
        {
          location_id: 1468,
          location_name: 'Al Zaab',
          location_slug: 'al-zaab',
        },
        {
          location_id: 1468,
          location_name: 'Al Zaab duplicate',
          location_slug: 'al-zaab',
        },
        { location_name: 'Missing id' },
      ],
      listings: [
        {
          area_name: 'Al Zaab',
          restaurant_name: 'Bombay Box listing',
          restaurant_url:
            'https://www.talabat.com/uae/restaurant/757815/bombay-box?aid=1468',
        },
        {
          area_name: 'Al Rowdah',
          restaurant_name: 'Bombay Box listing',
          restaurant_url:
            'https://www.talabat.com/uae/restaurant/757815/bombay-box?aid=1461',
        },
      ],
      menus: [
        {
          id: 687548,
          outletCode: 757815,
          name: 'Bombay Box',
          rate: 4.4,
          category: [
            {
              category_id: 1,
              category_name: 'Mains',
              items: [{ item_id: 10, item_name: 'Thali', price: 0 }],
            },
          ],
        },
      ],
    };

    const result = runPipeline(input, talabatAdapter);

    expect(result.quarantined.locations).toHaveLength(1);
    expect(result.quarantined.locations[0].reason).toContain('location_id');
    expect(result.locations).toEqual([
      {
        locationId: 1468,
        name: 'Al Zaab',
        slug: 'al-zaab',
        sourceProvider: 'talabat',
      },
    ]);
    expect(result.restaurants).toEqual([
      expect.objectContaining({
        outletCode: 757815,
        name: 'Bombay Box',
        hasMenu: true,
        areaIds: [1468, 1461],
        sourceProvider: 'talabat',
      }),
    ]);
    expect(result.menuItems[0]).toEqual(
      expect.objectContaining({
        itemId: 10,
        priceIsZero: true,
        restaurantOutletId: 757815,
      }),
    );
  });

  it('accepts only locations', () => {
    const result = runPipeline(
      {
        locations: [
          {
            location_id: 1468,
            location_name: 'Al Zaab',
            location_slug: 'al-zaab',
          },
        ],
      },
      talabatAdapter,
    );

    expect(result.locations).toHaveLength(1);
    expect(result.restaurants).toEqual([]);
    expect(result.menuCategories).toEqual([]);
    expect(result.menuItems).toEqual([]);
  });

  it('accepts listings and menus for restaurant merge', () => {
    const result = runPipeline(
      {
        listings: [
          {
            area_name: 'Al Zaab',
            restaurant_name: 'Bombay Box listing',
            restaurant_url:
              'https://www.talabat.com/uae/restaurant/757815/bombay-box?aid=1468',
          },
        ],
        menus: [
          {
            id: 687548,
            outletCode: 757815,
            name: 'Bombay Box',
          },
        ],
      },
      talabatAdapter,
    );

    expect(result.locations).toEqual([]);
    expect(result.restaurants[0]).toEqual(
      expect.objectContaining({
        outletCode: 757815,
        name: 'Bombay Box',
        hasMenu: true,
        areaIds: [1468],
      }),
    );
  });

  it('accepts only menus for categories and items', () => {
    const result = runPipeline(
      {
        menus: [
          {
            id: 1,
            outletCode: 34807,
            name: 'Thai Place',
            category: [
              {
                category_id: 1,
                category_name: 'Mains',
                items: [{ item_id: 10, item_name: 'Pad Thai', price: 57 }],
              },
            ],
          },
        ],
      },
      talabatAdapter,
    );

    expect(result.locations).toEqual([]);
    expect(result.menuCategories).toHaveLength(1);
    expect(result.menuItems).toHaveLength(1);
  });

  it('does not mutate the input', () => {
    const input = {
      locations: [
        {
          location_id: 1280,
          location_name: 'DWTC',
          location_slug: 'dwtc',
        },
      ],
      listings: [],
      menus: [],
    };
    const snapshot = structuredClone(input);

    runPipeline(input, talabatAdapter);

    expect(input).toEqual(snapshot);
  });
});

describe('runPipeline with raw samples', () => {
  const locations = resultsFrom(
    loadRawDocs('compero-xbyte.xbyte-raw-locations.json'),
  ).slice(0, 20);
  const listings = resultsFrom(
    loadRawDocs('compero-xbyte.xbyte-raw-restaurants.json'),
  ).slice(0, 20);
  const menus = resultsFrom(
    loadRawDocs('compero-xbyte.xbyte-raw-menus.json'),
  ).slice(0, 40);

  it('runs the full chain on a small raw batch', () => {
    const result = runPipeline({ locations, listings, menus }, talabatAdapter);

    expect(result.locations.length).toBeGreaterThan(0);
    expect(result.restaurants.length).toBeGreaterThan(0);
    expect(result.locations[0]).toMatchObject({
      sourceProvider: 'talabat',
      locationId: expect.any(Number),
    });
    logPipelineResult('raw samples: runPipeline', result);
  });
});
