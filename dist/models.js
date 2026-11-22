window.KartModels=(()=>{
const T=THREE,PI=Math.PI;
const k=document.createElement('canvas');k.width=k.height=64;
const x=k.getContext('2d'),gradient=x.createRadialGradient(32,32,0,32,32,32);
gradient.addColorStop(0,'#fff');gradient.addColorStop(.35,'#fffa');gradient.addColorStop(1,'#fff0');
x.fillStyle=gradient;x.fillRect(0,0,64,64);
const soft=new T.CanvasTexture(k);

const FINISHES={
 gloss:{metalness:.55,roughness:.22,clearcoat:1,clearcoatRoughness:.14},
 matte:{metalness:.18,roughness:.72,clearcoat:.08,clearcoatRoughness:.8},
 chrome:{metalness:.96,roughness:.09,clearcoat:1,clearcoatRoughness:.06},
 pearl:{metalness:.68,roughness:.18,clearcoat:1,clearcoatRoughness:.08}
};

const LIVERIES=['solid','stripes','hex','bolt','carbon'];
const RIMS=['alloy','turbo','neon','beadlock'];
const liveryCache=new Map();

function getLiveryTexture(pattern){
 if(!pattern||pattern==='solid')return null;
 if(liveryCache.has(pattern))return liveryCache.get(pattern);
 const c=document.createElement('canvas');c.width=c.height=128;
 const ctx=c.getContext('2d');
 ctx.fillStyle='#ffffff';ctx.fillRect(0,0,128,128);
 if(pattern==='stripes'){
  ctx.fillStyle='#1b2230';
  ctx.fillRect(46,0,13,128);ctx.fillRect(69,0,13,128);
  ctx.fillStyle='#e8f4ff';
  ctx.fillRect(61,0,6,128);
 }else if(pattern==='hex'){
  ctx.strokeStyle='#1c2536';ctx.lineWidth=3;
  for(let y=0;y<144;y+=22)for(let x0=0;x0<144;x0+=26){
   const ox=x0+((y/22)%2)*13;
   ctx.beginPath();
   for(let a=0;a<6;a++){const ang=a*PI/3,px=ox+Math.cos(ang)*11,py=y+Math.sin(ang)*11;a?ctx.lineTo(px,py):ctx.moveTo(px,py)}
   ctx.closePath();ctx.stroke();
  }
 }else if(pattern==='bolt'){
  ctx.fillStyle='#101724';
  for(let i=-32;i<160;i+=32){
   ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(i+18,0);ctx.lineTo(i+38,64);ctx.lineTo(i+18,128);ctx.lineTo(i,128);ctx.lineTo(i+20,64);ctx.closePath();ctx.fill();
  }
 }else if(pattern==='carbon'){
  ctx.fillStyle='#464d5a';ctx.fillRect(0,0,128,128);
  for(let y=0;y<128;y+=8)for(let x0=0;x0<128;x0+=8){
   ctx.fillStyle=((x0+y)/8)%2===0?'#252a34':'#727c8f';
   ctx.fillRect(x0,y,6,4);
  }
 }
 const tex=new T.CanvasTexture(c);
 tex.wrapS=tex.wrapT=T.RepeatWrapping;
 if(tex.repeat)tex.repeat.set(.35,.35);
 if(T.sRGBEncoding)tex.encoding=T.sRGBEncoding;
 tex.needsUpdate=true;
 liveryCache.set(pattern,tex);
 return tex;
}

const CARS=[
 {n:'SCOUT',c:0x19e6ff,spd:1.15,arm:.8,acc:1.2,hdl:1.1,len:.95,w:.92,ult:'HYPER-WARP',desc:'Phase Dash & Invulnerability',ultCdMax:20,ultDur:2.5,ability:0},
 {n:'TITAN',c:0xff8a1a,spd:.9,arm:1.6,acc:.8,hdl:.8,len:1.12,w:1.2,ult:'FORTRESS BARRIER',desc:'Reflect Missiles & Heavy Ram',ultCdMax:22,ultDur:4.0,ability:1},
 {n:'ASSASSIN',c:0xff2a6d,spd:1.1,arm:.7,acc:1.1,hdl:1.2,len:1.06,w:.88,ult:'SHADOW CLOAK',desc:'Stealth, Break Locks & Dual Mines',ultCdMax:20,ultDur:4.5,ability:2},
 {n:'VECTOR',c:0xa66bff,spd:1,arm:1,acc:1,hdl:1,len:1.08,w:1.02,ult:'OVERCLOCK OVERDRIVE',desc:'Infinite Boost & 2x Rapid-Fire',ultCdMax:24,ultDur:5.0,ability:3},
 {n:'APEX',c:0xb6ff3b,spd:1.2,arm:.75,acc:1.1,hdl:1.15,len:1.12,w:.95,ult:'SLIPSTREAM SURGE',desc:'Mach Speed, Zero Slip & Sonic Wake',ultCdMax:22,ultDur:3.5,ability:4},
 {n:'RALLY',c:0xffd470,spd:.98,arm:1.25,acc:1.18,hdl:1.18,len:.95,w:1.14,ult:'SEISMIC OVERDRIVE',desc:'All-Terrain Surge & Shockwave Pulses',ultCdMax:23,ultDur:4.5,ability:5}
];

function applyFinish(paintMat,finishName,baseCol,liveryName){
 const f=FINISHES[finishName]||FINISHES.gloss;
 paintMat.metalness=f.metalness;
 paintMat.roughness=f.roughness;
 if('clearcoat' in paintMat){paintMat.clearcoat=f.clearcoat;paintMat.clearcoatRoughness=f.clearcoatRoughness}
 if(paintMat.emissive){
  paintMat.emissive.setHex(finishName==='pearl'?baseCol:0x000000);
  paintMat.emissiveIntensity=finishName==='pearl'?.18:0;
 }
 if(liveryName!==undefined){
  paintMat.map=getLiveryTexture(liveryName);
 }
 paintMat.needsUpdate=true;
}

// 6 distinct side-profile chassis silhouettes + canopy geometries
const CHASSIS_PROFILES={
 SCOUT:{
  body:[[-2.15,.42],[2.48,.42],[2.62,.58],[1.78,.82],[.55,.94],[-1.45,1.06],[-2.22,.88]],
  depth:1.42,bevel:.18,
  canopy:[[-1.08,.96],[-.58,1.44],[.42,1.40],[.95,.94]],canDepth:.96,wheelR:.54,wheelW:.5,rideY:0
 },
 TITAN:{
  body:[[-2.42,.44],[2.52,.44],[2.68,.92],[1.85,1.22],[.35,1.32],[-1.78,1.36],[-2.46,1.12]],
  depth:2.02,bevel:.16,
  canopy:[[-1.35,1.26],[-.92,1.72],[.58,1.70],[1.15,1.22]],canDepth:1.48,wheelR:.60,wheelW:.62,rideY:.06
 },
 ASSASSIN:{
  body:[[-2.35,.32],[2.58,.32],[2.72,.48],[1.65,.76],[.25,.88],[-1.65,.96],[-2.42,.78]],
  depth:1.78,bevel:.14,
  canopy:[[-1.22,.84],[-.62,1.22],[.32,1.20],[1.08,.82]],canDepth:1.06,wheelR:.52,wheelW:.52,rideY:-.04
 },
 VECTOR:{
  body:[[-2.25,.34],[2.66,.34],[2.74,.50],[1.42,.72],[.15,.98],[-1.48,1.10],[-2.32,.84]],
  depth:.96,bevel:.14,
  canopy:[[-.88,.94],[-.45,1.32],[.18,1.30],[.65,.92]],canDepth:.72,wheelR:.55,wheelW:.56,rideY:-.02
 },
 APEX:{
  body:[[-2.40,.34],[2.60,.34],[2.72,.56],[1.78,.88],[.48,.96],[-1.62,1.04],[-2.46,.86]],
  depth:1.86,bevel:.20,
  canopy:[[-1.25,.92],[-.72,1.34],[.38,1.34],[1.05,.90]],canDepth:1.02,wheelR:.54,wheelW:.55,rideY:-.04
 },
 RALLY:{
  body:[[-2.18,.62],[2.28,.62],[2.42,.96],[1.56,1.16],[.38,1.24],[-1.52,1.26],[-2.22,1.02]],
  depth:1.72,bevel:.18,
  canopy:[[-1.12,1.18],[-.75,1.68],[.42,1.66],[.94,1.16]],canDepth:1.28,wheelR:.64,wheelW:.60,rideY:.16
 }
};

function mkCar(d,col,finish='gloss',livery='stripes',rimStyle='alloy'){
 const carCol=col!==undefined?col:d.c;
 const prof=CHASSIS_PROFILES[d.n]||CHASSIS_PROFILES.SCOUT;
 const g=new T.Group();
 const body=new T.Group();
 body.position.y=prof.rideY;
 g.add(body);g.body=body;

 const fin=FINISHES[finish]||FINISHES.gloss;
 const livTex=getLiveryTexture(livery);
 const paint=new T.MeshPhysicalMaterial({color:carCol,map:livTex,metalness:fin.metalness,roughness:fin.roughness,clearcoat:fin.clearcoat,clearcoatRoughness:fin.clearcoatRoughness,emissive:finish==='pearl'?carCol:0x000000,emissiveIntensity:finish==='pearl'?.18:0});
 const dark=new T.MeshStandardMaterial({color:0x080d17,metalness:.92,roughness:.14});
 const canopy=new T.MeshPhysicalMaterial({color:0x07101f,metalness:.9,roughness:.06,clearcoat:1,clearcoatRoughness:.05,emissive:carCol,emissiveIntensity:.1});
 const trim=new T.MeshStandardMaterial({color:0x1b2538,metalness:.88,roughness:.34});
 const em=new T.MeshBasicMaterial({color:carCol});
 const lm=new T.MeshBasicMaterial({color:0xfff8dc});
 const tm=new T.MeshBasicMaterial({color:0xd01828});
 const rotorMat=new T.MeshBasicMaterial({color:carCol});
 const ex=(pts,dep,bv)=>{const s=new T.Shape();pts.forEach(([px,py],i)=>i?s.lineTo(px,py):s.moveTo(px,py));const o=new T.ExtrudeGeometry(s,{depth:dep,bevelEnabled:true,bevelSize:bv,bevelThickness:bv,bevelSegments:2});o.translate(0,0,-dep/2);return o};
 const bx=(w,h,l,m,px,py,pz,rz,parent=body,cast=false)=>{const o=new T.Mesh(new T.BoxGeometry(w,h,l),m);o.position.set(px,py,pz);if(rz)o.rotation.z=rz;if(cast)o.castShadow=true;parent.add(o);return o};

 // Sculpted per-vehicle chassis body & canopy
 const b=new T.Mesh(ex(prof.body,prof.depth,prof.bevel),paint);
 const cb=new T.Mesh(ex(prof.canopy,prof.canDepth,prof.bevel*.85),canopy);
 b.rotation.y=cb.rotation.y=-PI/2;b.castShadow=cb.castShadow=true;body.add(b,cb);

 // 4 customizable wheel assemblies (alloy / turbo / neon / beadlock) with reactive brake discs
 const rub=new T.MeshStandardMaterial({color:0x0f1218,roughness:.92}),rimMat=new T.MeshStandardMaterial({color:0xd8e0ee,metalness:1,roughness:.2});
 g.wh=[];g.rotors=rotorMat;
 const wxOff=d.n==='VECTOR'?1.24:d.n==='TITAN'?1.26:d.n==='RALLY'?1.24:1.15;
 const wzFront=d.n==='VECTOR'?1.62:1.46,wzRear=d.n==='VECTOR'?-1.56:-1.46;
 for(const [wx,wz] of[[wxOff,wzFront],[-wxOff,wzFront],[wxOff,wzRear],[-wxOff,wzRear]]){
  const p=new T.Group(),w=new T.Group();
  const wr=prof.wheelR,ww=prof.wheelW;
  const t=new T.Mesh(new T.CylinderGeometry(wr,wr,ww,14),rub);
  const r=new T.Mesh(new T.CylinderGeometry(wr*.65,wr*.65,ww+.02,12),rimStyle==='neon'?dark:rimMat);
  const disc=new T.Mesh(new T.CylinderGeometry(wr*.48,wr*.48,ww+.03,10),rotorMat);
  t.rotation.z=r.rotation.z=disc.rotation.z=PI/2;
  t.castShadow=true;
  w.add(t,r,disc);
  if(rimStyle==='turbo'){
   const fan=new T.Mesh(new T.CylinderGeometry(wr*.58,wr*.58,ww+.04,12),em);fan.rotation.z=PI/2;w.add(fan);
  }else if(rimStyle==='neon'){
   const ring=new T.Mesh(new T.TorusGeometry(wr*.6,0.045,6,16),em);ring.rotation.y=PI/2;ring.position.x=Math.sign(wx)*(ww*.52);w.add(ring);
  }else if(rimStyle==='beadlock'){
   const lip=new T.Mesh(new T.TorusGeometry(wr*.64,0.06,5,10),rimMat);lip.rotation.y=PI/2;lip.position.x=Math.sign(wx)*(ww*.48);w.add(lip);
   for(let a=0;a<2;a++){const sp=new T.Mesh(new T.BoxGeometry(ww+.05,.09,wr*1.15),rimMat);sp.rotation.x=a*PI/2;w.add(sp)}
  }else{
   for(let a=0;a<2;a++){const sp=new T.Mesh(new T.BoxGeometry(ww+.05,.055,wr*1.12),rimMat);sp.rotation.x=a*PI/2;w.add(sp)}
  }
  p.add(w);p.position.set(wx,wr,wz);g.add(p);g.wh.push({p,w,f:wz>0});
  if(d.n!=='VECTOR'&&d.n!=='SCOUT')bx(.14,.32,1.36,paint,wx*1.01,wr+.42,wz);
  else bx(.55,.08,.12,trim,wx*.55,wr+.05,wz); // Exposed open-wheel suspension wishbones!
 }

 // Headlights, glowing LED rear bar, side strips, twin exhausts & volumetric light cones
 const zFront=d.n==='VECTOR'?2.74:2.62,zRear=d.n==='RALLY'?-2.42:-2.58;
 for(const s of[-1,1]){
  bx(.64,.12,.12,lm,s*(prof.depth*.36),.78,zFront);
  bx(.76,.13,.09,tm,s*(prof.depth*.28),.96,zRear);
  bx(.06,.08,3.25,em,s*(prof.depth*.54),.56,0);
  const exPipe=new T.Mesh(new T.CylinderGeometry(.12,.12,.46,8),trim);exPipe.rotation.x=PI/2;exPipe.position.set(s*.48,.52,zRear-.08);body.add(exPipe);
  const cone=new T.Mesh(new T.ConeGeometry(1.35,10.5,10,1,true),new T.MeshBasicMaterial({color:0xfff4cc,transparent:true,opacity:.085,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide}));
  cone.rotation.x=-PI/2;cone.position.set(s*.68,.66,8.0);body.add(cone);
 }
 bx(prof.depth*.78,.07,.08,tm,0,.96,zRear-.02);
 bx(prof.depth*1.15,.08,.52,trim,0,.28,zFront+.08);
 bx(prof.depth*.92,.13,.42,trim,0,.3,zRear-.04);

 // Articulated 3D Rotating Roof Turret & Twin Plasma Barrels
 const turret=new T.Group();
 const turretY=d.n==='TITAN'?1.82:d.n==='RALLY'?1.78:d.n==='ASSASSIN'?1.34:d.n==='VECTOR'?1.48:1.52;
 turret.position.set(0,turretY,d.n==='VECTOR'?-.35:.62);
 const tBase=new T.Mesh(new T.CylinderGeometry(.28,.34,.18,12),trim);
 const tHousing=new T.Mesh(new T.BoxGeometry(.42,.2,.54),dark);tHousing.position.set(0,.1,.08);
 const tRing=new T.Mesh(new T.TorusGeometry(.3,.035,6,16),em);tRing.rotation.x=PI/2;tRing.position.y=-.04;
 const barrelGroup=new T.Group();barrelGroup.position.set(0,.12,.38);
 for(const s of[-1,1]){
  const brl=new T.Mesh(new T.CylinderGeometry(.045,.055,.88,8).rotateX(PI/2),dark);brl.position.set(s*.11,0,.4);
  const tip=new T.Mesh(new T.CylinderGeometry(.055,.055,.14,8).rotateX(PI/2),em);tip.position.set(s*.11,0,.84);
  barrelGroup.add(brl,tip);
 }
 turret.add(tBase,tHousing,tRing,barrelGroup);
 body.add(turret);
 g.turret=turret;g.barrels=barrelGroup;

 // Dynamic Aero Rear Wing Group (tilts as airbrake when braking!)
 const wing=new T.Group();
 body.add(wing);g.wing=wing;

 // Unique Vehicle Architectural Kits
 if(d.n==='SCOUT'){
  // Cyber-buggy twin angled jet thruster pods + high split wing
  for(const s of[-1,1]){
   const pod=new T.Mesh(new T.CylinderGeometry(.2,.26,1.6,10).rotateX(PI/2),trim);pod.position.set(s*.94,.86,-1.15);body.add(pod);
   const glow=new T.Mesh(new T.TorusGeometry(.21,.035,6,14),em);glow.position.set(s*.94,.86,-1.96);body.add(glow);
   bx(.08,.56,.26,dark,s*.68,1.38,-2.24);
   bx(.06,.34,.58,em,s*1.06,1.66,-2.28);
  }
  wing.position.set(0,1.66,-2.28);
  bx(2.14,.09,.54,paint,0,0,0,0,wing,true);
 }else if(d.n==='TITAN'){
  // Heavy armored bull-bar ram plow, flared armor shields & twin roof ordnance pods
  bx(2.74,.62,.52,trim,0,.64,2.92,0,body,true);
  bx(2.5,.12,.14,em,0,.92,3.16);
  bx(1.6,.14,.24,lm,0,1.82,.35);
  for(const s of[-1,1]){
   bx(.22,.68,2.1,trim,s*1.32,.86,.15,0,body,true);
   bx(.34,.32,1.15,dark,s*.82,1.52,-.95);
   bx(.08,.08,1.18,em,s*.82,1.68,-.95);
  }
  wing.position.set(0,1.58,-2.35);
  bx(2.24,.14,.46,trim,0,0,0,0,wing,true);
 }else if(d.n==='ASSASSIN'){
  // Razor-low stealth bat-wing V-tail, sharp side intake blades & optical crimson visor
  bx(1.24,.14,.18,em,0,1.06,.92);
  for(const s of[-1,1]){
   bx(.08,.86,1.12,paint,s*1.02,1.36,-2.26,s*.42,body,true);
   bx(.05,.82,.14,em,s*1.12,1.44,-2.72,s*.42);
   bx(.36,.24,1.65,dark,s*1.28,.54,.65);
   bx(.05,.05,1.8,em,s*1.22,.82,-.6);
  }
  wing.position.set(0,1.36,-2.38);
  bx(1.76,.06,.48,paint,0,0,0,0,wing,true);
 }else if(d.n==='VECTOR'){
  // Formula-E / F1 open-wheel single-seater: wide front wing, sidepods, cockpit Halo & high DRS wing
  bx(2.64,.08,.56,paint,0,.30,2.88,0,body,true);
  for(const s of[-1,1]){
   bx(.08,.34,.66,em,s*1.32,.44,2.86);
   // Sculpted aerodynamic F1 sidepods
   bx(.62,.54,2.15,paint,s*.86,.66,-.18,0,body,true);
   bx(.48,.34,.14,dark,s*.86,.72,.92);
   bx(.06,.08,1.95,em,s*1.18,.78,-.18);
   // Rear wing endplates
   bx(.07,.78,.68,dark,s*1.04,1.42,-2.38);
  }
  // 3D F1 Cockpit Halo bar + airbox intake
  const halo=new T.Mesh(new T.TorusGeometry(.44,.045,6,16,PI),trim);halo.rotation.x=PI/2;halo.position.set(0,1.22,.1);body.add(halo);
  bx(.06,.24,.06,trim,0,1.18,.52);
  bx(.36,.42,.95,paint,0,1.32,-.88,0,body,true);
  wing.position.set(0,1.72,-2.38);
  bx(2.06,.09,.56,paint,0,0,0,0,wing,true);
  bx(2.02,.06,.22,em,0,.18,-.12,0,wing);
 }else if(d.n==='APEX'){
  // LMP1 Le Mans Hypercar: vented front fenders, full dorsal shark-fin & glowing quad-diffuser
  bx(.76,.22,2.18,paint,0,.62,2.28);
  bx(.07,.62,2.05,paint,0,1.52,-1.32,0,body,true);
  bx(.08,.06,1.96,em,0,1.84,-1.32);
  for(const s of[-1,1]){
   bx(.58,.42,2.25,paint,s*1.26,.58,-.25,0,body,true);
   bx(.08,.68,.72,em,s*1.14,1.62,-2.42);
   bx(.34,.14,.42,dark,s*1.18,.92,1.42);
  }
  wing.position.set(0,1.66,-2.44);
  bx(2.26,.09,.62,paint,0,0,0,0,wing,true);
 }else if(d.n==='RALLY'){
  // Dakar Off-Road Trophy Buggy: external tubular roll-cage, roof LED light-bar & rear spare tire!
  bx(1.66,.12,1.66,trim,0,1.72,-.18);
  bx(1.32,.18,.18,lm,0,1.92,.48);
  for(const s of[-1,1]){
   bx(.12,.92,.12,trim,s*.82,1.38,-.65);
   bx(.12,.82,.12,trim,s*.82,1.38,.48);
   bx(.12,.12,1.35,trim,s*.82,1.76,-.08);
  }
  // Angled mounted spare off-road tire on rear deck
  const spare=new T.Mesh(new T.CylinderGeometry(.56,.56,.34,12),rub);
  spare.rotation.x=PI/2-.42;spare.position.set(0,1.36,-1.92);body.add(spare);
  const spareRim=new T.Mesh(new T.CylinderGeometry(.32,.32,.36,10),em);
  spareRim.rotation.x=PI/2-.42;spareRim.position.set(0,1.36,-1.92);body.add(spareRim);
  wing.position.set(0,1.72,-1.52);
  bx(1.58,.08,.34,paint,0,0,0,0,wing);
 }

 // Dynamic Underglow Plane
 const ug=new T.Mesh(new T.PlaneGeometry(3.5,6.1),new T.MeshBasicMaterial({map:soft,color:carCol,transparent:true,opacity:.62,blending:T.AdditiveBlending,depthWrite:false}));
 ug.rotation.x=-PI/2;ug.position.y=.12;g.add(ug);

 // Headlight Road Pool
 const pool=new T.Mesh(new T.PlaneGeometry(9.5,24),new T.MeshBasicMaterial({map:soft,color:0xfff1c0,transparent:true,opacity:.26,blending:T.AdditiveBlending,depthWrite:false}));
 pool.rotation.x=-PI/2;pool.position.set(0,.11,14.5);g.add(pool);

 // Dual Afterburner Exhaust Flames
 g.fl=new T.Group();
 for(const s of[-1,1]){
  const jet=new T.Group();
  jet.add(
   new T.Mesh(new T.ConeGeometry(.34,1.35,10).translate(0,.68,0),new T.MeshBasicMaterial({color:0xff7a1a,transparent:true,opacity:.88,blending:T.AdditiveBlending,depthWrite:false})),
   new T.Mesh(new T.ConeGeometry(.16,.9,8).translate(0,.45,0),new T.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.95,blending:T.AdditiveBlending,depthWrite:false}))
  );
  jet.position.x=s*.48;
  g.fl.add(jet);
 }
 g.fl.rotation.x=-PI/2;g.fl.position.set(0,.52,zRear-.24);g.fl.visible=false;body.add(g.fl);

 // Soft Contact Shadow
 const shadow=new T.Mesh(new T.PlaneGeometry(4.2,6.6),new T.MeshBasicMaterial({map:soft,color:0x000000,transparent:true,opacity:.68,depthWrite:false}));
 shadow.rotation.x=-PI/2;shadow.position.y=.055;g.add(shadow);

 g.paint=paint;g.canopy=canopy;g.em=em;g.base=new T.Color(carCol);g.ug=ug;g.tm=tm;
 g.scale.set(d.w,1,d.len);
 return g;
}

return {cars:CARS,finishes:FINISHES,liveries:LIVERIES,rims:RIMS,getLiveryTexture,applyFinish,create:mkCar,soft};
})();