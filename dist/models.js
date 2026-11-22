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

const CARS=[
 {n:'SCOUT',c:0x19e6ff,spd:1.15,arm:.8,acc:1.2,hdl:1.1,len:.95,w:.9,ult:'HYPER-WARP',desc:'Phase Dash & Invulnerability',ultCdMax:20,ultDur:2.5,ability:0},
 {n:'TITAN',c:0xff8a1a,spd:.9,arm:1.6,acc:.8,hdl:.8,len:1.1,w:1.2,ult:'FORTRESS BARRIER',desc:'Reflect Missiles & Heavy Ram',ultCdMax:22,ultDur:4.0,ability:1},
 {n:'ASSASSIN',c:0xff2a6d,spd:1.1,arm:.7,acc:1.1,hdl:1.2,len:1.05,w:.85,ult:'SHADOW CLOAK',desc:'Stealth, Break Locks & Dual Mines',ultCdMax:20,ultDur:4.5,ability:2},
 {n:'VECTOR',c:0xa66bff,spd:1,arm:1,acc:1,hdl:1,len:1,w:1,ult:'OVERCLOCK OVERDRIVE',desc:'Infinite Boost & 2x Rapid-Fire',ultCdMax:24,ultDur:5.0,ability:3},
 {n:'APEX',c:0xb6ff3b,spd:1.2,arm:.75,acc:1.1,hdl:1.15,len:1.12,w:.92,ult:'SLIPSTREAM SURGE',desc:'Mach Speed, Zero Slip & Sonic Wake',ultCdMax:22,ultDur:3.5,ability:4},
 {n:'RALLY',c:0xffd470,spd:.98,arm:1.25,acc:1.18,hdl:1.18,len:.92,w:1.12,ult:'SEISMIC OVERDRIVE',desc:'All-Terrain Surge & Shockwave Pulses',ultCdMax:23,ultDur:4.5,ability:5}
];

function applyFinish(paintMat,finishName,baseCol){
 const f=FINISHES[finishName]||FINISHES.gloss;
 paintMat.metalness=f.metalness;
 paintMat.roughness=f.roughness;
 if('clearcoat' in paintMat){paintMat.clearcoat=f.clearcoat;paintMat.clearcoatRoughness=f.clearcoatRoughness}
 if(paintMat.emissive){
  paintMat.emissive.setHex(finishName==='pearl'?baseCol:0x000000);
  paintMat.emissiveIntensity=finishName==='pearl'?.18:0;
 }
 paintMat.needsUpdate=true;
}

