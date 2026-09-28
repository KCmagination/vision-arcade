// Render time is measured independently of the fixed simulation steps.
export const MAX_ACTIVE_FRAME_SECONDS = 0.25;
export const INTERRUPTION_NOTICE = 'Play paused after a long frame interruption. Resume when ready.';
export const createFrameClock = () => ({ last: null });
export function readFrameClock(clock, now, active) {
  const previous = clock.last;
  clock.last = active && Number.isFinite(now) ? now : null;
  const elapsed = previous === null || clock.last === null ? 0 : Math.max(0, (now - previous) / 1000);
  return elapsed > MAX_ACTIVE_FRAME_SECONDS + 1e-9
    ? { seconds: 0, interrupted: true }
    : { seconds: elapsed, interrupted: false };
}
