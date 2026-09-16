import * as fs from 'fs';
import * as path from 'path';
import { talabatAdapter } from '../../providers/talabat/adapter';
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

function summarizeRecord(record: unknown): unknown {
  if (record && typeof record === 'object' && 'category' in record) {
    const { category, ...rest } = record as {
      category?: unknown[];
      [key: string]: unknown;
    };
    return {
      ...rest,
      categoryCount: Array.isArray(category) ? category.length : 0,
    };
  }
  return record;
}

function logNormalizeResult(
  label: string,
  before: unknown,
  after: unknown,
) {
  console.log(`\n=== ${label} ===`);
  console.log('before:', JSON.stringify(summarizeRecord(before), null, 2));
  console.log('after:', JSON.stringify(summarizeRecord(after), null, 2));
}

describe('normalizeRecords', () => {
  it('trims string values', () => {
    const records = [
      {
        location_id: 1468,
        location_name: '  Al Zaab  ',
        location_slug: ' al-zaab ',
      },
    ];

    expect(normalizeRecords(records)).toEqual([
      {
        location_id: 1468,
        location_name: 'Al Zaab',
        location_slug: 'al-zaab',
      },
    ]);
  });

  it('drops blank strings so optional fields are missing', () => {
    const records = [
      {
        restaurant_name: 'Sla Restaurant and Cafe',
        restaurant_url: 'https://www.talabat.com/uae/restaurant/648607/sla',
        area_name: '   ',
        contact: '',
      },
    ];

    expect(normalizeRecords(records)).toEqual([
      {
        restaurant_name: 'Sla Restaurant and Cafe',
        restaurant_url: 'https://www.talabat.com/uae/restaurant/648607/sla',
      },
    ]);
  });

  it('coerces purely numeric strings and leaves mixed strings alone', () => {
    const records = [
      {
        deliveryFee: '9',
        latitude: '25.23018894217186',
        DeliveryTime: '25-40 mins',
        Contact: '00000-00000',
      },
    ];

    expect(normalizeRecords(records)).toEqual([
      {
        deliveryFee: 9,
        latitude: 25.23018894217186,
        DeliveryTime: '25-40 mins',
        Contact: '00000-00000',
      },
    ]);
  });

  it('trims nested menu item names', () => {
    const records = [
      {
        id: 1400,
        outletCode: 34807,
        category: [
          {
            category_id: 1,
            category_name: '  Picks for you  ',
            items: [
              {
                item_id: 10,
                item_name: '  Pad Thai  ',
                price: 57,
              },
            ],
          },
        ],
      },
    ];

    expect(normalizeRecords(records)).toEqual([
      {
        id: 1400,
        outletCode: 34807,
        category: [
          {
            category_id: 1,
            category_name: 'Picks for you',
            items: [
              {
                item_id: 10,
                item_name: 'Pad Thai',
                price: 57,
              },
            ],
          },
        ],
      },
    ]);
  });

  it('does not mutate the input', () => {
    const record = {
      location_name: '  Al Jaddaf  ',
      deliveryFee: '9',
    };
    const input = [record];
    const snapshot = structuredClone(input);

    normalizeRecords(input);

    expect(input).toEqual(snapshot);
  });

  it('is deterministic: same input produces the same output', () => {
    const records = [
      {
        restaurant_name: '  Bombay Box  ',
        deliveryFee: '9',
        DeliveryTime: '25-40 mins',
      },
    ];

    expect(normalizeRecords(records)).toEqual(normalizeRecords(records));
  });
});

describe('normalizeRecords with raw restaurant samples', () => {
  const rawDocs = loadRawDocs('compero-xbyte.xbyte-raw-restaurants.json');
  const { valid } = validateRecords(
    resultsFrom(rawDocs).slice(0, 5),
    talabatAdapter.schemas.restaurantListing,
  );

  it('normalizes validated restaurant listings from raw_data', () => {
    const normalized = normalizeRecords(valid);

    expect(normalized).toHaveLength(5);
    expect(normalized[0]).toMatchObject({
      restaurant_name: expect.any(String),
      restaurant_url: expect.any(String),
    });
    logNormalizeResult('restaurants: normalize', valid[0], normalized[0]);
  });
});

describe('normalizeRecords with raw menu samples', () => {
  const rawDocs = loadRawDocs('compero-xbyte.xbyte-raw-menus.json');
  const { valid } = validateRecords(
    resultsFrom(rawDocs).slice(0, 5),
    talabatAdapter.schemas.menu,
  );

  it('normalizes validated menu records from raw_data', () => {
    const normalized = normalizeRecords(valid);

    expect(normalized).toHaveLength(5);
    expect(normalized[0]).toMatchObject({
      id: expect.any(Number),
      outletCode: expect.any(Number),
    });
    expect(typeof (normalized[0] as { deliveryFee?: unknown }).deliveryFee).toBe(
      'number',
    );
    expect(
      (normalized[0] as { DeliveryTime?: unknown }).DeliveryTime,
    ).toBe('25-40 mins');
    logNormalizeResult('menus: normalize', valid[0], normalized[0]);
  });
});
