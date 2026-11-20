import {migrateGrid,packetTarget} from './debtbreak-command-grid.js';
import {checkContinuous} from './debtbreak-continuous.js';
export const GROUND_SAVE_KEY='vision:debtbreak:ground-run:v1';
export function serializeGroundRun(world){
 if(!world.ground||!world.ledger.continuous?.ground||world.ledger.phase!=='playing')throw Error('Only an active Ground Defense run can be saved.');
 checkContinuous(world.ledger);
 const copy=structuredClone(world);copy.ledger.paused=true;copy.triggers={};copy.pendingShot=false;copy.firing=false;copy.autoFire=false;
 const text=JSON.stringify({version:1,savedAt:new Date().toISOString(),world:copy});
 if(text.length>4000000)throw Error('This run is too large for a local checkpoint. End and review it.');
 return text;
}
export function parseGroundRun(text){
 if(typeof text!=='string'||text.length>4000000)throw Error('No compatible local checkpoint.');
 const save=JSON.parse(text),w=save.world;
 if(save.version!==1||!w?.ground||w.ledger?.continuous?.ground?.version!==1||w.ledger.phase!=='playing'||!Number.isSafeInteger(w.ledger.period)||w.ledger.period<1||!Number.isFinite(w.time)||w.time<0||!Array.isArray(w.drones)||w.drones.length>60||w.ground.blasts?.length>8||w.ground.projectiles?.length>8)throw Error('This checkpoint is incompatible. Start a fresh run.');
 if(w.ledger.continuous.ground.command?.version===1){
  migrateGrid(w.ledger.continuous.ground.command);
  for(const d of w.drones){d.targetAssetId??=packetTarget(d);d.routeProgress=Math.max(0,Math.min(1,((d.z??85)-85)/695));d.lane=(d.lane??0)%2;}
 }
 checkContinuous(w.ledger);w.ledger.paused=true;w.triggers={};w.pendingShot=false;w.firing=false;w.autoFire=false;return w;
}
