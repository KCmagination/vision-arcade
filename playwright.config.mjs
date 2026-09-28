import { defineConfig } from '@playwright/test';
export default defineConfig({
 forbidOnly:!!process.env.CI,testDir:'./tests/browser',timeout:180000,expect:{timeout:15000},fullyParallel:true,workers:2,retries:0,
 webServer:process.env.DEBTBREAK_TEST_URL?undefined:{command:'npm run start -- --hostname 127.0.0.1 --port 4174',url:'http://127.0.0.1:4174',reuseExistingServer:false,timeout:30000},
 reporter:[['list'],['html',{open:'never'}]],
 use:{baseURL:process.env.DEBTBREAK_TEST_URL||'http://127.0.0.1:4174',headless:true,trace:{mode:'retain-on-failure',screenshots:false,snapshots:true,sources:false},screenshot:'only-on-failure',launchOptions:{executablePath:process.env.CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox','--disable-dev-shm-usage','--disable-webgl','--disable-gpu']}},
 projects:[{name:'desktop-mouse',use:{viewport:{width:1440,height:1000}}},{name:'mobile-touch',use:{viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1}}],
});
