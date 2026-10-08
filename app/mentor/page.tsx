"use client";
import { useState } from "react";
import { requestComparison } from "../../lib/calculator-client.js";
import { DEFAULT_CURRENT, DEFAULT_SCENARIO } from "../../lib/vision-contract.js";

const keys = ["cashFlow", "capital", "collateral", "credit"] as const;
type Comparison = {current:{corners:Record<string,{status:string;strength:number|null}>};scenario:{corners:Record<string,{status:string;strength:number|null}>};deltas:Record<string,number|null>};
export default function MentorPage() {
 const [current,setCurrent]=useState({...DEFAULT_CURRENT});
 const [scenario,setScenario]=useState({...DEFAULT_SCENARIO});
 const [comparison,setComparison]=useState<Comparison|null>(null);
 const [messages,setMessages]=useState<{role:string;content:string}[]>([]);
 const [question,setQuestion]=useState("");
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 async function calculate() {
  setBusy(true);setError("");
  try { const result=await requestComparison(current,scenario);setComparison(result as Comparison);setMessages([]); }
  catch(e){setError(e instanceof Error?e.message:"Calculator unavailable");}
  finally{setBusy(false);}
 }
 async function ask() {
  if(!comparison||!question.trim())return;
  const next=[...messages,{role:"user",content:question.trim()}];setMessages(next);setQuestion("");setBusy(true);setError("");
  try {const r=await fetch("/api/mentor",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({comparison,messages:next})});const data=await r.json();if(!r.ok)throw Error(data.error||"Mentor unavailable");setMessages([...next,{role:"assistant",content:data.answer}]);}
  catch(e){setError(e instanceof Error?e.message:"Mentor unavailable");}
  finally{setBusy(false);}
 }
 return <main style={{maxWidth:980,margin:"auto",padding:24,color:"#e5f7ff",background:"#071422",minHeight:"100vh",fontFamily:"system-ui"}}>
 <p style={{color:"#61e6db"}}>VI$ION · EXPERIMENTAL PILOT</p><h1 style={{fontSize:36}}>Sentinel AI Mentor</h1><p>Explore fictional decisions. Casey's calculator determines the numbers; the mentor explains them.</p>
 <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(250px,1fr))",gap:20}}>
 <section><h2>Current finances (USD)</h2>{Object.entries(current).map(([key,value])=><label key={key} style={{display:"block",marginBottom:12}}>{key}<input aria-label={key} style={{display:"block",width:"100%",padding:8,color:"#111"}} type="number" value={value??""} onChange={e=>setCurrent(v=>({...v,[key]:key==="creditScore"&&e.target.value===""?null:Number(e.target.value)}))}/></label>)}</section>
 <section><h2>Proposed scenario (USD)</h2>{Object.entries(scenario).map(([key,value])=><label key={key} style={{display:"block",marginBottom:12}}>{key}<input aria-label={key} style={{display:"block",width:"100%",padding:8,color:"#111"}} type="number" value={value} onChange={e=>setScenario(v=>({...v,[key]:Number(e.target.value)}))}/></label>)}</section></div>
 <button disabled={busy} onClick={calculate} style={{padding:14,background:"#61e6db",color:"#071422",fontWeight:700}}>Calculate with Vi$ion</button>
 {comparison&&<><h2 style={{marginTop:24}}>Four financial corners</h2><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12}}>{keys.map(k=><div key={k} style={{border:"1px solid #346",borderRadius:12,padding:16}}><h3>{k}</h3><p>Current: {comparison.current.corners[k].status==="known"?comparison.current.corners[k].strength?.toFixed(3):comparison.current.corners[k].status}</p><p>Scenario: {comparison.scenario.corners[k].status==="known"?comparison.scenario.corners[k].strength?.toFixed(3):comparison.scenario.corners[k].status}</p><p>Change: {comparison.deltas[k]===null?"unknown":comparison.deltas[k].toFixed(3)}</p></div>)}</div>
 <h2 style={{marginTop:24}}>Ask Sentinel</h2><p>Try: Explain my reserves. What trade-off did I make? Give me a learning challenge.</p><div aria-live="polite">{messages.map((m,i)=><p key={i}><strong>{m.role==="assistant"?"Mentor":"You"}:</strong> {m.content}</p>)}</div><input aria-label="Question for mentor" value={question} onChange={e=>setQuestion(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")void ask()}} style={{padding:12,width:"75%",color:"#111"}}/><button disabled={busy} onClick={ask} style={{padding:12}}>Ask</button></>}
 {error&&<p role="alert" style={{color:"#ffb2a5"}}>{error}</p>}
 <p style={{marginTop:36,opacity:.7}}>Fictional educational simulation · No accounts or student profiles · AI responses are explanations, not authoritative calculations.</p></main>;
}
