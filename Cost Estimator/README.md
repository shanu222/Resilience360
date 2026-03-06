
  # Create design prototype

  This is a code bundle for Create design prototype. The original project is available at https://www.figma.com/design/VR0FnM1sLq8Y0xJkVtAWMx/Create-design-prototype.

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.

## Real AI Analysis Backend

The Cost Estimator now uses a backend endpoint for live model analysis:

- Endpoint: `POST /api/cost-estimator/analyze`
- Form fields: `file` (required), `provider` (`openai|azure|openrouter`), `projectType`, `region`

Run backend + frontend together from the repo root:

```bash
npm run dev:full
```

### Backend environment variables

OpenAI (default):

- `OPENAI_API_KEY` or `OPENAI_API_KEYS`
- Optional: `COST_ESTIMATOR_OPENAI_MODEL` (default uses `OPENAI_VISION_MODEL` or `gpt-4o-mini`)

Azure OpenAI:

- `COST_ESTIMATOR_AI_PROVIDER=azure`
- `AZURE_OPENAI_ENDPOINT`
- `AZURE_OPENAI_API_KEY`
- `AZURE_OPENAI_DEPLOYMENT`
- Optional: `AZURE_OPENAI_API_VERSION` (default `2024-10-21`)

OpenRouter:

- `COST_ESTIMATOR_AI_PROVIDER=openrouter`
- `OPENROUTER_API_KEY`
- `OPENROUTER_MODEL` (example: `openai/gpt-4o-mini`)
- Optional: `OPENROUTER_SITE_URL`, `OPENROUTER_SITE_NAME`

Frontend override for provider selection:

- `VITE_COST_ESTIMATOR_AI_PROVIDER=openai|azure|openrouter`
  