# API Key Configuration Guide

This document explains how to properly configure OpenAI API keys across the entire Resilience360 ecosystem with multi-key support and automatic quota rotation.

## Overview

The application now supports **multiple OpenAI API keys** with automatic rotation when quota limits are hit (429 errors). This is implemented across:

1. **Main Backend** (`server/index.mjs`) - Text completions and image generation
2. **GBCP Portal** (`GBCP Portal/netlify/functions/ai-summary.js`) - Code summarization
3. **Main App** (`src/App.tsx`) - All AI features
4. **Material Hub Portal** - Uses main backend via `VITE_PORTAL_API_BASE_URL`
5. **COE Training Portal** - Uses main backend via Supabase

## Configuration Files

### Root `.env` File

Location: `f:/Resilience360/.env`

```env
# Option 1: Multiple API keys (recommended for production)
OPENAI_API_KEYS=sk-your-first-key-here,sk-your-second-key-here,sk-your-third-key-here

# Option 2: Single API key (fallback, used if OPENAI_API_KEYS not provided)
OPENAI_API_KEY=sk-your-api-key-here

# Vision/Text Model Configuration
OPENAI_VISION_MODEL=gpt-4o-mini
AI_PROVIDER=openai
OPENAI_FALLBACK_TO_HUGGINGFACE=false

# Fallback to Hugging Face if all OpenAI keys fail (optional, set to true to enable)
# OPENAI_FALLBACK_TO_HUGGINGFACE=true
```

### How to Add Your Keys

1. **Edit `.env` file** in the project root
2. **Replace placeholder values** in `OPENAI_API_KEYS`:
   ```
   OPENAI_API_KEYS=sk-your-actual-key-1,sk-your-actual-key-2,sk-your-actual-key-3
   ```
3. **Keep `OPENAI_API_KEY` empty** if using `OPENAI_API_KEYS`
4. **Save the file**
5. **Restart the backend server**:
   ```bash
   npm run server
   # or for development
   npm run dev:full
   ```

## Where API Keys Are Used

### 1. Main Backend Endpoints

**File**: `server/index.mjs` (port 8787)

**Features that use API keys**:
- ✅ `/api/guidance/construction` - Construction guidance generation
- ✅ `/api/guidance/step-images` - Step-by-step image generation
- ✅ `/api/advisory/ask` - Advisory questions
- ✅ `/api/pgbc/code-qa` - PGBC code Q&A
- ✅ `/api/models/resilience-catalog` - Infrastructure model catalog
- ✅ `/api/models/research` - Research models
- ✅ `/api/models/research-images` - Research images
- ✅ `/api/models/structural-design-report` - Design reports
- ✅ `/api/vision/analyze` - Image analysis
- ✅ `/api/material-hubs/ai-agent` - Material hub AI operations

**How it works**:
- Automatically rotates to next API key when a 429 quota error is encountered
- Retries the same request with the new key
- Falls back to Hugging Face if configured and all keys fail

### 2. GBCP Portal AI Summarization

**File**: `GBCP Portal/netlify/functions/ai-summary.js` (Netlify Edge Function)

**Feature**: Summarizing building code sections

**Environment Variables** (Set in Netlify UI or `netlify.toml`):
```
OPENAI_API_KEYS=sk-your-first-key,sk-your-second-key
OPENAI_API_KEY=sk-fallback-key (optional, if OPENAI_API_KEYS not provided)
```

**How it works**:
- Tries each API key sequentially
- Skips to next key on 429 quota errors
- Returns error only after all keys are exhausted

### 3. Material Hub Portal

**Uses**: Main backend (`VITE_PORTAL_API_BASE_URL`)

**Connection**: 
- Frontend calls: `POST https://resilience360-backend.onrender.com/api/material-hubs/ai-agent`
- Backend uses: `OPENAI_API_KEYS` from root `.env`

### 4. COE Training Portal

**Uses**: Supabase authentication + Main backend for AI features

**No direct API key needed** - proxied through main backend

### 5. PGBC Portal

**Uses**: Both client-side and Netlify function for code summarization

**Netlify function**: Uses `OPENAI_API_KEYS` environment variable

## Deployment to Render

For production deployment on Render:

1. **Set Netlify environment variables** (for GBCP Portal):
   ```
   OPENAI_API_KEYS = sk-key-1,sk-key-2,sk-key-3
   ```

