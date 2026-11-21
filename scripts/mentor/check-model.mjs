// Private-service preflight; no simulated responses and no automatic installation.
import {mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
const at=new Date().toISOString();
const evidence={at,model:'qwen3:4b',status:'blocked',synthetic:false};
try {
 const base=new URL(process.env.OLLAMA_BASE_URL||'http://127.0.0.1:11434');
 if(!['http:','https:'].includes(base.protocol)||base.username||base.password)throw Error('Invalid OLLAMA_BASE_URL');
 if(process.env.OLLAMA_MODEL&&process.env.OLLAMA_MODEL!=='qwen3:4b')throw Error('This pilot requires qwen3:4b');
 evidence.commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 async function call(path,body,timeout=10000){
  const r=await fetch(new URL(path,base),{method:body?'POST':'GET',headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(timeout),redirect:'error'});
  if(!r.ok)throw Error(`Ollama ${path} returned HTTP ${r.status}`);
  return r.json();
 }
 evidence.version=(await call('/api/version')).version;
 const installed=(await call('/api/tags')).models.find(m=>m.name==='qwen3:4b');
 if(!installed)throw Error('Missing model: run ollama pull qwen3:4b');
 evidence.digest=installed.digest;
 const result=await call('/api/chat',{model:'qwen3:4b',stream:false,think:false,messages:[{role:'user',content:'Reply with one sentence defining a fictional financial learning challenge.'}]},120000);
 if(!result.done||!result.message?.content?.trim())throw Error('Model did not return a complete response');
 evidence.response=result.message.content;
 evidence.totalDurationNs=result.total_duration;
 evidence.status='model-responded';
 evidence.limit='Preflight only: calculator integration and factual quality still require browser capture and review.';
}catch(error){evidence.error=error.message;process.exitCode=1;}
await mkdir('test-results/mentor-preflight',{recursive:true});
await writeFile(`test-results/mentor-preflight/${at.replace(/[:.]/g,'-')}.json`,JSON.stringify(evidence,null,2));
console.log(JSON.stringify(evidence,null,2));
