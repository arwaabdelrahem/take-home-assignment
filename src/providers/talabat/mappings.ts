/**
 * Declarative source → target field names for Talabat.
 * The core pipeline reads these keys; it never hard-codes Talabat names.
 */
export const talabatMappings = {
  location: {
    locationId: 'location_id',
    name: 'location_name',
    slug: 'location_slug',
  },
  restaurantListing: {
    name: 'restaurant_name',
    url: 'restaurant_url',
    areaName: 'area_name',
  },
  restaurant: {
    outletCode: 'outletCode',
    talabatId: 'id',
    name: 'name',
    logo: 'logo',
    rating: 'rate',
    deliveryFee: 'deliveryFee',
    deliveryTime: 'DeliveryTime',
    minOrderAmount: 'Minimum Order',
    address: 'Restaurant Address',
    city: 'City',
    contact: 'Contact',
  },
  menuCategory: {
    categoryId: 'category_id',
    name: 'category_name',
  },
  menuItem: {
    itemId: 'item_id',
    name: 'item_name',
    description: 'description',
    price: 'price',
    rating: 'rating',
    image: 'image',
  },
} as const;
