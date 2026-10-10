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

## Reproducible real-model demonstration (10 October follow-up)

Status: **not yet demonstrated with Qwen**. See [timestamped validation](MENTOR_VALIDATION_2026-10-10.md). The new opt-in `mentor-qwen.spec.mjs` never intercepts requests. It records the model digest, timestamps, actual replies and the server-returned calculator comparison alongside screenshots on desktop and mobile. Passing its transport checks is not a numerical or educational quality approval.

### Prerequisites

- Git, Node.js 22.13 or newer, npm, Ollama, and a machine that can run Chromium.
- A private machine with capacity to load Qwen3:4b (the model download is approximately 2.5 GB; leave additional disk and RAM for Ollama, Node and Chromium).
- Outbound access to the hosted calculator, npm/browser downloads, Ollama's registry **and its redirected model-storage hosts**. Registry access alone is insufficient.
- Ollama serving `qwen3:4b` on `127.0.0.1:11434`. No paid API key is needed. Keep both the app and Ollama private for this pilot.

Install Ollama from https://ollama.com/download for your operating system. Start its app/service, or run `ollama serve` in a separate terminal. Then, in PowerShell or a terminal:

```sh
git clone --branch feat/sentinel-mentor-pilot https://github.com/kaliyuga187/vision-arcade.git
cd vision-arcade
npm ci
ollama pull qwen3:4b
node scripts/mentor/check-model.mjs
npm test
npm run build
npx playwright install chromium
```

Stop if a command fails. The preflight exits nonzero when the model is missing, unreachable or fails to complete; successful preflight only proves an actual model response, not mentor correctness. Linux may also need `npx playwright install-deps chromium`.

Run the real workflow in PowerShell:

```powershell
$env:MENTOR_QWEN_CHECK='1'
npx playwright test mentor-qwen.spec.mjs --workers=1
Remove-Item Env:MENTOR_QWEN_CHECK
npx playwright show-report
```

Or on Linux/macOS:

```sh
MENTOR_QWEN_CHECK=1 npx playwright test mentor-qwen.spec.mjs --workers=1
npx playwright show-report
```

The test starts the production app itself on port 4174; leave that port free. It deliberately fails on service errors, rather than substituting canned answers. Preserve `test-results/` and `playwright-report/` **before another test run**, which may overwrite them. Preflight evidence is saved under `test-results/mentor-preflight/`; archive it before running Playwright. No generated evidence is committed automatically.

For Casey's hands-on demonstration:

```sh
npm run start -- --hostname 127.0.0.1 --port 3000
```

Open `http://localhost:3000/mentor`, click **Calculate with Vi$ion**, and ask for all four corners, then one learning challenge. Clear `creditScore`, calculate again, and ask what can be concluded about credit. The browser test also exercises touch interaction at 390×844. For an actual phone, use a private VPN or authenticated tunnel; this pilot has no public-access controls.

If the model runs on an already authorised VPS, bind Ollama to loopback there and use an SSH tunnel from the app machine:

```sh
ssh -N -L 11434:127.0.0.1:11434 USER@VPS_HOST
```

Replace USER/VPS_HOST with the authorised account and host. No host or SSH access is configured by this guide. Do not open port 11434 publicly. A permanent hosted demonstration needs a separate authenticated deployment.

### Acceptance review — required before calling the demo verified

For **each captured reply**, compare numerical claims to the `comparison` returned with that reply (the mentor obtains a fresh calculator response). Check all current/scenario strengths and deltas. Distinguish dollars, ratios and strength scores; a strength is not a credit score or a prediction.

- Cash Flow: explain changes in income/outflow and remaining monthly cash.
- Capital: explain remaining reserves and reserve runway, without inventing a target.
- Collateral: distinguish dollar equity from the calculator's strength; higher dollar equity need not mean higher strength.
- Credit: describe supplied values only. With a blank score, current/scenario strength and delta must remain unknown; never estimate a score or claim a future credit change.
- Learning challenge: refer to this fictional purchase/reserves, ask an answerable question, and avoid inventing a calculator result. Review the next student answer manually in the UI.
- Stop Ollama after a successful reply, ask another question, confirm a visible error and preserved question, restart it and retry. Run `mentor.spec.mjs` separately for synthetic retry/input-invalidating checks. `MENTOR_LIVE_CHECK=1` is exclusively the absent-model check; do not run it expecting a working model.

The server currently allows 25 seconds for a model reply. If real CPU inference exceeds that, preserve the failed evidence and measure it before changing the bounded timeout. No successful latency or model-quality claim has been made.
