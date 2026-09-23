# Landing-page onboarding and copy correction

## Demo refinements after version 38

- The landing demonstration starts with all four attributes at minimum. Each
  eight-second phase rises from weakest to strongest, holds at the peak, and
  returns to weakest before the next attribute. The order remains shield,
  sword, helm/wings, then armor. Inactive attributes remain at minimum.
- Equipment emissions now follow the same power value as the concept-card
  outlines, with bloom for the illuminated shield, blade, crown/wings, and
  armor. These changes affect only the landing model's cloned materials.
- The shield grows an animated energy field. Near full charge, its wireframe
  shell, three orbiting rings, pulsing envelope, and green light fade in; all
  fade back out as power falls. The Sentinel itself stays facing forward.
  Pause freezes the shield animation as well as the attribute cycle.
- Reduced-motion visitors see the static minimum-strength front view. The
  existing no-WebGL artwork fallback is preserved. No shared hangar renderer,
  calculator, financial data, game logic, or character asset was changed.

Verification: the production build and all four targeted timeline, real-model,
and rendered-page checks passed. The real GLB tests cover minimum/maximum
equipment transforms, increasing/decreasing emissions, inactive attributes,
fixed body pose, full-shield geometry, smooth fade, and pause. The browser
loaded the landing page without application errors and used its still-artwork
fallback; this browser has no WebGL, so GPU-rendered glow could not be visually
checked. Type checking reports only the pre-existing missing Cloudflare ambient
declarations in db/index.ts and worker/index.ts.

## Landing attribute demonstration after version 37

- The landing-page Sentinel now holds a fixed front view. Body/head idle motion
  is disabled for this showcase; the hangar's model and controls are unchanged.
- Each eight-second phase starts at full strength, falls to weakest, and rises
  back to full strength. The 32-second repeating order is shield/Capital,
  sword/Cash Flow, helm and wings/Credit, then armor/Collateral. Brief holds at
  each extreme make the differences visible. Other attributes stay at full
  demonstration strength while one changes.
- One frame clock updates both the existing model inputs and the matching
  description square's outline opacity. Power changes do not re-render the
  React component tree on every frame. The credit demo supplies a synthetic
  visual score so the existing model changes both the antenna and wings.
- Pause/resume replaces the rotation control. The cycle stops when off screen
  or the tab is hidden. Reduced-motion visitors receive a static front view.
  Devices without WebGL keep the existing still artwork and do not show a
  misleading animated card glow.
- These are illustrative values only: no visitor financial inputs, calculator
  requests, private math, game logic, character assets, or financial storage
  are changed.

Verification: timing tests cover order, extremes, midpoint strength, inactive
attributes, and loop continuity. Tests load the real Sentinel GLB and execute
the existing CharacterModel frame updates: shield, sword, antenna, wings, and
armor change as expected while the torso/head pose stays still. Browser checks
verified the landing-page fallback and the actual controller, outlines, and
pause/resume controls using a temporary frame-stepping fixture. That fixture
was removed before the final build. The cloud browser has no WebGL, so a visual
GPU-rendered animation check could not be performed. Type checking reports only
the existing missing Cloudflare ambient declarations in db/index.ts and
worker/index.ts, with no errors in the changed components.
The production build and all four targeted model/timeline/rendered-page checks
passed. The hangar's shared CharacterModel source and calculator/game files
remain byte-for-byte unchanged from version 37.

## Layout revision after version 36

The owner requested a banner immediately below the header reading “Welcome to
Vi$ion Games — Gamified Budgeting and Financial Education.” Removed the “See
your finances. Change the picture. Play the consequences.” headline and promoted
the existing explanatory sentence to the bold main title. Moved How Vi$ion Works
into a 2×2 grid to the left of Sentinel, with the main Build My Vi$ion action
directly below the avatar. At narrow widths the grid remains two columns with
flexible card heights, followed by the avatar and button.

