import { z } from 'zod';

const nonEmptyString = z.string().min(1);

export const talabatLocationSchema = z.looseObject({
  location_id: z.number().int().positive(),
  location_name: nonEmptyString,
  location_slug: nonEmptyString,
});

export const talabatRestaurantListingSchema = z.looseObject({
  restaurant_name: nonEmptyString,
  restaurant_url: nonEmptyString,
  area_name: nonEmptyString.optional(),
});

// Identity fields only. Extra fields (categories, items, etc.) are kept
// for later steps.
export const talabatMenuSchema = z.looseObject({
  id: z.number().int().positive(),
  outletCode: z.number().int().positive(),
});

export type TalabatLocation = z.infer<typeof talabatLocationSchema>;
export type TalabatRestaurantListing = z.infer<
  typeof talabatRestaurantListingSchema
>;
export type TalabatMenu = z.infer<typeof talabatMenuSchema>;
