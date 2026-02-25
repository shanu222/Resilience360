# Backend Deploy Instructions (Auto-Deploy from GitHub Push)

This project backend is in:
- server/index.mjs
- Start command: npm run server

Because GitHub Pages deploys static frontend only, deploy backend to a Node host with GitHub auto-deploy.

## Option A: Render (recommended)

### 1) Create service
- Go to Render Dashboard -> New -> Web Service
- Connect GitHub repo: shanu222/Resilience360
- Branch: main
- Root directory: (leave empty)
- Runtime: Node

### 2) Build & start settings
- Build Command: npm install
- Start Command: npm run server

### 3) Environment variables
Set these in Render -> Environment:
- AI_PROVIDER=openai
- OPENAI_API_KEY=<your production key>
- OPENAI_VISION_MODEL=gpt-4.1-mini (optional)
- OPENAI_FALLBACK_TO_HUGGINGFACE=true (optional, default true)
- Optional fallback when OpenAI limit/quota is exceeded:
	- HUGGINGFACE_API_KEY=<fallback key>
	- HUGGINGFACE_BASE_URL=https://router.huggingface.co/v1 (optional)
	- HUGGINGFACE_CHAT_MODEL=<chat model id>
	- HUGGINGFACE_VISION_MODEL=<vision model id>
	- HUGGINGFACE_IMAGE_MODEL=<text-to-image model id>
- Any additional vars from .env.example used by backend
- PORT is managed by Render automatically

For portal credential recovery email (PGBC + COE), add:
- RECOVERY_FROM_EMAIL=<verified sender email>
- RECOVERY_FROM_NAME=Resilience360 Recovery
- RECOVERY_EMAIL_PROVIDER=resend (or brevo)
- RESEND_API_KEY=<required if provider is resend>
- BREVO_API_KEY=<required if provider is brevo>

For community issue admin status updates, add:
- COMMUNITY_ISSUES_ADMIN_TOKEN=<shared secret token used by admin dashboard>

Notes:
- At least one provider key must be configured.
- This backend mail path avoids browser-side EmailJS provider token expiry issues.

### 4) Auto-deploy
- Enable Auto-Deploy = On
- Every push to main triggers a new backend deployment automatically

### 5) Verify
- Open: https://<your-render-service>/health
- Should return healthy response before wiring frontend calls
- Test recovery API with POST https://<your-render-service>/api/recovery/send-credentials

## Option B: Railway

### 1) New project
- Create new Railway project from GitHub repo
- Select branch main

### 2) Service settings
- Start command: npm run server
- Install command: npm install (default)

### 3) Environment
- Add OpenAI env vars, plus optional Hugging Face fallback vars from .env.example

### 4) Auto-deploy
- Railway redeploys automatically on main branch pushes

### 5) Verify
- Test https://<your-railway-domain>/health

## Frontend integration after backend deploy

1. Ensure frontend points to deployed backend URL (HTTPS), not localhost
2. Commit + push to main
3. GitHub Actions deploy-pages.yml auto-deploys frontend on each push

## Suggested release sequence

1. Push backend changes
2. Wait for backend auto-deploy success
3. Push frontend changes (or same commit)
4. Confirm GitHub Pages workflow green
5. Smoke test app: map, alerts, AI guidance, vision upload
