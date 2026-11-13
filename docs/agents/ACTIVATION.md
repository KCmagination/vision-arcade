# Contributor activation gates

This document describes required decisions; it does not execute them or grant permission to change settings.

## Current scope and status

Phase 1 authorizes a documentation-only setup branch and draft PR after checking hosting triggers, plus one blocked pilot issue. No merge, deployment, permissions change, engine change or newly authorized owner spending is included. Merely publishing these documents does not activate the worker policy.

VAG-001 is [issue #5](https://github.com/KCmagination/vision-arcade/issues/5). It was created blocked and unassigned. Use the live issue for subsequent readiness, base SHA and scope; this document is not a second task-status database. Other work-queue entries are proposals only.

## Publication gate

Before creating any upstream branch or PR, inspect the repository workflows and all relevant connected hosting settings. Check branch-push, PR, preview, production and custom-environment triggers. Confirm that the intended documentation publication will not cause a deployment or unauthorized charge. A branch name, draft status, missing repository configuration file or empty commit-status list is not proof that no hosting integration exists.

If relevant settings cannot be inspected, keep the candidate files and PR text local and report the blocker. Do not invent a successful check. Do not add a deployment configuration file, change a workflow, disconnect a provider, cancel existing work or modify permissions to work around this gate without separate authorization.

## Activation gates — separate owner decisions

1. Review and approve the exact documentation candidate and its change list; integrate only through an owner-authorized merge.
2. Review main-branch protection, required CI checks, review requirements and privileged-account enforcement. Check actual workflow/job identities rather than guessing display names. Do not configure an independent-approval rule that prevents the available reviewers from completing setup; the PR author cannot supply their own independent approval.
3. Review connected hosting automation and explicit deployment controls. Keep previews and production within the owner's separately approved policy. Inspect GitHub installed apps/webhooks as needed; repository workflow inspection alone does not enumerate external integrations.
4. Review existing CI, artifact retention/storage and account spending controls. No new spending is authorized. New workflows, paid runners, subscriptions and service accounts remain outside this phase.
5. Confirm the approved policy is on the designated main branch, record its SHA in issue #5, and explicitly mark the task READY as the owner. A contributor claim or edited checklist is not an authorization substitute.

## Worker permissions after activation

A READY issue permits only its documented fork/PR task. Contributors use their own identities and compute. No upstream write/admin credentials, private-source access, payments, merge or deployment are granted. Live calculator requests default to zero unless the owner separately approves a bounded request budget in that task. Required automatic checks do not authorize releases.

## Pilot acceptance

One unfamiliar contributor completes VAG-001 from public instructions without a private tutorial. A separate reviewer checks the exact candidate and supplies actual evidence, limitations and a merge/return/hold recommendation. The owner may reject or hold it. Deployment still requires a separate decision.

## Evidence scope

The Phase 1 inspection found main at `1b41d197be7d7203df5f191d380f8c1ac723125e` with protection disabled and no returned rulesets. The two inspected workflow files contain tests/builds/artifact upload but no deployment step. This is a point-in-time record, not a guarantee about future settings or external integrations. Recheck before publication and activation.
