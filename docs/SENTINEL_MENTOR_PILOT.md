# Sentinel AI Mentor — experimental fork pilot

Route: `/mentor`. This is an isolated demonstration; it does not alter the existing arcade screens.

## Run locally

1. `npm ci && npm run dev`
2. Install Ollama and run `ollama pull qwen3:4b`
3. Visit `http://localhost:3000/mentor`.
4. Calculate the fictional default scenario and ask a question.

Optional environment variables: `OLLAMA_BASE_URL=http://127.0.0.1:11434`, `OLLAMA_MODEL=qwen3:4b`.

The browser calls the existing `requestComparison` helper, which validates the actual `/api/vision/calculate` response. Only the resulting comparison and chat messages are sent to the local mentor route. The route sends these to Ollama server-side. No provider key is required.

## Scope and review

- Prototype only; no authentication, persistence, analytics or live deployment.
- Never expose Ollama directly to the internet. A hosted demo requires a protected model backend and abuse limits.
- Inputs are fictional USD values; no account credentials or identity data.
- Calculator owns scores. The model may only explain the returned values.
- Do not merge without verifying `npm test`, `npm run build`, browser walkthrough, API availability and live Ollama response.
- AI explanations require factual review before use with students.
- This fork is not Casey's production deployment.
