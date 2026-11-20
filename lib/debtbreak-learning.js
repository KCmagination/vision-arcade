// Observation only: never use these counters to authorize or settle money.
export function newCycleLearning(cycle, complete=true) {
 return {cycle,complete,playerPaid:0,totemPaid:0,reservePaid:0,missRefunds:0,unusedRefunds:0,cancelledReturns:0,deposits:0,wallSpend:0,conditionAdded:0,conditionLost:0,shieldLosses:0};
}
export function recordLearning(s,key,value) {
 const g=s.continuous?.ground;if(!g||!Number.isSafeInteger(value)||value<=0)return;
 // Old checkpoints cannot reconstruct events they never recorded.
 if(!g.learning||g.learning.cycle!==s.period)g.learning=newCycleLearning(s.period,false);
 g.learning[key]+=value;
}
