window.KartModels=(()=>{const T=THREE,PI=Math.PI,customPaint=null;const k=document.createElement('canvas');k.width=k.height=64;const x=k.getContext('2d'),gradient=x.createRadialGradient(32,32,0,32,32,32);gradient.addColorStop(0,'white');gradient.addColorStop(1,'transparent');x.fillStyle=gradient;x.fillRect(0,0,64,64);const soft=new T.CanvasTexture(k);
const CARS=[
 {n:'SCOUT',c:0x19e6ff,spd:1.15,arm:.8,acc:1.2,hdl:1.1,len:.95,w:.9,ult:'HYPER-WARP',desc:'Phase Dash & Invulnerability',ultCdMax:20,ultDur:2.5},
 {n:'TITAN',c:0xff8a1a,spd:.9,arm:1.6,acc:.8,hdl:.8,len:1.1,w:1.2,ult:'FORTRESS BARRIER',desc:'Reflect Missiles & Heavy Ram',ultCdMax:22,ultDur:4.0},
 {n:'ASSASSIN',c:0xff2a6d,spd:1.1,arm:.7,acc:1.1,hdl:1.2,len:1.05,w:.85,ult:'SHADOW CLOAK',desc:'Stealth, Break Locks & Dual Mines',ultCdMax:20,ultDur:4.5},
 {n:'VECTOR',c:0xa66bff,spd:1,arm:1,acc:1,hdl:1,len:1,w:1,ult:'OVERCLOCK OVERDRIVE',desc:'Infinite Boost & 2x Rapid-Fire',ultCdMax:24,ultDur:5.0},
 {n:'APEX',c:0xb6ff3b,spd:1.2,arm:.75,acc:1.1,hdl:1.15,len:1.12,w:.92,ult:'HYPER-WARP',desc:'Prototype • extreme speed',ultCdMax:22,ultDur:2.5,ability:0},
 {n:'RALLY',c:0xffd470,spd:.98,arm:1.25,acc:1.18,hdl:1.18,len:.92,w:1.12,ult:'FORTRESS BARRIER',desc:'All-terrain • heavy impact',ultCdMax:24,ultDur:3.5,ability:1}
];
function mkCar(d, col, isP){
 const carCol = col !== undefined ? col : (isP && customPaint ? parseInt(customPaint.slice(1), 16) : d.c);
 const g=new T.Group();
 const paint=new T.MeshPhysicalMaterial({color:carCol,metalness:.48,roughness:.3,clearcoat:1,clearcoatRoughness:.2});
 const dark=new T.MeshStandardMaterial({color:0x090e18,metalness:1,roughness:.12});
 const trim=new T.MeshStandardMaterial({color:0x1a2336,metalness:.9,roughness:.38});
 const em=new T.MeshBasicMaterial({color:carCol});
 const lm=new T.MeshBasicMaterial({color:0xfff6d0});
 const tm=new T.MeshBasicMaterial({color:0xb0121e});
 const ex=(pts,dep,bv)=>{const s=new T.Shape();pts.forEach(([x,y],i)=>i?s.lineTo(x,y):s.moveTo(x,y));const o=new T.ExtrudeGeometry(s,{depth:dep,bevelEnabled:true,bevelSize:bv,bevelThickness:bv,bevelSegments:3});o.translate(0,0,-dep/2);return o};
 const bx=(w,h,l,m,x,y,z,rz)=>{const o=new T.Mesh(new T.BoxGeometry(w,h,l),m);o.position.set(x,y,z);if(rz)o.rotation.z=rz;g.add(o);return o};

 // Main chassis body
 const b=new T.Mesh(ex([[-2.3,.4],[2.4,.4],[2.5,.75],[1.6,.95],[.4,1.05],[-1.5,1.1],[-2.35,.95]],1.7,.22),paint);
 const cb=new T.Mesh(ex([[-1.2,1],[-.75,1.4],[.35,1.4],[.95,1]],1.1,.2),dark);
 b.rotation.y=cb.rotation.y=-PI/2;g.add(b,cb);bx(.9,.05,1.2,paint,0,1.63,-.2);

 // Wheels with animated steering and spinning
 const rub=new T.MeshStandardMaterial({color:0x111111,roughness:.92}),rim=new T.MeshStandardMaterial({color:0xcfd6e4,metalness:1,roughness:.25});g.wh=[];
 for(const [x,z] of[[1.12,1.45],[-1.12,1.45],[1.12,-1.45],[-1.12,-1.45]]){
  const p=new T.Group(),w=new T.Group(),t=new T.Mesh(new T.CylinderGeometry(.54,.54,.5,20),rub),r=new T.Mesh(new T.CylinderGeometry(.34,.34,.52,10),rim),h=new T.Mesh(new T.CylinderGeometry(.1,.1,.55,6),dark);
  t.rotation.z=r.rotation.z=h.rotation.z=PI/2;w.add(t,r,h);p.add(w);p.position.set(x,.54,z);g.add(p);g.wh.push({p,w,f:z>0});bx(.12,.3,1.3,paint,x*1.02,.95,z);
 }

 // Headlights, Taillights, Neon Side Accents & Twin Exhaust Pipes
 for(const s of[-1,1]){
  bx(.7,.12,.1,lm,s*.7,.8,2.62); // Headlight lens
  bx(.8,.12,.08,tm,s*.5,.95,-2.57); // Taillight lens
  bx(.1,.2,2.4,trim,s*1.2,.38,0); // Skirt
  bx(.05,.07,3.4,em,s*1.09,.58,0); // Side neon strip
  const e=new T.Mesh(new T.CylinderGeometry(.11,.11,.4,8),trim);e.rotation.x=PI/2;e.position.set(s*.5,.5,-2.6);g.add(e); // Chrome exhaust
 }
 bx(2.3,.08,.5,trim,0,.28,2.7); // Front splitter
 bx(1.8,.12,.4,trim,0,.3,-2.6); // Rear diffuser
 bx(1.2,.25,.06,dark,0,.6,2.66); // Front intake grille

 // Turret & Top Gun
 const turret=new T.Mesh(new T.CylinderGeometry(.28,.34,.2,10),trim);turret.position.set(0,1.75,.9);g.add(turret);bx(.09,.09,1,dark,0,1.82,1.4);

 // Class-specific aero design
 if(d.n=='TITAN'||d.n=='RALLY'){
  bx(2.5,.5,.4,trim,0,.6,2.9); // Heavy bull-bar ram
  bx(1.4,.1,.2,lm,0,1.78,.1); // Roof light bar
  for(const s of[-1,1])bx(.1,.55,1.7,trim,s*1.28,.8,.2); // Armor plates
 }else if(d.n=='ASSASSIN'){
  for(const s of[-1,1]){
   bx(.06,.7,.9,paint,s*.95,1.55,-2.3,s*.35); // Stealth daggers
   bx(.3,.25,1.3,dark,s*1.3,.62,.9); // Air intakes
  }
  bx(1.6,.05,.4,paint,0,1.45,-2.4); // Stealth wing
 }else if(d.n=='VECTOR'||d.n=='APEX'){
  bx(2.3,.06,.4,trim,0,.35,2.8); // Formula stepped wing
  bx(1.9,.08,.6,paint,0,1.85,-2.4); // Formula rear wing
  for(const s of[-1,1])bx(.08,.4,.8,dark,s*1.15,1.1,.5); // Sidepods
 }else{
  bx(2.1,.08,.55,paint,0,1.75,-2.3); // Scout high wing
  for(const s of[-1,1]){bx(.08,.5,.25,dark,s*.7,1.5,-2.3);bx(.06,.3,.6,paint,s*1.05,1.75,-2.3)}
 }

 // Dynamic Underglow Plane matching exact car color
 const ug=new T.Mesh(new T.PlaneGeometry(3.2,5.8),new T.MeshBasicMaterial({map:soft,color:carCol,transparent:true,opacity:.55,blending:T.AdditiveBlending,depthWrite:false}));
 ug.rotation.x=-PI/2;ug.position.y=.12;g.add(ug);

 // Headlight Beam on road
 const pool=new T.Mesh(new T.PlaneGeometry(9,22),new T.MeshBasicMaterial({map:soft,color:0xfff1c0,transparent:true,opacity:.28,blending:T.AdditiveBlending,depthWrite:false}));
 pool.rotation.x=-PI/2;pool.position.set(0,.11,14);g.add(pool);

 // Exhaust Flames
 g.fl=new T.Group();
 g.fl.add(new T.Mesh(new T.ConeGeometry(.38,1.2,10).translate(0,.6,0),new T.MeshBasicMaterial({color:0xff7a1a,transparent:true,opacity:.85,blending:T.AdditiveBlending})),new T.Mesh(new T.ConeGeometry(.18,.8,8).translate(0,.4,0),new T.MeshBasicMaterial({color:0xffffff})));
 g.fl.rotation.x=-PI/2;g.fl.position.set(0,.5,-2.8);g.fl.visible=false;g.add(g.fl);

 // Signature aero, center stripe, brake discs and a soft contact shadow.
 bx(.16,.025,1.2,trim,-.16,1.69,-.2);bx(.16,.025,1.2,trim,.16,1.69,-.2);
 for(const wheel of g.wh){const disc=new T.Mesh(new T.CylinderGeometry(.28,.28,.54,16),em);disc.rotation.z=PI/2;wheel.w.add(disc);for(let a=0;a<5;a++){const spoke=new T.Mesh(new T.BoxGeometry(.56,.045,.6),rim);spoke.rotation.x=a*PI/5;wheel.w.add(spoke)}}
 if(d.n==='APEX'){bx(.7,.22,2.1,paint,0,.65,2.25);for(const side of[-1,1]){bx(.55,.35,2.0,paint,side*1.25,.6,-.5);bx(.08,.6,.65,em,side*1.1,1.9,-2.4)}g.scale.y=.85}
 if(d.n==='RALLY'){bx(1.5,.15,1.5,trim,0,1.75,-.2);for(const side of[-1,1]){bx(.35,.25,.2,lm,side*.5,1.95,.4);bx(.15,.8,.15,trim,side*.7,1.4,-.5)}g.scale.y=1.15}
 const shadow=new T.Mesh(new T.PlaneGeometry(4,6.4),new T.MeshBasicMaterial({map:soft,color:0x000000,transparent:true,opacity:.65,depthWrite:false}));shadow.rotation.x=-PI/2;shadow.position.y=.055;g.add(shadow);
 g.paint=paint;g.base=new T.Color(carCol);g.ug=ug;g.tm=tm;g.scale.set(d.w,g.scale.y,d.len);return g;
}

return {cars:CARS,create:mkCar}})();