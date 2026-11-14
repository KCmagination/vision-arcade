# Integration and assigned-task gates

These are operating instructions, not commands that change settings, launch agents or authorize spending.

## Submission is not activation
Contributors may develop and offer public-scope proposals in their own forks under `CONTRIBUTING.md`. Review can result in accepting none, part or all of the work. An unsolicited submission does not activate an assigned task, authorize upstream changes or grant access to owner resources.

PR #6 integrated the initial documentation only. VAG-001 is [issue #5](https://github.com/KCmagination/vision-arcade/issues/5); its live owner-controlled status and final approved base remain authoritative. It stays blocked until explicitly activated. Do not create a second task-status database here.

## Owner-controlled integration settings
The intended main-branch rules are:
- Require a pull request and resolved review discussions.
- Require GitHub Actions checks `verify` and `browser`, with the candidate up to date.
- Set required approving reviews to **0**; do not require code-owner or last-pusher approval.
- Block force pushes and deletion, with no bypass exemptions.
- Keep automatic merging off and outside contributors on their own forks without upstream write/admin access.

The [import candidate](main-protection.ruleset.json) expresses the branch rules. Committing this JSON does not install or activate it. An administrator must import/review it in repository settings; if a different ruleset already exists, reconcile rather than stack conflicting review requirements. Verify the active configuration afterward. A read-only settings check is not a destructive enforcement test.

Zero required reviews removes a mandatory second account, not PRs, tests or the owner's integration decision. Any identity with upstream write rights may still be able to merge after checks. The assistant therefore merges only the exact PR/head authorized by the owner. A GitHub rule cannot distinguish the owner from an assistant using that same account. Independent review is encouraged for higher-risk work but is not a universal prerequisite.

## Hosting, execution and budget
Before publication through owner-connected tools or integration, maintainers inspect relevant branch/PR/preview/production triggers and connected hosting. Contributors check their own environment; they are not required to inspect inaccessible owner settings. If publication effects are unknown, prepare a local patch/report rather than alter integrations or assume a draft cannot deploy.

Keep untrusted contributions away from production secrets and privileged runners. Review proposed workflow changes before approving a fork's workflow execution. Approval to run tests is not approval to merge. Review existing CI/artifact storage and spending controls; no new owner spending, paid runner, subscription, service or live API test budget is authorized here.

## Activate a specific assignment only when ready
1. Confirm the approved policy is on main and intended branch/check controls are active.
2. Review hosting, execution and cost controls without weakening existing safeguards.
3. Record the approved base SHA and scope in the live issue, and have the owner mark it READY.
4. Let the contributor work independently within that scope; accept a blocker report rather than requiring repeated owner troubleshooting.

For VAG-001, the owner may review the result with assistant support. Return evidence and a recommendation; an additional independent reviewer is optional unless the owner specifically requires one. Passing checks does not authorize a merge or deployment.

## Selective integration
Select the desired work, preserve attribution/licenses and identify dependencies. A reduced or adapted submission is a new candidate and must pass applicable checks at its exact head. Do not bypass the v51 guard to accept a runtime experiment; use the separately reviewed VAG-002 process. Merge and release require separate owner decisions.