The revision changes only the welcome page, its CSS, the existing rendered-page
regression assertions, and this change history. Desktop inspection confirmed
four square cards, the grid left of Sentinel, and the button below it. A 390px
iframe viewport showed readable cards without clipping or horizontal page
overflow. The How It Works navigation still focuses the grid. No calculator,
gameplay, shared welcome behavior, or financial storage changes were made.
The production build and both existing rendered-page checks passed. The
temporary narrow-screen preview route was removed before the final build.

This revision is saved for review under the original brief's deployment-approval
rule. The prior version 36 was separately approved and published.

## Scope

This is an onboarding/copy update, not a calculator or gameplay release. The
baseline is Sites version 35 (`c8c794a0fc787dce205f0afd5f789ff9fa883fb4`). That
version updated the main hangar; this correction applies the approved brief to
the actual `/welcome` landing page. Save for owner review; production deployment
and a separate GitHub sync/version-history update require approval.

## Changed files

- `app/welcome/page.tsx`: approved headline, four-concept explanation, seven-input
  and five-input What If instructions, avatar mappings, and qualified gameplay
  copy. Existing About, developer API demo, support, pilot materials, and video
  are preserved.
- `app/welcome/welcome.css`: responsive presentation within the existing brand.
- `components/vision-welcome.tsx`: one shared introduction, accessible dismissal,
  direct actions, and the existing versioned seen flag.
- `components/vision-workspace.tsx`: reuse the introduction and focus the current
  input form when entering through `/#picture`.
- `tests/rendered-html.test.mjs`, `tests/ui-components.test.mjs`: landing-page
  content/link and blocked-storage regression checks.
- This release note records the correction and review limitations.

## Copy review

- Omitted “About 2 minutes · No account required.” The duration is unvalidated;
  the helper is not needed to enter the current form.
- “Four numbers” is not used: the current UI has seven base inputs. The four
  concepts are preserved. “Eventually play” remains in the approved welcome
  as a sequence, but is flagged for owner review because games already exist.
- Preserved “Credit → Helm & Wings,” with an explicit note that Sentinel's
  current hangar calls its credit headpiece “Antenna.” Verdant uses leaves,
  trunk, roots, and canopy. Cash flow also includes living expenses.
- “Reduce principal balances” and “Experiment with different debt strategies
  such as Avalanche and Snowball and watch how the same starting situation can
  produce very different results” are scoped to Debtbreak Classic's fictional
  scenarios. They are not features of the current hangar-driven turret mode.
- Omitted “Decide whether disposable income should strengthen your next round
  or repair damaged defenses.” This is not a verified general choice in the
  current hangar-driven turret mode; no new game feature was added to support it.
- “Can I afford this purchase?” remains an exploratory question, with an
  explicit statement that Vi$ion does not recommend a purchase. No overall
  grade, credit-score forecast, or real-account effect was added.

## Verification

- Desktop preview: inspected the hero and welcome visually; no horizontal
  page overflow. Checked first arrival, initial button focus, Escape dismissal
  and return focus, How It Works closing/focusing the explanation, and reload
  suppression. Checked both the welcome Build action and persistent landing
  links: each opens the current input form and focuses monthly income without
  opening a second welcome.
- First-visit tests used temporary QA preference keys; the source is restored
  to the existing `vision:welcome:v1` before saving. Only a `seen` flag is stored.
- Browser preview initially had stale development-module errors. A refreshed
  preview resolved navigation; successful checks above were performed afterward.
- Blocked storage is covered by an automated write-failure/fallback check,
  not a real browser with storage disabled. The UI remains dismissible using
  the in-memory fallback. Full reload persistence is unavailable when both
  browser storage mechanisms are blocked.
- Responsive CSS and 44px-or-larger welcome actions are retained. A physical
  touch device and narrow-screen browser were not tested in this correction.
- Financial inputs, avatar selection logic, calculator requests, API routes,
  private engine files, game engines, and character assets are unchanged. No
  new financial data persistence or database changes were introduced.
- This correction does not claim new end-to-end gameplay verification.

- Production build passed. All 138 automated tests passed, including the new
  rendered landing-page and storage-fallback checks. Whitespace validation
  passed. Source comparison confirms no changes under the calculator, private
  engine, API, game logic, hooks, or public-asset directories.
