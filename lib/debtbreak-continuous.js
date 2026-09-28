// Continuous Debtbreak game ledger. Independent of the private calculator.
// Integer cents; simple 30/360 daily interest uses an exact BigInt remainder.
const DEN = 3600000n;
export const DAY_SECONDS = { standard:2, relaxed:3, pressure:1.5 };
export const MAX_ACTIVE_WANTS = 8;
export const RESCUE_SECONDS = 10;
export const EXPANSION_COST = 15000;
export const EXPANSION_CONDITION = 25;
export const MAX_EXPANSIONS = 7;
const copy = s => structuredClone(s);
const sum = xs => xs.reduce((a,b)=>a+b,0);
const amount = n => Number.isSafeInteger(n) && n >= 0;
const wallet = source => source === 'reserve' ? 'reserves' : 'incomeWallet';
const money = n => `$${(n/100).toFixed(n%100?2:0)}`;
export const accountDebt = a => a.method==='payments' ? null : a.principal+a.interest+a.fees;
const payoff = a => accountDebt(a)+Number(BigInt(a.remainder)*2n>=DEN);
const obligations = s => s.threats.filter(t=>t.lane!=='reserve'&&t.lane!=='want');
const claims = (s,id) => obligations(s).filter(t=>t.accountId===id&&t.kind==='debt');
export const heldMoney = s => sum(Object.values(s.continuous.holds).map(h=>h.amount));
export function continuousOutflow(s) {
  return sum(s.continuous.living.map(e=>e.amount))+sum(s.continuous.accounts.map(a=>a.otherPayment+(a.method==='payments'||payoff(a)>0?a.payment:0)));
}
export function basePlan(s) {
  const c=s.continuous,base=c.base;
  const goal=continuousOutflow(s)*(base?.goalMonths??3);
  const committed=sum(obligations(s).map(t=>Math.min(t.remaining,sum(Object.values(c.holds).filter(h=>h.targetId===t.id).map(h=>h.amount)))));
  const uncovered=Math.max(0,sum(obligations(s).map(t=>t.remaining))-committed-Math.max(0,s.incomeWallet));
  const surplus=Math.max(0,s.reserves-goal-uncovered);
  return {goal,uncovered,surplus,cost:EXPANSION_COST,canExpand:!!base&&base.expansions<MAX_EXPANSIONS&&surplus>=EXPANSION_COST};
}
function log(s,text,type='transaction',value=0) {
  s.notice=text;
  s.continuous.log.push({id:++s.continuous.serial,day:s.continuous.day,type,text,amount:value});
}
function makeAccount(a,fictional=false) {
  const method=fictional?'daily-v1':a.modeled?(a.method??'monthly-v1'):'payments';
  return {id:a.id,name:a.name,type:a.type??'other',method,principal:a.balance,opening:a.balance,interest:a.interestCarry??0,fees:0,remainder:'0',
    rateBps:a.rate===null?null:Math.round(a.rate*100),payment:Math.max(0,a.payment-(a.otherPayment??0)),otherPayment:a.otherPayment??0,
    dueDay:a.dueDay??20,feeDelay:a.feeDelayDays??0,lateFee:fictional?2500:(a.lateFeeCents??null),timingKnown:!!a.dueDay,
    interestPosted:0,feesPosted:0,paid:0,principalPaid:0,unbilledFees:0,lateHistory:false,payoffDay:null};
}
export function enableContinuous(input,options={}) {
  const s=copy(input),fictional=!!options.fictional;
  const details=s.hangar?.details;
  const accounts=details&&!details.issues.length?details.accounts.map(a=>makeAccount(a)):s.hangar?[makeAccount({id:'unspecified',name:'Unspecified debt',balance:s.hangar.totalDebt,payment:s.hangar.monthlyDebtPayments,rate:null,modeled:false})]:s.debts.map(a=>makeAccount({...a,rate:a.apr,otherPayment:0},true));
  const living=details&&!details.issues.length?copy(details.expenses):[{id:'living',name:fictional?'Living costs + utilities':'Unspecified living costs',amount:s.baseLiving+sum(s.defenses.map(d=>d.upkeep))}];
  s.continuous={version:1,issues:[],day:0,dayFraction:0,secondsPerDay:DAY_SECONDS[options.pace]??2,fictional,accounts,living,holds:{},serial:0,processed:[],log:[],cyclePlan:{},cycleAdjustment:{},summaries:[],autoProtect:true,wantsEnabled:true,wantSerial:0,nextWantDay:0,wantRush:false,offers:[],enjoyment:0,purchases:0,livingPaid:0,debtPaid:0,repairPaid:0,banner:'',bannerUntil:0,repairSerial:0,lastRepair:null,rescue:null};
  s.threats=[];s.arrears=0;s.elapsed=0;s.history=[];s.review=null;s.period=1;s.incomeReceived=s.startingIncome;
  s.continuous.base={goalMonths:[1,3,6].includes(options.goalMonths)?options.goalMonths:3,expansions:0,spent:0};
  s.defenses=s.defenses.map(d=>({...d,maxCondition:s.hangar?.loadout.assetsMax??100}));
  const values=[s.startingIncome,s.reserves,...living.map(e=>e.amount),...accounts.flatMap(a=>[a.principal,a.payment,a.otherPayment,a.lateFee??0])];
  // Bound the entire four-cycle mission well below the safe-integer limit.
  if(values.some(v=>!Number.isSafeInteger(v)||Math.abs(v)>1e12))s.continuous.issues.push('Amounts exceed the supported game range of $10 billion per input. Reduce them or use the fictional example.');
  issueCycle(s);refreshContinuous(s);return s;
}
function addBill(s,id,label,value,lane,accountId,kind,dueDay,fee=null,feeDelay=0) {
  if(!value||s.threats.some(t=>t.id===id))return;
  s.threats.push({id,label,lane,accountId,kind,original:value,remaining:value,progress:5,speed:0,eligible:lane==='credit',intercepted:false,overdue:false,impacted:false,paidAt:null,incomePaid:0,reservePaid:0,cycle:s.period,issuedDay:(s.period-1)*30,dueDay,lateFee:fee,feeDelay,feeApplied:false,late30:false,lastAttack:null,adjustment:0});
}
function issueCycle(s) {
  const c=s.continuous,offset=(s.period-1)*30;
  for(const e of c.living)addBill(s,`living:${e.id}:${s.period}`,e.name,e.amount,'living',e.id,'living',offset+20);
  for(const a of c.accounts){
    if(a.method==='monthly-v1'&&a.principal>0){const n=Math.round(a.principal*a.rateBps/120000);a.interest+=n;a.interestPosted+=n;s.totals.interest+=n;log(s,`${a.name}: ${money(n)} monthly estimate posted.`,'interest',n);}
    addBill(s,`cost:${a.id}:${s.period}`,`${a.name} · taxes / other costs`,a.otherPayment,'living',a.id,'cost',offset+a.dueDay);
    const already=sum(claims(s,a.id).map(t=>t.remaining));
    const due=a.method==='payments'?a.payment:Math.min(a.payment+a.unbilledFees,Math.max(0,accountDebt(a)-already));
    a.unbilledFees=0;
    addBill(s,`debt:${a.id}:${s.period}`,a.name,due,'credit',a.id,'debt',offset+a.dueDay,a.lateFee,a.feeDelay);
  }
  s.threats=s.threats.filter(t=>t.lane!=='reserve');
  s.threats.push({id:`reserve:${s.period}`,label:'Reserve deposit',lane:'reserve',original:0,remaining:0,progress:0,speed:0,eligible:false,impacted:false,overdue:false,intercepted:false,incomePaid:0,reservePaid:0,paidAt:null,cycle:s.period});
  c.cyclePlan[s.period]=sum(obligations(s).filter(t=>t.cycle===s.period).map(t=>t.original));c.cycleAdjustment[s.period]=0;
  s.selectedId=obligations(s).find(t=>t.remaining>0)?.id??s.threats.find(t=>t.lane==='reserve')?.id;
}
function spawnWants(s) {
  const c=s.continuous;
  if((s.paused&&s.phase!=='briefing')||!['briefing','playing'].includes(s.phase)||c.day>=120)return;
  const rush=!obligations(s).some(t=>t.remaining>0);
  if(rush&&!c.wantRush)c.nextWantDay=Math.min(c.nextWantDay,c.day);
  c.wantRush=rush;
  if(c.day<c.nextWantDay)return;
  const live=c.offers.filter(o=>['flying','offered'].includes(o.status)).length;
  const count=Math.min(rush?3:1,MAX_ACTIVE_WANTS-live);
  const examples=[['Extra phone upgrade',8000,3],['Extra concert ticket',4000,2],['Extra headset upgrade',3000,2],['Extra family treat outing',2500,2],['Extra game purchase',2000,2],['Extra streaming subscription this cycle',1500,1]];
  for(let n=0;n<count;n++){
    const serial=++c.wantSerial,seed=(Math.imul(serial,1664525)+1013904223)>>>0;
    const [label,cost,reward]=examples[seed%examples.length];
    const arrivalDay=c.day+2+seed%2;
    c.offers.push({id:`want:${serial}`,label,cost,reward,spawnDay:c.day,arrivalDay,expiryDay:arrivalDay+5,status:'flying',source:null,drift:seed%997});
  }
  // More temptation once bills are covered, without adding financial obligations.
  c.nextWantDay=c.day+(rush?2:3);
}
export function refreshContinuous(s) {
  const c=s.continuous;
  resolveRescue(s);
  s.arrears=sum(obligations(s).filter(t=>t.remaining>0&&c.day>t.dueDay).map(t=>t.remaining));
  for(const t of obligations(s)){
    t.overdue=t.remaining>0&&c.day>t.dueDay;t.wasOverdue=!!t.wasOverdue||t.overdue;
    t.progress=t.impacted?100:Math.min(100,5+95*Math.max(0,(c.day+c.dayFraction-t.issuedDay)/(t.dueDay+3-t.issuedDay)));
  }
  for(const o of c.offers){
    if(o.status==='waiting'&&c.day>=o.spawnDay)o.status='flying';
    if(o.status==='flying'&&c.day>=o.arrivalDay)o.status='offered';
    if(['flying','offered'].includes(o.status)&&c.day>=o.expiryDay)o.status='declined';
  }
  spawnWants(s);
  // Resolved offers cannot be bought again; keep bounded recent history for replay.
  c.offers=c.offers.filter((o,i)=>['flying','offered'].includes(o.status)||i>=c.offers.length-24);
  s.threats=s.threats.filter(t=>t.lane!=='want');
  for(const o of c.offers.filter(o=>o.status==='flying'||o.status==='offered'))s.threats.push({id:o.id,label:o.label,lane:'want',kind:'want',original:o.cost,remaining:o.cost,progress:Math.min(100,100*(c.day+c.dayFraction-o.spawnDay)/(o.arrivalDay-o.spawnDay)),drift:o.drift,speed:0,eligible:false,intercepted:false,overdue:false,impacted:false,paidAt:null,incomePaid:0,reservePaid:0,cycle:s.period});
  return s;
}
function applyAccount(s,a,requested,source) {
  const oldDebt=accountDebt(a),paid=a.method==='payments'?requested:Math.min(requested,payoff(a));
  if(!paid)return 0;
  let left=paid;
  if(a.method!=='payments'){
    let p=Math.min(left,a.fees);a.fees-=p;a.unbilledFees=Math.max(0,a.unbilledFees-p);left-=p;
    p=Math.min(left,a.interest);a.interest-=p;left-=p;
    p=Math.min(left,a.principal);a.principal-=p;left-=p;a.principalPaid+=p;s.totals.principalPaid+=p;
    if(a.principal===0&&BigInt(a.remainder)){
      const tail=Number(BigInt(a.remainder)*2n>=DEN);a.interest+=tail;a.interestPosted+=tail;s.totals.interest+=tail;a.remainder='0';
    }
    p=Math.min(left,a.interest);a.interest-=p;left-=p;
    if(left)throw Error('Unapplied account payment');
  }
  a.paid+=paid;s.continuous.debtPaid+=paid;
  let credit=paid;
  for(const t of claims(s,a.id).sort((a,b)=>a.dueDay-b.dueDay||a.id.localeCompare(b.id))){
    const x=Math.min(credit,t.remaining);t.remaining-=x;credit-=x;t[source==='reserve'?'reservePaid':'incomePaid']+=x;if(!t.remaining)t.paidAt=s.elapsed;
  }
  if(a.method!=='payments'&&accountDebt(a)===0&&oldDebt>0){
    a.payoffDay=s.continuous.day;log(s,`${a.name} paid off in the model. Linked costs continue.`,'payoff');
    for(const t of claims(s,a.id)){t.adjustment+=t.remaining;s.continuous.cycleAdjustment[t.cycle]+=t.remaining;t.remaining=0;}
  }
  return paid;
}
function settleValue(s,targetId,requested,source) {
  const t=s.threats.find(t=>t.id===targetId);if(!t||t.lane==='want')return 0;
  if(t.lane==='reserve'){
    if(source!=='income')return 0;s.reserves+=requested;s.totals.reserveDeposited+=requested;s.totals.incomeSpent+=requested;t.incomePaid+=requested;return requested;
  }
  let paid=0;
  const x=Math.min(requested,t.remaining);
  if(t.kind==='debt'){
    const a=s.continuous.accounts.find(a=>a.id===t.accountId);
    // A combined payment covers issued linked costs before its debt component.
    let available=x;
    for(const cost of obligations(s).filter(b=>b.kind==='cost'&&b.accountId===a.id&&b.dueDay<=t.dueDay&&b.remaining>0).sort((a,b)=>a.dueDay-b.dueDay)){
      const p=Math.min(available,cost.remaining);cost.remaining-=p;cost[source==='reserve'?'reservePaid':'incomePaid']+=p;available-=p;paid+=p;s.continuous.livingPaid+=p;
      if(!cost.remaining)cost.paidAt=s.elapsed;if(!available)break;
    }
    paid+=applyAccount(s,a,available,source);
  }else{paid=x;t.remaining-=paid;t[source==='reserve'?'reservePaid':'incomePaid']+=paid;s.continuous.livingPaid+=paid;if(!t.remaining)t.paidAt=s.elapsed;}
  s.totals[source==='reserve'?'reserveSpent':'incomeSpent']+=paid;return paid;
}
function refundAll(s) {for(const id of Object.keys(s.continuous.holds))finishHoldMutable(s,id,null);}
function finishHoldMutable(s,id,targetId) {
  const h=s.continuous.holds[id];if(!h)return 0;delete s.continuous.holds[id];
  const paid=targetId?settleValue(s,targetId,h.amount,h.source):0;
  s[wallet(h.source)]+=h.amount-paid;
  resolveRescue(s);
  return paid;
}
export function holdShot(input,id,source='auto',requested=2500,targetId=null) {
  const s=copy(input);if(s.phase!=='playing'||s.paused||s.continuous.holds[id]||!amount(requested)||!['auto','income','reserve'].includes(source))return s;
  const chosen=source==='auto'?(s.incomeWallet>0?'income':'reserve'):source;
  if(chosen==='reserve'&&s.threats.some(t=>t.id===targetId&&t.lane==='reserve')){
    s.notice='Reserve tank accepts income only. Aim at a bill or Want-bot.';return s;
  }
  const value=Math.min(requested,Math.max(0,s[wallet(chosen)]));if(!value)return s;
  s[wallet(chosen)]-=value;s.continuous.holds[id]={source:chosen,amount:value,targetId};
  return s;
}
export function finishShot(input,id,targetId=null) {
  const s=copy(input),t=s.threats.find(t=>t.id===targetId);
  if(t?.lane==='want'){const offer=s.continuous.offers.find(o=>o.id===targetId);if(offer)offer.status='declined';}
  const paid=finishHoldMutable(s,id,targetId);
  if(paid)log(s,`${money(paid)} ${t?.lane==='reserve'?'deposited to reserves':`paid toward ${t?.label}`}.`,'payment',paid);
  return refreshContinuous(s);
}
// All explicit actions go through this reducer, including actions during pause.
export function continuousAction(input,action) {
  const s=copy(input),c=s.continuous;if(s.phase!=='playing')return s;
  if(action.id&&c.processed.includes(action.id))return s;
  if(action.id)c.processed.push(action.id);
  const source=action.source??'reserve';if(!['income','reserve'].includes(source))return s;
  const key=wallet(source),available=Math.max(0,s[key]);
  if(action.type==='protect'){c.autoProtect=!!action.enabled;return s;}
  if(action.type==='reject'){
    const o=c.offers.find(o=>o.id===action.offerId);if(o&&['flying','offered'].includes(o.status)){o.status='declined';log(s,`${o.label} declined — no charge.`,'want');}
  }else if(action.type==='buy'){
    const o=c.offers.find(o=>o.id===action.offerId);
    if(o&&['flying','offered'].includes(o.status)&&available>=o.cost){s[key]-=o.cost;c.purchases+=o.cost;c.enjoyment+=o.reward;o.status='bought';o.source=source;log(s,`${o.label}: ${money(o.cost)} from ${source}; +${o.reward} enjoyment.`,'purchase',o.cost);}
    else log(s,'Purchase needs enough available funds in the selected wallet.');
  }else if(action.type==='expand'){
    if(source==='reserve'&&basePlan(s).canExpand){
      s.reserves-=EXPANSION_COST;c.base.spent+=EXPANSION_COST;c.base.expansions++;
      s.cashActivity.equipment+=EXPANSION_COST;s.totals.equipment+=EXPANSION_COST;
      s.defenses.push({id:`expansion:${c.base.expansions}`,name:`Lifestyle wall ${c.base.expansions}`,tier:1,owned:true,condition:EXPANSION_CONDITION,maxCondition:EXPANSION_CONDITION,baseValue:0,upkeep:0,securedBalance:0});
      log(s,`Wall expanded for ${money(EXPANSION_COST)} from surplus reserves. +${EXPANSION_CONDITION} condition; ${c.base.expansions}/${MAX_EXPANSIONS} lifestyle segments built.`,'expansion',EXPANSION_COST);
    }else log(s,'Expansion needs surplus reserves after the reserve goal and uncovered bills, with fewer than seven added segments.');
  }else if(action.type==='repair'){
    const d=s.defenses.find(d=>d.id===action.defenseId)??s.defenses.find(d=>d.owned&&d.condition<d.maxCondition);
    const points=d?.owned&&amount(action.points??10)?Math.min(action.points??10,d.maxCondition-d.condition,Math.floor(available/1000)):0;
    if(points>0){const cost=points*1000;s[key]-=cost;d.condition+=points;c.repairPaid+=cost;s.totals.repair+=cost;s.cashActivity[source==='income'?'incomeRepairs':'reserveRepairs']+=cost;c.lastRepair={serial:++c.repairSerial,defenseId:d.id,points,source};log(s,`Repair +${points} condition for ${money(cost)} from ${source}.`,'repair',cost);}
    else log(s,'No affordable repair is needed or available.');
  }else if(action.type==='deposit'&&amount(action.amount)){
    const x=Math.min(s.incomeWallet,action.amount);s.incomeWallet-=x;s.reserves+=x;s.totals.reserveDeposited+=x;s.totals.incomeSpent+=x;log(s,`${money(x)} moved from income to reserves.`,'deposit',x);
  }else if(action.type==='pay'&&amount(action.amount)){
    const x=settleValue(s,action.targetId,Math.min(action.amount,available),source);s[key]-=x;log(s,`${money(x)} paid from ${source}.`,'payment',x);
  }else if(action.type==='extra'&&amount(action.amount)){
    const a=c.accounts.find(a=>a.id===action.accountId);
    if(a&&a.method!=='payments'&&!obligations(s).some(t=>t.accountId===a.id&&t.remaining>0)){
      const x=applyAccount(s,a,Math.min(available,action.amount),source);s[key]-=x;s.totals[source==='reserve'?'reserveSpent':'incomeSpent']+=x;log(s,`${money(x)} extra paid to ${a.name}.`,'payment',x);
    }else log(s,'Cover this account’s issued requirements before paying extra.');
  }
  return refreshContinuous(s);
}
function autoPay(s,t) {
  const x=settleValue(s,t.id,Math.max(0,s.reserves),'reserve');s.reserves-=x;
  if(x)log(s,`Reserve protection paid ${money(x)} toward ${t.label}.`,'protection',x);
  resolveRescue(s);
}
function resolveRescue(s) {
  const c=s.continuous;
  if(s.phase==='playing'&&c.rescue&&(s.defenses.some(d=>d.owned&&d.condition>0)||!s.threats.find(t=>t.id===c.rescue.targetId)?.remaining)){
    c.rescue=null;log(s,'Rescue complete. Defense restored or the breaching obligation covered.','rescue');
    completeIfReady(s);
  }
}
function completeIfReady(s) {
  if(s.phase==='playing'&&s.continuous.summaries.length===s.maxPeriods&&!s.continuous.rescue){
    s.phase='complete';s.paused=true;refundAll(s);log(s,'Four cycles survived. Review unpaid obligations and remaining debt.','complete');
  }
}
function failDefense(s,reason) {
  s.phase='gameover';s.paused=true;s.gameOverReason=reason;s.continuous.rescue=null;refundAll(s);log(s,reason,'defeat');
}
function rescuePayment(s,t) {
  if(t.kind!=='debt')return t.remaining;
  // Payments first cover linked costs and older claims on the same account.
  const ordered=claims(s,t.accountId).sort((a,b)=>a.dueDay-b.dueDay||a.id.localeCompare(b.id));
  return sum(ordered.slice(0,ordered.findIndex(b=>b.id===t.id)+1).map(b=>b.remaining))+
    sum(obligations(s).filter(b=>b.kind==='cost'&&b.accountId===t.accountId&&b.dueDay<=t.dueDay).map(b=>b.remaining));
}
function breach(s,t,day) {
  // Resolve committed payments for this identified claim before judging failure.
  for(const [id,h] of Object.entries(s.continuous.holds))if(h.targetId===t.id)finishHoldMutable(s,id,t.id);
  if(s.continuous.autoProtect)autoPay(s,t);
  if(!t.remaining)return;
  t.impacted=true;t.lastAttack=day;
  const d=s.defenses.find(d=>d.owned&&d.condition>0),damage=Math.min(35,Math.max(4,Math.ceil(t.remaining/15000)*3));
  let loss=0;if(d){loss=Math.min(d.condition,damage);d.condition-=loss;s.totals.damage+=loss;}
  log(s,`${t.label} breached with ${money(t.remaining)} unpaid. ${d?`Defense lost ${loss} condition.`:'No functioning defense.'}`,'breach');
  if(!s.defenses.some(d=>d.owned&&d.condition>0)){
    const reason=`${t.label} breached with ${money(t.remaining)} unpaid.`;
    if(s.continuous.rescue){failDefense(s,`${reason} Another unprotected breach arrived before rescue was completed.`);return;}
    const funds=s.incomeWallet+Math.max(0,s.reserves);
    const canRepair=Math.max(s.incomeWallet,s.reserves)>=1000&&s.defenses.some(d=>d.owned&&d.maxCondition>0);
    if(funds>=rescuePayment(s,t)||canRepair){
      s.continuous.rescue={targetId:t.id,label:t.label,remainingSeconds:RESCUE_SECONDS};
      log(s,`Final defense down: ${RESCUE_SECONDS} active seconds to repair or cover ${t.label}. Another unprotected breach ends the mission.`,'rescue');
    }else failDefense(s,`${reason} Defense condition reached zero; available funds cannot repair or cover this breach.`);
  }
}
function closeDay(s,day) {
  const c=s.continuous;c.day=day;let dailyInterest=0;
  for(const a of c.accounts){
    if(a.method==='daily-v1'&&a.principal>0){const numerator=BigInt(a.remainder)+BigInt(a.principal)*BigInt(a.rateBps),posted=Number(numerator/DEN);a.remainder=String(numerator%DEN);a.interest+=posted;a.interestPosted+=posted;s.totals.interest+=posted;dailyInterest+=posted;}
    for(const t of claims(s,a.id)){
      if(t.remaining>0&&day>t.dueDay+t.feeDelay&&!t.feeApplied){
        t.feeApplied=true;if(a.method!=='payments'&&t.lateFee!==null){a.fees+=t.lateFee;a.feesPosted+=t.lateFee;a.unbilledFees+=t.lateFee;log(s,`${a.name}: ${money(t.lateFee)} fee for missed day ${t.dueDay} requirement.`,'fee',t.lateFee);}
      }
      if(t.remaining>0&&day>=t.dueDay+30){t.late30=true;a.lateHistory=true;}
    }
  }
  if(dailyInterest)log(s,`${money(dailyInterest)} daily game interest added across modeled accounts.`,'interest',dailyInterest);
  for(const t of obligations(s).filter(t=>t.remaining>0).sort((a,b)=>a.dueDay-b.dueDay||a.id.localeCompare(b.id))){
    if(!t.intercepted&&day>=t.dueDay-1){t.intercepted=true;if(c.autoProtect)autoPay(s,t);}
    if(t.remaining>0&&day>=t.dueDay+3&&(!t.impacted||day>=t.lastAttack+5))breach(s,t,day);
    if(s.phase!=='playing')break;
  }
  refreshContinuous(s);
  if(day%30===0&&s.phase==='playing'){
    const rows=obligations(s).filter(t=>t.cycle===s.period),planned=c.cyclePlan[s.period],adjustment=c.cycleAdjustment[s.period];
    const summary={cycle:s.period,planned,adjustment,paid:sum(rows.map(t=>t.incomePaid+t.reservePaid)),unpaid:sum(rows.map(t=>t.remaining)),income:s.incomeWallet,reserves:s.reserves,day,onTime:rows.every(t=>t.remaining===0&&!t.wasOverdue)};
    c.summaries.push(summary);
    if(s.period===s.maxPeriods)completeIfReady(s);
    else {s.period++;s.carriedIncome=s.incomeWallet;s.incomeWallet+=s.startingIncome;s.incomeReceived+=s.startingIncome;s.openingIncome=s.incomeWallet;s.periodStartReserves=s.reserves;issueCycle(s);c.banner=`Cycle ${s.period} — ${money(s.startingIncome)} income received · ${money(s.arrears)} overdue`;c.bannerUntil=day+3;log(s,c.banner,'payday',s.startingIncome);}
  }
}
export function tickContinuous(input,seconds) {
  if(input.phase!=='playing'||input.paused||!Number.isFinite(seconds)||seconds<=0)return input;
  const s=copy(input),c=s.continuous;
  let left=seconds;
  // Visit each day boundary and rescue deadline in order, even during bulk replays.
  // Inclusive due date: timestamped actions have already settled before closeDay.
  while(left>1e-9&&s.phase==='playing'){
    const toDay=c.day<30*s.maxPeriods?(1-c.dayFraction)*c.secondsPerDay:Infinity;
    const toRescue=c.rescue?.remainingSeconds??Infinity;
    const delta=Math.min(left,toDay,toRescue);
    if(!Number.isFinite(delta))break;
    s.elapsed+=delta;left-=delta;
    if(c.day<30*s.maxPeriods)c.dayFraction+=delta/c.secondsPerDay;
    if(c.rescue){
      c.rescue.remainingSeconds=Math.max(0,c.rescue.remainingSeconds-delta);
      if(c.rescue.remainingSeconds<=1e-9){failDefense(s,`Rescue expired for ${c.rescue.label}. No defense was repaired and the breaching obligation remains unpaid.`);break;}
    }
    if(c.dayFraction>=1-1e-9){c.dayFraction=0;closeDay(s,c.day+1);}
  }
  if(s.phase!=='playing')c.dayFraction=0;
  return refreshContinuous(s);
}
export function continuousSummary(s) {
  const c=s.continuous,held=heldMoney(s),expansions=c.base?.spent??0,spent=c.livingPaid+c.debtPaid+c.repairPaid+c.purchases+expansions;
  return {held,spent,livingPaid:c.livingPaid,debtPaid:c.debtPaid,repairs:c.repairPaid,purchases:c.purchases,expansions,enjoyment:c.enjoyment,
    cashDifference:s.initialReserves+s.incomeReceived-s.incomeWallet-s.reserves-held-spent,
    unpaid:sum(obligations(s).map(t=>t.remaining)),debt:sum(c.accounts.filter(a=>a.method!=='payments').map(a=>accountDebt(a))),
    planned:c.cyclePlan[s.period],adjustment:c.cycleAdjustment[s.period],paid:sum(obligations(s).filter(t=>t.cycle===s.period).map(t=>t.incomePaid+t.reservePaid))};
}
export function checkContinuous(s) {
  if(continuousSummary(s).cashDifference!==0)throw Error('Cash does not reconcile');
  for(const n of [s.incomeWallet,s.reserves,s.incomeReceived,...Object.values(s.continuous.holds).map(h=>h.amount)])if(!Number.isSafeInteger(n))throw Error('Unsafe money');
  for(const a of s.continuous.accounts.filter(a=>a.method!=='payments')){
    if(accountDebt(a)!==a.opening+a.interestPosted+a.feesPosted-a.paid)throw Error(`Debt does not reconcile: ${a.id}`);
    if(sum(claims(s,a.id).map(t=>t.remaining))>accountDebt(a))throw Error('Requirements overlap');
    if([a.principal,a.interest,a.fees].some(n=>!amount(n)))throw Error('Invalid liability');
  }
  return true;
}
