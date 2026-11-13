# Contribute to Vi$ion

Vi$ion turns Cash Flow, Capital, Collateral and Credit into understandable, playable tradeoffs. Contribute original assets, code, tests, research or documented experiments. **Submission is an offer for review, not automatic inclusion. The owner may accept all, select useful parts, request changes, hold or decline it.**

## Two ways to contribute

**Offer an experiment.** Work in your own fork with your own authorized compute and public inputs. Open a clearly labeled PROPOSAL issue or draft PR, with a preview or findings and honest limitations. No assigned VAG number or advance implementation approval is needed for an unsolicited proposal. A short issue before a large effort can avoid wasted work; acceptance and reimbursement are not promised.

**Take an assigned task.** Choose an issue explicitly marked READY by the owner. Follow its approved scope, base SHA, budget and acceptance criteria, and check for existing work. A claim comment is coordination, not exclusive ownership. [VAG-001 / issue #5](https://github.com/KCmagination/vision-arcade/issues/5) remains governed by its live blocked/ready status; this document does not activate it.

Neither route grants write/admin access to the upstream repository, private-engine access, permission to spend the owner's money, merge authority or deployment authority. Agents must act under an operator's authorization; these files do not launch or fund agents.

## Start here
Read [AGENTS.md](AGENTS.md), the [API guide](docs/CALCULATOR_API.md), [versioning policy](docs/VERSIONING.md), [work queue](docs/agents/WORK-QUEUE.md) and [integration gates](docs/agents/ACTIVATION.md). Main is the integration baseline. Experiments are evidence, not approved replacements.

Public references:
- [Reviewed experiment catalog](https://github.com/KCmagination/vision-arcade/blob/f37ad5549e8973251baab9f02aaa771373fc58eb/docs/experiments/README.md)
- [Publication exclusions](https://github.com/KCmagination/vision-arcade/blob/f37ad5549e8973251baab9f02aaa771373fc58eb/docs/experiments/BOUNDARIES.md)

Use your own fork/branch. Do not ask for owner credentials. Maintainers inspect upstream hosting and CI before authorizing integration or workflow execution; contributors check their own connected environment. A contributor without GitHub write tools may provide a patch and report to their operator. Do not require access to private owner settings to develop an idea.

## Make the work easy to evaluate
State its purpose, starting commit, changed components, dependencies and remaining limitations. Separate unrelated changes where practical. An unfinished experiment is welcome when labeled honestly; it is not a passing release candidate.

For an asset, provide editable source, usable export, preview, relevant measurements and rights. For code, provide applicable test evidence and known failures. For research, provide sources, reproducible examples and uncertainties. Full application checks apply to the final integration candidate, not to every sketch or discussion.

## Accepting only part of a submission
The ordinary Merge button takes the complete PR; it is not a file-selection control. To keep only part, ask for a smaller PR or prepare a new integration branch containing the selected commits, files or edits. Record the source PR and commits, preserve author/license notices, identify omitted material and dependencies, and test that new combination. Passing checks on the original PR do not certify the extracted subset. Close or annotate the original proposal with the disposition instead of implying everything was adopted.

The owner may review with an assistant and then authorize an exact integration PR. A second eligible GitHub reviewer is not mandatory under the intended zero-required-approval configuration. Contributors without upstream write permissions do not gain merge rights from that setting. Any future write-access grants require a separate decision.

## Local setup and validation
The current baseline requires Node 22.13 or later. Use a clean checkout and LF line endings because historical checks verify exact bytes.

```sh
npm ci
npm test
npm run build
npx playwright install chromium
npm run test:browser
```

The browser command checks v51 identity before browser behavior. [VAG-002](docs/agents/WORK-QUEUE.md) proposes separating checkpoint identity from candidate verification. Report blocked or failed checks; never delete a guard, skip a failing assertion or regenerate expected hashes to certify unreviewed work.

Routine automated tests use labeled synthetic calculator responses. They do not validate private scoring or live-service availability. Automated live API checks require a separately approved bounded request budget. Do not load-test the hosted service or submit personal financial records.

## Compute, licensing and release
Use your own authorized compute. No new owner spending, reimbursement, service or deployment is authorized by submitting work.

For original code/documentation intended for inclusion, confirm it is offered under the existing [MIT license](LICENSE); disclose any different terms before integration. For assets and third-party material, identify the actual license, source, modification/redistribution rights and required notices. An upload does not automatically transfer ownership, clear third-party rights or grant an exclusive license. Do not relabel someone else's work as MIT. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

Keep the private calculator and withheld materials excluded. Preserve source provenance; documentation-only changes do not create a new application release. Integration and deployment remain separate owner decisions.
