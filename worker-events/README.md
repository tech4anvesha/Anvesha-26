# Anvesha '26 — events API

A second Worker, separate from `worker/` (the merch API). Same D1 database (`anvesha`),
its own tables, its own deployment, its own cron.

| | |
|---|---|
| Worker | `anvesha-events-api` |
| D1 | `anvesha` — tables `events_scheduled`, `events_done` |
| Cron | `*/15 * * * *` — archives events whose end time has passed |
| Auth | the merch admin panel's session token (shared `admin_login` table) |

## Tables

`events_scheduled` — `event_id`, `name`, `starts_at`, `ends_at`, `venue`, `description`,
`registration_link`, `event_type`, `created_at`

`events_done` — the same, with `registration_link` replaced by `gallery_link` (a Drive
link) and a `summary` column added, plus `archived_at`.

Times are two naive **IST** stamps, `'YYYY-MM-DD HH:MM'` — no timezone suffix, no UTC
conversion at either end. The date is `date(starts_at)` and the clock time is
`time(starts_at)`; the sweep only ever compares `ends_at`.

## Routes

```
GET    /api/events              upcoming, soonest first          public
GET    /api/events/past         already happened, newest first   public
POST   /api/events              add to the schedule              admin
PUT    /api/events/:id          edit a scheduled event           admin
DELETE /api/events/:id          drop a scheduled event           admin
PUT    /api/events/past/:id     set gallery_link + summary       admin
POST   /api/events/sweep        run the archive sweep now        admin
```

Admin routes take `Authorization: Bearer <session_token>` — the token the existing
admin panel already holds after login. No new password, no new secret.

## The sweep

`scheduled()` fires every 15 minutes and runs one D1 batch (a single transaction):

```sql
INSERT OR IGNORE INTO events_done (...) SELECT ... FROM events_scheduled WHERE ends_at <= ?;
DELETE FROM events_scheduled WHERE ends_at <= ?;
```

Both statements bind the same IST cutoff, so a row can never be deleted without having
been archived first. It is idempotent — running it twice, or by hand via
`POST /api/events/sweep`, costs nothing.

`GET /api/events` also filters `ends_at > now`, so an event that ended eight minutes ago
is already gone from the upcoming list before the cron gets to it.

## Local

```bash
npm i
npm run db:local     # creates the tables in the merch Worker's local D1
npm run dev          # shares that same local D1, so admin login works
npm test
npm run typecheck
```

`dev` and `db:local` both pass `--persist-to ../worker/.wrangler/state`. Without it
wrangler would give this directory its own local sqlite file, which would have the
events tables but no `admin_login` — every admin route would 401 locally.

## Deploy

```bash
npm run db:remote    # once — creates the two tables in the live D1
npm run deploy
```

`wrangler deploy` with no `--env` ships the top-level `vars` block, so `ALLOWED_ORIGINS`
there is the production list. Add a local origin in `.dev.vars` (git-ignored), never here.
