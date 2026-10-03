# Vi$ion Arcade

Financial awareness, built for play. Choose a Mech or Tree, shape your avatar with four financial corners, compare a what-if, and take that loadout into the arcade.

[Try the live MVP](https://vision-financial-map.rettke75.chatgpt.site)

## What's open source

The hangar, mobile interface, original character artwork and models, model generators, animation, game simulations, input forms, and calculator API client are MIT licensed. The proprietary financial calculator runs as a separate hosted service. Its formulas, calibration and implementation are absent from this repository and its history.

| Financial corner | Sentinel / Mech | Verdant / Tree |
| --- | --- | --- |
| Cash flow | Weapon | Leaves |
| Capital / liquid reserves | Shield | Trunk thickness |
| Collateral / equity | Chest armor | Roots |
| Credit | Antenna and wings | Canopy |

Each corner remains independent. There is no combined grade, purchase recommendation, credit prediction, or penalty for low income. All loadouts are playable. Games cannot change real finances.

## Run locally

Requires Node 22.13 or later.

```sh
npm ci
npm run dev
```

Open `http://localhost:3000`. The included Next.js route forwards calculation requests to the live Vi$ion service. No calculator source or API key is needed. An internet connection and an available hosted service are required. Optional `VISION_CALCULATOR_URL` in `.env.local` points the server adapter at a compatible service; it is not a browser credential.

```sh
npm test
npm run build
npm start
```

The public package uses standard Next.js for portability. This 0.9.0 local review candidate contains the approved movable-grid prototype from the separately published Site v57. The public hosted adapter and scaffold are retained; updating this repository does not deploy the Site. Source privacy checks run before tests and builds; CI repeats those checks. Production browser source maps are disabled.

## What's playable

- **Automated Base Defense:** place four role pieces and seven needs, authorize cash for bills, and survive three waves. Cash Flow is the sole weapon; Capital covers authorized savings backup, Credit extends local range, and Collateral anchors shared base condition. Savings backup is optional. Build windows pause time and reset spending permission. The living-cost ruler, savings milestones, educational credit bar and captured collateral needle explain different financial signals without changing scores or real money.
- **Ground Defense:** aim ahead of bill missiles, configure shared totem payments, inspect reserve-shield tradeoffs and use local checkpoints.
- **Four-cycle Debtbreaker:** Sentinel protects a lifestyle base under a green capital shield. Utilitanks march and descend; Debtonator missiles enter from several directions. Switch between Intercept and Rapid Fire, use credit radar warnings, slash Want-bots with the Sentinel, and expand the base to cover seven lifestyle categories. Finish all four cycles with the required sections standing and issued bills paid. The base can be completed early and defended. Reserve goals charge a protective shield. A continuous four-cycle ledger follows the selected Current or What If picture. Autofire and aim assist start off. Failure persists until retry.
- **Debtbreak Classic and challenges:** fictional debt-payoff scenarios with period allocation, Snowball/Avalanche choices and five four-corner missions. Their scenario choices are separate from hangar-driven turret mode.
- **Debt Invaders:** firing cadence, shields, barriers and ship size respond to the four corners.
- **Wants vs Needs:** a side-scrolling shooter with Utilities boosts, directional aiming, ad planes and three bosses.
- **Pulse Range:** a 45-second training arena.

The `/welcome` page explains the four concepts and includes a developer example, captioned preview and educator resources. The hangar includes responsive pillar/avatar feedback, credit-grade labels and zeroed What If changes. Unknown credit stays labeled. Mobile controls and the new Canvas 2D Debtbreaker battlefield are included.

Use **Advanced: debts & living costs** in the hangar to enter named accounts and living-cost categories. Review each total before applying changes; partial details can leave positive unspecified remainders. What If additions stay separate. The battlefield divides each monthly obligation across more targets without multiplying the amount owed. Rapid Fire uses $25 payment projectiles for Utilitanks; Intercept pays up to $100 per press for debt missiles. Missed projectiles refund their committed funds.

Account balances stay payments-only by default. Explicitly opted-in accounts with a known rate held constant and a known non-debt payment portion can use the selected simplified monthly or daily estimate. Known due dates and explicitly entered late fees determine game events. Included costs are paid first, then interest, then principal. Pause / Plan supports bounded extra payments and Essential / Current / Expanded lifestyle choices. Lifestyle adjustments apply next cycle to a bounded adjustable portion of living costs; they never refund past bills or rewrite issued claims. Expansion preserves coverage for issued bills; the reserve goal grants a shield power-up rather than blocking construction. The model assumes no unentered borrowing, rate changes, unentered fees or interest on unpaid interest; remaining term does not promise payoff. Estimates never change the entered picture or captured pillar loadout. Future credit scores are not projected. Proprietary four-corner scoring remains exclusively in the hosted calculator; the public game ledgers are simulations.

Utilitanks start in three rows and travel 2× faster; Debtonators fly 5× faster. Want waves have twice as many ads at twice the fall speed. Each connected sword strike clears an ad; every five clears charge a stronger area sweep. Faster physical impacts do not advance due dates or create early fees.

## Browser verification

Run `npx playwright install chromium`, then `npm run test:browser:all`. The repeatable suite exercises mouse and mobile touch against the production build with WebGL disabled and synthetic calculator responses. See [browser instructions](tests/browser/README.md).

## Source version

Public package **0.9.0** is a local grid-prototype candidate corresponding to Site **version 57**, source `2d03337728209a186446f88f80ebe2034a5efc56`. It is prepared from verified PR3 head `cb2a1ab03d420348c03c96c54fa2e18e956d6e77` without importing Site history. It has not been pushed or merged. Sites and public package versions are separate. The public Next.js adapter and build setup intentionally differ from Site infrastructure. See [CHANGELOG.md](CHANGELOG.md), [release-manifest.json](release-manifest.json) and [versioning policy](docs/VERSIONING.md).

## Data and availability

Financial inputs are sent over HTTPS to Vi$ion for calculation. Application code does not persist or log those payloads. Entries reset on refresh; only avatar and introductory UI preferences are saved locally. Hosting providers still process requests. No bank or credit-provider connection is included.

Edits are briefly debounced and obsolete requests cancelled. While updating, the last calculated picture is explicitly labeled; game launch waits for a current result. If the service fails, entries remain available and a retry is shown. There is no hidden local scoring fallback.

The hosted endpoint is an experimental public calculation service with no availability guarantee. See [the API guide](docs/CALCULATOR_API.md). MIT licensing of this repository does not transfer ownership of or guarantee continued access to the separately hosted engine. Public outputs can be observed; keeping source private is not a guarantee against algorithm inference.

## Contributing

Contribute UI, accessibility, game mechanics, new original assets, and improvements to the public API adapter. Preserve the four corners, accessible baseline avatars, unknown-credit state and current/scenario separation. Keep financial formulas, calibration tables, legacy financial code and financial test fixtures out of this repository. Review third-party licenses before adding assets.

Use `scripts/assets/build-sentinel.mjs` and `scripts/assets/generate-verdant.mjs` to regenerate the original GLBs. The historical prototypes were not merged: their unfinished app code and restricted assets are not part of this release.

See [LICENSE](LICENSE) and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## Grid prototype candidate (0.9.0)

This local candidate corresponds to Site v57. Place all eleven pieces or use the recommended layout, authorize a cash cap, then launch. Cash Flow fires; Capital, Credit and Collateral support the shared base. Placement is free and limited to setup/build phases. Savings backup is off unless explicitly authorized and only covers targets inside Capital’s area. The public hosted calculator adapter and synthetic browser fixtures are unchanged. This candidate has not been pushed to GitHub.
