import * as fs from 'fs';
import * as path from 'path';
import { talabatAdapter } from '../../providers/talabat/adapter';
import { mapFields, mapRecords } from './map';
import { normalizeRecords } from './normalize';
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

function summarizeRecord(record: unknown): unknown {
  if (record && typeof record === 'object' && 'category' in record) {
    const { category, ...rest } = record as {
      category?: unknown[];
      [key: string]: unknown;
    };
    const firstCategory = Array.isArray(category) ? category[0] : undefined;
    return {
      ...rest,
      categoryCount: Array.isArray(category) ? category.length : 0,
      firstCategory,
    };
  }
  return record;
}

function logMapResult(label: string, before: unknown, after: unknown) {
  console.log(`\n=== ${label} ===`);
  console.log('before:', JSON.stringify(summarizeRecord(before), null, 2));
  console.log('after:', JSON.stringify(summarizeRecord(after), null, 2));
}

describe('mapFields', () => {
  it('renames location fields using the Talabat mapping', () => {
    const record = {
      location_id: 1468,
      location_name: 'Al Zaab',
      location_slug: 'al-zaab',
    };

    expect(mapFields(record, talabatAdapter.mappings.location)).toEqual({
      locationId: 1468,
      name: 'Al Zaab',
      slug: 'al-zaab',
    });
  });

  it('omits missing optional source fields and keeps the record', () => {
    const record = {
      id: 687548,
      outletCode: 757815,
      name: 'Bombay Box',
    };

    expect(mapFields(record, talabatAdapter.mappings.restaurant)).toEqual({
      talabatId: 687548,
      outletCode: 757815,
      name: 'Bombay Box',
    });
  });

  it('does not mutate the input', () => {
    const record = {
      location_id: 1185,
      location_name: 'Al Jaddaf',
      location_slug: 'al-jaddaf',
    };
    const snapshot = structuredClone(record);

    mapFields(record, talabatAdapter.mappings.location);

    expect(record).toEqual(snapshot);
  });

  it('is deterministic: same input produces the same output', () => {
    const record = {
      location_id: 1177,
      location_name: 'Al Barsha South',
      location_slug: 'al-barsha-south',
    };

    expect(mapFields(record, talabatAdapter.mappings.location)).toEqual(
      mapFields(record, talabatAdapter.mappings.location),
    );
  });
});

describe('talabatAdapter.mapRestaurantListing', () => {
  it('renames listing fields and parses outletCode and areaId from the URL', () => {
    const record = {
      area_name: 'Al Zaab',
      restaurant_name: 'Sla Restaurant and Cafe',
      restaurant_url:
        'https://www.talabat.com/uae/restaurant/648607/sla-restaurant-and-cafe-al-rowdah?aid=1468',
    };

    expect(talabatAdapter.mapRestaurantListing(record)).toEqual({
      name: 'Sla Restaurant and Cafe',
      url: record.restaurant_url,
      areaName: 'Al Zaab',
      outletCode: 648607,
      areaId: 1468,
    });
  });

  it('omits outletCode and areaId when the URL does not match', () => {
    const record = {
      restaurant_name: 'Unknown Place',
      restaurant_url: 'https://example.com/not-a-talabat-listing',
      area_name: 'Al Zaab',
    };

    expect(talabatAdapter.mapRestaurantListing(record)).toEqual({
      name: 'Unknown Place',
      url: record.restaurant_url,
      areaName: 'Al Zaab',
    });
  });
});

describe('talabatAdapter.mapMenu', () => {
  it('renames restaurant, category, and item fields and keeps categories nested', () => {
    const record = {
      id: 1400,
      outletCode: 34807,
      name: 'Thai Place',
      rate: 4.4,
      'Minimum Order': 0,
      category: [
        {
          category_id: 295140159,
          category_name: 'Picks for you',
          items: [
            {
              item_id: 295140160,
              item_name: 'Pad Thai',
              description: 'Thin rice noodles',
              price: 57,
              rating: 0,
              image: 'https://example.com/pad-thai.jpg',
            },
          ],
        },
      ],
    };

    expect(talabatAdapter.mapMenu(record)).toEqual({
      talabatId: 1400,
      outletCode: 34807,
      name: 'Thai Place',
      rating: 4.4,
      minOrderAmount: 0,
      category: [
        {
          categoryId: 295140159,
          name: 'Picks for you',
          items: [
            {
              itemId: 295140160,
              name: 'Pad Thai',
              description: 'Thin rice noodles',
              price: 57,
              rating: 0,
              image: 'https://example.com/pad-thai.jpg',
            },
          ],
        },
      ],
    });
  });
});

describe('mapRecords with raw restaurant samples', () => {
  const rawDocs = loadRawDocs('compero-xbyte.xbyte-raw-restaurants.json');
  const { valid } = validateRecords(
    resultsFrom(rawDocs).slice(0, 5),
    talabatAdapter.schemas.restaurantListing,
  );
  const normalized = normalizeRecords(asRecords(valid));

  it('maps validated restaurant listings from raw_data', () => {
    const mapped = normalized.map((record) =>
      talabatAdapter.mapRestaurantListing(record),
    );

    expect(mapped).toHaveLength(5);
    expect(mapped[0]).toMatchObject({
      name: expect.any(String),
      url: expect.any(String),
      outletCode: expect.any(Number),
      areaId: expect.any(Number),
    });
    expect(mapped[0]).not.toHaveProperty('restaurant_name');
    logMapResult('restaurants: map', normalized[0], mapped[0]);
  });
});

describe('mapRecords with raw menu samples', () => {
  const rawDocs = loadRawDocs('compero-xbyte.xbyte-raw-menus.json');
  const { valid } = validateRecords(
    resultsFrom(rawDocs),
    talabatAdapter.schemas.menu,
  );
  const normalized = normalizeRecords(asRecords(valid));
  const withCategories = normalized.find((record) => {
    const category = record.category;
    return Array.isArray(category) && category.length > 0;
  });

  it('maps validated menu records from raw_data', () => {
    expect(withCategories).toBeDefined();
    const mapped = talabatAdapter.mapMenu(withCategories!);

    expect(mapped).toMatchObject({
      outletCode: expect.any(Number),
      talabatId: expect.any(Number),
      name: expect.any(String),
    });
    expect(mapped).not.toHaveProperty('rate');
    expect(mapped).not.toHaveProperty('Minimum Order');

    const categories = mapped.category as Record<string, unknown>[];
    expect(categories[0]).toMatchObject({
      categoryId: expect.any(Number),
      name: expect.any(String),
    });
    expect(categories[0]).not.toHaveProperty('category_id');
    logMapResult('menus: map', withCategories, mapped);
  });
});

describe('mapRecords', () => {
  it('maps a list of locations', () => {
    const records = [
      {
        location_id: 1468,
        location_name: 'Al Zaab',
        location_slug: 'al-zaab',
      },
    ];

    expect(mapRecords(records, talabatAdapter.mappings.location)).toEqual([
      { locationId: 1468, name: 'Al Zaab', slug: 'al-zaab' },
    ]);
  });
});