function mkCar(d,col,finish='gloss'){
 const carCol=col!==undefined?col:d.c;
 const g=new T.Group();
 const body=new T.Group();
 g.add(body);g.body=body;

 const fin=FINISHES[finish]||FINISHES.gloss;
 const paint=new T.MeshPhysicalMaterial({color:carCol,metalness:fin.metalness,roughness:fin.roughness,clearcoat:fin.clearcoat,clearcoatRoughness:fin.clearcoatRoughness,emissive:finish==='pearl'?carCol:0x000000,emissiveIntensity:finish==='pearl'?.18:0});
 const dark=new T.MeshStandardMaterial({color:0x080d17,metalness:.92,roughness:.12});
 const canopy=new T.MeshPhysicalMaterial({color:0x07101f,metalness:.9,roughness:.06,clearcoat:1,clearcoatRoughness:.05,emissive:carCol,emissiveIntensity:.08});
 const trim=new T.MeshStandardMaterial({color:0x1b2538,metalness:.88,roughness:.34});
 const em=new T.MeshBasicMaterial({color:carCol});
 const lm=new T.MeshBasicMaterial({color:0xfff8dc});
 const tm=new T.MeshBasicMaterial({color:0xd01828});
 const ex=(pts,dep,bv)=>{const s=new T.Shape();pts.forEach(([x,y],i)=>i?s.lineTo(x,y):s.moveTo(x,y));const o=new T.ExtrudeGeometry(s,{depth:dep,bevelEnabled:true,bevelSize:bv,bevelThickness:bv,bevelSegments:3});o.translate(0,0,-dep/2);return o};
 const bx=(w,h,l,m,x,y,z,rz,parent=body,cast=false)=>{const o=new T.Mesh(new T.BoxGeometry(w,h,l),m);o.position.set(x,y,z);if(rz)o.rotation.z=rz;if(cast)o.castShadow=true;parent.add(o);return o};

 // Main chassis body & glossy cockpit canopy
 const b=new T.Mesh(ex([[-2.32,.4],[2.42,.4],[2.54,.72],[1.65,.96],[.42,1.06],[-1.52,1.12],[-2.38,.94]],1.72,.22),paint);
 const cb=new T.Mesh(ex([[-1.25,1],[-.76,1.42],[.38,1.42],[.98,1]],1.12,.2),canopy);
 b.rotation.y=cb.rotation.y=-PI/2;b.castShadow=cb.castShadow=true;body.add(b,cb);
 bx(.92,.05,1.22,paint,0,1.64,-.2);
 // Racing dual hood stripes
 bx(.15,.028,2.1,trim,-.18,1.22,.85);bx(.15,.028,2.1,trim,.18,1.22,.85);
 bx(.16,.025,1.2,trim,-.16,1.69,-.2);bx(.16,.025,1.2,trim,.16,1.69,-.2);

 // Wheels with animated steering, spinning, glowing brake rotors & lightweight alloy spokes
 const rub=new T.MeshStandardMaterial({color:0x0f1218,roughness:.92}),rim=new T.MeshStandardMaterial({color:0xd8e0ee,metalness:1,roughness:.2});g.wh=[];
 for(const [wx,wz] of[[1.14,1.46],[-1.14,1.46],[1.14,-1.46],[-1.14,-1.46]]){
  const p=new T.Group(),w=new T.Group();
  const t=new T.Mesh(new T.CylinderGeometry(.55,.55,.52,14),rub);
  const r=new T.Mesh(new T.CylinderGeometry(.35,.35,.54,10),rim);
  const disc=new T.Mesh(new T.CylinderGeometry(.28,.28,.55,10),em);
  t.rotation.z=r.rotation.z=disc.rotation.z=PI/2;
  t.castShadow=true;
  w.add(t,r,disc);
  for(let a=0;a<2;a++){const spoke=new T.Mesh(new T.BoxGeometry(.57,.055,.62),rim);spoke.rotation.x=a*PI/2;w.add(spoke)}
  p.add(w);p.position.set(wx,.55,wz);g.add(p);g.wh.push({p,w,f:wz>0});
  bx(.13,.3,1.34,paint,wx*1.02,.96,wz);
 }

 // Headlights, glowing rear light bar, side skirts, neon strips & twin exhausts
 for(const s of[-1,1]){
  bx(.74,.13,.12,lm,s*.72,.8,2.63);
  bx(.82,.13,.09,tm,s*.55,.96,-2.58);
  bx(.11,.2,2.45,trim,s*1.22,.38,0);
  bx(.06,.08,3.45,em,s*1.11,.58,0);
  const e=new T.Mesh(new T.CylinderGeometry(.12,.12,.44,8),trim);e.rotation.x=PI/2;e.position.set(s*.52,.5,-2.62);body.add(e);
  // Subtle volumetric headlight cone
  const cone=new T.Mesh(new T.ConeGeometry(1.4,11,10,1,true),new T.MeshBasicMaterial({color:0xfff4cc,transparent:true,opacity:.09,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide}));
  cone.rotation.x=-PI/2;cone.position.set(s*.72,.68,8.2);body.add(cone);
 }
 // Full-width LED rear brake strip
 bx(1.4,.07,.08,tm,0,.96,-2.59);
 bx(2.34,.08,.52,trim,0,.28,2.72); // Front splitter
 bx(1.86,.13,.42,trim,0,.3,-2.62); // Rear diffuser
 bx(1.24,.26,.06,dark,0,.6,2.67); // Front intake grille

 // Articulated 3D Rotating Roof Turret & Twin Plasma Barrels
 const turret=new T.Group();
 turret.position.set(0,1.74,.82);
 const tBase=new T.Mesh(new T.CylinderGeometry(.3,.36,.2,12),trim);
 const tHousing=new T.Mesh(new T.BoxGeometry(.44,.22,.56),dark);tHousing.position.set(0,.1,.08);
 const tRing=new T.Mesh(new T.TorusGeometry(.32,.035,6,16),em);tRing.rotation.x=PI/2;tRing.position.y=-.04;
 const barrelGroup=new T.Group();barrelGroup.position.set(0,.12,.38);
 for(const s of[-1,1]){
  const brl=new T.Mesh(new T.CylinderGeometry(.045,.055,.9,8).rotateX(PI/2),dark);brl.position.set(s*.11,0,.4);
  const tip=new T.Mesh(new T.CylinderGeometry(.055,.055,.14,8).rotateX(PI/2),em);tip.position.set(s*.11,0,.85);
  barrelGroup.add(brl,tip);
 }
 turret.add(tBase,tHousing,tRing,barrelGroup);
 body.add(turret);
 g.turret=turret;g.barrels=barrelGroup;

 // Class-specific aero silhouettes
 if(d.n==='TITAN'||d.n==='RALLY'){
  bx(2.54,.52,.44,trim,0,.6,2.92);
  bx(1.48,.12,.22,lm,0,1.79,.1);
  for(const s of[-1,1])bx(.12,.58,1.76,trim,s*1.3,.8,.2);
 }else if(d.n==='ASSASSIN'){
  for(const s of[-1,1]){
   bx(.07,.74,.96,paint,s*.96,1.58,-2.32,s*.35);
   bx(.32,.26,1.35,dark,s*1.32,.62,.9);
   bx(.05,.05,1.4,em,s*1.12,1.1,-.9);
  }
  bx(1.66,.06,.44,paint,0,1.46,-2.42);
 }else if(d.n==='VECTOR'||d.n==='APEX'){
  bx(2.38,.07,.45,trim,0,.35,2.84);
  bx(1.98,.09,.62,paint,0,1.88,-2.42);
  for(const s of[-1,1])bx(.09,.42,.86,dark,s*1.18,1.1,.5);
 }else{
  bx(2.16,.09,.56,paint,0,1.78,-2.32);
  for(const s of[-1,1]){bx(.08,.52,.26,dark,s*.72,1.52,-2.32);bx(.06,.32,.62,paint,s*1.08,1.78,-2.32);bx(.04,.06,.58,em,s*1.1,1.78,-2.32)}
 }

 if(d.n==='APEX'){
  // Hypercar dorsal shark-fin & twin illuminated winglets
  bx(.74,.22,2.15,paint,0,.65,2.28);
  bx(.06,.52,1.9,paint,0,1.72,-1.35);
  bx(.08,.06,1.8,em,0,1.98,-1.35);
  for(const side of[-1,1]){bx(.56,.36,2.05,paint,side*1.28,.6,-.5);bx(.08,.64,.68,em,side*1.12,1.92,-2.42)}
  g.scale.y=.86;
 }
 if(d.n==='RALLY'){
  // Roll-cage bars, roof spotlights & elevated rugged stance
  bx(1.56,.15,1.56,trim,0,1.76,-.2);
  for(const side of[-1,1]){
   bx(.36,.24,.22,lm,side*.46,1.96,.42);
   bx(.14,.84,.14,trim,side*.74,1.42,-.52);
   bx(.14,.74,.14,trim,side*.74,1.42,.48);
  }
  g.scale.y=1.14;
 }

 // Dynamic Underglow Plane
 const ug=new T.Mesh(new T.PlaneGeometry(3.4,6.0),new T.MeshBasicMaterial({map:soft,color:carCol,transparent:true,opacity:.62,blending:T.AdditiveBlending,depthWrite:false}));
 ug.rotation.x=-PI/2;ug.position.y=.12;g.add(ug);

 // Headlight Road Pool
 const pool=new T.Mesh(new T.PlaneGeometry(9.5,24),new T.MeshBasicMaterial({map:soft,color:0xfff1c0,transparent:true,opacity:.28,blending:T.AdditiveBlending,depthWrite:false}));
 pool.rotation.x=-PI/2;pool.position.set(0,.11,14.5);g.add(pool);

 // Dual Afterburner Exhaust Flames
 g.fl=new T.Group();
 for(const s of[-1,1]){
  const jet=new T.Group();
  jet.add(
   new T.Mesh(new T.ConeGeometry(.34,1.35,10).translate(0,.68,0),new T.MeshBasicMaterial({color:0xff7a1a,transparent:true,opacity:.88,blending:T.AdditiveBlending,depthWrite:false})),
   new T.Mesh(new T.ConeGeometry(.16,.9,8).translate(0,.45,0),new T.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.95,blending:T.AdditiveBlending,depthWrite:false}))
  );
  jet.position.x=s*.52;
  g.fl.add(jet);
 }
 g.fl.rotation.x=-PI/2;g.fl.position.set(0,.5,-2.82);g.fl.visible=false;body.add(g.fl);

 // Soft Contact Shadow
 const shadow=new T.Mesh(new T.PlaneGeometry(4.2,6.6),new T.MeshBasicMaterial({map:soft,color:0x000000,transparent:true,opacity:.68,depthWrite:false}));
 shadow.rotation.x=-PI/2;shadow.position.y=.055;g.add(shadow);

 g.paint=paint;g.canopy=canopy;g.em=em;g.base=new T.Color(carCol);g.ug=ug;g.tm=tm;
 g.scale.set(d.w,g.scale.y,d.len);
 return g;
}

return {cars:CARS,finishes:FINISHES,applyFinish,create:mkCar,soft};
})();
