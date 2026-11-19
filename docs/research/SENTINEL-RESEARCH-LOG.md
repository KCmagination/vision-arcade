# Sentinel Research Log
## Modular armor: what worked, what failed, what comes next

**Research record • 18 November 2026**

This log describes isolated character-art research, not a public release or a finished production character. The public MVP remains a separate baseline. No asset download, installation, license grant or permission to change the game is implied by this report.

---

## 1. Modular teardown: change the right part

**Question:** Can the character gain more layered armor without breaking its existing articulation?

The structural audit found 30 interchangeable equipment assets sharing one 44-bone skeleton. All 30 catalog hashes matched; inspected skin weights were normalized, and donor inverse-bind matrices agreed with the canonical skeleton within 1e-6.

The important finding was ownership of motion. A shoulder cup follows the chest, while the shoulder ball follows its rotating mechanism. Likewise, front hip covers and thigh shells follow different joints. Geometry that looks adjacent in a standing pose does not necessarily move together.

**Decision:** Keep the skeleton, bind data and existing animation intact. Add or reshape each plate according to the mechanism that actually carries it. Do not weld independent moving parts together to improve a still image.

**What this establishes:** A documented attachment map and a repeatable starting point for isolated experiments.

**What it does not establish:** Finished visual quality, collision-free motion or real-device performance. The private research rig should not be assumed interchangeable with the public MVP rig.

## 2. Thigh guards: a useful failure

**Question:** Could fuller thigh-mounted plates close the exposed upper-leg gap?

Two higher, fuller thigh-weighted designs collided with the articulated pelvis covers during sampled strike/guard motion. Both were rejected. Shortening the plates improved clearance, but the remaining design looked like knee-adjacent guards and left much of the upper thigh exposed.

The shortened comparison candidate passed a sampled body test: **132 poses across four authored clips, 64,944 mesh-pair triangle checks, zero detected surface intersections** in the selected comparisons. Intentional same-side thigh backing contact was excluded.

That result did not make the design a visual success. The armor no longer fulfilled the desired upper-leg coverage.

**Decision:** Retain this as a clearance study, not the finished design. Move the upper-coverage experiment to the hip-cover articulation rather than repeatedly extending a thigh-mounted plate through the pelvis sweep.

**Lesson:** “No detected collisions” and “looks right” are different acceptance criteria. A candidate must satisfy both.

## 3. Hip-mounted upper plates: promising, still a prototype

**Question:** Could upper plates follow the existing front hip covers while leaving the lower thigh free to flex?

The comparison candidate adds upper tassets: short articulated armor plates carried by the front hip-cover joints. It retains the optional greaves and **does not include the rejected lower-thigh guards**. Original skeleton, bind data and animation arrays remain unchanged.

A close-fitting first version produced **118 sampled intersection records** with the underlying thighs and was rejected. The revised upper-only version needed **25 mm outward and 45 mm forward stand-off**. It adds **88 triangles and four primitives** beyond the greave profile. Four primitives is not a measured real-device draw-call result.

The stand-off is a clearance tradeoff, not a validated production mounting design. The design adds upper-leg coverage while retaining a dark lower-thigh flexion zone; it is not yet full visual-target fidelity.

### Evidence for the upper-only comparison candidate

These are separate audits with different purposes. Their counts must not be combined into one “everything passed” score.

| Audit | Actual coverage | Recorded result and limit |
| --- | --- | --- |
| Body surface intersections | 132 skinned poses across four authored clips; 64,944 mesh-pair triangle checks | Zero detected surface intersections in selected pairs. Intentional same-side original hip-cover backing excluded. Sampled, not continuous. |
| Weapon clearance | 50 sword/shield combinations × four clips × 33 samples = 6,600 poses; 20,465 narrow-phase checks | Zero detected intersections between the tested new candidate primitives and weapon geometry. Uses the selected maximum helmet/armor configuration, not every outfit. |
| Outfit/runtime preservation | 66 helmet/armor states; four clips; 38,874 sampled frames | One shared 44-bone skeleton, stable identities, finite sampled skinned vertices and authored endpoint returns. **Not a collision test.** |
| Follow-up motion audit | 3,396 runtime poses across all authored keys and sub-key samples | Recorded ready endpoints and tested pauses passed; vertex reconstruction error reported as zero. **Not a completed transition-clearance or surface-distance sweep.** |

The follow-up motion audit comprised 721 guard, 577 sword-strike, 1,137 articulated-guard and 961 articulated-strike poses. These are denser runtime samples, not proof that every interval between poses is clear.

### Why the two armor studies cannot simply be combined

Adding independently thigh-mounted lower guards to the upper layer produced **580 contact records**. A revised combination with a **30 mm idle seam** still produced **199 contacts** during articulated motion. Both combinations were rejected.

An idle gap is not a motion envelope. Two individually promising parts can collide when assembled. These failures do not prove that all two-layer designs are impossible; they show that these tested combinations should not ship together.

**Decision:** Keep the upper-only version as an isolated comparison prototype. Do not silently promote it to the public game or combine it with the earlier lower guards.

---

## Next gate: motion and appearance, not another “passed” badge

Before proposing integration:

1. Freeze the exact candidate and compare it with the baseline at identical cameras and timestamps.
2. Finish transition-clearance testing along the supported ready → action → ready paths, including repeated cycles, uneven time steps and pauses near close approaches.
3. Record minimum separation, time and worst mesh pair. Refine near-contact intervals rather than claiming continuous safety from a fixed sample grid.
4. Check containment, unintended contact, foot sliding and endpoint continuity separately. Keep excluded backing contacts explicit.
5. Review appearance in motion, then test actual WebGL rendering and representative mobile hardware, including frame time and draw calls.
6. Preserve the existing public version until a separately approved integration and release candidate passes its own gates.

The finer surface-distance sweep remains unfinished. There is no completed continuous-collision, arbitrary-blend, transition-clearance, mobile or GPU performance certification in these results. CPU texture-stub checks and studio comparisons are not substitutes for those tests.

## Evidence and publication boundary

This text summarizes retained structural, collision, runtime and iteration reports. Raw assets, private source, internal repository locations, account identifiers and unlicensed imagery are intentionally excluded. No video is claimed or supplied. Publication of this narrative does not authorize distribution of the research assets.

---

## Follow-up research record • 19 November 2026
### Correct the test, then improve the silhouette

This dated follow-up preserves the 18 November entry as a historical record. It covers subsequent isolated candidates, not an update to the public character or a declaration that every equipment combination is safe.

### 1. A hip overlap the earlier filter missed

A later audit included same-joint mesh pairs and found overlapping cobalt and silver pieces on the right hip plate. The earlier pair filter had missed this: sharing a joint does not make an overlap intentional.

Correcting the mirrored geometry left the rig unchanged. Independent Blender checks recorded **nine intersecting face pairs before correction and zero afterward**, with approximately **1.05 mm seams on both sides**.

The corrected candidate then received a **separate 3,396-sample clearance sweep over 562 primitive pairs** and a **separate 6,600-pose weapon check across 50 sword/shield combinations**. These are new tests on the corrected candidate, not a reinterpretation of the similarly numbered audits in the historical entry. A later targeted thumb check sampled 401 poses across a short near-contact interval and measured a minimum separation of **6.46 mm**.

**What changed:** Both the geometry and the scope of the pair audit were corrected.

**What remains unproved:** Continuous clearance between samples, arbitrary animation blends and actual device behavior. The correction is not permission to combine the rejected lower-thigh guards with this candidate.

### 2. A shoulder that clears a guard can still fail a strike

A compact fixed shoulder study improved the silhouette, but its closest sampled Shield05 separation was only **1.87 mm**. Raising the whole shell appeared promising in a cross-body guard: 721 sampled poses passed. The same moving shell intersected the shield during the low grounded strike, confirmed independently in Blender. Reducing the lift did not resolve that tested failure.

**Decision:** Reject the animated whole-shell approach. A successful guard-only test was not sufficient evidence for the supported move set.

The replacement keeps the upper shell fixed and moves a smaller lower lamella, a sliding armor plate, beneath it. This preserved the layered motion while increasing the measured closest Shield05 separation to **10.03 mm**. The study recorded no unintended contacts in **4,130 dense poses** and **6,600 weapon-loadout poses** within its selected test scope.

These counts describe two different audits; they are not a full outfit-combination certification. Standard loader checks established that the candidate could be loaded, not that it performed correctly on a live GPU.

### 3. Broader Crest shoulders without enlarging the moving plate

The next Crest study used the recommended **15–20 mm fixed-shell flare range**, leaving the lower moving plate unchanged. The measured top-projection area increased from **192.3 to 216.9 cm², about 12.8%**. This is a projected-area change, not a claim that the entire character became 12.8% larger.

The change added **72 triangles and no new draw primitives**. The fixed roof retained **35.18 mm** sampled Shield05 clearance; the lower plate retained approximately **10.03 mm**. No unintended contacts were recorded in 4,130 tested poses, including 357 refined samples, with three independent Blender checks.

**Boundary:** This result applies to the tested tapered contour. It does not establish that any arbitrary shell inside the same dimensions will clear, nor does a primitive count establish actual renderer draw calls or frame rate.

### 4. Field, Patrol and Crest: progress is not release readiness

The three featured tiers now provide a clearer visual progression, but each still has explicit limits:

- **Field:** Remained the lower-complexity visual baseline during the later Patrol and Crest edits. It was not silently rebuilt to make the comparisons look better.
- **Patrol:** Chest ridges and a lower keel improved the small-scale silhouette without adding triangles, material draws or textures. The selected changed-chest audit covered 2,420 samples. A moving-light Blender comparison found no new visible seam flash or outline break in its tested views; reduced depth precision and phone rendering remain unverified.
- **Crest:** The wider fixed shell and sliding lower plate are preferred research candidates, not public game equipment. A separate top-sword crossguard graze was corrected and rechecked in its tight recovery interval, rather than dismissed because the shoulder tests passed.

The opt-in tier harness exercised **117 selected states and 15,776 CPU animation updates** while preserving the 44-bone rig and an unchanged default. That is runtime-preservation evidence, **not collision coverage for every combination**. Its tested peak of 22,610 triangles and 144 primitives is not a mobile-performance result.

### Next acceptance gate

Keep exact candidates pinned, compare appearance at matching cameras and timestamps, and test the assembled character in actual WebGL on representative hardware. Measure loading and frame time, inspect moving seams and close approaches, and exercise physical touch where relevant. Studio renders, sampled geometric distances and CPU skinning checks answer different questions; none substitutes for that device gate.

This follow-up publishes research findings only. It includes no raw assets, rig reconstruction data, private source or calculator implementation, and grants no asset license. It does not release the character, change the public game or certify it as game-ready.
