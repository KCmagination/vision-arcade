# Debtbreak v51 recovery checkpoint

Public package **0.6.0** corresponds to Sites **version 51**, source commit `6fc8e788e927381e6c199aa41aa2fed9267558a4`, published September 28, 2026. This update includes the v50 lifestyle redesign and v51 wave/sword tuning.

Preserve `release/debtbreak-v51` at its verified release commit. Continue future changes on main or feature branches. This branch is a recovery reference, not an administratively protected branch. The earlier `release/debtbreak-v49` checkpoint remains intact.

To restore the Site, redeploy saved Sites version 51 to the same Site. To restore public source, start from this checkpoint commit or restore its files in a new commit. Never force-reset shared history.

The public export retains the hosted calculator adapter and standard Next.js setup. No calculator implementation, private fixtures, deployment credentials or Site history are included. This synchronization does not redeploy the Site or calculator service.

`tests/browser/baseline-v51.json` records product checksums and runtime dependencies for repeatable verification. The historical v49 harness remains on `test/debtbreak-v49-browser`. See `release-manifest.json` for measured validation and remaining limits.
