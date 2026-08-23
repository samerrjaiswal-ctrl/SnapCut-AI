# SnapCut AI — Supabase backend (store / fetch / auth)

Yeh file **live Supabase project** + SnapCut app code se match karti hai.  
Project URL / ref: `https://fbaropuqppterxawlrqf.supabase.co` (`fbaropuqppterxawlrqf`)  
Dashboard display name set karo: **SnapCut AI** (Project Settings → General → Project name)

App browser se **sirf anon / publishable key** use karti hai (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).  
`service_role` browser / Vercel public env mein **nahi** hona chahiye. Edge Functions: **none**.

Image generate / remove-text / OCR **n8n** se hote hain (same-origin `/api/*`). Supabase un raw n8n calls ko store nahi karta — sirf **result + history metadata** store hota hai.

---

## 1. Client kaise connect hota hai

| Point | Detail |
| --- | --- |
| File | `src/lib/supabase.ts` |
| Library | `@supabase/supabase-js` `createClient` |
| Session persist | Browser `localStorage` (tab close ke baad bhi login rehta hai) |
| Token refresh | `autoRefreshToken: true` (browser only) |
| URL session detect | Sirf jab URL mein `access_token` hash, `code`, ya `token_hash` ho |
| Auth redirect helper | `getAuthRedirectTo()` → `{origin}/login` (signup email confirm) |

Har Data API / Storage call user ke **JWT** se jaati hai. RLS `auth.uid()` se row filter karti hai.

---

## 2. Auth — kya store / fetch hota hai

Auth data **`auth` schema** mein rehta hai (Supabase manage karta hai). App `auth.users` pe seedha SQL nahi chalaati.

### 2.1 `auth.users` mein kya store hota hai (signup / login)

| Field (concept) | Kab store | App kahan set karti hai |
| --- | --- | --- |
| `id` (UUID) | Signup / Google | Auto |
| `email` | Signup / Google | `signUp` / OAuth |
| Password hash | Email signup | `signUp({ password })` — plaintext kabhi store nahi |
| `email_confirmed_at` | Confirm link / OTP | Supabase Auth |
| `raw_user_meta_data.full_name` | Signup + Settings name | `signUp({ data: { full_name } })`, `updateUser({ data: { full_name } })` |
| Identities (email / Google) | Provider link | Auth |
| Sessions / refresh tokens | Login | Client persist |
| MFA TOTP factors | Settings 2FA (agar enroll ho) | `auth.mfa.enroll` / `verify` / `unenroll` |

**Fetch (session):** `supabase.auth.getSession()` + `onAuthStateChange`.  
App session shape (`AppSession`): `userId`, `name`, `email`, `plan`, `twoFactorEnabled`.

Name resolve order:

1. `profiles.full_name`
2. `user.user_metadata.full_name`
3. email local-part
4. `"Creator"`

`plan` **`profiles.plan`** se aata hai (`pro` / `pro_plus` → UI `"pro"`, warna `"free"`).  
`twoFactorEnabled` UI mein abhi hard `false` hai; factors `listVerifiedMfaFactors()` se alag load hote hain (Settings).

### 2.2 Signup (email + password)

1. `supabase.auth.signUp({ email, password, options: { data: { full_name }, emailRedirectTo: {origin}/login } })`
2. Agar email already registered (`identities.length === 0`) → error: login karo.
3. Agar Supabase turant session de de → app **`signOut()`** karti hai. User **pehle login** kare (product rule).
4. Confirm email ke baad user `/login` pe aata hai.
5. Trigger `on_auth_user_created` → `public.profiles` row insert.

**Store:** Auth user + `profiles` row.  
**Fetch:** Confirm hone tak koi dashboard data nahi.

### 2.3 Login (email + password)

1. `signInWithPassword({ email, password })`
2. JWT + refresh token localStorage
3. `profiles` se `full_name, email, plan` fetch (`2s` timeout; fail → metadata fallback)
4. Navigate: login ke baad **`/`** (home), phir Open Dashboard

**Store:** naya session (Auth). Profile update nahi.  
**Fetch:** `auth` session + own `profiles` row.

### 2.4 Google OAuth

1. `signInWithOAuth({ provider: "google", options: { redirectTo: {origin}/ } })`
2. Supabase Google se user create / link
3. Wapas `{origin}/` — hash/code se session detect
4. `handle_new_user` profile banaata hai (`full_name` Google se aa sakta hai)

### 2.5 Email confirm / magic callback

Route: `/auth/callback`

