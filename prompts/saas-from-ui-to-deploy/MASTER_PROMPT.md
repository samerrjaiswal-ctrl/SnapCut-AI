# Generalized SaaS playbook (UI → auth → tools → deploy)

Copy this entire file into a new Cursor chat for any new product. Fill the block at the top. Then build **exactly** this stack and this user journey. Do not invent a different signup/login/logout flow. Do not skip the proxy. Do not force-push git history.

---

## Fill this first

```
PRODUCT_NAME:
ONE_LINER:
PRIMARY_COLOR:          (example: #4648d4)
NAVY_COLOR:             (example: #131b2e)
TOOLS:                  (name + route + what it does)
N8N_WEBHOOKS:           (tool → production webhook URL; keep Path: text if the live URL includes it)
FORMDATA_FILE_FIELD:    data
STORAGE_BUCKET:
HISTORY_TABLE:          processing_history
GITHUB_REPO:
VERCEL_PRODUCTION_URL:
SUPABASE_PROJECT_URL:
AUTH_SITE_URL:          (no port — production origin only)
AUTH_REDIRECT_URLS:     http://localhost:<dev-port>/**  and  https://<prod-domain>/**
```

If a field is unknown, ask once, then continue with a named placeholder. Never hardcode service-role keys. Never commit `.env.local`.

---

## 0. Role and constraints

You are implementing a production SaaS, not a demo mock.

- Speak to the user in their language (Hinglish if they use it). Keep code and git messages in English.
- Change only what the current request needs. Do not rewrite working auth, proxy, or tool pipelines “for cleanliness”.
- If the user says do not touch functionality, change layout/CSS only.
- If the user asks to push/redeploy: commit (if needed), `git push` (never `--force`), then `npx vercel --prod --yes`.
- If the repo is connected to Lovable (or any git-synced visual editor): never force-push, rebase, amend, or squash **pushed** commits.
- Do not skip git hooks.

---

## 1. Technology lock (do not substitute)

| Layer | Use this |
|---|---|
| App | TanStack Start + TanStack Router + Vite |
| UI | React 19, Tailwind CSS v4, shadcn/ui, sonner toasts |
| Auth + DB + files | Supabase Auth + Postgres + Storage |
| Automation | n8n production webhooks |
| Hosting | Vercel production from `main` |
| Language | TypeScript |

Client talks to **same-origin** `POST /api/...` only. Server verifies a Bearer Supabase access token, then forwards to n8n. The browser must never call n8n or hold webhook URLs as required client secrets.

File uploads to n8n use `FormData` field name **`data`** unless the fill-in block says otherwise. Preserve unusual webhook path strings **exactly** (including `Path:` in the URL if that is the live path).

---

## 2. Product information architecture

Public (no login):

- `/` landing
- `/pricing`
- `/login` and `/signup` (guest-only; logged-in users bounce to `/`)
- `/auth/callback`
- `/auth/update-password` (recovery)

Signed-in app shell (direct URL without session → replace-navigate to `/`):

- `/dashboard`
- one route per tool
- `/history`
- `/settings`

Header on landing/pricing:

- Logged out: Log In, Get Started
- Logged in: **Open Dashboard** (not auto-dump into dashboard)

---

## 3. Locked user journey (signup → logout)

This journey is non-negotiable. Do not “improve” it with extra redirects.

1. **Anyone** can open `/`. The marketing site is never behind auth.
2. **Guests cannot run tools.** Feature cards on the landing are not links into tools. Direct tool URLs hit `RequireAuth` and go to `/`.
3. **Get Started** opens signup (route `/signup` or an overlay tab). Do **not** jump routes in a way that kills the login/signup CSS slider. Switch tab state only (`setTab`), no `navigate('/signup')` from inside the overlay.
4. **Signup**
   - Collect name, email, password, confirm password.
   - Password ≥ 8 characters; confirm must match.
   - If Supabase returns a user with **empty `identities`**, the email already exists. Stay on **signup**. Show: “This email is already registered. Use a different email, or log in.” Do **not** auto-switch to the login tab.
   - If signup returns a session, **`signOut` immediately**. The user must log in themselves.
   - Then switch to the **login** tab and show: check inbox/spam for the confirmation link if confirmation is required, otherwise “Account created. Log in to continue.”
5. **Login**
   - Email + password only. No 2FA / MFA challenge on the login screen. Keep `mfaPending` forced `false` unless the product later adds MFA **after** a working password login.
   - On success, go to **`/` (landing)**, not dashboard.
   - Logged-in landing header shows **Open Dashboard**.
6. **Forgot password** sits **above** the Log In button (right-aligned under the password field). Reset email goes through `POST /api/reset-password`, not a raw client-only call that you cannot rate-limit. Recovery page is `/auth/update-password`. After a successful password update, sign out and send them to login.
7. **Dashboard / tools / history / settings** require a session.
8. **Logout** returns to `/`. **Do not delete** history, storage files, or the auth user. Logout is session-only.
9. **Delete account** is a separate, explicit settings action — never part of logout.

### Auth implementation rules (bugs we already paid for)

