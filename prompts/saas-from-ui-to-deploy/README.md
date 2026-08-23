# SaaS from UI to deploy — master prompt

Yeh folder SnapCut AI ke real build se nikaala gaya hai: landing → signup → login → dashboard → tools → history → logout → GitHub → Vercel.

Naye project pe **same technology** aur **same auth workflow** follow karne ke liye yeh use karo.

## Kaise use karein

1. Naya Cursor chat / naya repo kholo.
2. `MASTER_PROMPT.md` poora copy karo.
3. Uski top pe **Fill this first** block bharo (product name, tools, colors, webhooks).
4. Prompt paste karo. Agent ko bolo: implement exactly this playbook; do not invent a different auth flow.
5. Deploy tab: `git push` (no force) + `npx vercel --prod --yes`.

## Is prompt mein kya lock hai

- Stack: TanStack Start + Vite + React 19 + Tailwind v4 + shadcn + Supabase + Vercel
- Guest landing always public; tools require login
- Signup never auto-logs-in; existing email stays on signup
- Login lands on `/`; header **Open Dashboard**
- Logout returns to landing; user data is not deleted
- Browser → same-origin `/api/*` proxy → n8n (never expose secrets)
- Phone / tablet / laptop UI without changing tool behavior

`MASTER_PROMPT.md` English mein hai taaki agent follow kare. Yeh README Hinglish mein hai.