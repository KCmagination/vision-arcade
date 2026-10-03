# Grid visual overlay provenance and privacy review

Public 0.10.0 extends draft PR3 head `04cdce775c036a617ff523795b3817347851b4ac` and corresponds to separately published Site v58 / source `c0321378cba430b792adcbc3b40426cc5e4a21dc`. This repository update does not deploy the Site.

The 13 imported files cover the canvas renderer/projection, original canyon and support artwork, placement/briefing/legend presentation, the advanced-dialog CSS fix, and projection-aware browser/unit tests. All existing public counterparts were compared with the reviewed v57 baseline before copying. The public calculator adapter, API route, contracts, scaffold, synthetic test fixtures, dependency graph and licenses are retained; all 11 protected-file hashes are recorded in release-manifest.json. No proprietary scoring implementation, private fixtures, credentials, hosting metadata, generated build output, deployment archive or Site history is imported. The unchanged public guard and its negative self-tests enforce this boundary.

New representational artwork was generated for this project from the owner's approved original concept. Existing original district, enemy and Sentinel art is reused. No third-party game screenshots or clip frames are shipped.

| New original asset | SHA256 |
| --- | --- |
| public/debtbreak/grid-canyon.png | 11dc3219cf162b340322ca641b8e4c9b8bed2f9b099449a6dc5429c779c858f7 |
| public/debtbreak/grid-supports.png | f27640f0e8199f5fd84892767c0779c660803623026417aad764a37d65a79d7d |

Rendering keeps bounded cosmetic histories and does not mutate the game ledger. Reduced motion removes traveling bursts, recoil and debris. Cash Flow alone fires; support roles and all financial/game calculations remain unchanged.

Public validation results are recorded in release-manifest.json and the PR description. Browser scenarios use synthetic API responses and emulated desktop/mobile input, not a physical-device benchmark. Site-native timing and live-calculator checks were performed separately.
