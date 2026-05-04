# Punchlister landing page

Static landing page + a single Vercel serverless function that receives pilot applications and emails them via Resend.

## Local preview

Just open `index.html` in a browser. The form will fail gracefully (the `/api/apply` endpoint only exists when deployed or running `vercel dev`).

To test the full flow locally:

```sh
npm i -g vercel
vercel dev
```

Then visit http://localhost:3000.

## Deploy to Vercel

1. Push the repo to GitHub (or any git host Vercel can reach).
2. On vercel.com → "Add New… → Project" → import this repo. No build step needed; Vercel auto-detects `index.html` + `api/`.
3. In **Project Settings → Environment Variables**, add:

   | Name                | Value                                                    |
   |---------------------|----------------------------------------------------------|
   | `RESEND_API_KEY`    | API key from [resend.com](https://resend.com)            |
   | `LEAD_NOTIFY_EMAIL` | Comma-separated recipients (e.g. `hello@punchlister.com`)|
   | `LEAD_FROM_EMAIL`   | `Punchlister <pilot@yourdomain.com>` (verified in Resend)|

4. Redeploy.

## Changing where applications are sent

Change the `LEAD_NOTIFY_EMAIL` env var in Vercel and redeploy (no code change needed). Multiple addresses are supported, comma-separated:

```
LEAD_NOTIFY_EMAIL=co-founder1@punchlister.com,co-founder2@punchlister.com
```

## Domain verification (Resend)

For production, [verify your sending domain](https://resend.com/domains) in Resend and use a `LEAD_FROM_EMAIL` on that domain. Without verification, Resend only allows `onboarding@resend.dev`, which lands in spam more often.
