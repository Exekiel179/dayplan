<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/44359201-eb79-4716-a227-d07eb511c122

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Create `.env.local` (or copy from `.env.example`) and set:
   - `AI_API_KEY`
   - `AI_BASE_URL=https://api.aipaibox.com`
   - `AI_MODEL=gemini-3.1-pro-preview`
3. Run the app:
   `npm run dev`

## Secure Deployment (Docker)

1. Create `.env` on the server:
   - `AI_API_KEY=...`
   - `AI_BASE_URL=https://api.aipaibox.com`
   - `AI_MODEL=gemini-3.1-pro-preview`
2. Build and start:
   - `docker compose --env-file .env up -d --build`
3. Open:
   - `http://<your-server>:3000`

The frontend now calls your own backend endpoint `/api/ai/plan`, so the API key stays on the server and is not exposed to browser users.

## Task Persistence

- Tasks are now stored on disk at `.data/tasks.json`.
- This storage is independent of browser port/origin, so restarting the app or changing from `3000` to `3001` will not lose tasks.
