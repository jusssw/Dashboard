# Deploying this online (Render)

This makes the app reachable from any browser, on any device, without your
computer or VS Code needing to be running. The API server now also serves
the built frontend, so it's one deployable service with one URL — no
separate frontend host, no CORS setup.

Render's free tier works for this. (Railway and Fly.io work too, with
similar steps — the commands below are the same either way, just entered in
a different dashboard.)

## 1. Put the project on GitHub

Render deploys from a Git repo, not a zip upload.

1. Create a new repository on https://github.com (public or private, either
   is fine).
2. In your project folder in VS Code, open the built-in Source Control
   panel (the branch-looking icon in the left sidebar), or run in the
   terminal:
   ```
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
   git push -u origin main
   ```
   (VS Code will prompt you to sign in to GitHub the first time — follow
   the prompts.)

Your `.gitignore` already excludes `node_modules` and `.env`, so your
Supabase secret key won't get pushed to GitHub. Good — you'll enter it
directly on Render instead (next step).

## 2. Create the service on Render

1. Go to https://render.com, sign up/log in, then **New +** → **Web
   Service**.
2. Connect the GitHub repo you just pushed.
3. Fill in:
   - **Build Command**: `pnpm install && pnpm run build`
   - **Start Command**: `pnpm --filter @workspace/api-server run start`
   - **Environment**: Node
4. Add environment variables (Render's dashboard has an "Environment" tab
   for this — same names as your local `.env`, but paste your real values):
   - `SUPABASE_URL` = `https://YOUR-PROJECT-REF.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY` = your Supabase secret key
   - `PORT` = `10000` (Render expects the app to listen on the port it
     gives you via this variable — 10000 is Render's default, but check
     the dashboard; it also sets `PORT` for you automatically in some
     plans, so if the build complains, just remove this line and let
     Render inject it)
5. Click **Create Web Service**.

Render will run the build, then start the server, and give you a public
URL like `https://your-app-name.onrender.com` — that's the link you can
open from any device.

## 3. Redeploying after future changes

Any time you `git push` to `main`, Render automatically rebuilds and
redeploys. No manual redeploy step needed.

## Notes

- Free-tier Render services "spin down" after 15 minutes of no traffic and
  take ~30-60 seconds to wake back up on the next visit. That's a Render
  free-tier behavior, not a bug in the app.
- If you'd rather not use GitHub, Railway supports deploying via their CLI
  directly from a local folder — ask and I can walk through that instead.
