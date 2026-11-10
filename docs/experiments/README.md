# Vi$ion experiments

This is the review index for **experiments/catalog**, organized on 2026-11-10. It brings the existing public efforts into one labeled map without merging experiments into the live app.

**Scope:** six public-baseline experiment families plus one already-public historical learning branch. Later local experiments are listed only by broad family and remain withheld where privacy, ownership or redistribution is not settled. This is not a claim that every historical prototype has been published or tested.

Baseline: [public main at 1b41d197be7d7203df5f191d380f8c1ac723125e](https://github.com/KCmagination/vision-arcade/tree/1b41d197be7d7203df5f191d380f8c1ac723125e). This branch adds documentation and catalog-validation tests only. Existing runtime code, models, dependencies, calculator adapter and release manifest remain unchanged.

## Browse the experiments

### EXP-001: Sentinel, Verdant and attribute showcase

- **Labels:** avatar, 3d, animation, accessibility
- **State:** public baseline, retained in place
- **Explore:** /welcome for the showcase; / for avatar selection and hangar

Original public character generators, responsive hangar and presentation-only attribute demonstration. This is the published MVP asset family, not later private Sentinel or Knight studies.

**Source:** [components/avatar-stage.tsx](../../components/avatar-stage.tsx), [components/character-model.tsx](../../components/character-model.tsx), [components/sentinel-showcase-demo.tsx](../../components/sentinel-showcase-demo.tsx), [components/sentinel-showcase-scene.tsx](../../components/sentinel-showcase-scene.tsx), [components/sentinel-showcase.tsx](../../components/sentinel-showcase.tsx), [lib/sentinel-showcase-cycle.js](../../lib/sentinel-showcase-cycle.js), [lib/sentinel-showcase-effects.ts](../../lib/sentinel-showcase-effects.ts), [scripts/assets/build-sentinel.mjs](../../scripts/assets/build-sentinel.mjs), [scripts/assets/generate-verdant.mjs](../../scripts/assets/generate-verdant.mjs).

**Focused tests:**

```sh
node --test tests/sentinel-showcase.test.mjs
```

Node tests exercise timing, model structure and server-rendered behavior, not physical-device GPU performance. Generators overwrite the public GLBs when explicitly run; run them only in a disposable checkout.

### EXP-002: Debtbreaker continuous battlefield

- **Labels:** gameplay, simulation, canvas2d, touch
- **State:** public baseline, retained in place
- **Explore:** / then choose Debtbreaker in the arcade

Hangar-driven four-cycle lifestyle base defense, Sentinel controls, projectiles, reserve shield, account detail and wave tuning.

**Source:** [components/debtbreaker-battlefield.tsx](../../components/debtbreaker-battlefield.tsx), [components/debtbreaker-turret.tsx](../../components/debtbreaker-turret.tsx), [components/debtbreaker-controller.ts](../../components/debtbreaker-controller.ts), [lib/debtbreak-continuous.js](../../lib/debtbreak-continuous.js), [lib/debtbreak-siege.js](../../lib/debtbreak-siege.js), [lib/debtbreak-siege-render.js](../../lib/debtbreak-siege-render.js), [lib/debtbreaker-engine.js](../../lib/debtbreaker-engine.js), [lib/advanced-finances.js](../../lib/advanced-finances.js), [docs/debtbreak-wave-tuning.md](../../docs/debtbreak-wave-tuning.md), [docs/DEBTBREAK-V51-CHECKPOINT.md](../../docs/DEBTBREAK-V51-CHECKPOINT.md).

**Focused tests:**

```sh
node --test tests/debtbreak-continuous.test.mjs tests/debtbreak-siege.test.mjs tests/debtbreaker-hangar.test.mjs tests/debtbreak-lifestyle.test.mjs tests/debtbreak-priority-fixes.test.mjs tests/advanced-finances.test.mjs
```

Public game ledgers are fictional simulations, not the proprietary calculator. Browser checks use synthetic responses and disabled WebGL; they are not financial-calibration or hardware benchmarks.

### EXP-003: Debtbreak Classic and four-corner challenges

- **Labels:** gameplay, learning, scenario
- **State:** public baseline, retained in place
- **Explore:** / then Play Debtbreaker, then Classic or Challenges

Fictional period allocation, debt-payoff choices, scenario replay and challenge missions, separate from hangar-driven continuous play.

**Source:** [components/debtbreak-arena.tsx](../../components/debtbreak-arena.tsx), [components/debtbreak-challenges.tsx](../../components/debtbreak-challenges.tsx), [components/debtbreak-world.tsx](../../components/debtbreak-world.tsx), [lib/debtbreak-finance.js](../../lib/debtbreak-finance.js), [lib/debtbreak-challenges.js](../../lib/debtbreak-challenges.js), [lib/arcade-engine.js](../../lib/arcade-engine.js).

**Focused tests:**

```sh
node --test tests/arcade-engine.test.mjs tests/debtbreak-challenges.test.mjs tests/debtbreak-arena-view.test.mjs tests/debtbreak-clock.test.mjs
```

Practice amounts and scenario choices are synthetic. Gameplay results are not personal financial advice or predictions.

### EXP-004: Debt Invaders

- **Labels:** gameplay, arcade, four-corners
- **State:** public baseline, retained in place
- **Explore:** / then choose Debt Invaders in the arcade

Arcade experiment mapping four public corner outputs to firing cadence, shields, barriers and ship size.

**Source:** [components/debt-invaders-arena.tsx](../../components/debt-invaders-arena.tsx), [lib/debt-invaders-engine.js](../../lib/debt-invaders-engine.js), [app/debt-invaders.css](../../app/debt-invaders.css).

**Focused tests:**

```sh
node --test tests/debt-invaders.test.mjs
```

The engine tests cover simulation rules. They do not establish rendering performance or availability of the hosted calculator.

### EXP-005: Wants vs Needs

- **Labels:** gameplay, side-scroller, canvas2d
- **State:** public baseline, retained in place
- **Explore:** / then choose Wants vs Needs in the arcade

Directional aiming, Utilities boosts, advertising planes and three bosses in a side-scrolling learning game.

**Source:** [components/wants-needs-arena.tsx](../../components/wants-needs-arena.tsx), [components/wants-needs-renderer.ts](../../components/wants-needs-renderer.ts), [lib/wants-needs-engine.js](../../lib/wants-needs-engine.js), [app/wants-needs.css](../../app/wants-needs.css).

**Focused tests:**

```sh
node --test tests/wants-needs.test.mjs
```

The pure engine suite is not a fresh end-to-end visual or accessibility sign-off.

### EXP-006: Pulse Range

- **Labels:** gameplay, training, input
- **State:** public baseline, retained in place
- **Explore:** / then choose Pulse Range in the arcade

A 45-second, no-fail training arena with keyboard, mouse and touch controls and its own inline simulation.

**Source:** [components/training-arena.tsx](../../components/training-arena.tsx).

**Test coverage:** No dedicated automated Pulse Range coverage was identified. Catalog reference checks and the project build do not establish gameplay or UI correctness for this experiment.

### EXP-007: Ground Defense, automated base defense and movable-grid learning

**Labels:** learning, historical, separate-checkout. The existing [work/debtbreak-learning-20261002 branch](https://github.com/KCmagination/vision-arcade/tree/work/debtbreak-learning-20261002) is preserved, not merged. Audited revision: `0f8f62faaacb3c7a6832db4ce1d88b135939b2a6`. Four commits ahead of the audited main, this is a substantial runtime experiment: Ground Defense, automated three-wave Base Defense, cash/reserve spending caps, pause/build windows, movable role pieces and seven needs, learning/recovery readouts, and a later original-art visual overlay.

Key sources on that branch include components/debtbreak-base-defense.tsx, components/debtbreak-grid-placement.tsx, components/debtbreak-command-guides.tsx, lib/debtbreak-grid-view.js and the command, ground, learning and readiness modules. Tests include debtbreak-command, ground, grid-view and visuals units, with corresponding grid/ground/command/learning browser suites. See its [visual-overlay notes](https://github.com/KCmagination/vision-arcade/blob/0f8f62faaacb3c7a6832db4ce1d88b135939b2a6/docs/visual-overlay-v0.10.0.md) and [manifest](https://github.com/KCmagination/vision-arcade/blob/0f8f62faaacb3c7a6832db4ce1d88b135939b2a6/release-manifest.json).

Its manifest records 277 unit checks and 92 browser cases from prior work, not new results from this catalog pass. Its browser README still refers to the older 0.9.0 baseline while the branch is 0.10.0. Read the branch scripts and exact manifest together. Its checks use synthetic inputs and do not establish physical-device performance or current calculator availability. See [branch map](BRANCHES.md) before comparing or running it.

## Reproduce the public baseline

Use a separate checkout so local work is not disturbed:

```sh
git clone -c core.autocrlf=false --branch experiments/catalog https://github.com/KCmagination/vision-arcade.git vision-experiments
cd vision-experiments
npm ci
npm test
npm run build
npm start
```

Requires Node 22.13 or later. The clone command keeps LF bytes because the release-boundary and browser-baseline checks verify exact file hashes, including line endings. Open http://localhost:3000. Use fictional inputs for review. The public app calls a hosted calculator; a successful local build does not prove that service is reachable. No key or private calculator source is needed.

For browser checks, install Chromium with `npx playwright install chromium`, then run `npm run test:browser`. See [browser instructions](../../tests/browser/README.md) for synthetic inputs, desktop/touch coverage and limits. Run focused checks only after installing dependencies; they are not a replacement for the full suite.

The machine-readable [catalog.json](catalog.json) supplies stable experiment IDs, labels, source/test paths and exclusions. `tests/experiment-catalog.test.mjs` verifies those references and catalog structure during `npm test`.

## Fresh verification

[Validation record](VALIDATION.md): 209 unit tests and the production build passed. The browser rerun passed 18 of 28 cases, with ten desktop cases blocked by an existing touch-detection mismatch on this Windows machine. The complete browser gate did not pass.

## Review and promotion

- [Branch map and deployment caveat](BRANCHES.md)
- [Publication boundaries and held-back families](BOUNDARIES.md)
- [Existing source provenance policy](../VERSIONING.md)
- [Third-party notices](../../THIRD_PARTY_NOTICES.md)

No merge, production deployment, new asset release or repository setting change is part of this organization pass. A branch is a review location, not an approval to promote its contents.
