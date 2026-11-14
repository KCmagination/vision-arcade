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

// The HUD reads modeled time; it never schedules or awards income itself.
export function paydayClock(s){
 const c=s.continuous,terminal=['complete','gameover'].includes(s.phase);
 const finalCycle=!c.ground&&s.period>=s.maxPeriods;
 const seconds=terminal?0:Math.max(0,Math.ceil((s.period*30-c.day-c.dayFraction)*c.secondsPerDay-1e-7));
 return {seconds,label:terminal?'RUN ENDED':finalCycle?'MISSION ENDS':'PAYDAY',
  time:`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`,
  amount:terminal||finalCycle?0:s.startingIncome,paused:s.phase==='playing'&&s.paused};
}

// A paused transition has no later active frame to refresh its controls.
export function needsCombatRefresh(before,after,sinceHud){
 return before.phase!==after.phase||before.paused!==after.paused||before.period!==after.period||before.continuous?.ground?.command?.lastImpact?.id!==after.continuous?.ground?.command?.lastImpact?.id||sinceHud>100;
}
