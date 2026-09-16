import * as fs from 'fs';
import * as path from 'path';
import { talabatAdapter } from '../../providers/talabat/adapter';
import { deduplicateRecords } from './deduplicate';
import { normalizeRecords } from './normalize';
import { projectToTarget } from './project';
import { validateRecords } from '../validation/validate';

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

function asRecords(records: unknown[]): Record<string, unknown>[] {
  return records.filter(
    (record): record is Record<string, unknown> =>
      record !== null && typeof record === 'object',
  );
}

function logProjectResult(
  label: string,
  output: ReturnType<typeof projectToTarget>,
) {
  console.log(`\n=== ${label} ===`);
  console.log('locations:', output.locations.length);
  console.log('restaurants:', output.restaurants.length);
  console.log('menuCategories:', output.menuCategories.length);
  console.log('menuItems:', output.menuItems.length);
  console.log(
    'location sample:',
    JSON.stringify(output.locations[0], null, 2),
  );
  console.log(
    'restaurant sample:',
    JSON.stringify(output.restaurants[0], null, 2),
  );
  console.log(
    'category sample:',
    JSON.stringify(output.menuCategories[0], null, 2),
  );
  console.log('item sample:', JSON.stringify(output.menuItems[0], null, 2));
}

describe('projectToTarget', () => {
  const sourceProvider = talabatAdapter.sourceProvider;

  it('adds sourceProvider to locations', () => {
    const output = projectToTarget({
      locations: [{ locationId: 1468, name: 'Al Zaab', slug: 'al-zaab' }],
      listings: [],
      menus: [],
      sourceProvider,
    });

    expect(output.locations).toEqual([
      {
        locationId: 1468,
        name: 'Al Zaab',
        slug: 'al-zaab',
        sourceProvider: 'talabat',
      },
    ]);
  });

  it('merges a listing and a menu with the same outletCode', () => {
    const output = projectToTarget({
      locations: [],
      listings: [
        {
          outletCode: 757815,
          name: 'Listing name',
          url: 'https://www.talabat.com/uae/restaurant/757815/bombay-box?aid=1468',
          areaName: 'Al Zaab',
          areaIds: [1468, 1461],
        },
      ],
      menus: [
        {
          outletCode: 757815,
          talabatId: 687548,
          name: 'Bombay Box',
          rating: 4.4,
          deliveryFee: 9,
        },
      ],
      sourceProvider,
    });

    expect(output.restaurants).toEqual([
      {
        outletCode: 757815,
        name: 'Bombay Box',
        url: 'https://www.talabat.com/uae/restaurant/757815/bombay-box?aid=1468',
        talabatId: 687548,
        rating: 4.4,
        deliveryFee: 9,
        areaIds: [1468, 1461],
        hasMenu: true,
        sourceProvider: 'talabat',
      },
    ]);
  });

  it('marks listing-only restaurants as hasMenu false', () => {
    const output = projectToTarget({
      locations: [],
      listings: [
        {
          outletCode: 648607,
          name: 'Sla Restaurant and Cafe',
          url: 'https://www.talabat.com/uae/restaurant/648607/sla?aid=1468',
          areaIds: [1468],
        },
      ],
      menus: [],
      sourceProvider,
    });

    expect(output.restaurants).toEqual([
      {
        outletCode: 648607,
        name: 'Sla Restaurant and Cafe',
        url: 'https://www.talabat.com/uae/restaurant/648607/sla?aid=1468',
        areaIds: [1468],
        hasMenu: false,
        sourceProvider: 'talabat',
      },
    ]);
  });

  it('flattens nested categories and items onto the restaurant outlet', () => {
    const output = projectToTarget({
      locations: [],
      listings: [],
      menus: [
        {
          outletCode: 34807,
          name: 'Thai Place',
          category: [
            {
              categoryId: 1,
              name: 'Picks for you',
              items: [
                {
                  itemId: 10,
                  name: 'Pad Thai',
                  description: 'Noodles',
                  price: 57,
                  rating: 0,
                  image: 'https://example.com/pad-thai.jpg',
                },
                {
                  itemId: 11,
                  name: 'Free tea',
                  price: 0,
                },
              ],
            },
          ],
        },
      ],
      sourceProvider,
    });

    expect(output.menuCategories).toEqual([
      {
        categoryId: 1,
        name: 'Picks for you',
        restaurantOutletId: 34807,
        sourceProvider: 'talabat',
      },
    ]);
    expect(output.menuItems).toEqual([
      {
        itemId: 10,
        name: 'Pad Thai',
        description: 'Noodles',
        price: 57,
        rating: 0,
        image: 'https://example.com/pad-thai.jpg',
        categoryId: 1,
        restaurantOutletId: 34807,
        sourceProvider: 'talabat',
        priceIsZero: false,
      },
      {
        itemId: 11,
        name: 'Free tea',
        price: 0,
        categoryId: 1,
        restaurantOutletId: 34807,
        sourceProvider: 'talabat',
        priceIsZero: true,
      },
    ]);
  });

  it('does not mutate the input', () => {
    const input = {
      locations: [{ locationId: 1, name: 'A', slug: 'a' }],
      listings: [{ outletCode: 1, name: 'L', areaIds: [10] }],
      menus: [
        {
          outletCode: 1,
          name: 'M',
          category: [{ categoryId: 2, name: 'C', items: [] }],
        },
      ],
      sourceProvider,
    };
    const snapshot = structuredClone(input);

    projectToTarget(input);

    expect(input).toEqual(snapshot);
  });
});

describe('projectToTarget with raw samples', () => {
  const locationResults = resultsFrom(
    loadRawDocs('compero-xbyte.xbyte-raw-locations.json'),
  ).slice(0, 20);
  const listingResults = resultsFrom(
    loadRawDocs('compero-xbyte.xbyte-raw-restaurants.json'),
  ).slice(0, 20);
  const menuResults = resultsFrom(
    loadRawDocs('compero-xbyte.xbyte-raw-menus.json'),
  ).slice(0, 80);

  const locations = deduplicateRecords(
    normalizeRecords(
      asRecords(
        validateRecords(locationResults, talabatAdapter.schemas.location).valid,
      ),
    ).map((record) => talabatAdapter.mapLocation(record)),
    { key: 'locationId' },
  );

  const listings = deduplicateRecords(
    normalizeRecords(
      asRecords(
        validateRecords(
          listingResults,
          talabatAdapter.schemas.restaurantListing,
        ).valid,
      ),
    ).map((record) => talabatAdapter.mapRestaurantListing(record)),
    {
      key: 'outletCode',
      collect: { from: 'areaId', into: 'areaIds' },
    },
  );

  const menus = deduplicateRecords(
    normalizeRecords(
      asRecords(
        validateRecords(menuResults, talabatAdapter.schemas.menu).valid,
      ),
    ).map((record) => talabatAdapter.mapMenu(record)),
    { key: 'outletCode' },
  );

  it('projects a small raw-data batch onto the target collections', () => {
    const output = projectToTarget({
      locations,
      listings,
      menus,
      sourceProvider: talabatAdapter.sourceProvider,
    });

    expect(output.locations.length).toBeGreaterThan(0);
    expect(output.restaurants.length).toBeGreaterThan(0);
    expect(output.locations[0]).toMatchObject({
      locationId: expect.any(Number),
      sourceProvider: 'talabat',
    });
    expect(output.restaurants[0]).toEqual(
      expect.objectContaining({
        sourceProvider: 'talabat',
        hasMenu: expect.any(Boolean),
        areaIds: expect.any(Array),
      }),
    );
    logProjectResult('raw samples: project', output);
  });
});
