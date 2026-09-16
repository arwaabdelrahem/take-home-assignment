# 3.2 Analysis and Target Model

## Source Data

There are 3 main types of raw API data:

### 1. Locations

The locations data contains:

* `location_id`
* `name`
* `slug`

There are 8 API responses containing the same list of around 697 locations, so the data is duplicated.

A location is identified by `location_id`.

### 2. Restaurant Listings

The restaurant listing data shows which restaurants are available in which areas.

It is not the complete restaurant data. It mainly provides the relationship between restaurants and areas.

The relationship is:

```text
Restaurant <-> Area
many-to-many
```

The same restaurant can exist in multiple areas, and an area can contain multiple restaurants.

### 3. Restaurant Menus

The menu data contains restaurant details, categories and menu items.

It also contains:

* `id`
* `outletCode`
* restaurant information
* menu categories
* menu items

The restaurant URL uses the outlet identifier:

```text
/restaurant/{id}
```

`outletCode` is used as the restaurant/outlet identifier, while `id` is kept as the source/Talabat internal ID.

The menu data contains nested categories and items, so categories and items should become first-class collections.

---

## Anomalies Found

### Duplicate data

The locations data is duplicated because there are 8 API responses containing the same locations.

The same restaurant can also appear multiple times because it can exist in different areas.

The pipeline should deduplicate the data and use upserts so running it multiple times does not create duplicates.

### Inconsistent / missing fields

Some records can have missing or empty restaurant/menu fields.

Fields such as rating, deliveryFee, deliveryTime, image, contact, etc. should therefore not be assumed to always exist.

The pipeline should handle missing values safely.

### Mixed / unstable identifiers

There are multiple IDs in the source data.

For restaurants, `outletCode` is used as the main business identifier, while the source `id` is kept as `talabatId`.

Categories and items also have their own IDs and should be linked to the restaurant using the restaurant `outletCode`.

### Nested data

The menu response contains nested categories and items.

These should not remain deeply nested inside the restaurant document because categories and items are separate entities and can grow independently.

---

## Target Model

The target model will contain:

```text
locations
restaurants
menu_categories
menu_items
```

### Location

```text
Location
- _id
- locationId
- name
- slug
- sourceProvider
```

`locationId` is the source identifier and will be used for upserts.

Index:

```text
unique(locationId, sourceProvider)
```

This prevents the same location from being inserted more than once for the same provider.

---

### Restaurant

```text
Restaurant
- _id
- outletCode
- name
- url
- talabatId
- logo
- location
- rating
- deliveryFee
- deliveryTime
- minOrderAmount
- address
- city
- contact
- areaIds
- hasMenu
- sourceProvider
- outletStatus
```

`outletCode` is the main restaurant identifier.

`talabatId` keeps the original source/internal restaurant ID.

The restaurant gets its area information from the restaurant listing data:

```text
Restaurant
    |
    └── areaIds[]
```

Index:

```text
unique(outletCode, sourceProvider)
```

This makes the restaurant upsertable and prevents duplicate restaurants.

---

### Menu Category

```text
MenuCategory
- _id
- name
- categoryId
- restaurantOutletId
- sourceProvider
```

A category belongs to one restaurant.

It references the restaurant using:

```text
restaurantOutletId -> Restaurant.outletCode
```

A unique index can be created on:

```text
unique(categoryId, restaurantOutletId, sourceProvider)
```

This prevents the same category from being inserted multiple times for the same restaurant.

---

### Menu Item

```text
MenuItem
- _id
- restaurantOutletId
- categoryId
- itemId
- name
- description
- price
- rating
- image
- priceIsZero
```

An item belongs to a restaurant and a category.

Relationships:

```text
Restaurant
    |
    └── restaurantOutletId
            |
            ▼
       MenuCategory
            |
            └── categoryId
                    |
                    ▼
                MenuItem
```

A unique index can be created on:

```text
unique(itemId, restaurantOutletId, sourceProvider)
```

---

## Trade-offs

The relationship between restaurants and areas is naturally many-to-many.

The clean relational approach would be to create another collection:

```text
restaurantAreas
- restaurantId
- areaId
```

However, to keep the implementation simple, the area IDs will be embedded inside the restaurant:

```text
areaIds: []
```

This means we avoid creating another collection and another join when reading a restaurant.

The trade-off is that updating restaurant-area relationships is slightly less normalized.

For menu categories and items, we use separate collections instead of embedding them inside restaurants because they are separate entities and the menu can contain many categories and items.

The target model therefore keeps the structure simple while avoiding unnecessary duplication.
