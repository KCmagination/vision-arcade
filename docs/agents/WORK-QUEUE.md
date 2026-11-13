# Initial Vi$ion agent work queue

**Status:** candidate specifications, not standing execution permission. [VAG-001 / issue #5](https://github.com/KCmagination/vision-arcade/issues/5) was created blocked pending setup approval; its live owner-controlled status is authoritative. VAG-002 through VAG-006 remain roadmap proposals, not published or authorized assignments. Read [ACTIVATION.md](ACTIVATION.md). Do not maintain a second mutable status database here.

Main audited base: `1b41d197be7d7203df5f191d380f8c1ac723125e`.
Catalog evidence: `f37ad5549e8973251baab9f02aaa771373fc58eb`.

All tasks inherit root `AGENTS.md`. No new owner spending; use contributor compute. Routine tests use fictional data and synthetic calculator responses. Claim one task, work in a fork, and stop after two materially different blocked approaches with a useful report. New owner-side live API requests default to zero.

## SETUP — Owner approval and enforcement gate

**Why:** a written policy does not enforce bounded autonomy.

**Current Phase 1 scope:** prepare a documentation-only branch and draft PR after hosting-trigger review, and create VAG-001 as blocked. No settings, permissions, merge, deployment, engine changes or spending are authorized.

**Separate activation work:** the owner must separately approve any required branch/CI/hosting controls: required checks and review, no force-push/deletion, appropriate privileged-account enforcement, fork execution, hosting triggers and cost limits. Keep automatic merging off and avoid upstream write/admin credentials for outside contributors. Listing these requirements is not permission to configure them.

**Done:** policy published; main visibly protected; verified check identities required; safe enforcement test confirms an ineligible change cannot merge; hosting triggers and costs documented; first issue ready. No application code, private engine, subscription or experimental branch is changed. Configure rules for actual reviewer accounts; the author cannot provide their own independent PR approval.

**Owner decision:** approve the small standing-work policy and setup once, not every fork edit.

## VAG-001 — Repair desktop/touch test selection (first independence pilot)

**Live issue:** [#5](https://github.com/KCmagination/vision-arcade/issues/5). The owner must approve setup and mark this issue READY before execution; use its final approved base and scope.

**Why:** the catalog records ten desktop cases that stopped at `locator.tap` because the helper inferred touch from hardware-reported `navigator.maxTouchPoints` despite a non-touch Playwright context. Downstream assertions therefore remain unverified in that recorded run.

**Evidence:** catalog `docs/experiments/VALIDATION.md`, 10 November 2026. This is a recorded finding, not a guarantee the contributor's environment will reproduce it.

**Base:** current approved main; record its exact SHA. Read the pinned validation record without merging catalog runtime changes.

**Allowed changes:** relevant files under `tests/browser/` and a narrow helper regression test under `tests/`. Discover the actual helper path from the existing suite and report it. `playwright.config.mjs` only if necessary to express explicit input projects and within the approved issue scope.

**Do not change:** application behavior, public assets, private engine, dependencies, workflow permissions, browser assertions unrelated to input selection, baseline hashes or release manifests.

**Deliver:** use the configured test project/context to choose mouse versus touch interaction. Preserve both modalities, not a blanket change that makes every test touch-enabled. Add a regression covering disagreement between reported touch points and configured context.

**Acceptance:** show a failing focused test before the fix and a pass after; execute desktop and touch suites; preserve existing unit/build gates; report all 28 original cases individually or as exact passed/failed/skipped counts. Do not claim real-hardware certification. If this environment cannot reproduce the original symptom, demonstrate the helper mismatch in an isolated regression instead of inventing a failure.

**Owner packet:** narrow diff, before/after counts, actual environment, exact tested SHA and one recommendation. No design question should be needed.

## VAG-002 — Separate v51 checkpoint identity from candidate verification

**Why:** `scripts/check-browser-baseline.mjs` hashes every file under app, components, hooks, lib, public, server and vendor against v51. This currently rejects intentional product changes before behavior tests run.

**Risk class:** protected verification change. Requires task-specific owner authorization before editing guard or workflow scope. May be designed while VAG-001 proceeds; should be reviewed and integrated before calling runtime changes release-ready.

**Allowed changes after authorization:** the browser-baseline checking script, browser manifests, focused tests, documented package commands and necessary CI wiring. Record exact proposed file list before implementation. Preserve existing source privacy checks and API behavior.

**Deliver:** retain immutable v51 evidence and validate it against its historical Git tree; validate candidate browser behavior against the candidate build; record source base/head and release provenance separately. Propose how trusted baseline/manifest decisions remain distinct from unreviewed PR edits. Do not allow a PR to rewrite its own expected outputs and thereby certify itself.

**Acceptance:** tests prove (1) historical v51 remains verifiable, (2) altered checkpoint evidence is rejected, (3) a reviewed intentional candidate change can reach behavior tests, (4) a real behavioral regression fails, and (5) the existing privacy/contract guards and negative tests remain intact. Record required check names and confirm they refer to the new approved gate rather than a stale skipped check.

**Stop:** if the only approach is deleting a guard, skipping failing tests or silently accepting all new hashes, return a proposal marked blocked. Do not merge/deploy.

## VAG-003 — Verify the public API boundary with synthetic outputs

**Why:** third-party games need reproducible development without private formulas or live-service dependency.

**Inputs:** `docs/CALCULATOR_API.md`, `lib/vision-contract.d.ts`, existing public request helper and current adapter tests. Inspect implementation paths rather than inventing a new endpoint.

**Allowed changes:** new or extended public contract/client tests, clearly labeled synthetic test helpers, and concise developer instructions. Reuse existing fixture shapes. Any required change to a protected guard, actual API route or transport contract is a separate review item, not permission to alter it here.

**Deliver:** tests for unknown credit, malformed/incomplete responses, cancellation, stale response handling and error states that the actual helper supports. Verify any claimed unsupported case before adding expectations. Synthetic output values must not derive from or reveal private calibration.

**Acceptance:** tests run without real financial records, engine source, credentials or live API calls; data marked synthetic cannot become a production fallback; errors stay visible; current and hypothetical state remain distinguishable. Report what these tests do not establish: calibration accuracy, service availability and real hosting limits.

## VAG-004 — One original asset, not an entire asset library

**Why:** prove contributors can deliver usable content without a private model handoff or lengthy owner supervision.

**Suggested assignment:** one original Utilitank/enemy or neutral environmental prop referencing only existing public game art. The issue selects one object and its intended scene before becoming ready.

**Allowed changes:** a new isolated `contributions/assets/VAG-004/` directory with source, export, manifest and preview. This is a proposed staging directory, not an existing asset path. No app imports or edits to runtime asset directories in this pilot. Integration is a later task after VAG-002.

**Deliver:** editable source; GLB or format actually supported by the selected scene; image/turntable preview; authorship and redistribution statement; dimensions, orientation, origin, triangle count, materials, textures and file size; reproducible export instructions. A static 2D scene may need an image/sprite rather than a GLB—do not produce unusable 3D content simply to satisfy a format preference.

**Acceptance:** opens in a declared viewer/tool version; no missing resources; attribution/dependency rights established; all geometry fits the declared scene scale; measured budgets documented. Use the existing public style as the reference, not inaccessible private Sentinel or Knight studies. Do not invent an approved universal polygon limit. Include a proposed budget if none is documented and mark it for review before production integration.

**Stop:** if the task requires a withheld reference or uncertain third-party redistribution, choose a fully original approved public-scope object or mark the task blocked. Do not seek broad private-repository access.

## VAG-005 — Debtbreaker ledger and gameplay regression evidence

**Why:** preserve learning value while allowing visual intensity and future-impact estimates.

**Inputs:** EXP-002 sources and focused tests in the catalog; especially `lib/debtbreak-continuous.js`, `lib/debtbreak-siege.js`, `lib/debtbreaker-engine.js`, and `lib/advanced-finances.js`.

**Allowed initial changes:** focused tests and a short findings report. Product fixes become a scoped follow-up after VAG-002; never rewrite private scoring.

**Deliver:** deterministic test scenarios examining whether multiple targets preserve the same original obligation, missed-projectile refunds occur exactly once, visual enemy speed stays separate from financial time, and a completed/failing campaign can reach a coherent end state. Inspect current rules before assuming an old chat-described bug still exists.

**Acceptance:** each finding has exact input, expected rule, observed result and a reproducible test. Check boundary cases without introducing a new fees/interest policy. Forecast examples state horizon and assumptions. No fabricated future credit points or guarantee of an actual outcome. A passing unit suite is not a frame-rate or physical-device result.

## VAG-006 — Pulse Range baseline coverage

**Why:** the catalog identifies no dedicated automated Pulse Range coverage.

**Inputs:** EXP-006 and `components/training-arena.tsx` in the approved base.

**Allowed initial changes:** targeted tests and a concise coverage note. Avoid refactoring gameplay merely to claim coverage. Any required application refactor must become an explicitly scoped follow-up.

**Deliver:** characterize the actual 45-second training flow, restart/end state and supported input interactions; isolate synthetic inputs. Select browser versus unit coverage based on the actual implementation, not a preconceived framework.

**Acceptance:** at least one meaningful regression test demonstrates behavior beyond “component rendered”; document input modes, render/WebGL limitations and environment. Do not infer mobile GPU performance from headless tests.

## Promotion and review

The first acceptance test of this collaboration system is VAG-001 completed by a contributor who has not read the owner's chats. A separate reviewer checks the exact commit and returns one decision packet. If instructions are insufficient, record and repair the missing information in the repository rather than relying on another private tutorial.

Review candidates separately from releases. No task here grants automatic merge, new owner spending, private-engine access or production deployment. The owner can hold a candidate without invalidating useful work on other independent ready tasks.
