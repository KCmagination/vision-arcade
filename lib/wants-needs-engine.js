// Game tuning consumes approved corner strengths. Financial calculations stay on the server.
export const RUNNER_HEIGHT = 540;
export const RUNNER_GROUND = 448;
export const RUNNER_LENGTH = 3400;
export const RUNNER_GRAVITY = 1300;
export const RUNNER_ENEMY_COUNT = Math.ceil(11 * 1.5);
export const RUNNER_LEVELS = [
  { name: "Land Lord", line: "Time to pay the rent!", place: "RENT DISTRICT", color: "#ffc16e", hp: 20 },
  { name: "Car Magedon", line: "More maintenance!", place: "MAINTENANCE MILE", color: "#ff8e9d", hp: 24 },
  { name: "Mortgage Maniac", line: "Own your home!", place: "MORTGAGE HEIGHTS", color: "#b2a0ff", hp: 28 },
];
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const strength = n => Number.isFinite(n) ? clamp(n, 0, 1) : .5;
export function createRunnerLoadout(corners) {
  return { fireRate: 2 + strength(corners.cashFlow) * 6, shieldsMax: Math.round(strength(corners.capital) * 8),
    jumpVelocity: 460 + strength(corners.collateral) * 300, speed: 190 + strength(corners.credit) * 140,
    unknown: Object.keys(corners).filter(key => !Number.isFinite(corners[key])) };
}
export function createRunner(loadout, level = 1, score = 0, viewWidth = 960) {
  const index = clamp(level, 1, 3), config = RUNNER_LEVELS[index - 1];
  const platforms = [{ x: 660, y: 380, w: 130 }, { x: 1040, y: 380, w: 130 },
    { x: 1380, y: 306, w: 155 }, { x: 1770, y: 380, w: 140 }, { x: 2070, y: 302, w: 165 }];
  const enemies = Array.from({length: 11}, (_, i) => {
    const coffee = i % 2 === 0, hp = coffee ? 1 : 2;
    return { id: i, kind: coffee ? "coffee" : "burger", x: 550 + i * 185, y: RUNNER_GROUND,
      home: 550 + i * 185, w: coffee ? 36 : 48, h: coffee ? 48 : 40, hp, maxHp: hp,
      active: false, cooldown: 1.4 + (i % 3) * .5, flash: 0, tick: i * .7 };
  });
  // Keep the original wants, and include three Utilities and three planes in the 17-enemy total.
  for (const platform of [0, 1, 3]) {
    const p = platforms[platform], x = p.x+p.w+48;
    enemies.push({id: enemies.length, kind: "utility", x, y: RUNNER_GROUND, home: x,
      w: 42, h: 54, hp: 2, maxHp: 2, active: false, cooldown: 2.6, flash: 0, tick: 0, platform});
  }
  for (let i = 0; enemies.length < RUNNER_ENEMY_COUNT; i++) {
    const x = 850+i*650;
    enemies.push({id: enemies.length, kind: "plane", x, y: 142+i%2*36, home: x,
      w: 84, h: 34, hp: 2, maxHp: 2, active: false, cooldown: 1.5+i*.3, flash: 0, tick: i});
  }
  return { phase: "ready", level: index, score, levelStartScore: score, elapsed: 0, viewWidth,
    x: 120, y: RUNNER_GROUND, vy: 0, facing: 1, moving: false, grounded: true, jumpHeld: false,
    aim: 0, launchPlatform: null, powerups: [], boostsCollected: 0, rapidFire: 0,
    coyote: .1, jumpBuffer: 0, camera: 0, cooldown: 0, invulnerable: 0, lives: 5, shields: loadout.shieldsMax,
    shotsFired: 0, wantsCleared: 0, cause: "", platforms, enemies, shots: [], particles: [],
    boss: { x: 3190, y: RUNNER_GROUND, w: index === 2 ? 160 : 122, h: index === 3 ? 165 : index === 2 ? 92 : 140,
      hp: config.hp, maxHp: config.hp, active: false, tick: 0, cooldown: 1.4, volley: 0, flash: 0, warning: 0 } };
}
function burst(s, x, y, color) {
  for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2;
    s.particles.push({x, y, vx: Math.cos(a) * (65 + i * 7), vy: Math.sin(a) * (65 + i * 7), life: .4, color}); }
  if (s.particles.length > 160) s.particles.splice(0, s.particles.length - 160);
}
function damage(s) {
  if (s.invulnerable > 0 || s.phase !== "playing") return;
  const shielded = s.shields > 0;
  if (shielded) s.shields--; else s.lives--;
  s.invulnerable = 1;
  burst(s, s.x, s.y - 28, shielded ? "#69e3b2" : "#ff7488");
  if (s.lives <= 0) { s.phase = "failed"; s.cause = "Your shields and health ran out."; }
}
// Segment vs. expanded rectangle: bullets cannot tunnel through targets on slower devices.
function intersects(x0, y0, x1, y1, x, y, w, h) {
  let enter = 0, leave = 1;
  for (const [p, d, min, max] of [[x0, x1-x0, x-w/2-4, x+w/2+4], [y0, y1-y0, y-h-4, y+4]]) {
    if (Math.abs(d) < .00001) { if (p < min || p > max) return Infinity; }
    else { let a = (min-p)/d, b = (max-p)/d; if (a>b) [a,b]=[b,a]; enter=Math.max(enter,a); leave=Math.min(leave,b); if (enter>leave) return Infinity; }
  }
  return enter;
}
function hostileShot(s, x, y, vx, vy, kind = "expense") {
  s.shots.push({x, y, vx, vy, life: 5, enemy: true, kind});
}
function utilityBoost(s, utility) {
  const platform = utility.platform, p = s.platforms[platform], slot = utility.maxHp-utility.hp-1;
  s.powerups.push({x: p.x+p.w+40+slot*22, y: p.y-74-slot*20, platform});
  burst(s, utility.x, utility.y-30, "#69e3b2");
}
export function stepRunner(s, controls, loadout, seconds) {
  if (s.phase !== "playing") return;
  const dt = clamp(Number.isFinite(seconds) ? seconds : 0, 0, .04);
  if (!dt) return;
  s.elapsed += dt;
  s.invulnerable = Math.max(0, s.invulnerable-dt);
  s.cooldown -= dt;
  s.rapidFire = Math.max(0, s.rapidFire-dt);
  s.aim = controls.aim === 90 ? 90 : controls.aim === 45 ? 45 : 0;
  const move = clamp(controls.move || 0, -1, 1);
  s.moving = Math.abs(move) > .01;
  if (move) s.facing = move > 0 ? 1 : -1;
  const left = s.boss.active ? RUNNER_LENGTH-s.viewWidth+24 : 22;
  s.x = clamp(s.x+move*loadout.speed*dt, left, RUNNER_LENGTH-26);
  s.camera = s.boss.active ? RUNNER_LENGTH-s.viewWidth : clamp(s.x-s.viewWidth*.3, 0, RUNNER_LENGTH-s.viewWidth);
  if (s.grounded) s.coyote = .1; else s.coyote = Math.max(0,s.coyote-dt);
  if (controls.jump && !s.jumpHeld) s.jumpBuffer = .14; else s.jumpBuffer = Math.max(0,s.jumpBuffer-dt);
  s.jumpHeld = !!controls.jump;
  if (s.jumpBuffer > 0 && s.coyote > 0) {
    s.launchPlatform = s.platforms.findIndex(p => Math.abs(s.y-p.y)<1 && s.x+13>p.x && s.x-13<p.x+p.w);
    s.vy = -loadout.jumpVelocity; s.grounded = false; s.coyote = 0; s.jumpBuffer = 0;
    burst(s,s.x,s.y,"#ffc16e");
  }
  const oldFeet = s.y;
  s.vy += RUNNER_GRAVITY*dt; s.y += s.vy*dt; s.grounded = false;
  if (s.vy >= 0) {
    let floor = RUNNER_GROUND;
    for (const p of s.platforms) if (s.x+13 > p.x && s.x-13 < p.x+p.w && oldFeet <= p.y+1 && s.y >= p.y) floor = Math.min(floor,p.y);
    if (s.y >= floor) { s.y=floor; s.vy=0; s.grounded=true; s.launchPlatform=null; }
  }
  if (controls.fire && s.cooldown <= 0) {
    const angle = s.aim*Math.PI/180, dx = s.facing*Math.cos(angle), dy = -Math.sin(angle);
    s.shots.push({x:s.x+dx*27, y:s.y-32+dy*27, vx:dx*900, vy:dy*900, life:1.15, enemy:false, kind:"pulse"});
    s.cooldown = Math.max(s.cooldown,-dt)+1/(loadout.fireRate*(s.rapidFire>0 ? 1.5 : 1)); s.shotsFired++;
  } else if (!controls.fire) s.cooldown = Math.max(0,s.cooldown);
  for (const e of s.enemies) {
    e.flash = Math.max(0,e.flash-dt);
    if (Math.abs(e.x-s.x) < s.viewWidth*.9) e.active = true;
    if (!e.active) continue;
    e.tick += dt;
    const direction = s.x < e.x ? -1 : 1;
    if (e.kind === "plane") {
      e.x = e.home+Math.sin(e.tick*.85)*160;
      e.y = 142+(e.id%2)*36+Math.sin(e.tick*1.8)*10;
      if (e.x>s.camera+30 && e.x<s.camera+s.viewWidth-30) {
        e.cooldown -= dt;
        if (e.cooldown<=0) {
          hostileShot(s,e.x,e.y+10,Math.cos(e.tick*.85)*35,95,"adBomb");
          e.cooldown = 2.7-s.level*.2;
        }
      }
      if (Math.abs(e.x-s.x)<e.w/2+13 && s.y>e.y-e.h && s.y-52<e.y) damage(s);
      continue;
    }
    if (e.kind === "coffee") { e.x += direction*(35+s.level*7)*dt; e.y = RUNNER_GROUND; }
    else if (e.kind === "burger") { e.x += direction*(45+s.level*6)*dt; e.y = RUNNER_GROUND-Math.max(0,Math.sin(e.tick*2.3))*36; }
    if (Math.abs(e.x-s.x) < 680) {
      e.cooldown -= dt;
      if (e.cooldown <= 0) {
        hostileShot(s,e.x,e.y-26,direction*(185+s.level*14),0,e.kind);
        e.cooldown = (e.kind === "utility" ? 4.5 : e.kind === "coffee" ? 3 : 3.5)-s.level*.2;
      }
      if (Math.abs(e.x-s.x) < e.w/2+13 && s.y > e.y-e.h && s.y-52 < e.y) damage(s);
    }
  }
  const boss = s.boss;
  if (s.phase === "failed") return;
  boss.flash = Math.max(0,boss.flash-dt);
  if (!boss.active && s.x >= RUNNER_LENGTH-s.viewWidth+145) {
    boss.active = true; s.phase = "bossIntro"; s.shots=[]; s.enemies=[]; s.powerups=[];
    s.y=RUNNER_GROUND; s.vy=0; s.grounded=true; s.camera=RUNNER_LENGTH-s.viewWidth;
    return;
  }
  if (boss.active) {
    boss.tick += dt; boss.cooldown -= dt;
    boss.warning = boss.cooldown < .55 ? .55-boss.cooldown : 0;
    if (s.level === 2) boss.x=3150+Math.sin(boss.tick*.85)*72;
    if (boss.cooldown <= 0) {
      const sign = s.x < boss.x ? -1 : 1, x = boss.x+sign*(boss.w/2+8);
      if (s.level === 1) hostileShot(s,x,RUNNER_GROUND-(boss.volley%3===2 ? 91 : 25),sign*240,0,"key");
      if (s.level === 2) {
        hostileShot(s,x,RUNNER_GROUND-25,sign*280,0,"bolt");
        if (boss.volley%2) hostileShot(s,x,RUNNER_GROUND-104,sign*230,0,"bolt");
      }
      if (s.level === 3) {
        const aimY = s.y-26, y = RUNNER_GROUND-108, distance = Math.max(150,Math.abs(s.x-x));
        hostileShot(s,x,y,sign*245,clamp((aimY-y)/distance*245,-120,120),"mortgage");
        if (boss.volley%3===2) hostileShot(s,x,RUNNER_GROUND-18,sign*300,0,"mortgage");
      }
      boss.volley++; boss.cooldown = s.level === 1 ? 1.35 : s.level === 2 ? 1.65 : 1.45;
    }
    if (Math.abs(s.x-boss.x) < boss.w/2+13 && s.y>boss.y-boss.h && s.y-52<boss.y) damage(s);
  }
  for (const b of s.shots) {
    if (b.life<=0) continue;
    if (b.kind==="adBomb") b.vy+=260*dt;
    const oldX=b.x, oldY=b.y; b.x+=b.vx*dt; b.y+=b.vy*dt; b.life-=dt;
    if (b.enemy) {
      if (intersects(oldX,oldY,b.x,b.y,s.x,s.y,27,52)!==Infinity) { b.life=0; damage(s); }
    } else {
      let target=null, nearest=Infinity;
      for (const e of s.enemies) if (e.hp>0) {
        const t=intersects(oldX,oldY,b.x,b.y,e.x,e.y,e.w,e.h);
        if (t<nearest) { target=e; nearest=t; }
      }
      // Upward shots can intercept the falling advertisements as well as their planes.
      for (const bomb of s.shots) if (bomb.kind==="adBomb" && bomb.life>0) {
        const t=intersects(oldX,oldY,b.x,b.y,bomb.x,bomb.y+13,28,26);
        if (t<nearest) { target=bomb; nearest=t; }
      }
      if (boss.active && boss.hp>0) {
        const t=intersects(oldX,oldY,b.x,b.y,boss.x,boss.y,boss.w,boss.h);
        if (t<nearest) target=boss;
      }
      if (target) {
        b.life=0;
        if (target.kind==="adBomb") {
          target.life=0; s.score+=10; burst(s,target.x,target.y,"#ff8e9d"); continue;
        }
        target.hp--; target.flash=.12;
        if (target.kind==="utility") utilityBoost(s,target);
        burst(s,b.x,b.y,target===boss ? RUNNER_LEVELS[s.level-1].color : "#64e1f5");
        if (!target.hp && target!==boss) { s.wantsCleared++; s.score+=target.kind==="plane" ? 75 : target.kind==="coffee" ? 25 : 40; }
      }
    }
    if (b.kind==="adBomb" && b.life>0 && b.y>=RUNNER_GROUND-9) {
      b.life=0; burst(s,b.x,RUNNER_GROUND-8,"#ff8e9d");
      if (Math.abs(b.x-s.x)<48 && s.y>RUNNER_GROUND-60) damage(s);
    }
    if (s.phase === "failed") break;
  }
  if (s.phase==="playing") s.powerups=s.powerups.filter(p=>{
    if (!s.grounded && s.launchPlatform===p.platform && Math.abs(s.x-p.x)<25 && p.y>s.y-65 && p.y<s.y+12) {
      s.rapidFire=Math.min(12,s.rapidFire+6); s.boostsCollected++; s.score+=50;
      burst(s,p.x,p.y,"#69e3b2"); return false;
    }
    return p.x>s.camera-220;
  });
  s.enemies=s.enemies.filter(e=>e.hp>0 && e.x>s.camera-220);
  s.shots=s.shots.filter(b=>b.life>0 && b.x>s.camera-100 && b.x<s.camera+s.viewWidth+150 && b.y>-80 && b.y<RUNNER_HEIGHT+20);
  for (const p of s.particles) { p.x+=p.vx*dt; p.y+=p.vy*dt; p.life-=dt; }
  s.particles=s.particles.filter(p=>p.life>0);
  if (boss.hp<=0 && s.phase==="playing") { s.score+=s.level*500; s.shots=[]; s.phase=s.level===3 ? "complete" : "levelClear"; }
}