| URL param | Action |
| --- | --- |
| `code` | `exchangeCodeForSession(code)` (PKCE) |
| `token_hash` + `type` | `verifyOtp({ token_hash, type })` |
| `type=recovery` | Password recovery flag → `/auth/update-password` |
| No token | Turant error: link missing/expired |
| Success (normal) | `/` |
| Success (recovery) | `/auth/update-password` |

### 2.6 Forgot / reset password

1. Browser `POST /api/reset-password` `{ email }` — **service_role nahi**
2. Server `POST {supabase}/auth/v1/recover` with **anon key**
3. Header `redirect-to: {origin}/auth/update-password`
4. User email link kholta hai → recovery session
5. `updateUser({ password })` → naya hash Auth mein
6. App `signOut()` — naya password se login

**Store:** naya password hash. History / files delete nahi.

### 2.7 Update password (Settings, signed-in)

`saveNewPassword` → `auth.updateUser({ password })`.  
Agar AAL2 / MFA chahiye, UI 6-digit code maangti hai (`mfa.challenge` + `mfa.verify`), phir password save.

Pending (unverified) TOTP Update Password **enroll nahi** karta; `clearUnverifiedTotp()` leftover factors hataata hai.

### 2.8 MFA (TOTP)

| Call | Store / fetch |
| --- | --- |
| `mfa.listFactors()` | Fetch verified + pending factors |
| `mfa.enroll({ factorType: "totp" })` | Store unverified factor + secret/QR (ab Update Password se nahi) |
| `mfa.challenge` + `mfa.verify` | Factor verified |
| `mfa.unenroll` | Factor delete |
| `mfa.getAuthenticatorAssuranceLevel` | Fetch AAL1 vs AAL2 |

### 2.9 Logout

`supabase.auth.signOut()` — **local + Auth session khatam**.  
`processing_history` + Storage files **delete nahi** hote.

### 2.10 Delete account

1. `auth.getUser()` — current uid
2. Storage: list + remove `snapcut-history/{uid}/**`
3. RPC `delete_own_account()` (security definer):
   - delete `processing_history`, `processed_images`, `security_events`, `devices`, `profiles` for uid
   - delete `auth.users` row
4. Local `signOut({ scope: "local" })`

---

## 3. Database tables — store vs fetch

RLS **sab public tables** pe ON. Guest (`anon`) in rows ko nahi padh sakta.

### 3.1 `public.profiles` — **ACTIVE (app use karti hai)**

User ki 1 row. `id` = `auth.users.id`.

| Column | Type | Default | Meaning |
| --- | --- | --- | --- |
| `id` | uuid PK | — | Auth user id |
| `full_name` | text | null | Display name |
| `email` | text | null | Copy of auth email (UI readonly) |
| `plan` | text | `free` | `free` \| `pro` \| `pro_plus` |
| `usage_count` | int | `0` | Legacy counter (UI History se count karti hai, yeh field nahi) |
| `created_at` | timestamptz | `now()` | |
| `updated_at` | timestamptz | `now()` | |

**Constraints:** `plan` check; `usage_count >= 0`; FK → `auth.users` ON DELETE CASCADE.

**STORE**

| Action | Writes |
| --- | --- |
| Signup / first login | Trigger `handle_new_user`: `id, email, full_name` |
| Settings Save name | `UPDATE full_name, updated_at` + `auth.updateUser` metadata |
| Missing profile | `UPSERT id, email, full_name` |
| `increment_profile_usage` / `record_processed_image` | `usage_count + 1` — **app ab yeh RPCs call nahi karti** |
| `activate_user_plan` | `plan` + `usage_count = 0` — **sirf service_role**, app call nahi karti |

**FETCH**

| Action | Reads |
| --- | --- |
| Login / session hydrate | `select full_name, email, plan where id = auth.uid()` |

**Lock:** trigger `protect_profile_locked_fields` BEFORE UPDATE — client `id`, `email`, `plan`, `usage_count` change nahi kar sakta. Name change allowed.

**RLS (authenticated, own row only):** INSERT / SELECT / UPDATE where `auth.uid() = id`.

---

### 3.2 `public.processing_history` — **ACTIVE (History + usage)**

Har completed tool run ki 1 row. Images Storage paths hain, blobs table mein nahi.

| Column | Type | Default | Meaning |
| --- | --- | --- | --- |
| `id` | uuid PK | `gen_random_uuid()` | |
| `user_id` | uuid | — | Owner |
| `operation_type` | text | — | `remove_text` \| `extract_text` \| `collage` \| `snapy` |
| `original_file_name` | text | — | Upload name, ya Snapy prompt (80 chars) |
| `original_file_path` | text | null | Storage path (input) |
| `result_file_path` | text | null | Storage path (output image) |
| `extracted_text` | text | null | OCR text |
| `status` | text | `completed` | `processing` \| `completed` \| `failed` |
| `created_at` | timestamptz | `now()` | |
| `metadata` | jsonb | null | Extra (Snapy: `{ prompt, source: "snapy" }`) |

