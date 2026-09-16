import * as fs from 'fs';
import * as path from 'path';
import { talabatAdapter } from '../../providers/talabat/adapter';
import { deduplicateRecords } from './deduplicate';
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

function logDedupeResult(
  label: string,
  beforeCount: number,
  after: Record<string, unknown>[],
) {
  console.log(`\n=== ${label} ===`);
  console.log(`before: ${beforeCount}`);
  console.log(`after: ${after.length}`);
  if (after[0] != null) {
    console.log('sample:', JSON.stringify(after[0], null, 2));
  }
}

describe('deduplicateRecords', () => {
  it('keeps the first location when locationId is duplicated', () => {
    const records = [
      { locationId: 1468, name: 'Al Zaab', slug: 'al-zaab' },
      { locationId: 1468, name: 'Al Zaab copy', slug: 'al-zaab-copy' },
      { locationId: 1280, name: 'DWTC', slug: 'dwtc' },
    ];

    expect(deduplicateRecords(records, { key: 'locationId' })).toEqual([
      { locationId: 1468, name: 'Al Zaab', slug: 'al-zaab' },
      { locationId: 1280, name: 'DWTC', slug: 'dwtc' },
    ]);
  });

  it('merges listing areaIds for the same outletCode', () => {
    const records = [
      {
        outletCode: 648607,
        name: 'Sla Restaurant and Cafe',
        url: 'https://www.talabat.com/uae/restaurant/648607/sla?aid=1468',
        areaId: 1468,
      },
      {
        outletCode: 648607,
        name: 'Should keep first name',
        url: 'https://www.talabat.com/uae/restaurant/648607/sla?aid=1461',
        areaId: 1461,
      },
    ];

    expect(
      deduplicateRecords(records, {
        key: 'outletCode',
        collect: { from: 'areaId', into: 'areaIds' },
      }),
    ).toEqual([
      {
        outletCode: 648607,
        name: 'Sla Restaurant and Cafe',
        url: 'https://www.talabat.com/uae/restaurant/648607/sla?aid=1468',
        areaIds: [1468, 1461],
      },
    ]);
  });

  it('does not duplicate the same collected areaId', () => {
    const records = [
      { outletCode: 1, name: 'A', areaId: 1468 },
      { outletCode: 1, name: 'A', areaId: 1468 },
    ];

    expect(
      deduplicateRecords(records, {
        key: 'outletCode',
        collect: { from: 'areaId', into: 'areaIds' },
      }),
    ).toEqual([{ outletCode: 1, name: 'A', areaIds: [1468] }]);
  });

  it('keeps the first menu restaurant when outletCode is duplicated', () => {
    const records = [
      { outletCode: 757815, name: 'Bombay Box', talabatId: 687548 },
      { outletCode: 757815, name: 'Bombay Box later', talabatId: 1 },
    ];

    expect(deduplicateRecords(records, { key: 'outletCode' })).toEqual([
      { outletCode: 757815, name: 'Bombay Box', talabatId: 687548 },
    ]);
  });

  it('keeps records that are missing the key', () => {
    const records = [
      { name: 'No outlet' },
      { outletCode: 1, name: 'Has outlet' },
    ];

    expect(deduplicateRecords(records, { key: 'outletCode' })).toEqual(records);
  });

  it('does not mutate the input', () => {
    const records = [
      { locationId: 1468, name: 'Al Zaab' },
      { locationId: 1468, name: 'Al Zaab copy' },
    ];
    const snapshot = structuredClone(records);

    deduplicateRecords(records, { key: 'locationId' });

    expect(records).toEqual(snapshot);
  });

  it('is deterministic: same input produces the same output', () => {
    const records = [
      { outletCode: 1, name: 'A', areaId: 10 },
      { outletCode: 1, name: 'B', areaId: 20 },
    ];
    const options = {
      key: 'outletCode',
      collect: { from: 'areaId', into: 'areaIds' },
    };

    expect(deduplicateRecords(records, options)).toEqual(
      deduplicateRecords(records, options),
    );
  });
});

describe('deduplicateRecords with raw location samples', () => {
  const rawDocs = loadRawDocs('compero-xbyte.xbyte-raw-locations.json');
  const { valid } = validateRecords(
    resultsFrom(rawDocs),
    talabatAdapter.schemas.location,
  );
  const mapped = normalizeRecords(asRecords(valid)).map((record) =>
    talabatAdapter.mapLocation(record),
  );

  it('deduplicates mapped locations from raw_data', () => {
    const deduped = deduplicateRecords(mapped, { key: 'locationId' });

    expect(mapped.length).toBeGreaterThan(deduped.length);
    expect(deduped[0]).toMatchObject({
      locationId: expect.any(Number),
      name: expect.any(String),
      slug: expect.any(String),
    });
    logDedupeResult('locations: dedupe', mapped.length, deduped);
  });
});

describe('deduplicateRecords with raw restaurant listing samples', () => {
  const rawDocs = loadRawDocs('compero-xbyte.xbyte-raw-restaurants.json');
  const { valid } = validateRecords(
    resultsFrom(rawDocs),
    talabatAdapter.schemas.restaurantListing,
  );
  const mapped = normalizeRecords(asRecords(valid)).map((record) =>
    talabatAdapter.mapRestaurantListing(record),
  );

  it('deduplicates mapped listings and collects areaIds', () => {
    const deduped = deduplicateRecords(mapped, {
      key: 'outletCode',
      collect: { from: 'areaId', into: 'areaIds' },
    });

    expect(mapped.length).toBeGreaterThan(deduped.length);
    const withSeveralAreas = deduped.find((record) => {
      const areaIds = record.areaIds;
      return Array.isArray(areaIds) && areaIds.length > 1;
    });
    expect(withSeveralAreas).toBeDefined();
    expect(withSeveralAreas).not.toHaveProperty('areaId');
    logDedupeResult('listings: dedupe', mapped.length, deduped);
    console.log('sample with several areas:', JSON.stringify(withSeveralAreas, null, 2));
  });
});
