import { test, expect } from './helpers.mjs';
const corners=Object.fromEntries(['cashFlow','capital','collateral','credit'].map(k=>[k,{status:k==='credit'?'unknown':'known',strength:k==='credit'?null:.5,raw:{},pressure:null}]));
const comparison={current:{kind:'current',scoringVersion:'synthetic-ui-only',inputs:{},corners},scenario:{kind:'scenario',scoringVersion:'synthetic-ui-only',inputs:{},corners},deltas:{cashFlow:0,capital:0,collateral:0,credit:null}};
test('mentor invalidates changed inputs, retries failed chat, and bounds history',async({page})=>{
 await page.route('**/api/vision/calculate',r=>r.fulfill({json:comparison}));
 let attempts=0;
 await page.route('**/api/mentor',async r=>{
  const body=r.request().postDataJSON();expect(body.comparison).toBeUndefined();expect(body.current).toBeTruthy();expect(body.messages.length).toBeLessThanOrEqual(11);expect(new TextEncoder().encode(r.request().postData()).length).toBeLessThanOrEqual(20000);
  attempts++;
  if(attempts===1)return r.fulfill({status:503,json:{error:'Model offline'}});
  await r.fulfill({json:{answer:'Synthetic UI response. '.repeat(200),comparison}});
 });
 await page.goto('/mentor');
 await expect(page.getByLabel('upfrontCash',{exact:true})).toHaveValue('3000');
 await page.getByRole('button',{name:'Calculate with Vi$ion'}).click();
 await expect(page.getByRole('heading',{name:'Four financial corners'})).toBeVisible();
 await page.getByLabel('liquidReserves',{exact:true}).fill('6000');
 await expect(page.getByRole('heading',{name:'Four financial corners'})).toHaveCount(0);
 await page.getByRole('button',{name:'Calculate with Vi$ion'}).click();
 await page.getByLabel('Question for mentor').fill('Give me a learning challenge.');
 await page.getByRole('button',{name:'Ask',exact:true}).click();
 await expect(page.getByRole('alert').filter({hasText:'Model offline'})).toHaveText('Model offline');
 await expect(page.getByLabel('Question for mentor')).toHaveValue('Give me a learning challenge.');
 await page.getByRole('button',{name:'Ask',exact:true}).click();
 await expect(page.getByLabel('Question for mentor')).toHaveValue('');
 for(let i=0;i<7;i++){
  await page.getByLabel('Question for mentor').fill('Explain the trade-off.');
  await page.getByRole('button',{name:'Ask',exact:true}).click();
  await expect(page.getByLabel('Question for mentor')).toHaveValue('');
 }
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('mentor API rejects malformed bodies and untrusted score-only requests',async({request})=>{
 const badJson=await request.post('/api/mentor',{headers:{'Content-Type':'application/json'},data:'{'});expect(badJson.status()).toBe(400);
 const fakeScores=await request.post('/api/mentor',{data:{comparison,messages:[{role:'user',content:'Explain'}]}});expect(fakeScores.status()).toBe(400);
 const wrongType=await request.post('/api/mentor',{headers:{'Content-Type':'text/plain'},data:'hello'});expect(wrongType.status()).toBe(415);
 const big=await request.post('/api/mentor',{data:{text:'a'.repeat(20001)}});expect(big.status()).toBe(413);
 const crossOrigin=await request.post('/api/mentor',{headers:{Origin:'https://foreign.example'},data:{}});expect(crossOrigin.status()).toBe(403);
});