Index: `(user_id, created_at DESC)`.

**STORE (app insert)**

| Tool | Function | original path | result path | extra |
| --- | --- | --- | --- | --- |
| Remove Text | `saveCompletedOperation` | `{uid}/remove-text/{uuid}.ext` | cleaned image | — |
| Image to Text | `saveCompletedOperation` | `{uid}/extract-text/{uuid}.ext` | usually null | `extracted_text` |
| Collage | `saveCollageResult` | null | `{uid}/collage/{uuid}.ext` | optional metadata |
| Snapy | `saveSnapyResult` | null | `{uid}/snapy/{uuid}.ext` | `metadata.prompt` |

Insert RLS: `user_id` must be `auth.uid()`.

**FETCH**

| UI | Query |
| --- | --- |
| History tabs | `select … where user_id = me order created_at desc limit 50` + optional `operation_type` |
| Dashboard recent | same, limit 5 |
| Usage / Settings bars | `select operation_type where user_id = me` → counts |

Signed URLs alag Storage call se (`createSignedUrl`, 1 hour). List pehle metadata, phir `signHistoryRecords`.

**DELETE**

History 3-dot Remove: row delete + Storage `remove(originalPath, resultPath)`.

---

### 3.3 `public.processed_images` — **LEGACY (app use nahi karti)**

Purane early SnapCut usage RPC ke liye (ab UI call nahi karti).

| Column | Meaning |
| --- | --- |
| `id`, `user_id`, `result_url`, `filename`, `created_at` | URL string + name |

`record_processed_image(filename, result_url)` yahan insert + `usage_count++` karta hai (limits: free 5, pro 10).  
**Current UI is RPC ko call nahi karti.** Delete-account RPC yeh rows saaf karti hai.

---

### 3.4 `public.devices` — **UNUSED by SnapCut UI**

Columns: `device_name`, `device_type` (`phone`/`laptop`/`tablet`), `auth_method` (`Authenticator`/`Passkey`), `last_used_at`.  
RLS own-row CRUD. App insert/select nahi karti.

---

### 3.5 `public.security_events` — **UNUSED by SnapCut UI**

Columns: `event_type`, `device_name`, `ip_address`, `user_agent`, `ok`, `warning`, `meta`.  
RLS: own INSERT + SELECT. App nahi likhti.

---

## 4. Storage — `snapcut-history`

| Setting | Value |
| --- | --- |
| Bucket | `snapcut-history` |
| Public | **false** (signed URL / download JWT se) |
| Max file | 10 MB (bucket); app compress ~8 MB / 1600px JPEG fallback |
| MIME | `image/jpeg`, `image/jpg`, `image/png`, `image/webp` |

### 4.1 Path convention (pehla folder = user id)

```
{userId}/remove-text/{uuid}.jpg|png|webp
{userId}/extract-text/{uuid}.jpg|png|webp
{userId}/collage/{uuid}.jpg|png|webp
{userId}/snapy/{uuid}.jpg|png|webp
```

RLS: `(storage.foldername(name))[1] = auth.uid()::text`  
Policies: INSERT, SELECT, UPDATE, DELETE — authenticated, own folder only.

### 4.2 STORE (upload)

`history-service` sniff JPEG/PNG/WEBP → upload. Fail / oversized → JPEG compress → retry.

| Tool | Kya file |
| --- | --- |
| Remove Text | original + cleaned result |
| OCR | original (text DB mein) |
| Collage | result collage only |
| Snapy | generated result only |

### 4.3 FETCH

| Call | Use |
| --- | --- |
| `createSignedUrl(path, 3600)` | History / dashboard thumbs, Open dialog |
| `download(path)` | Download + Copy image |
| `list(prefix)` | Delete-account folder walk |

Signed URL ke bina bucket public nahi — URL leak limited (1h).

---

## 5. RPCs (Postgres functions)

| Function | Who can execute | App use? | Kya karta hai |
| --- | --- | --- | --- |
| `delete_own_account()` | authenticated, service_role | **Yes** — Settings delete | Own rows + `auth.users` |
| `handle_new_user()` | trigger / service_role | Auto on signup | Insert/update `profiles` |
| `protect_profile_locked_fields()` | trigger | Auto | Lock plan/email/usage |
| `increment_profile_usage(uuid)` | authenticated, service_role | **No** | `usage_count + 1` |
| `record_processed_image(text, text)` | authenticated, service_role | **No** | Legacy image row + usage |
| `activate_user_plan(text)` | **service_role only** | **No** | Set `pro` / `pro_plus` |