- Auth provider: `getSession` + `onAuthStateChange`. No “if session fetch is slow, set session to null” races.
- `sessionFromUser` / profile reads must **timeout** (~2s) and fall back to the JWT user so a hung `profiles` query cannot block login.
- Do not show “Checking your session…” forever on guest pages. `RequireGuest` should render the form immediately; if a session exists, bounce home.
- `detectSessionInUrl` only when the URL actually has `access_token`, `code`, or `token_hash`.
- `emailRedirectTo` / `getAuthRedirectTo()` = `{origin}/login`.
- Supabase **Site URL must not include a port**. Redirect allow-list includes local `http://localhost:<port>/**` and production `https://domain/**`.
- Built-in Supabase email has a **rate limit**. If you see `over_email_send_rate_limit` / 429, stop sending signup/reset mail and tell the user to wait. Do not retry in a loop.
- Login hang is usually network + `getSession`. Keep the provider simple.

Login/signup UI: one card, two panels, overlay slider on `md+`. Overlay slides; form stays. Mobile shows one panel plus a text link to switch tabs.

---

## 4. Data and security

Supabase:

- `profiles` row created by a trigger on `auth.users` insert (`handle_new_user`).
- History table: `user_id uuid` = `auth.uid()`, RLS: users select/insert/update/delete **own rows only**.
- Storage bucket **private**. Policies: own-prefix or own-object only. Signed URLs for previews. Do not make the bucket public.
- RPCs that change data (`delete_own_account`, usage counters) must be `SECURITY DEFINER` **and** check `auth.uid()`.

API:

- Guest `POST /api/<tool>` → **401**.
- Authenticated proxy forwards the file, returns upstream status/body, 90s timeout.
- Never log access tokens, passwords, or webhook URLs in the client.

Favicon: ship a product icon in `public/` (`favicon.svg` + `favicon.ico` + apple-touch). Do not leave the host platform’s default favicon (Lovable blob, Vite logo, etc.).

---

## 5. UI / responsive (do not break tools to “make it pretty”)

- Phone / tablet: top bar + bottom nav. Laptop (`lg+`): sidebar.
- `viewport-fit=cover`, safe-area padding, no horizontal overflow.
- Fluid type (`clamp` for display headings).
- Dialogs: `w-[calc(100vw-2rem)]`, max-height with scroll.
- Full-screen editors (crop, lightbox): **`createPortal(..., document.body)`**, z-index **above** the mobile nav (nav is z-50 → overlay z-[120]).
- Android crop / drag UIs: **Apply must remain visible**. Pin a full-width Apply button at the bottom of the overlay with safe-area padding. Do not rely on a tiny header link that gets covered by the box-shadow, URL bar, or bottom nav.
- Touch: larger handles (≥32px on phone). `touch-none` on the canvas, `touch-auto` on Cancel/Apply.

App chrome vs marketing chrome are separate. Do not put the 280px sidebar on phones.

---

## 6. Build order for a new repo

Work in this sequence. Do not skip ahead to “AI features” before auth works.

1. **Scaffold** TanStack Start + Vite + Tailwind v4 + shadcn. Dev server, `/` placeholder.
2. **Brand** tokens, favicon, landing + pricing shells. Public pages first.
3. **Supabase** project, env (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) on local + Vercel. Auth redirect URLs. Profile trigger. History table + private bucket + RLS.
4. **Auth screens** with the locked journey above. Prove: signup existing email, confirm email, login → landing → Open Dashboard, logout → landing with data still there.
5. **App shell** dashboard, settings, history empty states.
6. **Each tool** as a signed-in page. Client → `/api/...` with Bearer token. Server proxy → n8n. Save results to history/storage.
7. **Responsive pass** without changing handlers.
8. **Production**
   - Custom favicon
   - Vercel env vars (same names as local)
   - `git add` / commit / `git push origin HEAD` (no force)
   - `npx vercel --prod --yes` from the linked project
   - If build fails, fix, **new commit**, push, redeploy. Do not amend a commit that is already on the remote.

Local check while developing: `npm run dev`. Do not treat localhost success as production success until Vercel env and Supabase Site URL match the live origin.

---

## 7. Git and Vercel

- Commit only when the user asks to commit, push, or redeploy (redeploy implies commit + push if there are local changes).
- Commit message: 1–2 sentences, **why**, not a file list.
- Never commit `.env`, `.env.local`, credentials, or service-role keys.
- After push, production alias is the Vercel domain (and custom domain if any).
- First production build often fails on missing exports or env. Fix forward; don’t revert the whole auth stack.

---

## 8. Definition of done (every new product)

- [ ] `/` opens with no login
- [ ] Guest cannot open a tool URL
- [ ] Get Started → signup overlay/page
- [ ] Existing email stays on signup with a clear error
- [ ] Signup does not leave the user logged in
- [ ] Confirm-email (if enabled) then login
- [ ] Login → landing → Open Dashboard
- [ ] Logout → landing; history still exists after login
- [ ] Forgot password is usable; reset does not dump the user on `/` with no way to set a password
- [ ] Tool POST as guest is 401; as user it hits n8n via `/api`
- [ ] History is per-user (RLS)
- [ ] Phone: bottom nav, crop Apply visible, no horizontal scroll
- [ ] Laptop: sidebar
- [ ] Product favicon, not a platform default
- [ ] GitHub `main` and Vercel production are in sync

---

## 9. What not to do

- Do not auto-redirect logged-in users away from `/` to dashboard.
- Do not put 2FA on the login form unless explicitly requested **after** password login is stable.
- Do not `Promise.race` a timer that clears a successful session.
- Do not call n8n from the browser.
- Do not change the FormData field name away from `data` without updating the n8n workflow.
- Do not make the storage bucket public “so previews work”.
- Do not force-push `main`.
- Do not spam signup emails against the free mailer.

When the user says “same as SnapCut”, they mean **this file**, not a generic CRUD app.