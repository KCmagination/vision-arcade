# Catalog validation: 2026-11-10

## Scope

This pass adds the experiment index, labels, branch map, publication boundaries and catalog tests. It does not change application behavior. The 103 product files checked by the existing browser baseline, the protected adapter/license files, runtime dependencies and release manifest remain at their reviewed public baseline.

## Fresh local results

Environment: Windows, Node 24.19.0, the repository's locked dependencies, headless Chromium via Playwright 1.62.1.

- Public release-boundary checks and their self-tests: **passed**.
- Full unit suite: **209/209 passed**, including the three new catalog checks.
- Next.js production build and TypeScript: **passed**.
- Exact product-file check: **103/103 matched** the public v51 baseline.
- Browser suite: **18/28 passed; 10 desktop-mouse cases failed**. All 14 mobile-touch cases passed; four desktop cases passed. The aggregate browser gate did not pass.

All ten desktop failures stopped at the existing helper's `locator.tap` call: “The page does not support tap. Use hasTouch context option to enable touch support.” The helper chooses tap when `navigator.maxTouchPoints > 0`. A separate diagnostic on this machine reported 10 touch points even with Playwright `hasTouch: false`, while touch events were unavailable in that context. That hardware/context mismatch explains the observed helper errors; it does not certify the unexecuted downstream desktop assertions.

The original helper and product were left unchanged to keep this publication scoped to organization. Do not present this branch as a newly complete browser gameplay certification. A follow-up can make input selection depend on the configured Playwright project and rerun the affected desktop cases.

An initial exact-byte check failed because Windows Git converted source line endings to CRLF. Restoring the verified LF bytes resolved it; no product semantics or expected hashes changed. The catalog's clone command explicitly retains LF bytes.

## Not established by these results

- The historical learning branch was inspected but not freshly run.
- Private or licensing-uncertain local experiments were not imported or certified.
- Pulse Range has no dedicated automated coverage identified by this audit.
- Browser tests use synthetic calculator responses and disable WebGL. They do not validate current hosted-calculator availability, physical-device frame rate or all 3D behavior.
- Remote CI and any external hosting integration checks must be read for the published commit. They are separate from these local results.

Local test logs, screenshots, traces and dependency/build outputs are retained locally and excluded from this commit. The existing release manifest remains historical evidence and is not rewritten to substitute this result.
