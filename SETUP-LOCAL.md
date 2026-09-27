# Running this locally in VS Code

This project came from Replit, which ran two things behind one URL: a Vite
frontend and an Express API server, with the API talking to Supabase through
Replit's own connector proxy. That proxy only exists on Replit, so a few
small changes were made to run this locally (nothing else about the app
changed):

- `artifacts/api-server/src/lib/supabase.ts` now calls Supabase's REST API
  directly using `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` env vars,
  instead of Replit's connector proxy.
- `artifacts/task-dashboard/vite.config.ts` now proxies `/api` requests to
  the Express server during local dev (`API_PROXY_TARGET`), since locally
  the frontend and API aren't served from the same origin the way Replit
  did it.
- Both `artifacts/api-server` and `artifacts/task-dashboard` now auto-load
  a `.env` file on startup (via Node's built-in env-file loading), so you
  don't have to export variables by hand.

## 1. Install prerequisites

- Node.js 24 (the version this project was built with): https://nodejs.org
- pnpm — after installing Node, run: `corepack enable`

## 2. Install dependencies

From the project root (`Task-Dashboard/`):

```
pnpm install
```

## 3. Set up Supabase

You need a Supabase project (the free tier works): https://supabase.com

1. Create a project, then in the SQL Editor run the contents of
   `supabase/schema.sql` once.
2. In Project Settings -> API, copy the **Project URL** and the
   **service_role** secret key (not the anon key — the API server needs
   elevated access to read/write tasks directly).

## 4. Configure environment variables

```
cp artifacts/api-server/.env.example artifacts/api-server/.env
cp artifacts/task-dashboard/.env.example artifacts/task-dashboard/.env
```

Edit `artifacts/api-server/.env` and paste in your `SUPABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY`. The `task-dashboard/.env` defaults are fine
as-is.

## 5. Run it (two terminals, from the project root)

Terminal 1 — API server:

```
pnpm --filter @workspace/api-server run dev
```

Terminal 2 — frontend:

```
pnpm --filter @workspace/task-dashboard run dev
```

Then open the URL Vite prints — by default http://localhost:5173.

## Notes

- `pnpm --filter @workspace/db run push` (schema push via Drizzle) needs a
  separate `DATABASE_URL` for direct Postgres access. It's optional —
  running `supabase/schema.sql` in the SQL Editor is enough to get started
  and is what the app expects.
- `@replit/connectors-sdk` was removed from `artifacts/api-server`'s
  dependencies since it's no longer used anywhere.
- If a port is already taken on your machine, just change `PORT` in the
  relevant `.env` file (and `API_PROXY_TARGET` in the frontend's `.env` if
  you change the API server's port).
