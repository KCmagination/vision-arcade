# Debtbreak v49 browser test results

Verified September 28, 2026 against the public v49 export (`cb72495ee12b0034e92ae8878a779387a1bdb2df`, package 0.5.0). This report records local verification before GitHub publication of the test-only `test/debtbreak-v49-browser` branch. No Site deployment was performed.

## Results

The full browser run took 5 minutes 13 seconds: **16 passed, 2 failed, 0 skipped, 0 retries**. Both failures expose the same missing reserve-goal success condition.

| Scenario | Desktop mouse | Mobile touch emulation |
| --- | --- | --- |
| Battlefield artwork and reachable controls | Pass | Pass |
| Intercept once per press; Rapid Fire repeats and releases | Pass | Pass |
| Missed shot refunds selected wallet | Pass | Pass |
| Pause, deposit and surplus-only expansion | Pass | Pass |
| Free Want-bot pass and unknown-credit warning | Pass | Pass |
| Long interruption pauses without advancing or spending | Pass | Pass |
| Four cycles, payment ledger, final reserve goal and replay reset | Pass | Pass |
| Reserve goal reached early does not end the mission | Pass | Pass |
| Four cycles below reserve goal must not claim success | **Fail** | **Fail** |

A follow-up desktop and mobile layout run passed both checks after strengthening the landscape assertion to wait for and verify the repainted Canvas after rotation. The battlefield redraw is visible in the saved landscape screenshot.

All 190 existing public unit tests passed. The production Next.js build and TypeScript check passed. The public calculator boundary guard and its regression checks passed. The checksum gate verified 103 unchanged product files and unchanged runtime dependencies.

## Confirmed gameplay gap

The fixture has $1,000 monthly living costs and $200 required debt payments. Its three-month reserve goal is $3,600. Completing all four cycles with $3,000 still displays `MISSION COMPLETE`. The shortfall is $600.

The game currently treats surviving four cycles as completion without requiring final reserves to meet the goal. A future gameplay change should evaluate both requirements at the final cycle close, and show a reserve-shortfall ending with replay when the goal is missed. Reaching the goal early should continue the mission. Base expansions should remain optional under the clarified success rule.

The acceptance failures are genuine nonzero results, not skipped tests or expected failures. `npm run test:browser` covers the passing baseline group. `npm run test:browser:all`, used by the prepared GitHub workflow, remains red for this known requirement gap.

## Environment and limits

The local run used Playwright 1.58.2 and headless Chromium 143.0.7499.0 with Node 24.19.0 on Linux, with WebGL explicitly disabled. The normal Playwright browser download was unavailable in this environment; the run used a Chromium executable extracted from the official `@sparticuz/chromium` npm package. That fallback package is not a project dependency. The prepared CI workflow installs Playwright's pinned Chromium through the normal installer; the results above describe the local run; consult GitHub Actions for subsequent remote runs.

Desktop viewport: 1440 × 1000. Mobile touch viewport: 390 × 844, with an 844 × 390 landscape check. Real mouse and Chromium touch input events exercise the game. Deterministic browser time and a controlled 10 Hz render cadence make long missions repeatable; game simulation and all money movements remain in the unchanged application code. This is not a frame-rate benchmark.

The calculator HTTP response is a synthetic fixture. These tests do not validate the hosted calculator service, private scoring, the WebGL hangar, other games, physical phones, Safari, Firefox or controllers. Real-device playtesting remains necessary to assess mobile feel and performance.

See [BROWSER-TESTS-V49.md](BROWSER-TESTS-V49.md) for repeat commands, architecture and the baseline update policy.
