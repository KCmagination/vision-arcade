// Small original synthesized cues; no downloads, service calls, or autoplay.
export class DebtbreakerAudio {
  context:AudioContext|null=null;
  enabled=true;
  unlock(){
    if(!this.enabled)return;
    try {this.context??=new AudioContext();void this.context.resume().catch(()=>{});}catch{/* Silent fallback is playable. */}
  }
  play(type:string){
    const ctx=this.context;if(!this.enabled||!ctx||ctx.state!=="running")return;
    const notes:Record<string,[number,number,number]>={shot:[190,70,.07],hit:[350,120,.1],deposit:[650,1100,.2],clear:[420,840,.23],intercept:[180,620,.2],warning:[720,480,.2],breach:[90,30,.3],checkpoint:[520,900,.3],defeat:[160,45,.5]};
    const note=notes[type];if(!note)return;
    const osc=ctx.createOscillator(),gain=ctx.createGain(),now=ctx.currentTime;
    osc.type=type==="shot"||type==="breach"?"triangle":"sine";
    osc.frequency.setValueAtTime(note[0],now);osc.frequency.exponentialRampToValueAtTime(note[1],now+note[2]);
    gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(type==="shot"?.035:.075,now+.008);gain.gain.exponentialRampToValueAtTime(.0001,now+note[2]);
    osc.connect(gain);gain.connect(ctx.destination);osc.start(now);osc.stop(now+note[2]+.01);
    osc.onended=()=>{osc.disconnect();gain.disconnect();};
  }
  dispose(){void this.context?.close().catch(()=>{});this.context=null;}
}
