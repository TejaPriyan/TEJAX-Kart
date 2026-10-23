(function(root){'use strict';
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const powers=[
  {name:'Repair',short:'HP',color:0x42ed9f,field:'hp',value:40},
  {name:'Nitro',short:'BOOST',color:0xffc34b,field:'bo',value:100},
  {name:'Shield',short:'SHIELD',color:0x56bcff,field:'sh',value:7},
  {name:'Missile reload',short:'AMMO',color:0xff687e,field:'ms',value:0},
  {name:'Rapid fire',short:'RAPID',color:0xc49cff,field:'rapid',value:10},
  {name:'Plasma rounds',short:'PLASMA',color:0xff66d4,field:'plasma',value:8},
  {name:'Pickup magnet',short:'MAGNET',color:0x66ffe2,field:'magnet',value:12},
  {name:'Ability recharge',short:'CHARGE',color:0xf8f3b3,field:'ultCd',value:0}
 ];
 function applyPower(car,type){const p=powers[type];if(!p)return false;if(type===0)car.hp=Math.min(100,car.hp+40);else car[p.field]=p.value;return true}
 function eligible(shooter,target,range=115,cone=.48){if(target===shooter||target.dead||target.cloaked)return false;const dx=target.x-shooter.x,dz=target.z-shooter.z,d=Math.hypot(dx,dz),a=Math.atan2(Math.sin(Math.atan2(dx,dz)-shooter.h),Math.cos(Math.atan2(dx,dz)-shooter.h));return d>3&&d<=range&&Math.abs(a)<=cone&&Math.abs((target.y||0)-(shooter.y||0))<24}
 function acquire(shooter,targets,visible=()=>true,current=null){let best=null,score=Infinity;for(const t of targets){if(!eligible(shooter,t)||!visible(shooter,t))continue;const angle=Math.abs(Math.atan2(Math.sin(Math.atan2(t.x-shooter.x,t.z-shooter.z)-shooter.h),Math.cos(Math.atan2(t.x-shooter.x,t.z-shooter.z)-shooter.h)));const s=angle*100+Math.hypot(t.x-shooter.x,t.z-shooter.z)*.12-(t===current?4:0);if(s<score){best=t;score=s}}return best}
 function aim(shooter,target,speed){if(!target)return {a:shooter.h,vy:0};const dx=target.x-shooter.x,dz=target.z-shooter.z,vx=target.vx||0,vz=target.vz||0,A=vx*vx+vz*vz-speed*speed,B=2*(dx*vx+dz*vz),C=dx*dx+dz*dz,D=B*B-4*A*C;let time=Math.sqrt(C)/speed;if(D>=0&&Math.abs(A)>1e-8){const roots=[(-B-Math.sqrt(D))/(2*A),(-B+Math.sqrt(D))/(2*A)].filter(v=>v>0);if(roots.length)time=Math.min(...roots)}time=clamp(time,.02,.65);const x=dx+vx*time,z=dz+vz*time,travel=Math.max(.02,Math.hypot(x,z)/speed);return {a:Math.atan2(x,z),vy:clamp(((target.y||0)-(shooter.y||0))/travel,-160,160)}}
 function clearShot(a,b,points,halfWidth=14){const distance=Math.hypot(b.x-a.x,b.z-a.z),steps=Math.max(2,Math.ceil(distance/8));for(let j=1;j<steps;j++){const t=j/steps,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t,y=a.y+(b.y-a.y)*t;for(let i=0;i<points.length;i+=2){const p=points[i];if((x-p.x)**2+(z-p.z)**2<halfWidth*halfWidth&&p.y+.15>y)return false}}return true}
 const api={powers,applyPower,eligible,acquire,aim,clearShot};if(typeof module!=='undefined')module.exports=api;else root.KartCombat=api;
})(typeof globalThis!=='undefined'?globalThis:this);
