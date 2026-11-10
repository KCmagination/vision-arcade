# Branch map

## Review entry point

`experiments/catalog` starts from public main `1b41d197be7d7203df5f191d380f8c1ac723125e`. It organizes six public experiment families plus one historical learning branch, adding documentation and catalog tests without moving original implementation files.

One catalog branch is deliberate: the public experiments share components and engines. Creating six identical copies would imply isolation that the code does not have. The stable EXP IDs and topic labels make the separate efforts findable while retaining their actual dependencies.

## Existing references retained

| Branch | Audited commit | Role |
| --- | --- | --- |
| main | 1b41d197be7d7203df5f191d380f8c1ac723125e | Existing public baseline; unchanged by this task |
| release/debtbreak-v51 | 1b41d197be7d7203df5f191d380f8c1ac723125e | Existing recovery checkpoint |
| release/debtbreak-v49 | cb72495ee12b0034e92ae8878a779387a1bdb2df | Earlier release checkpoint |
| release/site-v45 | 831a629a63fa5c43357b0f18a0530ab8ba7e2eef | Earlier release checkpoint |
| sync/site-v36 | 8fc30598d1944791465b0c9ed24cb43540cc11e9 | Earlier sync checkpoint |
| test/debtbreak-v49-browser | baeb602aaa2ee4694e9ff26f46950f97685120a3 | Historical browser harness |
| work/debtbreak-learning-20261002 | 0f8f62faaacb3c7a6832db4ce1d88b135939b2a6 | Separate historical learning experiment |

Refs were read on 2026-11-10; use the listed commit for a fixed comparison if a branch later advances. Historical branches are not newly certified by the catalog validation.

To inspect the learning branch without altering this checkout:

```sh
git clone -c core.autocrlf=false --branch work/debtbreak-learning-20261002 https://github.com/KCmagination/vision-arcade.git vision-learning-review
cd vision-learning-review
git rev-parse HEAD
```

Read that checkout's README and package scripts before running it. Do not merge its historical dependencies or implementation into main as part of reviewing the catalog.

## CI and deployment implications

At the audited baseline, `.github/workflows/ci.yml` runs install, unit/source-boundary tests and build on every push and pull request. `browser-tests.yml` runs on pull requests, manual dispatch and pushes to its named branches. Neither workflow contains a deployment step.

The public tree has no Vercel configuration file. The README identifies a separately deployed ChatGPT Site. External hosting integration settings could not be verified during this pass. **A pushed branch may still trigger a hosting preview through an external integration.** Branch names alone do not prevent that.

This task does not merge, change main, create a release, call a deployment API or alter hosting settings. No claim is made that every external integration is disabled. Check the exact new commit's CI and any external checks before promoting it.
