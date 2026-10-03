# Debtbreak browser gameplay checks

Run `npm ci`, `npx playwright install chromium`, `npm run build`, then `npm run test:browser`.

The suite starts and stops a local production server built from the checkout. Set `DEBTBREAK_TEST_URL` only to test an already running local test server. `CHROMIUM_EXECUTABLE` optionally selects an installed Chromium executable. No deployed Site is modified by the tests.

Both desktop mouse (1440 × 1000) and mobile touch (390 × 844, plus landscape rotation) are exercised. Pointer events use real browser input. The renderer is Canvas 2D; WebGL is explicitly disabled to verify the CPU-browser fallback. These are functional tests, not hardware or frame-rate benchmarks.

Run `npm run test:browser:all` for the full public-release gate (source boundary, unit tests, build, browser). CI runs the same gate. Before browser execution, `baseline-v0.8.0.json` verifies the reviewed 0.8.0 public-candidate product files and runtime dependencies. The original version 49 harness and baseline remain on `test/debtbreak-v49-browser`.

Tests additionally cover automated three-wave defense, explicit wallet/reserve caps, period-close credit progress, reversible savings markers, actual battlefield ruler drawing, keyboard focus, reduced motion and recovery. Tests cover artwork, seven visible lifestyle categories, both weapons, refunds, pause, deposits, expansion, radar, free Want choices, Sentinel sword targeting, deferred lifestyle changes, three-row formations, doubled Want waves, the five-clear power sweep, four-cycle failure without a base, success with a complete base below the reserve goal, and replay.

Synthetic calculator responses keep scenarios deterministic; they do not assert financial scores. The production UI, game, and ledger run unchanged. A read-only Canvas observer locates rendered targets. The Playwright clock drives each active 100 ms render frame, and the game still takes its normal 120 Hz simulation steps. Financial reconciliation must remain zero.

Results: `playwright-report/` contains the report and screenshots; `test-results/` contains failure traces. Both directories are ignored by git.
