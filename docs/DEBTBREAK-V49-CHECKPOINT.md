# Debtbreak v49 recovery checkpoint

Public package **0.5.0** corresponds to Sites **version 49**, source commit `5fb0defc1ae4264ce3b67182938cff4aca2f2775`, published September 28, 2026.

Preserve `release/debtbreak-v49` at its verified release commit. Continue future changes on main or feature branches. The commit is content-addressed; the branch is a recovery reference and is not administratively protected by this update.

To restore the Site, redeploy saved Sites version 49 to the same Site. To restore public source, start from this checkpoint commit or restore its files in a new commit. Never force-reset shared history. The private service has a matching recovery branch; preserve its private visibility.

The public export retains the hosted calculator and standard Next.js setup. It excludes proprietary implementation, deployment credentials and Site history. Updating this checkpoint does not explicitly redeploy a separate service.
