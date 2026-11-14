import {test,expect,tapOrClick} from './helpers.mjs';

// No route interception or synthetic upstreams. Requires a real private Ollama server.
// Passing transport assertions does NOT certify educational or numerical accuracy.
test('real Qwen explains calculator results and proposes a personalised challenge',async({page,request},info)=>{
 test.skip(process.env.MENTOR_QWEN_CHECK!=='1','Opt-in real Qwen evidence capture');
 test.setTimeout(240000);
 const base=process.env.OLLAMA_BASE_URL||'http://127.0.0.1:11434';
 const model=process.env.OLLAMA_MODEL||'qwen3:4b';
 expect(model).toBe('qwen3:4b');
 const tagsResponse=await request.get(new URL('/api/tags',base).href);
 expect(tagsResponse.ok(),'Ollama must be reachable').toBe(true);
 const tags=await tagsResponse.json();
 const installed=tags.models.find(m=>m.name===model);
 expect(installed,'Run ollama pull qwen3:4b first').toBeTruthy();
 const evidence={startedAt:new Date().toISOString(),project:info.project.name,model,digest:installed.digest,synthetic:false,qualityReview:'REQUIRED: compare every claim with its paired calculator response',turns:[]};
 try {
  await page.goto('/mentor');
  for(const unknown of [false,true]) {
   if(unknown)await page.getByLabel('creditScore',{exact:true}).fill('');
   const calculated=page.waitForResponse(r=>r.url().endsWith('/api/vision/calculate'));
   await tapOrClick(page,page.getByRole('button',{name:'Calculate with Vi$ion'}));
   const calculation=await calculated;
   expect(calculation.status()).toBe(200);
   await expect(page.getByRole('heading',{name:'Four financial corners'})).toBeVisible();
   const questions=unknown?['My credit score is unknown. Explain what you cannot conclude about Credit. Do not estimate a score.']:['Explain Cash Flow, Capital, Collateral and Credit separately. Quote the current and scenario strengths and changes exactly as supplied, and explain the trade-offs in plain language.','Give me one learning challenge tailored to this purchase and my reserves. Ask me a question without giving away its answer.'];
   for(const question of questions) {
    await page.getByLabel('Question for mentor').fill(question);
    const pending=page.waitForResponse(r=>r.url().endsWith('/api/mentor'),{timeout:60000});
    await tapOrClick(page,page.getByRole('button',{name:'Ask',exact:true}));
    const response=await pending;
    const body=await response.json();
    evidence.turns.push({at:new Date().toISOString(),unknownCredit:unknown,question,status:response.status(),...body});
    expect(response.status(),JSON.stringify(body)).toBe(200);
    expect(body.answer.trim().length).toBeGreaterThan(20);
    if(unknown){
     expect(body.comparison.current.corners.credit.status).toBe('unknown');
     expect(body.comparison.current.corners.credit.strength).toBeNull();
     expect(body.answer).toMatch(/unknown|cannot|can't|missing|unavailable/i);
    }
    await expect(page.getByLabel('Question for mentor')).toHaveValue('');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.screenshot({path:info.outputPath(`qwen-${evidence.turns.length}.png`),fullPage:true});
   }
  }
 } finally {
  evidence.finishedAt=new Date().toISOString();
  await info.attach('qwen-evidence.json',{body:JSON.stringify(evidence,null,2),contentType:'application/json'});
 }
});
