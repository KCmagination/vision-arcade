# Debtbreak Sentinel redesign — September 28, 2026

Baseline / rollback: Sites version 48, commit `03ff0e67b6e2f7f5fd76e7882930f57e1b5bba1c`.

## Implemented

- Replaced the continuous game's angled warehouse / reserve-tank battlefield with an open space battlefield following the approved concept. Sentinel stands beside the turret inside a collateral semicircle and an iridescent green capital dome. The dome's visibility follows spendable reserves relative to the selected reserve goal. Reserve protection remains an explicit toggle and pays through the existing ledger.
- The battlefield takes the dominant portion of the screen. Financial HUD rows, cycle progress, lifestyle tiles, funding, weapons and base-planning controls follow the mockup. The weapon strip remains available while scrolling the tall layout. Accounts, wants, deposits and detail stay in Pause / Plan.
- Utilitanks represent living-cost claims and sweep left/right, descend at the edges and accelerate toward the base. Stable slots prevent the survivors from jumping when another body clears.
- Debtonators represent shares of debt-payment claims. Deterministic seeded directions bring them in from the top or either side. They grow visually with modeled interest and fees; bodies share the same underlying obligation rather than creating extra debt.
- Intercept fires one instantaneous precision laser per press. In personal hangar runs it pays up to $100 from the selected wallet. Rapid Fire launches repeated $25 payment projectiles at Utilitanks, with cadence derived from the captured cash-flow loadout. Fictional practice uses its existing larger payment packet. A miss refunds committed funds. Weapons can reject Want-bots for free. Intercept does not pay Utilitanks; Rapid Fire does not pay debt missiles.
- Credit radar supplies actual pre-entry warnings: 1–6 seconds according to the calculator's existing credit strength, a one-second baseline when unknown, and three seconds for the fictional example. Known APRs of 18% or more are highlighted. Unknown APR is never invented. The controls explain the radar as a game metaphor.
- Choose a 1-, 3- or 6-month reserve goal before launch. A wall segment costs $150, adds 25 condition, and has no recurring upkeep or resale value. Expansion is allowed only from reserves above the goal and the amount of issued bills not already covered by available income or identified projectile commitments. Each cost is recorded once in equipment spending and cash reconciliation.
- Seven expansions form the lifestyle-protection goal. Each tile displays the condition of its corresponding fictional wall segment. These are game protection indicators, not calculations of health, sleep quality, relationships or purpose.
- Want-bots remain active throughout all four cycles. Purchases require an explicit Buy choice; arrival and shooting never buy anything. Wants, repairs, expansion and payments are available during tactical pause without advancing time.
- Preserved the negative-reserve calculator fix, fixed-step active clock, interruption pause, and 10-second final-defense rescue. Mission completion still waits for rescue resolution. Calculator scoring, other arcade games and the user's original financial picture remain unchanged.

## Controls

Mouse/touch aims. Tap FIRE or click the field for Intercept; hold for Rapid Fire. Keyboard: arrows/WASD aim, Space fires, 1/2 change weapons, R changes funding, P pauses. Controller: stick aims, right trigger fires, shoulder buttons select weapons, A/B select income/reserves, Start pauses. Assist follows a nearby target when firing; manual aim releases it. Autofire is a Rapid Fire option and starts off. Touch controls and a visible Fire button remain available.

## Validation

- All 208 repository tests passed, including 12 new gameplay/finance regressions for formation travel, radar warning windows, spawn directions, shared claims, single-fire laser behavior, rapid projectiles, free want rejection, 5/60 FPS equivalence, stable slots, expansion costs and limits, and commitment earmarking.
- A full four-cycle play simulation through the new combat layer completed day 120 with 169 shots, 117 hits, all issued bills paid, seven expansions ($1,050), no held funds and a zero cash reconciliation difference. Remaining modeled debt was retained; surviving is not presented as becoming debt-free.
- The React screen rendered on the server with its canvas, all seven lifestyle tiles and primary controls; the reserve tank was absent.
- Inspected the actual canvas renderer at desktop (1300×620), portrait (720×850) and narrow (390×530) sizes. This checks rendered game art, not browser DOM layout or physical input.
- Production build passed before final control polish; the publishing workflow rebuilds the exact final source.
- The standalone TypeScript check reports only the existing Cloudflare runtime declaration gaps in `db/index.ts` and `worker/index.ts`. No changed-component type errors were reported.
- Browser/device playtesting remains unverified because the managed preview's required `control-browser` skill is unavailable. Simulated frame rates are not measured device performance. Prices, warning ranges and pacing remain gameplay tuning choices for user playtesting.

## Art and source boundaries

Three built-in imagegen assets match the approved concept: `public/debtbreak/space.png`, `public/debtbreak/atlas.png`, and `public/debtbreak/sentinel.png`. The latter two preserve generated alpha. The atlas renderer uses measured source rectangles to avoid neighboring sprites. Exact generation prompts are in `debtbreak-art-prompts.json`; no generated screenshot is substituted for interactive game UI. The gun, enemies, shield, wall and HUD all respond to live game state.

The new gameplay and renderer are in `lib/debtbreak-siege.js` and `lib/debtbreak-siege-render.js`, consumed by `components/debtbreak-siege-field.tsx` and the existing controller/screen. Expansion accounting extends the existing continuous ledger. Prior combat code stays available for existing non-redesigned paths and regression coverage. Public package 0.5.0 ports this Site v49 release with owner authorization. See release-manifest.json for exact provenance and public-package checks.
