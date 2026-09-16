import { ZodType } from 'zod';
import { QuarantinedRecord } from '../../interfaces/types';
import { deduplicateRecords } from '../transform/deduplicate';
import { normalizeRecords } from '../transform/normalize';
import {
  projectLocations,
  projectMenuCategories,
  projectMenuItems,
  projectRestaurants,
  ProjectOutput,
} from '../transform/project';
import { validateRecords } from '../validation/validate';

export type PipelineAdapter = {
  sourceProvider: string;
  schemas: {
    location: ZodType;
    restaurantListing: ZodType;
    menu: ZodType;
  };
  mapLocation: (record: Record<string, unknown>) => Record<string, unknown>;
  mapRestaurantListing: (
    record: Record<string, unknown>,
  ) => Record<string, unknown>;
  mapMenu: (record: Record<string, unknown>) => Record<string, unknown>;
};

export type PipelineInput = {
  locations?: unknown[];
  listings?: unknown[];
  menus?: unknown[];
};

export type PipelineResult = ProjectOutput & {
  quarantined: {
    locations: QuarantinedRecord[];
    listings: QuarantinedRecord[];
    menus: QuarantinedRecord[];
  };
};

function asRecords(records: unknown[]): Record<string, unknown>[] {
  return records.filter(
    (record): record is Record<string, unknown> =>
      record !== null && typeof record === 'object',
  );
}

function runStream(
  records: unknown[],
  schema: ZodType,
  mapFn: (record: Record<string, unknown>) => Record<string, unknown>,
  dedupe: { key: string; collect?: { from: string; into: string } },
): { records: Record<string, unknown>[]; quarantined: QuarantinedRecord[] } {
  const { valid, quarantined } = validateRecords(records, schema);
  const mapped = asRecords(normalizeRecords(valid)).map(mapFn);
  return {
    records: deduplicateRecords(mapped, dedupe),
    quarantined,
  };
}

function unusedStream(): {
  records: Record<string, unknown>[];
  quarantined: QuarantinedRecord[];
} {
  return { records: [], quarantined: [] };
}

/**
 * Run validate → normalize → map → deduplicate on each provided stream,
 * then project only what that call can produce.
 */
export function runPipeline(
  input: PipelineInput,
  adapter: PipelineAdapter,
): PipelineResult {
  const locations =
    input.locations === undefined
      ? unusedStream()
      : runStream(
          input.locations,
          adapter.schemas.location,
          adapter.mapLocation,
          { key: 'locationId' },
        );
  const listings =
    input.listings === undefined
      ? unusedStream()
      : runStream(
          input.listings,
          adapter.schemas.restaurantListing,
          adapter.mapRestaurantListing,
          { key: 'outletCode', collect: { from: 'areaId', into: 'areaIds' } },
        );
  const menus =
    input.menus === undefined
      ? unusedStream()
      : runStream(input.menus, adapter.schemas.menu, adapter.mapMenu, {
          key: 'outletCode',
        });

  return {
    locations:
      input.locations === undefined
        ? []
        : projectLocations(locations.records, adapter.sourceProvider),
    restaurants:
      input.listings === undefined && input.menus === undefined
        ? []
        : projectRestaurants(
            listings.records,
            menus.records,
            adapter.sourceProvider,
          ),
    menuCategories:
      input.menus === undefined
        ? []
        : projectMenuCategories(menus.records, adapter.sourceProvider),
    menuItems:
      input.menus === undefined
        ? []
        : projectMenuItems(menus.records, adapter.sourceProvider),
    quarantined: {
      locations: locations.quarantined,
      listings: listings.quarantined,
      menus: menus.quarantined,
    },
  };
}
