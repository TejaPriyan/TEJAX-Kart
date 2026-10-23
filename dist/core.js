(function(root){
 'use strict';
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 function seeded(seed){let s=seed>>>0;return()=>{s+=0x6D2B79F5;let t=s;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
 function segmentDistance(ax,ay,az,bx,by,bz,x,y,z){const dx=bx-ax,dy=by-ay,dz=bz-az,d=dx*dx+dy*dy+dz*dz,t=d?clamp(((x-ax)*dx+(y-ay)*dy+(z-az)*dz)/d,0,1):0;return Math.hypot(x-ax-t*dx,y-ay-t*dy,z-az-t*dz)}
 function career(raw){try{const s=typeof raw==='string'?JSON.parse(raw):raw;return Object.fromEntries(['r','w','k','c'].map(k=>[k,Number.isSafeInteger(s?.[k])&&s[k]>=0?s[k]:0]))}catch{return {r:0,w:0,k:0,c:0}}}
 const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function validCar(c){return Number.isInteger(c)&&c>=0&&c<6}
 function validState(m){return ['x','z','h','vf','vl','lap','idx'].every(k=>Number.isFinite(m[k]))&&Math.abs(m.x)<1200&&Math.abs(m.z)<1200&&Math.abs(m.vf)<=200&&Math.abs(m.vl)<=200&&Number.isInteger(m.idx)&&m.idx>=0&&m.idx<500&&Number.isInteger(m.lap)&&m.lap>=0&&m.lap<=3}
 // Positive input means screen-right; the chase camera looks along world +Z.
 function headingDelta(steer,speed,handling,drift,dt){return -steer*1.9*handling*clamp(Math.abs(speed)/18,0,1)*(drift?1.4:1)/(1+Math.abs(speed)/90)*Math.sign(speed||1)*dt}
 function screenTilt(beta,gamma,angle){if(!Number.isFinite(beta)||!Number.isFinite(gamma))return null;const a=((angle||0)%360+360)%360;return a===90?beta:a===270?-beta:a===180?-gamma:gamma}
 function tiltInput(angle,neutral,sensitivity=25,invert=false){if(!Number.isFinite(angle)||!Number.isFinite(neutral))return 0;const delta=((angle-neutral+540)%360)-180,dead=2.5,value=Math.sign(delta)*Math.max(0,Math.abs(delta)-dead)/Math.max(8,sensitivity-dead);return clamp(value*(invert?-1:1),-1,1)}
 const api={clamp,seeded,segmentDistance,career,escape,validCar,validState,headingDelta,screenTilt,tiltInput};if(typeof module!=='undefined')module.exports=api;else root.KartCore=api;
})(typeof globalThis!=='undefined'?globalThis:this);
