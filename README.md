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

The public package uses standard Next.js for portability. This release ports the Site v36 interface, assets and game code, with a few documented public-only adaptations. Source privacy checks run before tests and builds; CI repeats those checks. Production browser source maps are disabled.

## What's playable

- **Debtbreaker:** turret defense driven by the selected Current or What If hangar snapshot. Aim at weaving Debtonator squads, fund obligations or reserves, and review each period. Manual fire starts enabled as the control mode; autofire and aim assist start off. Failure persists until retry.
- **Debtbreak Classic and challenges:** fictional debt-payoff scenarios with period allocation, Snowball/Avalanche choices and five four-corner missions. Their scenario choices are separate from hangar-driven turret mode.
- **Debt Invaders:** firing cadence, shields, barriers and ship size respond to the four corners.
- **Wants vs Needs:** a side-scrolling shooter with Utilities boosts, directional aiming, ad planes and three bosses.
- **Pulse Range:** a 45-second training arena.

The `/welcome` page explains the four concepts and includes a developer example, captioned preview and educator resources. The hangar includes responsive pillar/avatar feedback, credit-grade labels and zeroed What If changes. Unknown credit stays labeled. Mobile controls and the Debtbreaker compatibility renderer are included.

The turret mode does not predict interest, principal payoff or future credit scores. It uses aggregate monthly obligations and holds the selected credit grade fixed. All financial calculations remain in the hosted service; public game ledgers are fictional simulations.

## Source version

Public package **0.3.0** ports reviewed application files from Site **version 36**, source `e18f26e3e20a93dcb39e86ecfb9010cc1a72f0fd`. Sites and public package versions are separate. The public Next.js server adapter and build setup intentionally differ from the Site's deployment infrastructure. See [CHANGELOG.md](CHANGELOG.md), [release-manifest.json](release-manifest.json) and [versioning policy](docs/VERSIONING.md).

## Data and availability

Financial inputs are sent over HTTPS to Vi$ion for calculation. Application code does not persist or log those payloads. Entries reset on refresh; only avatar and introductory UI preferences are saved locally. Hosting providers still process requests. No bank or credit-provider connection is included.

Edits are briefly debounced and obsolete requests cancelled. While updating, the last calculated picture is explicitly labeled; game launch waits for a current result. If the service fails, entries remain available and a retry is shown. There is no hidden local scoring fallback.

The hosted endpoint is an experimental public calculation service with no availability guarantee. See [the API guide](docs/CALCULATOR_API.md). MIT licensing of this repository does not transfer ownership of or guarantee continued access to the separately hosted engine. Public outputs can be observed; keeping source private is not a guarantee against algorithm inference.

## Contributing

Contribute UI, accessibility, game mechanics, new original assets, and improvements to the public API adapter. Preserve the four corners, accessible baseline avatars, unknown-credit state and current/scenario separation. Keep financial formulas, calibration tables, legacy financial code and financial test fixtures out of this repository. Review third-party licenses before adding assets.

Use `scripts/assets/build-sentinel.mjs` and `scripts/assets/generate-verdant.mjs` to regenerate the original GLBs. The historical prototypes were not merged: their unfinished app code and restricted assets are not part of this release.

See [LICENSE](LICENSE) and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
