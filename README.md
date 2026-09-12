# Vi$ion Arcade

Financial awareness, built for play. Choose a Mech or Tree, shape your avatar with four financial corners, compare a what-if, and take that loadout into two playable games.

[Try the live MVP](https://vision-financial-map.rettke75.chatgpt.site)

## What's open source

The hangar, mobile interface, original character artwork and models, model generators, animation, game simulations, input forms, and calculator API client are MIT licensed. The proprietary financial calculator runs as a separate hosted service. Its formulas, calibration and implementation are absent from this repository and its history.

| Financial corner | Sentinel / Mech | Verdant / Tree |
| --- | --- | --- |
| Cash flow | Weapon | Leaves |
| Capital / liquid reserves | Shield | Trunk thickness |
| Collateral / equity | Battery | Roots |
| Credit | Head antenna | Tree height |

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

The public package uses standard Next.js for portability. The live MVP uses the same interface, assets and game code with a Cloudflare-compatible server. Source privacy checks run before tests and builds; CI repeats those checks. Production browser source maps are disabled.

## What's playable

- **Debtbreak:** three drone waves, a Core encounter, weapon/energy/shield/signal loadout, dash, automatic recovery, touch and keyboard controls.
- **Pulse Range:** a 45-second training arena with the same financial corner mappings.
- **Canopy:** a labeled future concept, not a playable game.

The mobile hangar supports touch controls, explicit model interaction, safe-area navigation, lower rendering cost and paused offscreen scenes. Liquid reserves have a −$1,000 entry minimum. Hover, keyboard focus or tap explains asset resale value and total debt.

## Data and availability

Financial inputs are sent over HTTPS to Vi$ion for calculation. Application code does not persist or log those payloads. Entries reset on refresh; only the chosen avatar is saved locally. Hosting providers still process requests. No bank or credit-provider connection is included.

Edits are briefly debounced and obsolete requests cancelled. While updating, the last calculated picture is explicitly labeled; game launch waits for a current result. If the service fails, entries remain available and a retry is shown. There is no hidden local scoring fallback.

The hosted endpoint is an experimental public calculation service with no availability guarantee. See [the API guide](docs/CALCULATOR_API.md). MIT licensing of this repository does not transfer ownership of or guarantee continued access to the separately hosted engine. Public outputs can be observed; keeping source private is not a guarantee against algorithm inference.

## Contributing

Contribute UI, accessibility, game mechanics, new original assets, and improvements to the public API adapter. Preserve the four corners, accessible baseline avatars, unknown-credit state and current/scenario separation. Keep financial formulas, calibration tables, legacy financial code and financial test fixtures out of this repository. Review third-party licenses before adding assets.

Use `scripts/assets/build-sentinel.mjs` and `scripts/assets/generate-verdant.mjs` to regenerate the original GLBs. The historical prototypes were not merged: their unfinished app code and restricted assets are not part of this release.

See [LICENSE](LICENSE) and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
