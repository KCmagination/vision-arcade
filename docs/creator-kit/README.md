# Vi$ion Creator Kit

Start with one piece: fit an equipment blank, redesign a utility tank, turn the ad plane into a new opponent, or dress a sample arena. These files are for independent contributor experiments, not a replacement for the live game.

## Download something to edit

| Item | Download or source | What it is |
| --- | --- | --- |
| Sentinel avatar | [Download the public Sentinel GLB](https://github.com/KCmagination/vision-arcade/raw/refs/heads/main/public/models/sentinel.glb) · [Editable generator](../../scripts/assets/build-sentinel.mjs) | Original public MVP avatar. Not the unreleased modular rig. |
| Gear fitting | [Editable gear-fit OBJ](models/gear-fit.obj) | Original training fixture: separate pivot, bracket and equipment blank. Not a Sentinel socket or a production clearance envelope. |
| Four attributes | [Fictional JSON examples](attribute-examples.json) · [Public showcase source](../../lib/sentinel-showcase-cycle.js) | Compare one corner at 0.25 and 0.75 while the others stay at 0.50. Unknown Credit is `null`, not a low score. These are presentation examples, not grade boundaries. |
| Utilitank (gameplay models) | [Electric GLB](models/utilitank-electric.glb) · [Water GLB](models/utilitank-water.glb) | The two original Blender models used by the connected Debtbreak playtest. The [editable tank OBJ](models/utilitank-blockout.obj) remains an optional training blockout, not an in-game mesh. |
| Debtonator (gameplay model) | [Download the Debtonator GLB](models/debtonator.glb) | Original flying enemy model used by the connected Debtbreak playtest. Not the Wants vs Needs ad plane. |
| Ad plane | [Editable plane OBJ](models/ad-plane-blockout.obj) · [Game reference](../../components/wants-needs-renderer.ts) | Original 3D interpretation. The public Wants vs Needs plane is drawn in 2D. |
| Environment | [Editable arena OBJ](models/sample-arena.obj) · [Game reference](../../components/debtbreaker-battlefield.tsx) | Original layout with a base plinth, two lanes and spawn markers. Not a live level or a private scene export. |

On GitHub, use **Raw** or **Download raw file** to save a GLB or OBJ. Import the three enemy GLBs as glTF 2.0; they are self-contained, with no external textures. Their unit is one meter, +Y up and +Z forward. The OBJ files are untextured, editable text with named components; no add-ons, external textures, account, or calculator are needed. Coordinates are in meters, +Y up and +Z forward. OBJ does not record those conventions, so set them explicitly when importing. The sample arena is 10 × 8 m at its deck.

## One small contribution

1. Import the gear-fit fixture and keep its `DEMO_pivot` and `DEMO_bracket` fixed. Edit the separate `DEMO_equipment_blank` (200 × 280 × 20 mm).
2. Export the part separately; include one view at rest and, if you have a test rig, matched guard and strike views. Mark any clipping you saw and state what you did not test. The neutral fixture alone does not prove the item fits a moving Sentinel.
3. For the public avatar, the generator names `cash_emitter`, `reserve_shield`, `equity_battery` and `credit_antenna`. Identify which reference you used, your units and pivot, whether the object is rigid or skinned, and the whole equipped scene's triangle and draw counts if you measured them.
4. Follow the [contributor guide](../../CONTRIBUTING.md): submit editable source, a usable export, a preview, test notes, and attribution and reuse terms in a proposal issue or draft PR from your fork.

## Rights and scope

See the [asset register](ASSETS.md), repository [MIT license](../../LICENSE) and [third-party notices](../../THIRD_PARTY_NOTICES.md). Keep the copyright and license notices with redistributed copies. Original kit blockouts contain no third-party art. The linked game sources are references; separate third-party dependencies retain their own terms. The private calculator, private rigs and uncleared source assets are not part of this kit.
