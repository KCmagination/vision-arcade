# Versioning and update policy

Sites version numbers identify deployed Site snapshots. Semantic versions identify public application releases. Record both, plus full source commit identities, in release-manifest.json; keep VERSION, package.json and package-lock.json consistent.

Future GitHub writes require the owner's approval. A reminder is not approval. Session authorization for a full update applies to that update only.

For each sync: recheck public main and the latest successful Site deployment; prepare on a branch from public main; copy reviewed public files without importing Site history; preserve the hosted adapter and API route; exclude proprietary engine files, fixtures, credentials, hosting metadata and build output. Review new imports and licenses. Run the release guard, gameplay/API tests, production build and browser checks, and report limitations. Check deployment integrations before moving a remote branch. Use non-forced writes and read back remote commit and CI status. Never claim completion from a local patch alone.

The public guard allows only exact reviewed uses of the existing collateral ratio output in two gameplay files and two synthetic fixtures. This is not permission to publish its calculation or any scoring calibration. Guard regression checks reject other uses, including formulas inside those same files.

Rollback uses a normal revert commit. Do not force-reset history. Private calculator and Site deployments require separate scope; public-repository synchronization does not update them.
