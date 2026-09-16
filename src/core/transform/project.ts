export type ProjectInput = {
  locations: Record<string, unknown>[];
  listings: Record<string, unknown>[];
  menus: Record<string, unknown>[];
  sourceProvider: string;
};

export type ProjectOutput = {
  locations: Record<string, unknown>[];
  restaurants: Record<string, unknown>[];
  menuCategories: Record<string, unknown>[];
  menuItems: Record<string, unknown>[];
};

const LOCATION_FIELDS = ['locationId', 'name', 'slug'] as const;

const RESTAURANT_FIELDS = [
  'outletCode',
  'name',
  'url',
  'talabatId',
  'logo',
  'location',
  'rating',
  'deliveryFee',
  'deliveryTime',
  'minOrderAmount',
  'address',
  'city',
  'contact',
  'outletStatus',
] as const;

const CATEGORY_FIELDS = ['categoryId', 'name'] as const;

const ITEM_FIELDS = [
  'itemId',
  'name',
  'description',
  'price',
  'rating',
  'image',
] as const;

function isPresent(value: unknown): boolean {
  return value !== undefined && value !== null && value !== '';
}

function pickFields(
  record: Record<string, unknown>,
  fields: readonly string[],
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const field of fields) {
    if (isPresent(record[field])) {
      result[field] = record[field];
    }
  }
  return result;
}

function outletKey(record: Record<string, unknown>): string | undefined {
  const value = record.outletCode;
  if (value === undefined || value === null) {
    return undefined;
  }
  return String(value);
}

export function projectLocations(
  locations: Record<string, unknown>[],
  sourceProvider: string,
): Record<string, unknown>[] {
  return locations.map((location) => ({
    ...pickFields(location, LOCATION_FIELDS),
    sourceProvider,
  }));
}

function areaIdsFrom(record: Record<string, unknown>): unknown[] {
  return Array.isArray(record.areaIds) ? [...record.areaIds] : [];
}

export function projectRestaurants(
  listings: Record<string, unknown>[],
  menus: Record<string, unknown>[],
  sourceProvider: string,
): Record<string, unknown>[] {
  const byOutlet = new Map<string, Record<string, unknown>>();
  const withoutKey: Record<string, unknown>[] = [];

  for (const listing of listings) {
    const restaurant = {
      ...pickFields(listing, RESTAURANT_FIELDS),
      areaIds: areaIdsFrom(listing),
      hasMenu: false,
      sourceProvider,
    };
    const key = outletKey(listing);
    if (key === undefined) {
      withoutKey.push(restaurant);
      continue;
    }
    byOutlet.set(key, restaurant);
  }

  for (const menu of menus) {
    const key = outletKey(menu);
    const menuFields = pickFields(menu, RESTAURANT_FIELDS);
    const existing = key === undefined ? undefined : byOutlet.get(key);
    const restaurant = {
      ...existing,
      ...menuFields,
      areaIds: existing ? areaIdsFrom(existing) : [],
      url: existing?.url ?? menuFields.url,
      hasMenu: true,
      sourceProvider,
    };

    if (key === undefined) {
      withoutKey.push(restaurant);
      continue;
    }
    byOutlet.set(key, restaurant);
  }

  return [...byOutlet.values(), ...withoutKey];
}

function flattenMenus(
  menus: Record<string, unknown>[],
  sourceProvider: string,
): {
  menuCategories: Record<string, unknown>[];
  menuItems: Record<string, unknown>[];
} {
  const menuCategories: Record<string, unknown>[] = [];
  const menuItems: Record<string, unknown>[] = [];
  const seenCategories = new Set<string>();
  const seenItems = new Set<string>();

  for (const menu of menus) {
    const restaurantOutletId = menu.outletCode;
    if (restaurantOutletId === undefined || restaurantOutletId === null) {
      continue;
    }

    const categories = Array.isArray(menu.category) ? menu.category : [];
    for (const category of categories) {
      if (category === null || typeof category !== 'object') {
        continue;
      }
      const source = category as Record<string, unknown>;
      if (!isPresent(source.categoryId)) {
        continue;
      }

      const categoryKey = `${String(source.categoryId)}:${String(restaurantOutletId)}`;
      if (!seenCategories.has(categoryKey)) {
        seenCategories.add(categoryKey);
        menuCategories.push({
          ...pickFields(source, CATEGORY_FIELDS),
          restaurantOutletId,
          sourceProvider,
        });
      }

      const items = Array.isArray(source.items) ? source.items : [];
      for (const item of items) {
        if (item === null || typeof item !== 'object') {
          continue;
        }
        const itemSource = item as Record<string, unknown>;
        if (!isPresent(itemSource.itemId)) {
          continue;
        }

        const itemKey = `${String(itemSource.itemId)}:${String(restaurantOutletId)}`;
        if (seenItems.has(itemKey)) {
          continue;
        }
        seenItems.add(itemKey);
        menuItems.push({
          ...pickFields(itemSource, ITEM_FIELDS),
          categoryId: source.categoryId,
          restaurantOutletId,
          sourceProvider,
          priceIsZero: itemSource.price === 0,
        });
      }
    }
  }

  return { menuCategories, menuItems };
}

export function projectMenuCategories(
  menus: Record<string, unknown>[],
  sourceProvider: string,
): Record<string, unknown>[] {
  return flattenMenus(menus, sourceProvider).menuCategories;
}

export function projectMenuItems(
  menus: Record<string, unknown>[],
  sourceProvider: string,
): Record<string, unknown>[] {
  return flattenMenus(menus, sourceProvider).menuItems;
}

/**
 * Shape mapped streams onto the target collections.
 * Pure: same input always produces the same output, and the input is not mutated.
 */
export function projectToTarget(input: ProjectInput): ProjectOutput {
  return {
    locations: projectLocations(input.locations, input.sourceProvider),
    restaurants: projectRestaurants(
      input.listings,
      input.menus,
      input.sourceProvider,
    ),
    ...flattenMenus(input.menus, input.sourceProvider),
  };
}
