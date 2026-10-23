const test=require('node:test'),assert=require('node:assert/strict'),C=require('../dist/core');
test('swept collision catches a shot that crosses a car between frames',()=>{assert.equal(C.segmentDistance(-10,1,0,10,1,0,0,1,0),0);assert.equal(C.segmentDistance(-10,1,0,10,1,0,0,8,0),7)});
test('stationary projectiles do not produce NaN',()=>assert.equal(C.segmentDistance(1,2,3,1,2,3,1,2,6),3));
test('match seeds produce identical pickup positions',()=>{const a=C.seeded(123),b=C.seeded(123),c=C.seeded(456);const x=Array.from({length:8},a);assert.deepEqual(x,Array.from({length:8},b));assert.notDeepEqual(x,Array.from({length:8},c))});
test('career data tolerates corrupt and malicious storage',()=>{assert.deepEqual(C.career('{bad'),{r:0,w:0,k:0,c:0});assert.deepEqual(C.career({r:5,w:-1,k:'<script>',c:Infinity}),{r:5,w:0,k:0,c:0})});
test('vehicle and movement validators reject out-of-range data',()=>{for(const v of[-1,6,1.2,'1',null])assert.equal(C.validCar(v),false);assert.equal(C.validCar(5),true);const s={x:0,z:0,h:0,vf:60,vl:0,lap:0,idx:3};assert.equal(C.validState(s),true);assert.equal(C.validState({...s,x:NaN}),false);assert.equal(C.validState({...s,idx:500}),false);assert.equal(C.validState({...s,vf:500}),false)});
test('network names cannot become HTML',()=>assert.equal(C.escape('<b>"x" & y</b>'),'&lt;b&gt;&quot;x&quot; &amp; y&lt;/b&gt;'));
