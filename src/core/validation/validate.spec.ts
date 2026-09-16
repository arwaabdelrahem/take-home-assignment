import * as fs from 'fs';
import * as path from 'path';
import { z } from 'zod';
import { talabatAdapter } from '../../providers/talabat/adapter';
import { validateRecords } from './validate';

type RawDoc = {
  payload?: {
    results?: unknown[];
    Message?: string;
    error?: unknown;
  };
};

function loadRawDocs(filename: string): RawDoc[] {
  const file = path.join(process.cwd(), 'raw_data', filename);
  return JSON.parse(fs.readFileSync(file, 'utf8')) as RawDoc[];
}

function resultsFrom(docs: RawDoc[]): unknown[] {
  return docs.flatMap((doc) => doc.payload?.results ?? []);
}

function failedPayloadsFrom(docs: RawDoc[]): unknown[] {
  return docs
    .map((doc) => doc.payload)
    .filter(
      (payload): payload is NonNullable<RawDoc['payload']> =>
        payload != null && !Array.isArray(payload.results),
    );
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

function logValidateResult(
  label: string,
  result: { valid: unknown[]; quarantined: { record: unknown; reason: string }[] },
) {
  console.log(`\n=== ${label} ===`);
  console.log(`valid: ${result.valid.length}`);
  console.log(`quarantined: ${result.quarantined.length}`);

  if (result.valid[0] != null) {
    console.log(
      'valid sample:',
      JSON.stringify(summarizeRecord(result.valid[0]), null, 2),
    );
  }

  for (const item of result.quarantined) {
    console.log('quarantine reason:', item.reason);
    console.log(
      'quarantine record:',
      JSON.stringify(summarizeRecord(item.record), null, 2),
    );
  }
}

describe('validateRecords', () => {
  const locationSchema = talabatAdapter.schemas.location;

  it('keeps valid records', () => {
    const records = [
      {
        location_id: 1280,
        location_name: 'Dubai World Trade Center - DWTC',
        location_slug: 'dubai-world-trade-center-dwtc',
      },
    ];

    const result = validateRecords(records, locationSchema);

    expect(result.valid).toEqual(records);
    expect(result.quarantined).toEqual([]);
  });

  it('quarantines invalid records with a reason instead of dropping them', () => {
    const bad = { location_name: 'Al Zaab', location_slug: 'al-zaab' };

    const result = validateRecords([bad], locationSchema);

    expect(result.valid).toEqual([]);
    expect(result.quarantined).toHaveLength(1);
    expect(result.quarantined[0].record).toBe(bad);
    expect(result.quarantined[0].reason).toContain('location_id');
  });

  it('splits a mixed batch into valid and quarantined', () => {
    const good = {
      location_id: 1468,
      location_name: 'Al Zaab',
      location_slug: 'al-zaab',
    };
    const missingId = { location_name: 'Dasman', location_slug: 'dasman' };
    const emptyName = {
      location_id: 1566,
      location_name: '',
      location_slug: 'dasman',
    };

    const result = validateRecords([good, missingId, emptyName], locationSchema);

    expect(result.valid).toEqual([good]);
    expect(result.quarantined).toHaveLength(2);
    expect(result.quarantined.map((item) => item.record)).toEqual([
      missingId,
      emptyName,
    ]);
  });

  it('preserves extra fields on valid records', () => {
    const record = {
      location_id: 1184,
      location_name: 'Al Hudaiba',
      location_slug: 'al-hudaiba',
      extra: 'keep-me',
    };

    const result = validateRecords([record], locationSchema);

    expect(result.valid[0]).toEqual(record);
  });

  it('does not mutate the input array or records', () => {
    const record = {
      location_id: 1185,
      location_name: 'Al Jaddaf',
      location_slug: 'al-jaddaf',
    };
    const input = [record];
    const snapshot = structuredClone(input);

    validateRecords(input, locationSchema);

    expect(input).toEqual(snapshot);
  });

  it('is deterministic: same input produces the same output', () => {
    const records = [
      {
        location_id: 1177,
        location_name: 'Al Barsha South',
        location_slug: 'al-barsha-south',
      },
      { location_name: 'missing-id' },
    ];

    expect(validateRecords(records, locationSchema)).toEqual(
      validateRecords(records, locationSchema),
    );
  });

  it('validates restaurant listings via the Talabat adapter schema', () => {
    const good = {
      area_name: 'Al Zaab',
      restaurant_name: 'Sla Restaurant and Cafe',
      restaurant_url:
        'https://www.talabat.com/uae/restaurant/648607/sla-restaurant-and-cafe-al-rowdah?aid=1468',
    };
    const bad = { area_name: 'Al Zaab', restaurant_name: 'No URL' };

    const result = validateRecords(
      [good, bad],
      talabatAdapter.schemas.restaurantListing,
    );

    expect(result.valid).toEqual([good]);
    expect(result.quarantined[0].reason).toContain('restaurant_url');
  });

  it('accepts a different provider schema without changing the core', () => {
    const otherProviderSchema = z.object({
      areaId: z.string().min(1),
      areaName: z.string().min(1),
    });

    const result = validateRecords(
      [
        { areaId: '1468', areaName: 'Al Zaab' },
        { areaName: 'missing-id' },
      ],
      otherProviderSchema,
    );

    expect(result.valid).toEqual([{ areaId: '1468', areaName: 'Al Zaab' }]);
    expect(result.quarantined).toHaveLength(1);
  });
});

describe('validateRecords with raw restaurant samples', () => {
  const listingSchema = talabatAdapter.schemas.restaurantListing;
  const rawDocs = loadRawDocs('compero-xbyte.xbyte-raw-restaurants.json');
  const realListings = resultsFrom(rawDocs);
  const failedPayloads = failedPayloadsFrom(rawDocs);

  it('keeps real restaurant listings from raw_data', () => {
    const sample = realListings.slice(0, 5);
    const result = validateRecords(sample, listingSchema);

    expect(sample.length).toBe(5);
    expect(result.valid).toHaveLength(5);
    expect(result.quarantined).toEqual([]);
    expect(result.valid[0]).toMatchObject({
      restaurant_name: expect.any(String),
      restaurant_url: expect.any(String),
    });
    logValidateResult('restaurants: valid sample', result);
  });

  it('quarantines failed restaurant payloads instead of dropping them', () => {
    const sample = failedPayloads.slice(0, 1);
    const result = validateRecords(sample, listingSchema);

    expect(sample.length).toBe(1);
    expect(result.valid).toEqual([]);
    expect(result.quarantined).toHaveLength(1);
    expect(result.quarantined[0].record).toBe(sample[0]);
    expect(result.quarantined[0].reason).toMatch(
      /restaurant_name|restaurant_url/,
    );
    logValidateResult('restaurants: failed payload', result);
  });

  it('splits a mixed raw restaurant batch into valid and quarantined', () => {
    const good = realListings.slice(0, 2);
    const bad = failedPayloads.slice(0, 1);
    const result = validateRecords([...good, ...bad], listingSchema);

    expect(result.valid).toHaveLength(2);
    expect(result.quarantined).toHaveLength(1);
    expect(result.quarantined[0].record).toBe(bad[0]);
    logValidateResult('restaurants: mixed batch', result);
  });
});

describe('validateRecords with raw menu samples', () => {
  const menuSchema = talabatAdapter.schemas.menu;
  const rawDocs = loadRawDocs('compero-xbyte.xbyte-raw-menus.json');
  const realMenus = resultsFrom(rawDocs);
  const failedPayloads = failedPayloadsFrom(rawDocs);

  it('keeps real menu records from raw_data', () => {
    const sample = realMenus.slice(0, 5);
    const result = validateRecords(sample, menuSchema);

    expect(sample.length).toBe(5);
    expect(result.valid).toHaveLength(5);
    expect(result.quarantined).toEqual([]);
    expect(result.valid[0]).toMatchObject({
      id: expect.any(Number),
      outletCode: expect.any(Number),
    });
    logValidateResult('menus: valid sample', result);
  });

  it('quarantines failed menu payloads instead of dropping them', () => {
    const sample = failedPayloads.slice(0, 2);
    const result = validateRecords(sample, menuSchema);

    expect(sample.length).toBe(2);
    expect(result.valid).toEqual([]);
    expect(result.quarantined).toHaveLength(2);
    expect(result.quarantined[0].record).toBe(sample[0]);
    expect(result.quarantined[0].reason).toMatch(/id|outletCode/);
    logValidateResult('menus: failed payload', result);
  });

  it('splits a mixed raw batch into valid and quarantined', () => {
    const good = realMenus.slice(0, 2);
    const bad = failedPayloads.slice(0, 1);
    const result = validateRecords([...good, ...bad], menuSchema);

    expect(result.valid).toHaveLength(2);
    expect(result.quarantined).toHaveLength(1);
    expect(result.quarantined[0].record).toBe(bad[0]);
    logValidateResult('menus: mixed batch', result);
  });
});
