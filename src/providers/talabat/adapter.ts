import { mapFields, mapRecords } from '../../core/transform/map';
import { talabatMappings } from './mappings';
import {
  talabatLocationSchema,
  talabatMenuSchema,
  talabatRestaurantListingSchema,
} from './schemas';

const LISTING_OUTLET = /\/restaurant\/(\d+)/;

function parseListingUrl(url: string): {
  outletCode?: number;
  areaId?: number;
} {
  const parsed: { outletCode?: number; areaId?: number } = {};
  const outletMatch = url.match(LISTING_OUTLET);
  if (outletMatch) {
    parsed.outletCode = Number(outletMatch[1]);
  }

  try {
    const aid = new URL(url).searchParams.get('aid');
    if (aid && /^-?\d+$/.test(aid)) {
      parsed.areaId = Number(aid);
    }
  } catch {
    // Invalid URLs just omit the extra fields.
  }

  return parsed;
}

function mapLocation(record: Record<string, unknown>): Record<string, unknown> {
  const mapped = mapFields(record, talabatMappings.location);
  return mapped;
}

function mapRestaurantListing(
  record: Record<string, unknown>,
): Record<string, unknown> {
  const mapped = mapFields(record, talabatMappings.restaurantListing);
  if (typeof mapped.url === 'string') {
    Object.assign(mapped, parseListingUrl(mapped.url));
  }
  return mapped;
}

function mapMenu(record: Record<string, unknown>): Record<string, unknown> {
  const mapped = mapFields(record, talabatMappings.restaurant);
  const categories = record.category;

  if (Array.isArray(categories)) {
    mapped.category = categories.map((category) => {
      if (category === null || typeof category !== 'object') {
        return category;
      }

      const source = category as Record<string, unknown>;
      const mappedCategory = mapFields(source, talabatMappings.menuCategory);
      if (Array.isArray(source.items)) {
        mappedCategory.items = mapRecords(
          source.items.filter(
            (item): item is Record<string, unknown> =>
              item !== null && typeof item === 'object',
          ),
          talabatMappings.menuItem,
        );
      }
      return mappedCategory;
    });
  }

  return mapped;
}

/**
 * Provider seam: Talabat-specific schemas and field names live here.
 * A second provider adds its own adapter + mappings; `pipeline/core` stays unchanged.
 */
export const talabatAdapter = {
  sourceProvider: 'talabat',
  schemas: {
    location: talabatLocationSchema,
    restaurantListing: talabatRestaurantListingSchema,
    menu: talabatMenuSchema,
  },
  mappings: talabatMappings,
  parseListingUrl,
  mapRestaurantListing,
  mapMenu,
  mapLocation,
};
