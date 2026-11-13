# Contribute to Vi$ion

Vi$ion turns Cash Flow, Capital, Collateral and Credit into understandable, playable tradeoffs. We welcome original assets, focused gameplay improvements, tests and documented experiments. Development continues; contributions must not require the owner to supervise every step.

## Activation comes first
The Phase 1 setup is a review candidate, not an active worker system. Read the [activation gates](docs/agents/ACTIVATION.md). [VAG-001 / issue #5](https://github.com/KCmagination/vision-arcade/issues/5) was created blocked pending setup approval. Consult its live owner-controlled status; do not start work from this document alone. Other work-queue entries remain proposals until separately approved.

## Start here
Read [AGENTS.md](AGENTS.md), the [API guide](docs/CALCULATOR_API.md), [versioning policy](docs/VERSIONING.md), and the relevant [task specification](docs/agents/WORK-QUEUE.md). Current main is the integration baseline; experiment branches are evidence, not automatic replacements.

Public experiment navigation, pinned to the reviewed catalog:
https://github.com/KCmagination/vision-arcade/blob/f37ad5549e8973251baab9f02aaa771373fc58eb/docs/experiments/README.md

Publication exclusions:
https://github.com/KCmagination/vision-arcade/blob/f37ad5549e8973251baab9f02aaa771373fc58eb/docs/experiments/BOUNDARIES.md

## Small-task workflow
Choose an owner-approved ready issue and check for an active claim or PR. Comment with task ID, operator identity, base SHA, intended scope and an absolute UTC claim expiry; the suggested window is 72 hours and can be renewed with a useful progress report. Claims coordinate work but are not technical locks. Use your own fork and branch. Check connected deployment effects before publishing; a branch or draft PR is not a deployment exemption. Do not ask for upstream write access.

Use the task's acceptance tests and submit one focused pull request with reproducible evidence. A contributor without authenticated write tools can return a patch and report to their own operator; do not ask the owner to share credentials. A review packet should make the decision clear without requiring a live tutorial.

## Local setup
The reviewed baseline requires Node 22.13 or later. Use a clean checkout with LF line endings; exact historical checks are byte-sensitive.

```sh
npm ci
npm test
npm run build
npx playwright install chromium
npm run test:browser
```

The last command invokes a v51 identity gate before browser execution. See VAG-002 for the proposed evolution of that gate. A failed environment setup or an intentionally changed runtime file must be reported honestly; do not bypass a guard and claim the aggregate gate passed.

The app's real calculation path uses the hosted API. Routine automated tests use synthetic outputs and do not require private formulas or financial records. Never point a stress test at the hosted service. Do not interpret a successful local build as current live-service certification.

## Compute and rights
Use your own authorized compute within a budget set by its operator. No owner spending, reimbursement, private-source access or production deployment is authorized by participation. Submit editable sources, redistribution rights and attribution for assets. Keep private and licensing-uncertain studies out of public work.

## Review
Owners approve integration and release separately. Independent reviewers check actual outputs, not just the author's summary. Preserve changelog and version provenance when a task changes application behavior. Document-only work must not pretend to be a new application release.