2. **Set Render environment variables** (for main backend):
   ```
   OPENAI_API_KEYS=sk-key-1,sk-key-2,sk-key-3
   OPENAI_API_KEY=(leave empty)
   OPENAI_VISION_MODEL=gpt-4o-mini
   AI_PROVIDER=openai
   OPENAI_FALLBACK_TO_HUGGINGFACE=false
   ```

## API Key Quota Management

### What Happens When Quota is Hit

1. **Backend receives 429 error** from OpenAI
2. **Logs message**: `Rotated to API key 2/3` (shown in server logs)
3. **Automatically tries next key** with same request
4. **If all keys fail**, returns original 429 error to client

### Monitoring Quota Status

Check server logs for rotation messages:
```
Rotated to API key 1/3
Quota limit hit, rotating to next API key...
Image generation quota limit hit, rotating to next API key...
```

## Testing the Setup

### Test Main Backend
```bash
curl -X POST http://localhost:8787/api/guidance/construction \
  -H "Content-Type: application/json" \
  -d '{"context":"foundation design"}'
```

### Test GBCP Portal Function
```bash
curl -X POST https://your-netlify-site.netlify.app/.netlify/functions/ai-summary \
  -H "Content-Type: application/json" \
  -d '{"sectionText":"...","sectionLabel":"..."}'
```

### Check Backend Health
```bash
curl http://localhost:8787/health
```

Expected response:
```json
{
  "ok": true,
  "hasVisionKey": true,
  "provider": "openai",
  "model": "gpt-4o-mini",
  "openAiFallbackToHuggingFace": false
}
```

## Troubleshooting

### Problem: "OpenAI API key required" Error

**Cause**: `.env` file has empty or placeholder keys

**Solution**:
1. Edit `.env` and add real API keys to `OPENAI_API_KEYS`
2. Restart backend: `npm run server`
3. Test with `/health` endpoint

### Problem: "429 You exceeded your current quota"

**This means**:
- ✅ New keys are not being added, OR
- ✅ All configured keys have hit quota limits

**Solution**:
1. Add more API keys to `OPENAI_API_KEYS` in `.env`
2. Separate keys with commas: `sk-key-1,sk-key-2,sk-key-3`
3. Restart backend
4. The system will automatically rotate through keys

### Problem: Netlify Function Returns 500

**Cause**: Environment variables not set on Netlify

**Solution**:
1. Go to Netlify dashboard → Site settings → Build & Deploy → Environment
2. Add: `OPENAI_API_KEYS=sk-key-1,sk-key-2,sk-key-3`
3. Redeploy the site

## Implementation Details

### Backend Multi-Key Logic (server/index.mjs)

```javascript
// Parse keys from env
const OPENAI_API_KEYS = String(process.env.OPENAI_API_KEYS ?? process.env.OPENAI_API_KEY ?? '')
  .split(',')
  .map(key => key.trim())
  .filter(Boolean)

// Try request, rotate on 429
if (status === 429 && OPENAI_API_KEYS.length > 1) {
  const nextKey = rotateApiKey()
  openai = new OpenAI({ apiKey: nextKey })
  // Retry request with new key...
}
```

### GBCP Netlify Function Logic

```javascript
// Try each key sequentially
for (let i = 0; i < apiKeys.length; i++) {
  const apiKey = apiKeys[i];
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    headers: { 'Authorization': `Bearer ${apiKey}` },
    // ...
  });
  
  // Skip to next key on 429
  if (response.status === 429 && i < apiKeys.length - 1) {
    continue; // Try next key
  }
  
  // Return response if ok or final attempt
  return response;
}
```

## FAQ

**Q: Should I use `OPENAI_API_KEYS` or `OPENAI_API_KEY`?**
A: Use `OPENAI_API_KEYS` for multiple keys. `OPENAI_API_KEY` is a fallback.

**Q: How many keys should I add?**
A: At least 2-3 keys if you expect high API usage. More keys = better quota distribution.

**Q: Will requests be slower with multiple keys?**
A: No - rotation only happens on 429 errors. Normal requests use the current key immediately.

**Q: What happens if a key is revoked?**
A: It will be skipped (returns 401), and the next key will be tried.

**Q: Can I mix old and new environment variable names?**
A: Yes - the code supports both `OPENAI_API_KEYS` and `OPENAI_API_KEY`. Use `OPENAI_API_KEYS` (plural) for multiple keys.

---

**Last Updated**: March 3, 2026  
**Version**: 1.0 - Multi-key API Rotation Support
