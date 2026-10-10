# Mentor validation — 10 October 2026 UTC

Inspected feature head: `174a353d3fcfd99610473b9626bda624e61af851`. PR #4 remained open/draft; Casey's main was not changed.

## Verified in this execution

- 206 Node tests passed; production Next.js build passed (Node 24.19.0).
- One isolated calculator-to-model transport test passed with explicitly synthetic upstreams, including calculator failure preventing a model call. This is not model-quality evidence.
- Both request-only Playwright checks passed (desktop/mobile projects): malformed JSON, wrong content type, oversized body, cross-origin and forged score-only request rejection.
- At **12:55:24.509Z**, a real local production app → hosted calculator request returned HTTP 200 for the documented fictional purchase and credit score 760.
- At **12:55:24.780Z**, the same path with `creditScore: null` returned HTTP 200. Current/scenario Credit status was `unknown`, strengths null and Credit delta null.
- At **12:55:24.643Z** and **12:55:25.000Z**, mentor requests returned HTTP 503 with the expected unavailable-model message. These are API observations, not browser or Qwen success.

The actual calculator responses gave these strengths (rounded here to six decimals for review, not embedded as test fixtures):

| Corner | Current | Scenario | Change |
| --- | ---: | ---: | ---: |
| Cash Flow | 0.666667 | 0.575163 | -0.091503 |
| Capital | 0.225490 | 0.116531 | -0.108959 |
| Collateral | 0.333333 | 0.316537 | -0.016796 |
| Credit, supplied 760 | 0.775000 | 0.775000 | 0 |

Returned monthly cash remaining was $2,550 → $2,200; reserves $5,250 → $2,250; runway approximately 3.088 → 1.098 months; dollar equity $42,000 → $49,000. These provide a concrete factual review baseline. **No model explanation has been checked against them.**

## Exact blockers

Ollama 0.40.2 installed and answered its local version endpoint. The Qwen3:4b registry manifest was accessible, but `POST /api/pull` returned HTTP 500: its redirected `r2.cloudflarestorage.com` model-storage host could not be resolved because network access was unavailable. The 2,497,280,480-byte model layer was not installed. No authenticated existing VPS or model endpoint was supplied or used.

Chromium 151.0.7922.34 downloaded successfully using its official distribution after the Playwright installer received an invalid archive. Launch then failed with `socket() failed: Operation not permitted` in `process_singleton_posix.cc`. Both UI tests were blocked before page interaction. October 9 browser results are historical, not a new pass.

## Added reproduction support

- `scripts/mentor/check-model.mjs`: fails closed, records UTC timestamp, source commit, Ollama version/model digest and real preflight response when available.
- `tests/browser/mentor-qwen.spec.mjs`: opt-in, no mocked routes; captures real four-corner explanations, personalised challenge, unknown-credit response, screenshots and paired calculator JSON on desktop and touch layouts. Syntax/test discovery checked; execution remains blocked by the infrastructure above.
- Expanded installation, private SSH-tunnel, review and failure/retry instructions in `SENTINEL_MENTOR_PILOT.md`.

No runtime feature change, public deployment, calculator source import or model-success claim. Keep the PR draft until the new real-model capture and numerical/educational review succeed on a capable private host.
