import { test, expect } from './helpers.mjs';
test('live hosted calculator renders a fictional purchase; absent model fails visibly',async({page},testInfo)=>{
 test.skip(process.env.MENTOR_LIVE_CHECK!=='1','Opt-in live service verification');
 await page.goto('/mentor');
 const calculated=page.waitForResponse(r=>r.url().endsWith('/api/vision/calculate')&&r.request().method()==='POST');
 await page.getByRole('button',{name:'Calculate with Vi$ion'}).click();
 const response=await calculated;expect(response.status()).toBe(200);
 const result=await response.json();expect(result.current.scoringVersion).not.toContain('synthetic');
 await expect(page.getByRole('heading',{name:'Four financial corners'})).toBeVisible();
 await testInfo.attach('live-calculator.json',{body:JSON.stringify({at:new Date().toISOString(),result}),contentType:'application/json'});
 await page.screenshot({path:testInfo.outputPath('live-calculator.png'),fullPage:true});
 await page.getByLabel('Question for mentor').fill('Explain the purchase and give me a learning challenge.');
 const mentored=page.waitForResponse(r=>r.url().endsWith('/api/mentor'));
 await page.getByRole('button',{name:'Ask',exact:true}).click();
 const mentor=await mentored;
 // This check is specifically for the known absent local model. It is not a Qwen success test.
 expect(mentor.status()).toBe(503);
 await expect(page.getByRole('alert').filter({hasText:'Mentor unavailable'})).toBeVisible();
 await expect(page.getByLabel('Question for mentor')).not.toHaveValue('');
});
