<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/temp/1

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. Create `.env.local` and add your server key:
   `GEMINI_API_KEY=your_new_gemini_key`
3. Run with Vercel local runtime (so `/api/*` routes work):
   `npx vercel dev`

## Deploy to Vercel (server-side Gemini)

1. Open your Vercel project dashboard.
2. Go to **Settings -> Environment Variables**.
3. Add:
   - `GEMINI_API_KEY` = your Gemini API key
4. Set it for **Production** and **Preview** (and Development if needed).
5. Redeploy the project.

## Why `VITE_GEMINI_API_KEY` is no longer used

`VITE_` variables are bundled into client-side JavaScript and are visible in the browser.
To keep secrets private, Gemini requests now run in `api/generate-quiz.ts` (Vercel serverless function) and read `process.env.GEMINI_API_KEY` on the server only.

## Security and key rotation

If Gemini returns a leaked/invalid key error:

1. Revoke/delete the leaked key in Google AI Studio immediately.
2. Generate a new API key in Google AI Studio.
3. Update local `.env.local` with the new `GEMINI_API_KEY`.
4. Update Vercel environment variable `GEMINI_API_KEY`.
5. Redeploy and verify quiz generation works.
