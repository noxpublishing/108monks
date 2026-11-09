import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { timeline, locate, observedCount, monkPosition, cohortOffset } from '../web/engine.js';
const p=JSON.parse(fs.readFileSync(new URL('../profiles/public-compassion.json',import.meta.url),'utf8'));
const tl=timeline(p.phases);
test('every frontend phase boundary is exact',()=>{
 tl.starts.forEach((start,i)=>{assert.equal(locate(tl,start).index,i);assert.equal(locate(tl,start).elapsed,0);});
 assert.equal(locate(tl,tl.total).index,0);
});
test('frontend never credits an initial partial mantra',()=>{
 const i=p.phases.findIndex(p=>p.id==='mani');
 const u=p.phases[i].unit_ms;
 assert.equal(observedCount(tl,tl.starts[i]+123,u-113,i),0);
 assert.equal(observedCount(tl,tl.starts[i]+123,2*u-113,i),1);
});
test('integer staggering matches expected ids (distributed mode)',()=>{
 for(let i=0;i<108;i++) assert.deepEqual(monkPosition(tl,108,i,12345,{mode:'distributed'}),locate(tl,Math.floor(i*tl.total/108)+12345));
});
test('every counter is zero at a fresh start',()=>{
 for(let i=0;i<108;i++)p.phases.forEach((_,j)=>assert.equal(observedCount(tl,Math.floor(i*tl.total/108),0,j),0));
});
test('cohort offsets mirror the Python engine byte-exactly',()=>{
 /* gleiche 32-Bit-Mischung wie app/engine.py · stable_start_offset · seed 108 · spread 1200 */
 const expected=[225,233,801,981,175,1035,1044,1167,808,371,1134,429];
 for(let i=0;i<expected.length;i++) assert.equal(cohortOffset(i+1,{mode:'cohort',spread_ms:1200,seed:108}),expected[i]);
 assert.equal(cohortOffset(0,{mode:'cohort',spread_ms:1200,seed:108}),0);
});
test('cohort default keeps the ensemble within the narrow corridor',()=>{
 const ens={mode:'cohort',spread_ms:1200,seed:108};
 let minOff=Infinity,maxOff=-Infinity;
 for(let i=0;i<108;i++){
   const off=cohortOffset(i,ens);
   const pos=monkPosition(tl,108,i,0,ens);
   assert.ok(off>=0&&off<=1200);
   minOff=Math.min(minOff,off);maxOff=Math.max(maxOff,off);
 }
 assert.equal(minOff,0);
 assert.ok(maxOff>0); /* individuelle Versätze vorhanden */
});