`anon` ko in business RPCs pe EXECUTE revoke hai (`revoke_anon_rpc_execute` migration).

---

## 6. Triggers

| Trigger | On | Effect |
| --- | --- | --- |
| `on_auth_user_created` | `auth.users` AFTER INSERT | `handle_new_user()` → profile |
| `protect_profile_locked_fields` | `profiles` BEFORE UPDATE | Client plan/email/id/usage overwrite nahi kar sakta |

---

## 7. Feature-wise: store vs fetch (end-to-end)

### 7.1 Landing / guest

Supabase: **kuch nahi**. Guest tools block; bounce home.

### 7.2 Dashboard

**Fetch:** `processing_history` (5 rows + stats).  
**Store:** nahi (New Project sirf navigate / Snapy open).

### 7.3 Remove Text

1. Browser file (local only) → `POST /api/remove-text` → n8n (JWT header)
2. Result blob wapas
3. **Store Storage** original + result
4. **Store DB** `processing_history` `remove_text`

### 7.4 Image to Text

1. File → `POST /api/extract-text` → n8n
2. **Store Storage** original
3. **Store DB** `extract_text` + `extracted_text`

History card **text** dikhati hai, input image nahi.

### 7.5 Collage Maker

1. Layout local / n8n jaisa app flow
2. **Store Storage** result
3. **Store DB** `collage`

### 7.6 Snapy

1. Prompt / voice → `POST /api/snapy-edit` → n8n (**Supabase generate nahi karta**)
2. **Store Storage** result
3. **Store DB** `snapy` + `metadata.prompt`

Chat / Q&A Supabase mein nahi.

### 7.7 History page

**Fetch** rows + signed URLs.  
**Store** nahi except Remove (delete).

Copy image: Storage `download` → clipboard (Snapy + Remove Text).  
Copy text: DB `extracted_text` (OCR only).

### 7.8 Settings

| Action | Store | Fetch |
| --- | --- | --- |
| Name | `profiles` + auth metadata | — |
| Email | — | session / profile (readonly) |
| Photo | **sirf local blob URL** — Storage/DB nahi | — |
| Usage bars | — | `processing_history` counts |
| Password | `auth.users` hash | — |
| Logout | session clear | — |
| Delete | Storage + RPC wipe | — |

### 7.9 Pricing / plan

UI plan `profiles.plan` se. Upgrade **Supabase billing nahi** — `activate_user_plan` app se wired nahi.

---

## 8. Security model (short)

1. Browser = anon key + user JWT. RLS = own rows / own storage folder.
2. n8n keys sirf server `/api/*` pe.
3. History bucket private.
4. Profile `plan` / `usage_count` client se lock.
5. Account delete user-scoped RPC; service_role app bundle mein nahi.
6. `user_metadata.full_name` display ke liye hai — **authorization claim nahi**.

---

## 9. Migrations (applied, newest last)

Project core schema pehle bana, phir SnapCut history add hui.

1. `snapcut_core_schema` — profiles / devices / security_events
2. `snapcut_insert_policies`
3. `add_snapcut_usage_and_history` — processed_images + usage RPCs
4. `revoke_anon_rpc_execute`
5. Several `fix_usage_tracking*` / `record_processed_image*`
6. `confirm_pending_auth_users`
7. `create_processing_history_and_private_storage`
8. `add_collage_operation_type` / collage + delete account
9. `fix_delete_own_account`
10. `lock_plan_rpc_and_rls_initplan` / profiles RLS
11. `fix_profiles_name_update_rls`
12. `add_snapy_operation_type`

---

## 10. Env checklist

| Variable | Where | Purpose |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Vite + server | Project URL |
| `VITE_SUPABASE_ANON_KEY` | Vite + server | Public API key |
| n8n URLs / secrets | **server only** | Not Supabase |

Kabhi `SERVICE_ROLE` / `secret` ko `VITE_` mat do.

---

## 11. Quick map

```
Browser
  ├─ supabase-js (anon + JWT)
  │    ├─ auth.*          → Auth users / sessions / MFA
  │    ├─ profiles        → name, email copy, plan (read)
  │    ├─ processing_history → History + usage counts
  │    └─ storage snapcut-history → images (private)
  └─ fetch /api/*         → n8n (generate / OCR / remove-text)
       └─ result wapas → Storage + processing_history
```

**Yaad:** Auth + profile + history images = Supabase.  
**AI pixels / OCR engine = n8n, Supabase nahi.**
