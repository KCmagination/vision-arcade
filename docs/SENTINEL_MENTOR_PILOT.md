# Sentinel AI Mentor — experimental fork pilot

Route: `/mentor`. This is an isolated demonstration; it does not alter the existing arcade screens.

## Run locally

1. `npm ci && npm run dev`
2. Install Ollama and run `ollama pull qwen3:4b`
3. Visit `http://localhost:3000/mentor`.
4. Calculate the fictional default scenario and ask a question.

Optional environment variables: `OLLAMA_BASE_URL=http://127.0.0.1:11434`, `OLLAMA_MODEL=qwen3:4b`.

The browser calls the existing `requestComparison` helper, which validates the actual `/api/vision/calculate` response. The mentor route receives the fictional inputs and bounded chat history, obtains a fresh result from the hosted calculator, and sends that result to Ollama server-side. Browser-supplied scores are never treated as authoritative. Editing an input clears the previous comparison and conversation. Failed questions remain available for retry. No provider key is required.

## Scope and review

- Prototype only; no authentication, persistence, analytics or live deployment.
- Never expose Ollama directly to the internet. A hosted demo requires a protected model backend and abuse limits.
- Inputs are fictional USD values; no account credentials or identity data.
- Calculator owns scores. The model may only explain the returned values.
- Do not merge without verifying `npm test`, `npm run build`, browser walkthrough, API availability and live Ollama response.
- AI explanations require factual review before use with students.
- This fork is not Casey's production deployment.


## Validation follow-up — 9 October 2026 UTC

- Existing 206 Node tests passed; production Next.js build passed.
- Four targeted Chromium checks passed across desktop 1440×1000 and mobile/touch 390×844: stale-result invalidation, failed-message retry, long conversation bounds, malformed/oversized requests, cross-origin rejection and rejection of score-only requests. Model replies in these UI checks are explicitly synthetic.
- Real browser → Next.js adapter → hosted calculator succeeded on desktop and mobile for the documented fictional purchase ($3,000 upfront, $350 monthly, $25,000 debt, $32,000 acquired asset). One desktop request returned 503; a bounded retry passed. This does not establish availability or an SLA.
- The separate opt-in live check verifies calculator rendering and a visible 503 when the local model is absent. It is not evidence of a successful Qwen response.
- No Ollama service/model was available in this execution environment. Actual Qwen explanation, challenge quality and adversarial model behaviour remain unverified. No deployment, student storage or authentication was added.
- GitHub PR #4 was restored to draft. Casey's main remains unchanged.

Reproduce offline UI/API checks after a production build:

```sh
npm test
npm run build
npx playwright install chromium
npx playwright test mentor.spec.mjs
```

The optional service check assumes Ollama is absent and should only be used for that failure-path verification:

```sh
MENTOR_LIVE_CHECK=1 npx playwright test mentor-live.spec.mjs
```

To finish the actual model demonstration, run Ollama with `qwen3:4b`, calculate the fictional purchase, then ask “Explain the four corners in everyday language and give me one learning challenge.” Compare every numerical statement with the displayed calculator result and test an unknown credit score. Keep the PR draft until this succeeds. Conversation is ephemeral; persistent student learning is future work requiring a separate data/consent design.
