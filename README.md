# Take-home: provider factory

Talabat raw dumps → validate → normalize → map → deduplicate → project → factory Mongo. Invalid records go to quarantine, never dropped.

Two databases: `provider_raw` (seed only) and `provider_factory` (locations, restaurants, menu categories, menu items, runs, quarantine).

## Setup

```bash
cp .env.example .env
docker compose up -d
npm install
```

Mongo on `27017`, Redis on `6379`. Defaults match `.env.example`.

## Seed

```bash
npm run seed:raw
```

Writes `raw_data/` into `xbyte_raw_locations`, `xbyte_raw_restaurants`, and `xbyte_raw_menus`. This is the only writer to `provider_raw`. Persist reads those collections and never writes them.

## Run

```bash
npm run start:dev
```

| Method | Path | What |
| --- | --- | --- |
| `POST` | `/runs` | Persist all collections. Optional `{ "limit": 50 }` |
| `GET` | `/runs/:id` | Status and counters |
| `GET` | `/runs/:id/errors` | Paginated quarantine (`page`, `pageSize`) |
| `GET` | `/health` | Mongo + Redis liveness |

```bash
curl -X POST http://localhost:3000/runs
curl http://localhost:3000/runs/<id>
curl http://localhost:3000/runs/<id>/errors
curl http://localhost:3000/health
```

## Test

```bash
npm test
```

Unit tests cover the pipeline stages, extract, upsert filters, and optional `runPipeline` inputs.

## Decisions

- **Core + adapter.** Transform is provider-agnostic. Talabat is schemas + mappings + a small URL parse. A second provider should not rewrite the pipeline.
- **Zod at the edge, quarantine inside.** Bad records are kept with a reason. Nothing is silently dropped.
- **Pure pipeline.** No Mongo in validate / normalize / map / dedupe / project. Same input, same output.
- **Seed writes raw; persist reads Mongo.** After seed, `provider_raw` is read-only. Persist does not read `raw_data/`.
- **Optional streams on `runPipeline`.** Each collection module passes only what it needs. Restaurants is the only caller that merges listings + menus (`outletCode`, `areaIds` from listings).
- **First-wins dedupe.** Locations by `locationId`. Listings collect `areaId` → `areaIds`. Menus flatten nested categories/items.
- **Unique indexes from `analysis.md`.** Upserts are safe to re-run: `(locationId, sourceProvider)`, `(outletCode, sourceProvider)`, category/item + `restaurantOutletId` + `sourceProvider`.
- **`POST /runs` waits.** Create a run, persist, return status and counters. No job queue.

## Known gaps

- A full run loads all raw docs and can take a while; `POST /runs` blocks until it finishes.
- Locations / restaurants / categories / items each run their own pipeline. Menus are processed more than once, so the same menu failure can be quarantined more than once.
- Quarantine is insert-only. Re-running appends the same errors again.

## Next steps

1. Adding Queues so `POST /runs` returns an id immediately and `GET /runs/:id` is polled.
3. upsert quarantine by `(runId)` so repeats do not grow the table.
4. Batch / cursor the raw reads instead of `find({}).toArray()`.
