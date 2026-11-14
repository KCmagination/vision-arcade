import test from 'node:test';
import assert from 'node:assert/strict';
import {gridProject,gridUnproject} from '../lib/debtbreak-grid-view.js';
test('oblique placement inverse preserves every cell interior and canonical route point',()=>{
 for(let x=0;x<=1000;x+=25)for(let z=0;z<=1000;z+=25){const p=gridProject(x,z),q=gridUnproject(p.x,p.z);assert.ok(Math.abs(x-q.x)<1e-9);assert.ok(Math.abs(z-q.z)<1e-9);}
 for(let col=2;col<=7;col++)for(let row=2;row<=7;row++)for(const offset of [1,50,99]){const p=gridProject(col*100+offset,row*100+offset),q=gridUnproject(p.x,p.z);assert.equal(Math.floor(q.x/100),col);assert.equal(Math.floor(q.z/100),row);}
});
