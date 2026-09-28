# Repeatable Debtbreak browser tests — version 49

Target: public release 0.5.0, commit `cb72495ee12b0034e92ae8878a779387a1bdb2df`, corresponding to Sites version 49. Product source, assets, runtime dependencies, calculator adapter and the recovery checkpoint are unchanged. Test code lives on a separate branch, `test/debtbreak-v49-browser`.

## Product direction and success rule

Browser based, mobile supported: desktop mouse is the primary input, with touch controls tested at a phone-sized viewport. A successful mission requires completing all four cycles and retaining at least the selected reserve goal at the final close. Reaching the goal early does not finish the mission. Seven base expansions are optional progression, not an additional victory requirement under this clarified rule.

The tests use the existing three-month goal: $1,000 living costs plus $200 required debt payments gives a $3,600 reserve goal. Fictional test amounts are fixed. No personal data or proprietary calculator is used.

Version 49 currently declares `MISSION COMPLETE` whenever all four cycles are survived, even below the reserve goal. The strict acceptance test asserts the new requirement and should fail on this saved baseline. It is neither skipped nor marked as an expected failure. A failure report identifies the $600 shortfall in its fixture. Fixing that product behavior is a separate change from testing the preserved version.

## Run

Requires Node 22.13+.

```sh
npm ci
npm run test:browser:install
npm run test:browser
npm run test:browser:acceptance
npm run test:browser:report
```

- `test:browser` checks the current release's controls and accounting.
- `test:browser:acceptance` evaluates the clarified reserve-goal rule and exits nonzero when it is unmet by the UI.
- `test:browser:all` runs both groups; this is the CI command. The known v49 acceptance gap keeps the complete job red until a separately reviewed product change addresses it.
- `test:browser:baseline` verifies the unchanged product files and runtime dependencies against the version 49 checksum manifest.

The test runner builds the production Next.js app, starts its own local server on port 3100, and stops it afterward. It refuses an already-used port by default. Reports, screenshots and failure traces are under ignored `test-results/`. The GitHub workflow retains them for 14 days and does not deploy anything.

For local test development only, `VISION_BROWSER_PREBUILT=1` reuses a verified production build. `VISION_BROWSER_EXECUTABLE` can point at an installed compatible Chromium executable. `VISION_BROWSER_REUSE_SERVER=1` permits reusing a local server outside CI. The default workflow uses Playwright's pinned browser and performs a fresh build.

## What is exercised

Both Chromium projects run the real application and game components:

- Desktop mouse: 1440 × 1000; mobile touch emulation: 390 × 844, plus an 844 × 390 landscape check.
- Real game artwork and Canvas rendering, seven lifestyle indicators, usable control sizes, horizontal overflow and asset/JavaScript loading.
- One Intercept payment per press, repeated Rapid Fire, release behavior, missed-shot refunds and chosen payment wallet.
- Pause/resume, single deposits, reserve-surplus expansion limits, free Want-bot rejection and unknown-credit warning labels.
- Large frame interruptions, four-cycle payment records, cent-exact cash reconciliation and replay reset.
- Reserve-goal acceptance: no early victory and no successful ending below the goal.

The financial HTTP response is intercepted at the browser boundary with explicitly synthetic public API-shaped snapshots. This tests game integration independently of hosted-service availability, without implementing financial scoring. All later payments, deposits, upgrades and timing run through version 49's actual code.

Playwright's clock fires frames through `runFor` at a controlled 10 Hz render cadence; the unmodified game still performs its own 120 Hz simulation steps. This makes four-cycle runs practical on CPU-only runners and is not a device FPS benchmark. It does not jump game state to a later day. Only the interruption test deliberately uses `fastForward`. Mouse and touch events are browser input events. Touch holds use Chromium's input protocol. A read-only Canvas observer records actual rendered sprite positions for aiming; it does not alter game state, physics or draw output.

## Limits

WebGL is explicitly disabled to prove that the new Canvas battlefield can run without it. These checks do not certify the 3D hangar, other arcade games, GPU performance, real phone hardware, Safari, Firefox or physical controllers. Mobile emulation checks layout and touch routing; a short real-device playtest remains necessary to assess feel and performance. The hosted calculator itself is not called or validated by this suite.

The baseline manifest must be deliberately reviewed and updated when tests are moved to a later product version. Do not silently update it to conceal a release change or relax acceptance assertions to make an unmet requirement pass.

## Recorded verification

See [BROWSER-TEST-RESULTS-V49.md](BROWSER-TEST-RESULTS-V49.md) for the measured local run, confirmed reserve-goal failure and browser environment.
