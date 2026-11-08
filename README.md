# ReviewBoost server

Express API running on Cloudflare Workers with a D1 database. The frontend is maintained separately.

## Setup

Use Node.js 22 and install dependencies with `npm install`. `.nvmrc` also selects Node.js 22 for Cloudflare Workers Builds.

The existing remote D1 database is `reviewboost-db` (`4542912b-9c6b-42d3-ae27-01171324466e`), bound as `DB` in `wrangler.jsonc`. Its `requests` table was created and verified manually through the Cloudflare dashboard and was reported to contain zero records. **Do not recreate or populate the remote table.** The repository's initial migration is for a new local database; there are no seeds or data imports. It defines `business_id` as text without a foreign key because the business schema is not known. Equivalence with the checked-in migration and Wrangler's migration-tracking state have not been independently verified here.

`DEMO_MODE` is set to `"true"` in `wrangler.jsonc`. In demo mode, `POST /api/send-request` returns the normal success shape with a `demo_` message ID, without contacting Twilio or writing to D1. `GET /api/health` returns `{ "status": "ok", "demoMode": true }`. The existing CORS middleware permits cross-origin requests and handles preflight. If `SMS_API_KEY` is configured, it remains required even in demo mode.

To enable real SMS deliberately, change `DEMO_MODE` to `"false"` in `wrangler.jsonc`, configure the Twilio secrets, review SMS endpoint protection, and deploy only after approval. Only the exact string `"true"` enables demo mode; a missing or different value uses real mode, which fails if Twilio credentials are missing. Real mode sends SMS and writes to D1.

Twilio credentials are not needed in demo mode. For real-mode local development, create a `.dev.vars` file alongside `wrangler.jsonc` (do not commit it):

```dotenv
TWILIO_ACCOUNT_SID="your-account-sid"
TWILIO_AUTH_TOKEN="your-auth-token"
TWILIO_PHONE_NUMBER="your-twilio-phone-number"
# Optional: SMS_API_KEY="your-private-api-key"
```

For demo-only local development, start the Worker with `npm run dev`; no database migration is needed. For real-mode local development, apply the migration locally and start the Worker:

```sh
npx wrangler d1 migrations apply reviewboost-db --local
npm run dev
```

## Remote schema and migration tracking

Before applying migrations remotely, inspect the existing table in the Cloudflare dashboard or using authenticated, read-only Wrangler queries:

```sh
npx wrangler d1 execute reviewboost-db --remote --command "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'requests'"
npx wrangler d1 execute reviewboost-db --remote --command "PRAGMA table_info(requests)"
npx wrangler d1 execute reviewboost-db --remote --command "PRAGMA foreign_key_list(requests)"
npx wrangler d1 execute reviewboost-db --remote --command "SELECT type, name, sql FROM sqlite_master WHERE tbl_name = 'requests' AND type IN ('index', 'trigger')"
npx wrangler d1 execute reviewboost-db --remote --command "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'd1_migrations'"
```

Compare column names, types, nullability, defaults, primary key, foreign keys, indexes and triggers with `migrations/0001_create_requests.sql`. If they differ, stop and decide on a separate, reviewed reconciliation migration; `IF NOT EXISTS` does **not** check or repair an existing schema. Do not drop or recreate the table to make it match, and do not assume migration tracking based on the table's presence.

Once the schemas are verified equivalent and remote migration is explicitly approved, run `npx wrangler d1 migrations list reviewboost-db --remote` to inspect pending migrations, then `npx wrangler d1 migrations apply reviewboost-db --remote`. The initial `CREATE TABLE IF NOT EXISTS` will leave the existing table untouched and Wrangler will record the migration in `d1_migrations`; future migrations can then be applied normally. The apply command changes migration metadata even when the table already exists. Do not manually insert migration-tracking rows. If the baseline is already recorded, do not attempt to record it again. Verify the migration list afterwards. This repository does not contain any seed records.

## SMS endpoint protection

`POST /api/send-request` keeps its existing JSON payload and success response. When the `SMS_API_KEY` secret is set to a non-empty value, callers must send `X-API-Key: <value>`; missing or incorrect keys return HTTP 401 with `{ "success": false, "error": "Unauthorized" }`. Without the secret, the endpoint remains publicly accessible for existing clients. **In real mode, leaving it unset permits anyone to send paid SMS messages.**

A shared API key embedded in browser code is public and is not robust protection. Prefer a trusted server-side caller or authenticated gateway, plus rate limits and abuse monitoring. Coordinate with the separate frontend before enabling the key: an unchanged browser client will otherwise receive 401 responses. CORS is not authentication.

The endpoint sends through Twilio first and then inserts a D1 row. If the insert fails, it returns an error even though the SMS may have been sent. Retrying can send a duplicate; there is currently no idempotency or reconciliation mechanism.

## GitHub integration (only when approved)

Connect the GitHub repository to the existing Worker using Cloudflare Workers Builds and select the intended production branch. Use these settings:

- **Root directory:** repository root.
- **Build command:** leave empty; Workers Builds installs dependencies from `package-lock.json` automatically.
- **Deploy command:** `npm run deploy` (runs `wrangler deploy`).
- **Node.js:** 22, selected by `.nvmrc`.

For real SMS, configure the Twilio values below as **runtime** secrets in the Worker dashboard; Workers Builds variables are build-only and are not a substitute. Verify previews use isolated bindings and secrets, or disable preview builds until they are configured safely. The D1 binding in `wrangler.jsonc` points to the existing database; neither the deploy script nor the GitHub build settings should run a migration, recreate the table, or insert data.

Connecting GitHub or pushing to a connected production branch can trigger an automatic deployment. Do so only after deployment approval. Ignore rules cover common local secret files but cannot identify every possible credential filename; review files and Git history before pushing.

## Deployment (only when approved)

For real SMS, set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_PHONE_NUMBER` as Worker secrets; optionally set `SMS_API_KEY` in either mode. Never put secret values in `wrangler.jsonc`. Cloudflare's `wrangler secret put` can create and immediately deploy a Worker version; only run these commands once deployment is approved:

```sh
npx wrangler secret put TWILIO_ACCOUNT_SID
npx wrangler secret put TWILIO_AUTH_TOKEN
npx wrangler secret put TWILIO_PHONE_NUMBER
npx wrangler secret put SMS_API_KEY
```

Omit the final command if retaining unauthenticated compatibility. To deploy manually instead of using GitHub integration:

```sh
npm run deploy
```

Update the existing public API hostname/routing or the frontend's API configuration as necessary. The separate frontend was not available for inspection, so direct dependencies on the old backend or database cannot be assessed here.

The existing billing and review routes remain placeholders. The Stripe webhook still does not verify signatures or process events; the Twilio and automation webhooks still only acknowledge requests. Configure external provider webhook URLs when moving hosts. No authentication or signature verification was added to those webhooks.
