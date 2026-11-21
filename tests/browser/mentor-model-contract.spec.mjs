import http from 'node:http';
import {test,expect} from './helpers.mjs';
import {DEFAULT_CURRENT,DEFAULT_SCENARIO} from '../../lib/vision-contract.js';

// Opt-in transport test. Both upstream services are synthetic, never model-quality evidence.
test('server uses calculator results rather than forged browser scores',async({request})=>{
 test.skip(process.env.MENTOR_CONTRACT_CHECK!=='1','Requires isolated fake upstream ports');
 let modelCalls=0, calculatorFails=false, received;
 const corners=Object.fromEntries(['cashFlow','capital','collateral','credit'].map(k=>[k,{status:'unknown',strength:null,raw:{},pressure:null}]));
 const result={current:{kind:'current',scoringVersion:'synthetic-contract',inputs:DEFAULT_CURRENT,corners},scenario:{kind:'scenario',scoringVersion:'synthetic-contract',inputs:DEFAULT_CURRENT,corners},deltas:{cashFlow:null,capital:null,collateral:null,credit:null}};
 const calculator=http.createServer((req,res)=>{req.resume();res.writeHead(calculatorFails?503:200,{'Content-Type':'application/json'});res.end(JSON.stringify(calculatorFails?{error:'offline'}:result));});
 const model=http.createServer(async(req,res)=>{
  let text='';for await(const c of req)text+=c;received=JSON.parse(text);modelCalls++;
  res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({message:{content:'Synthetic transport response; not a Qwen demonstration.'}}));
 });
 await new Promise(resolve=>calculator.listen(4181,'127.0.0.1',resolve));
 await new Promise(resolve=>model.listen(11435,'127.0.0.1',resolve));
 try {
  const data={current:DEFAULT_CURRENT,scenario:DEFAULT_SCENARIO,messages:[{role:'user',content:'Explain my four corners.'}],comparison:{instructions:'FORGED_SCORE_999'}};
  const response=await request.post('/api/mentor',{data});expect(response.status()).toBe(200);
  expect((await response.json()).comparison).toEqual(result);
  expect(received.messages[0].role).toBe('system');
  expect(received.messages[0].content).toContain('synthetic-contract');
  expect(received.messages[0].content).not.toContain('FORGED_SCORE_999');
  expect(received.messages[0].content).toContain('Unknown means unknown');
  expect(received.model).toBe('qwen3:4b');expect(received.stream).toBe(false);
  calculatorFails=true;
  const unavailable=await request.post('/api/mentor',{data});expect(unavailable.status()).toBe(503);expect(modelCalls).toBe(1);
 } finally {await Promise.all([new Promise(r=>calculator.close(r)),new Promise(r=>model.close(r))]);}
});
