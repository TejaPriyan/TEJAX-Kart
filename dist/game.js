(()=>{
const T=THREE,$=i=>document.getElementById(i),R=Math.random,PI=Math.PI,cl=(v,a,b)=>Math.max(a,Math.min(b,v)),HW=14,LAPS=3;
let state='menu',pl0=null,cars=[];
const prefs=window.KartSettings;
let elapsed=0,contactHits=new Map(),pickupRng=Math.random,trackLength=1,uiTick=0;
const roundTimers=new Set();
function later(fn,ms){const id=setTimeout(()=>{roundTimers.delete(id);fn()},ms);roundTimers.add(id);return id}
function cancelTimers(){for(const id of roundTimers)clearTimeout(id);roundTimers.clear()}
function removeEntity(o){if(!o)return;o.removeFromParent?o.removeFromParent():o.parent?.remove(o);const gs=new Set(),ms=new Set(),ts=new Set();o.traverse(n=>{if(n.geometry)gs.add(n.geometry);for(const m of(Array.isArray(n.material)?n.material:[n.material]))if(m){ms.add(m);for(const v of Object.values(m))if(v?.isTexture&&v!==soft)ts.add(v)}});gs.forEach(x=>x.dispose());ms.forEach(x=>x.dispose());ts.forEach(x=>x.dispose())}
function contactHit(target,amount,owner){const key=owner.uid+':'+target.uid;if((contactHits.get(key)||0)>elapsed)return;contactHits.set(key,elapsed+.65);hit(target,amount,owner)}
let carUID=0;

const CARS=[
 {n:'SCOUT',c:0x19e6ff,spd:1.15,arm:.8,acc:1.2,hdl:1.1,len:.95,w:.9,ult:'HYPER-WARP',desc:'Phase Dash & Invulnerability',ultCdMax:20,ultDur:2.5},
 {n:'TITAN',c:0xff8a1a,spd:.9,arm:1.6,acc:.8,hdl:.8,len:1.1,w:1.2,ult:'FORTRESS BARRIER',desc:'Reflect Missiles & Heavy Ram',ultCdMax:22,ultDur:4.0},
 {n:'ASSASSIN',c:0xff2a6d,spd:1.1,arm:.7,acc:1.1,hdl:1.2,len:1.05,w:.85,ult:'SHADOW CLOAK',desc:'Stealth, Break Locks & Dual Mines',ultCdMax:20,ultDur:4.5},
 {n:'VECTOR',c:0xa66bff,spd:1,arm:1,acc:1,hdl:1,len:1,w:1,ult:'OVERCLOCK OVERDRIVE',desc:'Infinite Boost & 2x Rapid-Fire',ultCdMax:24,ultDur:5.0},
 {n:'APEX',c:0xb6ff3b,spd:1.2,arm:.75,acc:1.1,hdl:1.15,len:1.12,w:.92,ult:'HYPER-WARP',desc:'Prototype • extreme speed',ultCdMax:22,ultDur:2.5,ability:0},
 {n:'RALLY',c:0xffd470,spd:.98,arm:1.25,acc:1.18,hdl:1.18,len:.92,w:1.12,ult:'FORTRESS BARRIER',desc:'All-terrain • heavy impact',ultCdMax:24,ultDur:3.5,ability:1}
];
const rd=new T.WebGLRenderer({canvas:$('c'),antialias:prefs.quality!=='low',powerPreference:'high-performance'});
rd.setPixelRatio(Math.min(devicePixelRatio,prefs.quality==='high'?2:prefs.quality==='low'?1:1.35));
rd.outputEncoding=T.sRGBEncoding;rd.toneMapping=T.ACESFilmicToneMapping;rd.toneMappingExposure=.85;

const sc=new T.Scene();sc.background=new T.Color(0x070b18);sc.fog=new T.Fog(0x070b18,90,520);
const envFaces=Array.from({length:6},(_,i)=>{const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const x=canvas.getContext('2d'),g=x.createLinearGradient(0,0,0,64);g.addColorStop(0,'#7392aa');g.addColorStop(.45,'#c5dbe5');g.addColorStop(.5,'#243944');g.addColorStop(1,'#081018');x.fillStyle=g;x.fillRect(0,0,64,64);return canvas});const envMap=new T.CubeTexture(envFaces);envMap.encoding=T.sRGBEncoding;envMap.needsUpdate=true;sc.environment=envMap;
const cam=new T.PerspectiveCamera(70,1,.5,1600);
const rs=()=>{rd.setSize(innerWidth,innerHeight);cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix()};addEventListener('resize',rs);rs();

const hl=new T.HemisphereLight(0x6a8cff,0x1a1020,.95);sc.add(hl);
const dl=new T.DirectionalLight(0xbcd0ff,.8);dl.position.set(-100,200,80);sc.add(dl);
let baseDLIntensity=.8;

const gr=new T.Mesh(new T.PlaneGeometry(2400,2400),new T.MeshStandardMaterial({color:0x0b101c,roughness:1}));
gr.rotation.x=-PI/2;gr.position.y=-.05;sc.add(gr);

/* ---------- SKY SYSTEM ---------- */
let sky,skyTex,skyCanvas=document.createElement('canvas');skyCanvas.width=4;skyCanvas.height=256;
skyTex=new T.CanvasTexture(skyCanvas);
sky=new T.Mesh(new T.SphereGeometry(900,24,16),new T.MeshBasicMaterial({map:skyTex,side:T.BackSide,fog:false}));sc.add(sky);
const sp=[];for(let i=0;i<500;i++){const a=R()*PI*2,e=.08+R()*1.2;sp.push(Math.cos(a)*Math.cos(e)*880,Math.sin(e)*880,Math.sin(a)*Math.cos(e)*880)}
const sg=new T.BufferGeometry();sg.setAttribute('position',new T.Float32BufferAttribute(sp,3));
sky.add(new T.Points(sg,new T.PointsMaterial({size:2.2,color:0xcfe0ff,fog:false,sizeAttenuation:false})));

function updateSky(c0,c1,c2,c3){
 const x=skyCanvas.getContext('2d'),r=x.createLinearGradient(0,0,0,256);
 r.addColorStop(0,c0);r.addColorStop(.55,c1);r.addColorStop(.78,c2);r.addColorStop(1,c3);
 x.fillStyle=r;x.fillRect(0,0,4,256);skyTex.needsUpdate=true;
}

/* ---------- TRACK DEFINITIONS & GENERATOR ---------- */
const TRACK_DEFS=[
 {
  n:'Neo City',ic:'🏙️',bg:0x070b18,fn:90,ff:520,hs:0x6a8cff,hg:0x1a1020,hi:.95,sc:0xbcd0ff,si:.8,gc:0x0b101c,asp:0x222838,edg:0x19e6ff,out:0xff2a8a,stp:0xffd27a,grp:1,thm:'city',
  sky:['#02030a','#0b1230','#2a1450','#07090f'],
  pts:[[0,0.5,0],[160,2.5,-20],[300,5.5,60],[330,4.0,200],[220,1.5,300],[60,3.5,250],[-40,6.5,340],[-200,5.0,300],[-260,2.0,160],[-150,0.8,60],[-100,1.5,-80]]
 },
 {
  n:'Crimson Canyon',ic:'🏜️',bg:0xc88668,fn:145,ff:650,hs:0xffe3bc,hg:0x623b36,hi:1.15,sc:0xffead4,si:1.2,gc:0x9b6248,asp:0x242a30,edg:0xff4d58,out:0xffcc85,stp:0xfff1da,grp:.94,thm:'canyon',
  sky:['#314b68','#ca806b','#ffd4a0','#ab664b'],
  pts:[[0,1.0,0],[140,6.5,-60],[260,14.0,-30],[320,9.5,120],[250,3.0,220],[120,8.5,180],[30,15.0,290],[-100,10.5,350],[-220,4.5,270],[-280,8.5,130],[-180,3.5,30],[-90,1.5,-40]]
 },
 {
  n:'Glacier Ridge',ic:'🏔️',bg:0x081525,fn:90,ff:500,hs:0x90d8ff,hg:0x08192d,hi:1.05,sc:0xd6f4ff,si:.95,gc:0x142b45,asp:0x203c58,edg:0x35e8ff,out:0x7be8ff,stp:0x35e8ff,grp:.82,thm:'glacier',
  sky:['#020814','#08223a','#104460','#081525'],
  pts:[[0,1.5,0],[130,3.0,-80],[250,8.5,-40],[290,14.0,80],[200,17.5,190],[90,12.0,170],[-20,6.0,220],[-140,3.5,250],[-230,9.0,180],[-260,15.0,70],[-160,8.5,-20],[-60,3.0,-50]]
 }
];

let curTrack=0,trackGrip=1,N=500,P=[],TN=[],NR=[],TY=[];
let bx0=1e9,bx1=-1e9,bz0=1e9,bz1=-1e9;
const trackGroup=new T.Group();sc.add(trackGroup);

function ribbon(a,b,yOff,color,dash,mat){
 const pos=[],idx=[];let k=0;
 for(let i=0;i<N;i++){
  if(dash&&i%dash>dash/2)continue;
  const j=(i+1)%N;
  for(const q of[i,j]){const p=P[q],n=NR[q],py=p.y+yOff;pos.push(p.x+n.x*a,py,p.z+n.z*a,p.x+n.x*b,py,p.z+n.z*b)}
  idx.push(k,k+2,k+1,k+1,k+2,k+3);k+=4
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();
 trackGroup.add(new T.Mesh(g,mat||new T.MeshBasicMaterial({color,side:T.DoubleSide})))
}

function wallRibbon(dist,height,color,op){
 const pos=[],idx=[];let k=0;
 for(let i=0;i<N;i++){
  const j=(i+1)%N;
  for(const q of[i,j]){
   const p=P[q],n=NR[q];const wx=p.x+n.x*dist,wz=p.z+n.z*dist;
   pos.push(wx,p.y+.05,wz,wx,p.y+height,wz);
  }
  idx.push(k,k+2,k+1,k+1,k+2,k+3);k+=4;
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();
 trackGroup.add(new T.Mesh(g,new T.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.4,transparent:!!op,opacity:op||.85,side:T.DoubleSide})));
}

function loadTrack(ti){
 curTrack=ti;const td=TRACK_DEFS[curTrack];
 sc.background.setHex(td.bg);sc.fog.color.setHex(td.bg);sc.fog.near=td.fn;sc.fog.far=td.ff;
 hl.color.setHex(td.hs);hl.groundColor.setHex(td.hg);hl.intensity=td.hi;
 dl.color.setHex(td.sc);dl.intensity=td.si;baseDLIntensity=td.si;
 gr.material.color.setHex(td.gc);
 trackGrip=td.grp;
 if(td.sky)updateSky(...td.sky);sky.children[0].visible=td.thm!=='canyon';

 while(trackGroup.children.length>0)removeEntity(trackGroup.children[0]);
 const curve=new T.CatmullRomCurve3(td.pts.map(([x,y,z])=>new T.Vector3(x,y,z)),true,'catmullrom',.5);
 P=curve.getSpacedPoints(N);P.pop();
 TN=P.map((p,i)=>P[(i+1)%N].clone().sub(P[(i+N-1)%N]).normalize());
 NR=TN.map(t=>{const l=Math.hypot(t.z,t.x)||1;return new T.Vector3(t.z/l,0,-t.x/l)});
 TY=P.map(p=>p.y);trackLength=P.reduce((a,p,i)=>a+p.distanceTo(P[(i+1)%N]),0);
 bx0=1e9;bx1=-1e9;bz0=1e9;bz1=-1e9;
 for(const p of P){bx0=Math.min(bx0,p.x);bx1=Math.max(bx1,p.x);bz0=Math.min(bz0,p.z);bz1=Math.max(bz1,p.z)}

 // Road ribbons
 const roadMat=new T.MeshStandardMaterial({color:td.asp,roughness:td.thm==='canyon'?.94:.45,envMapIntensity:td.thm==='canyon'?.15:1,side:T.DoubleSide});if(td.thm==='canyon')roadMat.color.convertSRGBToLinear();ribbon(-HW,HW,.05,0,0,roadMat);
 ribbon(-HW,-HW+.8,.08,td.edg);ribbon(HW-.8,HW,.08,td.edg);ribbon(-.15,.15,.08,td.stp,16);
 ribbon(-HW-2,-HW,.06,td.out,8);ribbon(HW,HW+2,.06,td.out,8);

 // 3D Physical Glowing Guardrail Walls (prevents clipping & flying off empty air)
 wallRibbon(-HW-.2,1.8,td.edg,.75);
 wallRibbon(HW+.2,1.8,td.out,.75);

 // Chevron turn signs for sharp curves
 const chGeo=new T.ConeGeometry(1.4,2.8,3).rotateZ(PI/2);
 const chMat=new T.MeshBasicMaterial({color:td.edg,side:T.DoubleSide});
 const chMesh=new T.InstancedMesh(chGeo,chMat,60);
 let chCount=0; const chObj=new T.Object3D();
 for(let i=4; i<N; i+=8){
  const t0=TN[(i+4)%N], t1=TN[(i-4+N)%N];
  const curveRate = (t0.x*t1.z - t0.z*t1.x);
  if(Math.abs(curveRate) > 0.08 && chCount < 60){
   const s = Math.sign(curveRate);
   const p = P[i], n = NR[i];
   chObj.position.set(p.x + n.x * s * (HW + 1.2), p.y + 2.4, p.z + n.z * s * (HW + 1.2));
   chObj.rotation.y = Math.atan2(TN[i].x, TN[i].z) + (s > 0 ? 0 : PI);
   chObj.updateMatrix();
   chMesh.setMatrixAt(chCount++, chObj.matrix);
  }
 }
 chMesh.count=chCount;
 trackGroup.add(chMesh);

 // Bridge Support Columns for elevated road sections
 const pilGeo=new T.CylinderGeometry(1.6,2.2,1,8);
 const pilMat=new T.MeshStandardMaterial({color:0x182030,roughness:.7,metalness:.4});
 const pillars=new T.InstancedMesh(pilGeo,pilMat,90);let pCount=0;const pObj=new T.Object3D();
 for(let i=0;i<N;i+=6){
  const p=P[i];
  if(p.y>2.2&&pCount<90){
   pObj.position.set(p.x,p.y/2,p.z);pObj.scale.set(1,p.y,1);pObj.updateMatrix();
   pillars.setMatrixAt(pCount++,pObj.matrix);
  }
 }
 pillars.count=pCount;trackGroup.add(pillars);

 if(td.thm==='city'){
  const w=document.createElement('canvas');w.width=32;w.height=64;const x=w.getContext('2d');x.fillStyle='#000';x.fillRect(0,0,32,64);
  for(let i=0;i<8;i++)for(let j=0;j<16;j++)if(R()<.45){x.fillStyle=['#ffd27a','#7ad7ff','#ff7ad9'][R()*3|0];x.fillRect(i*4+1,j*4+1,2,2)}
  const bm=new T.InstancedMesh(new T.BoxGeometry(1,1,1),new T.MeshStandardMaterial({color:0x10141f,emissive:0xffffff,emissiveMap:new T.CanvasTexture(w),roughness:.8}),260),o=new T.Object3D();let bi=0,tr=0;
  while(bi<260&&tr++<4000){const x=R()*1000-450,z=R()*900-350;let ok=true;for(let i=0;i<N;i+=6)if((P[i].x-x)**2+(P[i].z-z)**2<3200){ok=false;break}if(!ok)continue;
   const bw=14+R()*22,bh=20+R()*R()*150,bd=14+R()*22;o.position.set(x,bh/2,z);o.scale.set(bw,bh,bd);o.updateMatrix();bm.setMatrixAt(bi++,o.matrix)}
  bm.count=bi;trackGroup.add(bm);
  const lp=new T.InstancedMesh(new T.CylinderGeometry(.25,.3,9,6),new T.MeshStandardMaterial({color:0x333b4d}),100),lh=new T.InstancedMesh(new T.SphereGeometry(.9,8,6),new T.MeshBasicMaterial({color:0xffe9b0}),100);let li=0;
  for(let i=0;i<N;i+=10)for(const s of[-1,1]){const p=P[i],n=NR[i];o.scale.set(1,1,1);o.position.set(p.x+n.x*s*(HW+3.5),p.y+4.5,p.z+n.z*s*(HW+3.5));o.updateMatrix();lp.setMatrixAt(li,o.matrix);o.position.y=p.y+9.2;o.updateMatrix();lh.setMatrixAt(li++,o.matrix)}
  trackGroup.add(lp,lh);
 } else if(td.thm==='canyon'){
  // Unit-radius geometry: instance scale is the final radius, never radius squared.
  const random=KartCore.seeded(24831),geo=new T.CylinderGeometry(.72,1,1,7),mat=new T.MeshStandardMaterial({color:0xffffff,roughness:1});
  const rocks=new T.InstancedMesh(geo,mat,180),bands=new T.InstancedMesh(new T.CylinderGeometry(.84,.9,1,7),new T.MeshStandardMaterial({color:0xe1aa78,roughness:1}),180),o=new T.Object3D();let count=0;
  const rockBounds=[];
  for(let attempt=0;count<180&&attempt<6000;attempt++){
   const x=random()*1100-500,z=random()*1000-400,radius=10+random()*19,height=18+random()*random()*95;
   if(P.some(q=>Math.hypot(q.x-x,q.z-z)<radius+HW+13))continue;
   o.position.set(x,height/2,z);o.scale.set(radius,height,radius);o.rotation.y=random()*PI*2;o.updateMatrix();rocks.setMatrixAt(count,o.matrix);rocks.setColorAt(count,new T.Color([0x9c493c,0xbb6350,0x7f4038,0xca8060][count%4]).convertSRGBToLinear());
   o.position.y=height*.56;o.scale.y=height*.12;o.updateMatrix();bands.setMatrixAt(count,o.matrix);rockBounds.push({x,z,radius,height});count++;
  }
  rocks.count=bands.count=count;rocks.userData.rockBounds=rockBounds;trackGroup.add(rocks,bands);
  const posts=new T.InstancedMesh(new T.BoxGeometry(.45,2.8,.45),new T.MeshStandardMaterial({color:0xffd19a,emissive:0xff6745,emissiveIntensity:.25}),100);let n=0;
  for(let i=0;i<N;i+=10)for(const side of[-1,1]){const q=P[i],normal=NR[i];o.position.set(q.x+normal.x*side*(HW+3.5),q.y+1.4,q.z+normal.z*side*(HW+3.5));o.scale.set(1,1,1);o.rotation.y=0;o.updateMatrix();posts.setMatrixAt(n++,o.matrix)}trackGroup.add(posts);
 } else if(td.thm==='glacier'){
  const iceMat=new T.MeshStandardMaterial({color:0x4fa8d8,roughness:.15,metalness:.6});
  const bm=new T.InstancedMesh(new T.OctahedronGeometry(1),iceMat,220),o=new T.Object3D();let bi=0,tr=0;
  while(bi<220&&tr++<4000){const x=R()*1000-450,z=R()*900-350;let ok=true;for(let i=0;i<N;i+=6)if((P[i].x-x)**2+(P[i].z-z)**2<3400){ok=false;break}if(!ok)continue;
   const bw=12+R()*18,bh=20+R()*R()*110;o.position.set(x,bh/2,z);o.scale.set(bw,bh,bw);o.rotation.y=R()*PI*2;o.updateMatrix();bm.setMatrixAt(bi++,o.matrix)}
  bm.count=bi;trackGroup.add(bm);
  const gp=new T.InstancedMesh(new T.CylinderGeometry(.35,.4,8,6),new T.MeshBasicMaterial({color:0x35e8ff}),100);let li=0;
  for(let i=0;i<N;i+=10)for(const s of[-1,1]){const p=P[i],n=NR[i];o.scale.set(1,1,1);o.position.set(p.x+n.x*s*(HW+3.5),p.y+4,p.z+n.z*s*(HW+3.5));o.updateMatrix();gp.setMatrixAt(li++,o.matrix)}
  trackGroup.add(gp);
 }
 const gm=new T.MeshStandardMaterial({color:0x222a3c,metalness:.6,roughness:.4});
 for(const s of[-1,1]){const p=new T.Mesh(new T.BoxGeometry(2,14,2),gm);p.position.set(P[0].x+NR[0].x*s*(HW+2),P[0].y+7,P[0].z+NR[0].z*s*(HW+2));trackGroup.add(p)}
 const bn=new T.Mesh(new T.BoxGeometry(HW*2+5,2.4,1.2),new T.MeshBasicMaterial({color:0x111625}));bn.position.set(P[0].x,P[0].y+14,P[0].z);bn.rotation.y=Math.atan2(NR[0].x,NR[0].z)+PI/2;trackGroup.add(bn);
 const bnSign=new T.Mesh(new T.PlaneGeometry(HW*2+4,1.8),new T.MeshBasicMaterial({color:td.edg,side:T.DoubleSide}));
 bnSign.position.set(P[0].x,P[0].y+14,P[0].z);bnSign.rotation.y=Math.atan2(NR[0].x,NR[0].z)+PI/2;trackGroup.add(bnSign);
 if(state==='menu'&&pl0)place(pl0,3,0);
}

function near(c){
 let b=1e9,bi=c.idx;
 for(let k=-22;k<=22;k++){const i=(c.idx+k+N)%N,p=P[i],d=(p.x-c.x)**2+(p.z-c.z)**2;if(d<b){b=d;bi=i}}
 if(b>2500){for(let i=0;i<N;i++){const p=P[i],d=(p.x-c.x)**2+(p.z-c.z)**2;if(d<b){b=d;bi=i}}}
 c.idx=bi;c.lat=(c.x-P[bi].x)*NR[bi].x+(c.z-P[bi].z)*NR[bi].z;
}

/* ---------- SOFT GLOW TEXTURE ---------- */
const soft=(()=>{const k=document.createElement('canvas');k.width=k.height=64;const x=k.getContext('2d'),r=x.createRadialGradient(32,32,0,32,32,32);r.addColorStop(0,'#fff');r.addColorStop(.35,'#fffa');r.addColorStop(1,'#fff0');x.fillStyle=r;x.fillRect(0,0,64,64);return new T.CanvasTexture(k)})();

/* ---------- OPPONENT ROSTER & PAINTS ---------- */
let customPaint=null;
try{customPaint=localStorage.getItem('tk_paint');if(!/^#[0-9a-f]{6}$/i.test(customPaint))customPaint=null}catch(e){}

const BOT_ROSTER = [
 { n: 'VIPER', c: 0xff1744, hex: '#ff1744' },     // Neon Crimson
 { n: 'BLAZE', c: 0xff9100, hex: '#ff9100' },     // Solar Amber
 { n: 'NEXUS', c: 0x00e5ff, hex: '#00e5ff' },     // Electric Cyan
 { n: 'PHANTOM', c: 0xd500f9, hex: '#d500f9' },   // Cyber Violet
 { n: 'RAZOR', c: 0x00e676, hex: '#00e676' },     // Acid Green
 { n: 'VALKYRIE', c: 0xffd600, hex: '#ffd600' },   // Gold Ion
 { n: 'SPECTER', c: 0x651fff, hex: '#651fff' }    // Deep Indigo
];

/* ---------- CAR MODEL ---------- */
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

/* ---------- SKID MARKS ---------- */
const SK=300,sk=new T.InstancedMesh(new T.PlaneGeometry(.55,1.6).rotateX(-PI/2),new T.MeshBasicMaterial({color:0x04060b,transparent:true,opacity:.6,depthWrite:false}),SK),skd=new T.Object3D();let ski=0;
for(let i=0;i<SK;i++)sk.setMatrixAt(i,new T.Matrix4().makeScale(0,0,0));sk.frustumCulled=false;sc.add(sk);
function skid(c,fx,fz,rx,rz){
 const cy=TY[c.idx]||0;
 for(const s of[-1,1]){
  skd.position.set(c.x-fx*1.4+rx*s*1.1,cy+.12,c.z-fz*1.4+rz*s*1.1);
  skd.rotation.y=Math.atan2(c.vx,c.vz);skd.updateMatrix();sk.setMatrixAt(ski++%SK,skd.matrix);
 }
 sk.instanceMatrix.needsUpdate=true;
}

/* ---------- WEATHER SYSTEM ---------- */
let weather='clear',weatherT=0,lightningT=8,wetGrip=1;
const RAIN_N=800;
const rainPos=new Float32Array(RAIN_N*6);
const rainGeo=new T.BufferGeometry();
rainGeo.setAttribute('position',new T.BufferAttribute(rainPos,3));
const rain=new T.LineSegments(rainGeo,new T.LineBasicMaterial({color:0x7799cc,transparent:true,opacity:.35}));
rain.visible=false;rain.frustumCulled=false;sc.add(rain);
for(let i=0;i<RAIN_N;i++){const b=i*6;const x2=(R()-.5)*250,z2=(R()-.5)*250,y2=R()*60;
 rainPos[b]=x2;rainPos[b+1]=y2;rainPos[b+2]=z2;rainPos[b+3]=x2;rainPos[b+4]=y2-1.2;rainPos[b+5]=z2}
function updateWeather(dt){
 if(mpo){weather='clear';wetGrip=1;rain.visible=false;$('wx').textContent='';return}
 if(prefs.weather==='dynamic'){weatherT-=dt;if(weatherT<=0){weatherT=25+R()*35;weather=['clear','rain','storm'][Math.floor(R()*3)]}}
 if(weather==='clear'){rain.visible=false;wetGrip=1;$('wx').textContent='';return}
 rain.visible=true;wetGrip=weather==='storm'?.55:.75;
 $('wx').textContent=weather==='storm'?'⛈️ STORM':'🌧️ RAIN';
 const cx=pl0?pl0.x:0,cz=pl0?pl0.z:0,spd=weather==='storm'?80:50;
 for(let i=0;i<RAIN_N;i++){const b=i*6;
  rainPos[b+1]-=spd*dt;rainPos[b+4]-=spd*dt;
  if(rainPos[b+4]<-2){const x2=cx+(R()-.5)*250,z2=cz+(R()-.5)*250,y2=50+R()*30;
   rainPos[b]=x2;rainPos[b+1]=y2;rainPos[b+2]=z2;rainPos[b+3]=x2;rainPos[b+4]=y2-1.2;rainPos[b+5]=z2}}
 rainGeo.attributes.position.needsUpdate=true;
 if(weather==='storm'){lightningT-=dt;if(lightningT<=0){lightningT=4+R()*8;
  dl.intensity=4;later(()=>{dl.intensity=baseDLIntensity},80);
  later(()=>{dl.intensity=2.5;later(()=>{dl.intensity=baseDLIntensity},50)},180);
  later(()=>{if(AC&&!audioMuted)snd(55,1.2,'sawtooth',.12,.02)},400+R()*1200)}}
}

/* ---------- PARTICLES ---------- */
const PM=600,pp=new Float32Array(PM*3),pc=new Float32Array(PM*3),pv=new Float32Array(PM*3),pb=new Float32Array(PM*3),pl=new Float32Array(PM),pL=new Float32Array(PM).fill(1);let pn=0;
const pg=new T.BufferGeometry();
{pg.setAttribute('position',new T.BufferAttribute(pp,3));pg.setAttribute('color',new T.BufferAttribute(pc,3));
 const pts=new T.Points(pg,new T.PointsMaterial({size:.4,opacity:.65,map:soft,vertexColors:true,transparent:true,depthWrite:false,blending:T.AdditiveBlending}));pts.frustumCulled=false;sc.add(pts)}
const pa=(x,y,z,vx,vy,vz,life,r,g,b)=>{const i=pn++%PM;pp.set([x,y,z],i*3);pv.set([vx,vy,vz],i*3);pb.set([r,g,b],i*3);pl[i]=pL[i]=life};
const rings=[];let shake=0;
function boom(x,z,big,cy){const y0=cy||0,n=big?1:.35;
 for(let i=0;i<40*n;i++){const a=R()*PI*2,s=R()*16,u=R()*12;pa(x,y0+1.5,z,Math.cos(a)*s,u,Math.sin(a)*s,.5+R()*.5,1,.45,.1)}
 for(let i=0;i<30*n;i++){const a=R()*PI*2,s=15+R()*35;pa(x,y0+1.5,z,Math.cos(a)*s,R()*25,Math.sin(a)*s,.6+R()*.5,1,.9,.5)}
 for(let i=0;i<22*n;i++){const a=R()*PI*2,s=R()*7;pa(x,y0+2,z,Math.cos(a)*s,4+R()*7,Math.sin(a)*s,1.4+R(),.32,.32,.36)}
 const m=new T.Mesh(new T.RingGeometry(.8,1,32),new T.MeshBasicMaterial({color:0xffaa55,transparent:true,side:T.DoubleSide}));m.rotation.x=-PI/2;m.position.set(x,y0+.3,z);sc.add(m);rings.push({m,t:0,s:big?45:18});
 if(pl0){const d=Math.hypot(pl0.x-x,pl0.z-z);shake=Math.max(shake,(big?1:.3)/(1+d/40))}}

/* ---------- AUDIO SYSTEM ---------- */
let AC,eo,eg,master,audioMuted=prefs.volume===0;
function aud(){
 if(!AC){
  AC=new(window.AudioContext||window.webkitAudioContext)();
  master=AC.createGain();master.gain.value=prefs.volume/100;master.connect(AC.destination);eo=AC.createOscillator();eo.type='sawtooth';
  eg=AC.createGain();eg.gain.value=0;
  const f=AC.createBiquadFilter();f.frequency.value=650;
  eo.connect(f);f.connect(eg);eg.connect(master);
  eo.start();
 }
 if(AC&&AC.state==='suspended')AC.resume().catch(()=>{});
}
function snd(f,d,ty,v,sl,at){
 if(!AC||audioMuted||paused)return;
 if(at&&pl0)v/=1+Math.hypot(pl0.x-at.x,pl0.z-at.z)/35;
 if(v<.01)return;
 const t=AC.currentTime,o=AC.createOscillator(),g=AC.createGain();
 o.type=ty;o.frequency.setValueAtTime(f,t);
 o.frequency.exponentialRampToValueAtTime(Math.max(20,f*(sl||1)),t+d);
 g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.001,t+d);
 o.connect(g);g.connect(master);
 o.onended=()=>{o.disconnect();g.disconnect()};o.start();o.stop(t+d);
}

function toggleAudio(){
 audioMuted=!audioMuted;
 $('mubtn').textContent=audioMuted?'🔇':'🔊';
 $('p-mute').textContent=audioMuted?'Audio: OFF 🔇':'Audio: ON 🔊';
 if(audioMuted){stopMusic();if(eg)eg.gain.value=0}
 else if(state==='race'){startMusic()}
}
$('mubtn').onclick=e=>{e.stopPropagation();toggleAudio()};
$('p-mute').onclick=toggleAudio;

/* ---------- DYNAMIC SYNTH MUSIC ---------- */
let musicNodes=[],musicOn=false;
function startMusic(){
 if(!AC||musicOn||audioMuted)return;musicOn=true;
 const bss=AC.createOscillator();bss.type='triangle';bss.frequency.value=55;
 const bg=AC.createGain();bg.gain.value=.03;bss.connect(bg);bg.connect(master);bss.start();musicNodes.push(bss);
 for(const freq of[110,130.81,164.81]){const o=AC.createOscillator();o.type='sine';o.frequency.value=freq;
  const g=AC.createGain();g.gain.value=.01;const f=AC.createBiquadFilter();f.type='lowpass';f.frequency.value=350;
  o.connect(f);f.connect(g);g.connect(master);o.start();musicNodes.push(o)}
 const arpOsc=AC.createOscillator();arpOsc.type='sawtooth';const ag=AC.createGain();ag.gain.value=.012;
 const af=AC.createBiquadFilter();af.type='lowpass';af.frequency.value=700;
 arpOsc.connect(af);af.connect(ag);ag.connect(master);arpOsc.start();musicNodes.push(arpOsc);
 const notes=[220,261.63,329.63,392,329.63,261.63,220,174.61];let ni=0;
 const arpInt=setInterval(()=>{if(!musicOn){clearInterval(arpInt);return}
  arpOsc.frequency.setValueAtTime(notes[ni%notes.length],AC.currentTime);ni++},180);musicNodes.push({stop:()=>clearInterval(arpInt)})}
function stopMusic(){musicOn=false;musicNodes.forEach(n=>{try{if(n.stop)n.stop();if(n.disconnect)n.disconnect()}catch(e){}});musicNodes=[]}

/* ---------- STATE ---------- */
let prs=[],selCar=0,mpo=null,ns=0,mode=1,wave=0,wt=0,pu=[],mines=[],clk=0,fo=0,lockT=null,lockTm=0,ptime=0,warnT=0;
let camMode=0,paused=false,oilSlicks=[],lastCdNum=-1,driftSndT=0,bestLap=Infinity,lapStart=0;
const CAM_NAMES=['CHASE','WIDE','COCKPIT'];
const K={},M=[0,0,0],PUC=KartCombat.powers.map(p=>p.color),MODES=['Race','Combat','Elimination','Survival','Time trial'];

/* ---------- KILL FEED ---------- */
function addKF(text,color){color=color||'#ff2a8a';
 const d=document.createElement('div');d.className='kfm';d.style.borderColor=color;d.textContent=text;$('kf').appendChild(d);
 later(()=>{d.classList.add('out');later(()=>d.remove(),600)},2800)}

/* ---------- INPUT ---------- */
addEventListener('keydown',e=>{if(document.querySelector?.('dialog[open]')||['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName))return;const code=prefs.keys[e.code]||e.code;if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(code))e.preventDefault();K[code]=1;if(e.repeat)return;
 if(e.code=='KeyR'&&state!='menu'&&!mpo)start();
 if(e.code=='KeyC'&&state!='menu'&&state!=='count'){camMode=(camMode+1)%3;$('caminfo').textContent='📷 '+CAM_NAMES[camMode];$('caminfo').style.opacity='1';later(()=>$('caminfo').style.opacity='0',1500)}
 if((code=='KeyX'||code=='KeyZ')&&state=='race'&&!paused&&pl0)activateUlt(pl0);
 if(e.code=='Escape'&&state=='race')togglePause()});
addEventListener('keyup',e=>K[prefs.keys[e.code]||e.code]=0);
function resetInput(){Object.keys(K).forEach(k=>K[k]=0);M.fill(0);touchStr=touchThr=touchDrift=touchBoost=touchFire=touchMsl=touchGas=touchBrake=0;window.KartTilt?.reset()}
function togglePause(){if(mpo){$('pause').hidden=!$('pause').hidden;resetInput();return}if(state!=='race')return;paused=!paused;$('pause').hidden=!paused;resetInput();if(paused){stopMusic();if(eg)eg.gain.value=0}else startMusic()}
addEventListener('blur',()=>{resetInput();if(state==='race'&&!mpo&&!paused)togglePause()});
document.addEventListener('visibilitychange',()=>{if(document.hidden){resetInput();if(state==='race'&&!mpo&&!paused)togglePause()}});

addEventListener('mousedown',e=>{if(e.target===$('c')&&state==='race'&&!paused)M[e.button]=1});addEventListener('mouseup',e=>{M[e.button]=0});addEventListener('contextmenu',e=>e.preventDefault());

/* ---------- MOBILE TOUCH ---------- */
const isMobile='ontouchstart'in window||navigator.maxTouchPoints>0;
let touchStr=0,touchThr=0,touchDrift=0,touchBoost=0,touchFire=0,touchMsl=0,touchGas=0,touchBrake=0;
if(isMobile){$('touch').hidden=true;
 const joy=$('tjoy'),knob=$('tjknob');let jcx=0,jcy=0,jid=null;
 joy.addEventListener('touchstart',e=>{e.preventDefault();const t=e.changedTouches[0];jid=t.identifier;const r=joy.getBoundingClientRect();jcx=r.left+r.width/2;jcy=r.top+r.height/2},{passive:false});
 joy.addEventListener('touchmove',e=>{e.preventDefault();for(const t of e.changedTouches)if(t.identifier===jid){
  const dx=t.clientX-jcx,dy=t.clientY-jcy,mx2=52,d=Math.min(Math.hypot(dx,dy),mx2),a=Math.atan2(dy,dx);
  const nx=Math.cos(a)*d,ny=Math.sin(a)*d;knob.style.transform=`translate(calc(-50% + ${nx}px),calc(-50% + ${ny}px))`;
  touchStr=cl(dx/mx2,-1,1);touchThr=cl(-dy/mx2,-1,1)}},{passive:false});
 const jend=()=>{jid=null;touchStr=touchThr=0;knob.style.transform='translate(-50%,-50%)'};
 joy.addEventListener('touchend',e=>{if([...e.changedTouches].some(t=>t.identifier===jid))jend()});joy.addEventListener('touchcancel',jend);
 function tbind(id,fn){const el=$(id);if(!el)return;el.addEventListener('touchstart',e=>{e.preventDefault();fn(1);el.classList.add('act')},{passive:false});
  el.addEventListener('touchend',()=>{fn(0);el.classList.remove('act')});el.addEventListener('touchcancel',()=>{fn(0);el.classList.remove('act')})}
 tbind('tgas',v=>touchGas=v);tbind('tbrake',v=>touchBrake=v);tbind('tboost',v=>touchBoost=v);tbind('tfire',v=>touchFire=v);tbind('tmsl',v=>touchMsl=v);tbind('tdrift',v=>touchDrift=v);tbind('tult',v=>{if(v&&pl0)activateUlt(pl0)});tbind('tmine',v=>{if(v)mine(pl0)});tbind('temp',v=>{if(v)empBlast(pl0)});tbind('toil',v=>{if(v)dropOil(pl0)});$('tcam').onclick=()=>{camMode=(camMode+1)%3}}

/* ---------- CAR FACTORY ---------- */
function mk(d,isP,col,botName,colHex){
 const carCol=isP?(customPaint?parseInt(customPaint.slice(1),16):d.c):(col!==undefined?col:d.c);
 const m=mkCar(d,carCol,isP);
 if(isP&&customPaint){m.base.set(customPaint);m.paint.color.set(customPaint)}
 sc.add(m);const muzzle=new T.Mesh(new T.ConeGeometry(.2,.8,6).rotateX(PI/2),new T.MeshBasicMaterial({color:0xcaffff,transparent:true,opacity:.9,depthWrite:false}));muzzle.position.set(0,1.7,3.1);muzzle.visible=false;m.add(muzzle);m.muzzle=muzzle;const s=new T.Mesh(new T.SphereGeometry(3,16,12),new T.MeshBasicMaterial({color:0x35b0ff,transparent:true,opacity:.25,blending:T.AdditiveBlending,depthWrite:false}));s.position.y=1.2;s.visible=false;m.add(s);m.sh=s;
 const fsh=new T.Mesh(new T.DodecahedronGeometry(3.6,1),new T.MeshBasicMaterial({color:0xffaa20,wireframe:true,transparent:true,opacity:.85,blending:T.AdditiveBlending}));
 fsh.position.y=1.2;fsh.visible=false;m.add(fsh);m.fsh=fsh;
 const ultType=d.ability??CARS.findIndex(x=>x.n===d.n);
 const cHex=isP?(customPaint||'#'+d.c.toString(16).padStart(6,'0')):(colHex||'#'+carCol.toString(16).padStart(6,'0'));
 const name=isP?'PLAYER':(botName||d.n);
 return{uid:++carUID,sh:0,mn:0,d,m,isP,name,col:carCol,colHex:cHex,x:0,z:0,h:0,pitch:0,vx:0,vz:0,vf:0,vl:0,hp:100,bo:100,lap:0,checkpoint:0,idx:0,lat:0,dead:0,inv:0,mg:0,ms:0,off:0,kills:0,fin:0,rapid:0,plasma:0,magnet:0,emp:0,oil:0,flash:0,skill:1,lane:0,st:0,spin:0,ultCd:0,ultActive:0,ultType:ultType<0?0:ultType}
}
function place(c,i,lat){const p=P[i];c.x=p.x+NR[i].x*lat;c.z=p.z+NR[i].z*lat;c.h=Math.atan2(TN[i].x,TN[i].z);c.vx=c.vz=c.vf=c.vl=0;c.idx=i}
function menuCar(){if(pl0)removeEntity(pl0.m);pl0=mk(CARS[selCar],true);place(pl0,3,0);pl0.m.position.set(pl0.x,TY[pl0.idx],pl0.z);pl0.m.rotation.y=pl0.h;cars=[pl0]}
function bots(n,sk,base=7){
 for(let i=0;i<n;i++){
  const botInfo=BOT_ROSTER[i%BOT_ROSTER.length];
  const carDef=CARS[i%CARS.length];
  const b=mk(carDef,false,botInfo.c,botInfo.n,botInfo.hex);
  b.skill=sk+R()*.08;
  b.lane=(R()-.5)*12;
  place(b,(base+i*4)%N,i%2?-5:5);
  cars.push(b);
 }
}

function start(){
 cancelTimers();contactHits.clear();resetInput();elapsed=0;uiTick=0;lockT=null;lockTm=0;dl.intensity=baseDLIntensity;$('flash').style.opacity='0';$('empfl').style.opacity='0';$('cd').textContent='';
 for(const r of rings)removeEntity(r.m);rings.length=0;pl.fill(0);pc.fill(0);
 for(let i=0;i<SK;i++)sk.setMatrixAt(i,new T.Matrix4().makeScale(0,0,0));sk.instanceMatrix.needsUpdate=true;
 if(!mpo)pickupRng=KartCore.seeded(Date.now());
 $('touch').hidden=!isMobile;$('pause-label').textContent=mpo?'PIT MENU • RACE CONTINUES':'PAUSED';

 for(const c of cars)removeEntity(c.m);for(const p of prs)removeEntity(p.m);for(const m of mines)removeEntity(m.m);for(const p of pu)removeEntity(p.m);for(const o of oilSlicks)removeEntity(o.m);
 prs=[];mines=[];pu=[];oilSlicks=[];fo=0;wave=1;wt=0;lastCdNum=-1;paused=false;$('pause').hidden=true;$('kf').innerHTML='';
 bestLap=Infinity;lapStart=0;$('bestlap').textContent='';
 weather=mpo?'clear':(prefs.weather==='dynamic'?(R()<.3?'rain':'clear'):prefs.weather);weatherT=20+R()*30;
 pl0=mk(CARS[selCar],true);cars=[pl0];const my=mpo?mpo.indexOf(NET.me):0;place(pl0,3+my*4,mpo?(my%2?-5:5):0);
 if(mpo){for(const o of NET.players)if(o.id!=NET.me){const r=mk(CARS[o.car],false,parseInt(o.paint.slice(1),16),o.name,o.paint),k=mpo.indexOf(o.id);r.r=1;r.id=o.id;place(r,3+k*4,k%2?-5:5);r.tx=r.x;r.tz=r.z;r.th=r.h;cars.push(r)}}else if(mode!==4)bots(mode==3?3:5,prefs.difficulty==='rookie'?.72:prefs.difficulty==='expert'?1:.86);
 for(let i=0;i<8;i++){const ty=mode===0||mode===4?i%3:i,m=pickupModel(ty);sc.add(m);pu.push({m,i:(i*62+30)%N,ty,lat:(pickupRng()-.5)*12,t:0,pending:0})}
 state='count';clk=3.4;shake=0;$('menu').hidden=$('end').hidden=true;$('hud').hidden=false;aud();startMusic()}
const rank=c=>{const s=o=>o.fin?1e6-o.fin:o.lap*N+o.idx;return 1+cars.filter(o=>s(o)>s(c)).length};

function pickupModel(type){
 const group=new T.Group(),mat=new T.MeshBasicMaterial({color:PUC[type]}),add=(geo,x=0,y=0,z=0)=>{const m=new T.Mesh(geo,mat);m.position.set(x,y,z);group.add(m);return m};
 if(type===0){add(new T.BoxGeometry(.45,1.7,.4));add(new T.BoxGeometry(1.7,.45,.4))}
 else if(type===1){add(new T.ConeGeometry(.65,1.5,4),0,.2);add(new T.ConeGeometry(.5,1,4),0,-.6).rotation.z=PI}
 else if(type===2)add(new T.OctahedronGeometry(1));
 else if(type===3){add(new T.CylinderGeometry(.3,.3,1.5,8));add(new T.ConeGeometry(.3,.6,8),0,1)}
 else if(type===4){add(new T.BoxGeometry(.4,1.5,.4),-.45);add(new T.BoxGeometry(.4,1.5,.4),.45)}
 else if(type===5){add(new T.IcosahedronGeometry(.75));add(new T.TorusGeometry(1.1,.08,5,20)).rotation.x=PI/3}
 else if(type===6)add(new T.TorusGeometry(.7,.22,6,16,PI*1.5)).rotation.z=-PI/4;
 else{add(new T.TorusGeometry(.8,.15,6,20));add(new T.BoxGeometry(.25,2,.25))}
 const ring=add(new T.TorusGeometry(1.45,.06,5,24),0,-1.2);ring.rotation.x=PI/2;
 const canvas=document.createElement('canvas');canvas.width=128;canvas.height=32;const x=canvas.getContext('2d');x.fillStyle='#09131ee6';x.fillRect(0,0,128,32);x.font='bold 18px sans-serif';x.textAlign='center';x.fillStyle='#'+PUC[type].toString(16).padStart(6,'0');x.fillText(KartCombat.powers[type].short,64,23);
 const label=new T.Sprite(new T.SpriteMaterial({map:new T.CanvasTexture(canvas),transparent:true,depthWrite:false}));label.scale.set(3.2,.8,1);label.position.y=2;group.add(label);return group;
}
function collectPower(c,type){KartCombat.applyPower(c,type);if(c.isP)addKF(KartCombat.powers[type].name.toUpperCase()+' ACTIVE','#'+PUC[type].toString(16).padStart(6,'0'));snd(700,.18,'sine',.1,1.5,c)}
function combatState(c){return {x:c.x,y:(TY[c.idx]||0)+1.7,z:c.z,h:c.h,vx:c.vx,vz:c.vz,dead:c.dead,cloaked:c.ultActive>0&&c.ultType===2,car:c}}
function detectTarget(c,current=null){const targets=cars.filter(o=>o!==c).map(combatState),old=targets.find(t=>t.car===current);return KartCombat.acquire(combatState(c),targets,(a,b)=>KartCombat.clearShot(a,b,P),old)?.car||null}
function aimAt(c,target,ty){const a=combatState(c);a.x+=Math.sin(c.h)*3;a.z+=Math.cos(c.h)*3;return KartCombat.aim(a,target?combatState(target):null,ty?90:235+Math.max(c.vf,0))}
/* ---------- COMBAT ---------- */

function proj(c,ty,a,t,vertical,remote=false){
 const shot=c.isP?++NET.shot:0;const vy=vertical??(t?aimAt(c,t,ty).vy:0);if(c.isP&&mpo&&!remote)NET.send({t:'ev',k:ty,a,tg:t?.id,shot});
 const cy=TY[c.idx]||0;
 const px=c.x+Math.sin(c.h)*3,pz=c.z+Math.cos(c.h)*3,py=cy+1.7;
 let m,s;
 if(ty){
  // 3D Missile Rocket with Warhead, Stabilizing Fins, and Thruster
  const g=new T.Group();
  const body=new T.Mesh(new T.CylinderGeometry(.22,.22,2.2,8).rotateX(PI/2),new T.MeshStandardMaterial({color:0x202838,metalness:.8,roughness:.3}));
  const nose=new T.Mesh(new T.ConeGeometry(.22,.7,8).rotateX(PI/2),new T.MeshBasicMaterial({color:0xff2a4b}));
  nose.position.z=1.35;
  const fMat=new T.MeshBasicMaterial({color:0xff8a1a,side:T.DoubleSide});
  const f1=new T.Mesh(new T.PlaneGeometry(1,.4),fMat);f1.position.z=-.8;
  const f2=new T.Mesh(new T.PlaneGeometry(.4,1),fMat);f2.position.z=-.8;
  const thr=new T.Mesh(new T.CylinderGeometry(.14,.18,.3,8).rotateX(PI/2),new T.MeshBasicMaterial({color:0xffd000}));
  thr.position.z=-1.15;
  g.add(body,nose,f1,f2,thr);
  m=g;s=68+Math.max(c.vf,0);
 }else{
  // Dual-core Luminous Plasma Blaster
  const isVec=c.ultActive>0&&c.ultType===3;
  const g=new T.Group();
  const core=new T.Mesh(new T.CylinderGeometry(.12,.12,2.4,6).rotateX(PI/2),new T.MeshBasicMaterial({color:0xffffff}));
  const glow=new T.Mesh(new T.CylinderGeometry(.28,.28,2.9,6).rotateX(PI/2),new T.MeshBasicMaterial({color:c.plasma>0?0xff66d4:isVec||c.rapid>0?0xc49cff:0x66e8ff,transparent:true,opacity:.8,blending:T.AdditiveBlending,depthWrite:false}));
  g.add(core,glow);
  if(c.plasma>0){const halo=new T.Mesh(new T.TorusGeometry(.48,.09,5,12),new T.MeshBasicMaterial({color:0xff86e1,transparent:true,opacity:.8,depthWrite:false}));g.add(halo)}
  else if(c.rapid>0){for(const side of[-1,1]){const rail=new T.Mesh(new T.BoxGeometry(.07,.07,3.8),new T.MeshBasicMaterial({color:0xe4c7ff}));rail.position.x=side*.33;g.add(rail)}}
  m=g;s=235+Math.max(c.vf,0);
 }
 const p={m,o:c,ty,a,s,t,shot,vy,damage:ty?35:c.plasma>0?9:4,x:px,y:py,z:pz,ox:px,oz:pz,life:ty?6:.95,idx:c.idx};
 m.position.set(px,py,pz);m.rotation.y=a;m.rotation.x=-Math.atan2(vy,s);sc.add(m);prs.push(p);c.flash=.045;
}
function hit(c,amt,by,server=false){
 if(mpo&&!server)return;
 if(c.dead||c.inv>0)return;
 if(c.sh>0){c.m.sh.material.opacity=.8;return}
 c.hp-=amt/c.d.arm;
 const cy=TY[c.idx]||0;
 for(let i=0;i<6;i++)pa(c.x,cy+1.4,c.z,(R()-.5)*20,R()*12,(R()-.5)*20,.4,1,.8,.3);
 if(c.isP){shake=Math.max(shake,.35);$('flash').style.opacity=.55;later(()=>$('flash').style.opacity=0,120)}
 if(c.hp<=0){
  c.hp=0;c.dead=(mode===2||mode===3)?9e9:3.5;c.m.visible=false;boom(c.x,c.z,1,cy);snd(110,.9,'sawtooth',.35,.15,c);
  if(by&&by!==c&&state==='race'){
   by.kills++;
   const kName=by.name||by.d.n, vName=c.name||c.d.n;
   if(by.isP)addKF('💥 Destroyed '+vName+'!',c.colHex||'#ff2a8a');
   else if(c.isP)addKF('☠️ '+kName+' destroyed you!',by.colHex||'#ff4444');
   else addKF('💥 '+kName+' eliminated '+vName,by.colHex||'#8fa3c4');
  }
 }
}
const fire=(c,ty)=>{
 if(c.dead||c.fin||mode===0||mode===4||state!=='race'||paused||(c.isP&&!$('pause').hidden))return;
 if(ty){
  if(c.ms>0)return;
  c.ms=c.isP?4:7;
  const target=detectTarget(c,c.isP?lockT:c.tgt),aim=aimAt(c,target,1);proj(c,1,aim.a,target,aim.vy);
  snd(300,.5,'sawtooth',.2,.3,c);
 }else{
  if(c.mg>0)return;
  const isVec=c.ultActive>0&&c.ultType===3;
  c.mg=(isVec||c.rapid>0)?.045:.12;
  const target=detectTarget(c,c.isP?lockT:c.tgt),aim=aimAt(c,target,0);proj(c,0,aim.a,target,aim.vy);
  if(c.isP){
   const chEl=$('crosshair');
   if(chEl){chEl.classList.add('recoil');later(()=>chEl.classList.remove('recoil'),70)}
  }
  const cy=TY[c.idx]||0;
  for(let i=0;i<2;i++)pa(c.x+Math.sin(c.h)*3,cy+1,c.z+Math.cos(c.h)*3,0,1,0,.08,isVec?.8:1,isVec?.25:.9,isVec?1:.4);
  snd(isVec?720:540,.06,'square',isVec?.08:.06,isVec?.6:.4,c);
 }
};

/* ---------- EMP BLAST ---------- */
function empBlast(c){if(c.dead||c.emp>0||mode===0||mode===4||paused||state!=='race')return;c.emp=10;
 const cy=TY[c.idx]||0;
 for(const o of cars){if(o===c||o.dead||o.r)continue;const d=Math.hypot(o.x-c.x,o.z-c.z);
  if(d<28){const nx=(o.x-c.x)/(d||1),nz=(o.z-c.z)/(d||1);o.vx+=nx*25;o.vz+=nz*25;hit(o,18,c)}}
 for(let i=0;i<3;i++){later(()=>{const m2=new T.Mesh(new T.RingGeometry(.8,1.5,32),new T.MeshBasicMaterial({color:0x19e6ff,transparent:true,side:T.DoubleSide}));
  m2.rotation.x=-PI/2;m2.position.set(c.x,cy+1,c.z);sc.add(m2);rings.push({m:m2,t:0,s:22+i*7})},i*70)}
 for(let i=0;i<25;i++){const a=R()*PI*2,s=R()*18;pa(c.x,cy+2,c.z,Math.cos(a)*s,R()*12,Math.sin(a)*s,.5+R()*.3,.1,.9,1)}
 $('empfl').style.opacity='.6';later(()=>$('empfl').style.opacity='0',200);
 snd(150,.7,'square',.18,.08);snd(2000,.25,'sine',.08,.5);
 if(c.isP)addKF('⚡ EMP Blast!','#19e6ff');if(c.isP&&mpo)NET.send({t:'ev',k:2,a:0})}

/* ---------- OIL SLICK ---------- */
function dropOil(c){if(c.dead||c.oil>0||mode===0||mode===4||mpo||paused||state!=='race')return;c.oil=8;
 const cy=TY[c.idx]||0;
 const m=new T.Mesh(new T.CircleGeometry(3.2,16),new T.MeshBasicMaterial({color:0x151515,transparent:true,opacity:.55,depthWrite:false,side:T.DoubleSide}));
 m.rotation.x=-PI/2;const ox=c.x-Math.sin(c.h)*4,oz=c.z-Math.cos(c.h)*4;
 m.position.set(ox,cy+.1,oz);sc.add(m);oilSlicks.push({m,x:ox,y:cy+.1,z:oz,o:c,t:0,life:14})}

/* ---------- UNIQUE DRIVER ULTIMATES ---------- */
function activateUlt(c,remote=false){
 if(c.dead||c.ultActive>0||c.ultCd>0||state!='race'||paused||mode===0||mode===4)return;
 if(mpo&&!remote){if(c.isP&&performance.now()>(c.ultRequestUntil||0)){c.ultRequestUntil=performance.now()+500;NET.send({t:'ability'})}return}
 const cdMax=c.d.ultCdMax||20,dur=c.d.ultDur||3;
 c.ultActive=dur;c.ultCd=cdMax;
 const cy=TY[c.idx]||0;
 if(c.ultType===0){
  // SCOUT: HYPER-WARP (Invulnerable 180% speed dash passing through rivals)
  c.inv=dur;
  const fx=Math.sin(c.h),fz=Math.cos(c.h);
  c.vx+=fx*26;c.vz+=fz*26;
  for(let i=0;i<32;i++){const a=R()*PI*2,s=8+R()*18;pa(c.x,cy+1.2,c.z,Math.cos(a)*s,R()*6,Math.sin(a)*s,.6,.1,.9,1)}
  const m2=new T.Mesh(new T.RingGeometry(1,4.5,32),new T.MeshBasicMaterial({color:0x19e6ff,transparent:true,side:T.DoubleSide}));
  m2.rotation.x=-PI/2;m2.position.set(c.x,cy+1,c.z);sc.add(m2);rings.push({m:m2,t:0,s:35});
  if(c.isP){shake=Math.max(shake,.45);addKF('⚡ HYPER-WARP ACTIVATED!','#19e6ff')}
  else addKF('⚡ '+c.d.n+' activated Hyper-Warp!','#19e6ff');
  snd(440,.45,'sawtooth',.28,3,c);snd(1200,.35,'sine',.22,.5,c);
 }else if(c.ultType===1){
  // TITAN: FORTRESS BARRIER (Reflect Missiles & Heavy Ram)
  c.inv=dur;
  if(c.m.fsh)c.m.fsh.visible=true;
  for(let i=0;i<26;i++){const a=R()*PI*2,s=6+R()*14;pa(c.x,cy+1.2,c.z,Math.cos(a)*s,R()*5,Math.sin(a)*s,.7,1,.6,.1)}
  const m2=new T.Mesh(new T.RingGeometry(1.2,4.5,32),new T.MeshBasicMaterial({color:0xff8a1a,transparent:true,side:T.DoubleSide}));
  m2.rotation.x=-PI/2;m2.position.set(c.x,cy+1,c.z);sc.add(m2);rings.push({m:m2,t:0,s:30});
  if(c.isP){shake=Math.max(shake,.5);addKF('🛡️ FORTRESS BARRIER ACTIVE!','#ff8a1a')}
  else addKF('🛡️ '+c.d.n+' activated Fortress Barrier!','#ff8a1a');
  snd(160,.75,'sawtooth',.32,.4,c);snd(640,.5,'triangle',.22,1.5,c);
 }else if(c.ultType===2){
  // ASSASSIN: SHADOW CLOAK (Optical Stealth, Break Missile Locks, Deploy Dual Mines)
  if(lockT===c){lockT=null;lockTm=0}
  for(const p of prs)if(p.t===c)p.t=null;
  mine(c,true,-.8);mine(c,true,.8);
  for(let i=0;i<28;i++){const a=R()*PI*2,s=5+R()*12;pa(c.x,cy+1.2,c.z,Math.cos(a)*s,2+R()*5,Math.sin(a)*s,.8,1,.15,.5)}
  if(c.isP){shake=Math.max(shake,.3);addKF('👤 SHADOW CLOAK ENGAGED!','#ff2a6d')}
  else addKF('👤 '+c.d.n+' engaged Shadow Cloak!','#ff2a6d');
  snd(880,.4,'sine',.2,.2,c);snd(220,.6,'triangle',.25,.6,c);
 }else if(c.ultType===3){
  // VECTOR: OVERCLOCK OVERDRIVE (Unlimited Boost & 2x Fire Rate)
  c.bo=100;c.mg=0;
  for(let i=0;i<32;i++){const a=R()*PI*2,s=8+R()*18;pa(c.x,cy+1.2,c.z,Math.cos(a)*s,3+R()*8,Math.sin(a)*s,.7,.7,.3,1)}
  const m2=new T.Mesh(new T.RingGeometry(1,4.5,32),new T.MeshBasicMaterial({color:0xa66bff,transparent:true,side:T.DoubleSide}));
  m2.rotation.x=-PI/2;m2.position.set(c.x,cy+1,c.z);sc.add(m2);rings.push({m:m2,t:0,s:38});
  if(c.isP){shake=Math.max(shake,.45);addKF('⚡ OVERCLOCK OVERDRIVE!','#a66bff')}
  else addKF('⚡ '+c.d.n+' overclocked systems!','#a66bff');
  snd(350,.6,'sawtooth',.3,2.5,c);snd(980,.4,'square',.2,1.8,c);
 }
}

function endGame(t,win){if(state!='race')return;state='end';stopMusic();ptime=elapsed;let s;try{s=KartCore.career(localStorage.getItem('tk'))}catch(e){s=KartCore.career(null)};
 const cr=pl0.kills*50+(win?500:100);s.r++;s.w+=win?1:0;s.k+=pl0.kills;s.c+=cr;try{localStorage.setItem('tk',JSON.stringify(s))}catch(e){console.warn('storage unavailable',e)}
 addKF(win?'🏆 Victory!':'Race Complete',win?'#35ff9a':'#19e6ff');
 later(()=>{$('et').textContent=t;$('es').innerHTML='Time '+ptime.toFixed(1)+' s &nbsp; Kills '+pl0.kills+' &nbsp; +'+cr+' credits<br>Career: '+s.r+' races, '+s.w+' wins, '+s.k+' kills, '+s.c+' credits';$('end').hidden=false;$('touch').hidden=true;window.updateCareer?.()},900)}
const mine=(c,ability=false,side=0)=>{if(c.dead||(!ability&&c.mn>0)||mode===0||mode===4||mpo||paused||state!=='race')return;if(!ability)c.mn=6;const cy=TY[c.idx]||0;const m=new T.Mesh(new T.CylinderGeometry(1,1.2,.4,10),new T.MeshBasicMaterial({color:0xff2030}));
 const mx=c.x-Math.sin(c.h)*3.5+Math.cos(c.h)*side,mz=c.z-Math.cos(c.h)*3.5-Math.sin(c.h)*side;m.position.set(mx,cy+.3,mz);sc.add(m);mines.push({m,o:c,x:mx,y:cy+.3,z:mz,t:0})};

/* ---------- PHYSICS ---------- */
function drive(c,dt,i){
 const fx=Math.sin(c.h),fz=Math.cos(c.h),rx=fz,rz=-fx,d=c.d;
 let vf=c.vx*fx+c.vz*fz,vl=c.vx*rx+c.vz*rz;
 const bo=i.boost&&c.bo>0&&!c.dead;c.bo=bo?c.bo-dt*28:Math.min(100,c.bo+dt*7);
 if(c.ultActive>0&&c.ultType===3)c.bo=100;
 let mx=60*d.spd*c.skill*(bo?1.45:1)*(c.off?.55:1)*(c.hp<25?.75:1);
 if(c.ultActive>0&&c.ultType===0){mx*=1.8;vf+=65*dt}
 if(i.thr<0&&vf>1)vf-=75*dt;else vf+=i.thr*36*d.acc*(bo?2:1)*(c.hp<50?.85:1)*dt;if(!i.thr)vf*=1-.35*dt;
 vf=cl(vf,-22,mx);const latGrip=i.drift?1.1:9;vl*=Math.exp(-latGrip*wetGrip*trackGrip*dt);
 
 // Screen-relative steering: D/right decreases yaw when driving forward.
 c.h+=KartCore.headingDelta(i.str,vf,d.hdl,i.drift,dt);
 c.vx=fx*vf+rx*vl;c.vz=fz*vf+rz*vl;c.vf=vf;c.vl=vl;c.x+=c.vx*dt;c.z+=c.vz*dt;c.st=i.str;
 
 const p0=c.idx;near(c);const advance=(c.idx-p0+N)%N;if(advance<40&&c.checkpoint<3&&c.idx>=120*(c.checkpoint+1)&&c.idx<120*(c.checkpoint+1)+50)c.checkpoint++;
 if(c.idx<N*.1&&p0>N*.9&&c.checkpoint===3){
  if(!mpo)c.lap++;else NET.send({t:'lap'});c.checkpoint=0;
  if(c.isP){
   const lapTime=elapsed-lapStart;lapStart=elapsed;
   let diffStr='';
   if(lapTime<bestLap){
    if(bestLap!==Infinity)diffStr=' (-'+(bestLap-lapTime).toFixed(1)+'s BEST!)';
    bestLap=lapTime;$('bestlap').textContent='Best: '+bestLap.toFixed(1)+'s';
   } else {
    diffStr=' (+'+(lapTime-bestLap).toFixed(1)+'s)';
   }
   addKF('⏱️ Lap '+c.lap+': '+lapTime.toFixed(1)+'s'+diffStr,lapTime<=bestLap?'#35ff9a':'#19e6ff');
  }
  if(!mpo&&c.lap>=LAPS&&!c.fin){c.fin=++fo;if(c.isP)addKF('🏁 Lap '+LAPS+' complete!','#35ff9a')}
 }
 
 // Crisp physical barrier collision (matches 3D neon guardrail at HW)
 c.off=Math.abs(c.lat)>HW;
 const n=NR[c.idx],s=Math.sign(c.lat),ov=Math.abs(c.lat)-(HW+.2);
 if(ov>0){
  c.x-=n.x*ov*s;c.z-=n.z*ov*s;const vn=(c.vx*n.x+c.vz*n.z)*s;
  if(vn>0){
   c.vx-=n.x*vn*s*1.5;c.vz-=n.z*vn*s*1.5;hit(c,vn*.12,null);
   if(c.isP){shake=Math.max(shake,.3);if(vn>10&&!audioMuted){snd(120,.2,'triangle',.2,.2);snd(320,.12,'sawtooth',.15,.3)}}
  }
 }
 const cy=TY[c.idx]||0;
 if(Math.abs(vl)>9&&!c.off){
  skid(c,fx,fz,rx,rz);pa(c.x-fx*1.6+rx*1,cy+.4,c.z-fz*1.6+rz*1,0,1.5,0,.7,.55,.55,.6);pa(c.x-fx*1.6-rx*1,cy+.4,c.z-fz*1.6-rz*1,0,1.5,0,.7,.55,.55,.6);
  if(c.isP&&Math.abs(vl)>10&&!audioMuted){driftSndT-=dt;if(driftSndT<=0){driftSndT=.08;snd(220+Math.abs(vl)*6,.07,'sawtooth',.035,.85)}}
 }
 if(bo)pa(c.x-fx*3.2,cy+.9,c.z-fz*3.2,-fx*8,1,-fz*8,.35,1,.5,.1);if(c.hp<40&&R()<.5)pa(c.x,cy+1.2,c.z,0,5,0,1,.3,.3,.3);if(c.hp<20&&R()<.3)pa(c.x,cy+1,c.z,(R()-.5)*10,6,(R()-.5)*10,.3,1,.8,.2);
 return bo
}

function ai(c){
 // Wall recovery: if bot is wedged against outer wall at low speed, reverse & steer away
 if(Math.abs(c.lat)>HW-1&&Math.abs(c.vf)<8){return{thr:-.8,str:Math.sign(c.lat),drift:false,boost:false}}
 const j=(c.idx+13)%N;let tx=P[j].x+NR[j].x*c.lane-c.x,tz=P[j].z+NR[j].z*c.lane-c.z;
 const ch=mode==3?pl0:mode==2?cars.filter(o=>o!==c&&!o.dead).sort((a,b)=>Math.hypot(a.x-c.x,a.z-c.z)-Math.hypot(b.x-c.x,b.z-c.z))[0]:null;if(ch&&!ch.dead){tx=ch.x-c.x;tz=ch.z-c.z}let e=Math.atan2(tx,tz)-c.h;e=Math.atan2(Math.sin(e),Math.cos(e));const a=Math.abs(e);
 c.tgt=null;let bd=120;for(const o of cars)if(o!==c&&!o.dead){const dx=o.x-c.x,dz=o.z-c.z,d=Math.hypot(dx,dz);let q=Math.atan2(dx,dz)-c.h;q=Math.atan2(Math.sin(q),Math.cos(q));if(Math.abs(q)<.3&&d<bd){bd=d;c.tgt=o}}
 if(c.tgt){if(bd<60&&R()<.7)fire(c,0);if(bd>25)fire(c,1)}
 if(R()<.003&&c.vf>30)mine(c);
 if(R()<.001&&mode>=1)empBlast(c);
 if(R()<.002&&c.vf>25)dropOil(c);
 if(c.ultCd<=0&&c.ultActive<=0&&state=='race'){
  if(c.ultType===0&&c.vf>25&&R()<.006)activateUlt(c);
  else if(c.ultType===1&&cars.some(o=>o!==c&&!o.dead&&Math.hypot(o.x-c.x,o.z-c.z)<18)&&R()<.008)activateUlt(c);
  else if(c.ultType===2&&(cars.some(o=>o!==c&&!o.dead&&Math.hypot(o.x-c.x,o.z-c.z)<15)||lockT===c)&&R()<.008)activateUlt(c);
  else if(c.ultType===3&&a<.18&&c.vf>28&&R()<.006)activateUlt(c);
 }
 return{thr:a>.9&&c.vf>40?-.4:1,str:-cl(e*2.5,-1,1),drift:a>.6&&c.vf>35,boost:c.bo>40&&a<.12&&c.vf>30}
}

/* ---------- MAIN LOOP ---------- */
const mmc=$('mm'),mx2=mmc.getContext('2d');

function step(dt){
 if(paused)return;clk-=dt;if(state==='race')elapsed+=dt;
 if(state=='count'&&clk<=0){state='race';elapsed=0;lapStart=0}
 const racing=state=='race';
 const detected=racing&&!pl0.dead&&mode!==0&&mode!==4?detectTarget(pl0,lockT):null;if(detected&&detected===lockT)lockTm+=dt;else{lockT=detected;lockTm=0}
 updateWeather(dt);
 for(const c of cars){
  c.mg-=dt;c.ms-=dt;c.inv-=dt;for(const key of ['rapid','plasma','magnet','emp','oil','flash'])c[key]=Math.max(0,c[key]-dt);
  if(c.ultCd>0)c.ultCd-=dt;
  if(c.ultActive>0){
   c.ultActive-=dt;
   const cy=TY[c.idx]||0;
   if(c.ultType===0){
    c.inv=Math.max(c.inv,.2);
    pa(c.x+(R()-.5)*2.5,cy+1,c.z+(R()-.5)*2.5,(R()-.5)*6,R()*3,(R()-.5)*6,.35,.1,.9,1);
   }else if(c.ultType===1){
    c.inv=Math.max(c.inv,.2);
    if(c.m.fsh){c.m.fsh.visible=true;c.m.fsh.rotation.y+=dt*4;c.m.fsh.rotation.x+=dt*3}
   }else if(c.ultType===2){
    if(lockT===c){lockT=null;lockTm=0}
    pa(c.x+(R()-.5)*2,cy+1,c.z+(R()-.5)*2,0,1.2,0,.4,.9,.15,.5);
   }else if(c.ultType===3){
    c.bo=100;
    const fx=Math.sin(c.h),fz=Math.cos(c.h);
    pa(c.x-fx*3+(R()-.5)*1.5,cy+.8,c.z-fz*3+(R()-.5)*1.5,-fx*14,1.8,-fz*14,.3,.7,.2,1);
   }
   if(c.ultActive<=0){
    c.ultActive=0;
    if(c.m.fsh)c.m.fsh.visible=false;
    if(c.ultType===2){c.m.traverse(ch=>{if(ch.material&&ch.material.userData.cloakBase!==undefined)ch.material.opacity=ch.material.userData.cloakBase})}
   }
  }
  if(c.ultActive>0&&c.ultType===2)c.m.traverse(ch=>{if(ch.material&&ch!==c.m.sh&&ch!==c.m.fsh){const m=ch.material;if(m.userData.cloakBase===undefined)m.userData.cloakBase=m.opacity;m.transparent=true;m.opacity=.18}});
  c.m.muzzle.visible=c.flash>0;c.m.muzzle.material.color.setHex(c.plasma>0?0xff66d4:0x99efff);
  if(c.r){const k=cl(dt*12,0,1);c.x+=(c.tx-c.x)*k;c.z+=(c.tz-c.z)*k;let e=c.th-c.h;e=Math.atan2(Math.sin(e),Math.cos(e));c.h+=e*k;c.spin+=c.vf*dt/.52;near(c);const cy=TY[c.idx]||0;c.m.position.set(c.x,cy,c.z);c.m.rotation.y=c.h;c.m.rotation.z=cl(-c.vl*.012,-.12,.12);for(const w of c.m.wh)w.w.rotation.x=c.spin;c.m.visible=!c.dead;continue}
  if(c.dead>0){if(mpo)continue;c.dead-=dt;if(c.dead<=0){place(c,c.idx,0);c.hp=100;c.inv=2.5;c.m.visible=true}continue}
  let i={thr:0,str:0,drift:0,boost:0};
  if(racing){
   if(c.isP){
    if(state=='race'&&$('pause').hidden){
     const tilt=window.KartTilt?.sample(dt)||{active:false,steer:0,throttle:0};
     // Intuitive WASD steering: D/Right = turn right (+1), A/Left = turn left (-1)
     i={
      thr:(K.KeyS||K.ArrowDown||touchBrake||touchThr<-.2)?-1:(K.KeyW||K.ArrowUp||touchGas||touchThr>.2||tilt.throttle?1:0),
      str:(K.KeyD||K.ArrowRight?1:0)-(K.KeyA||K.ArrowLeft?1:0)+(tilt.active?tilt.steer:touchStr),
      drift:K.Space||touchDrift,
      boost:K.ShiftLeft||K.ShiftRight||touchBoost
     };
     i.str=cl(i.str,-1,1);
     if(M[0]||K.KeyF||touchFire||(prefs.autoFire!==false&&lockT&&lockTm>=.16))fire(c,0);if(M[2]||K.KeyE||touchMsl)fire(c,1);if(K.KeyQ)mine(c);if(K.KeyT)empBlast(c);if(K.KeyG)dropOil(c);if(K.KeyX||K.KeyZ)activateUlt(c);
    }
   } else i=ai(c);
  }
  const bo=drive(c,dt,i);c.spin+=c.vf*dt/.52;
  const cy=TY[c.idx]||0;
  
  // Calculate road pitch angle for smooth visual hill climbing/descending
  const nxtIdx=(c.idx+3)%N,dy=(TY[nxtIdx]||0)-cy,dhoriz=Math.hypot(P[nxtIdx].x-P[c.idx].x,P[nxtIdx].z-P[c.idx].z)||1;
  const pitch=-Math.atan2(dy,dhoriz);
  c.pitch=(c.pitch||0)+(pitch-(c.pitch||0))*cl(dt*8,0,1);
  
  c.m.position.set(c.x,cy,c.z);
  c.m.rotation.x=c.pitch;
  c.m.rotation.y=c.h;
  c.m.rotation.z=cl(-c.vl*.012,-.12,.12);
  c.m.visible=c.inv<=0||((c.inv*8)|0)%2==0;
  for(const w of c.m.wh){w.w.rotation.x=c.spin;if(w.f)w.p.rotation.y=-c.st*.4}
  c.m.fl.visible=!!bo;if(bo)c.m.fl.scale.y=2.2+R()*.9;c.m.tm.color.setHex(i.thr<0?0xff6a6a:0xb0121e);c.m.paint.color.copy(c.m.base).multiplyScalar(.3+.7*c.hp/100)
 }
 
 for(let a=0;a<cars.length;a++)for(let b=a+1;b<cars.length;b++){
  const p=cars[a],q=cars[b];if(p.dead||q.dead)continue;const dx=q.x-p.x,dz=q.z-p.z,d=Math.hypot(dx,dz);
  if(d<3.6&&d>.01){
   // SCOUT HYPER-WARP: Phase through and zap rival
   if(p.ultActive>0&&p.ultType===0){
    if(!q.r){contactHit(q,15,p);for(let k=0;k<6;k++)pa(q.x,(TY[q.idx]||0)+1.2,q.z,(R()-.5)*15,R()*8,(R()-.5)*15,.3,.1,.9,1)}
    continue;
   }
   if(q.ultActive>0&&q.ultType===0){
    if(!p.r){contactHit(p,15,q);for(let k=0;k<6;k++)pa(p.x,(TY[p.idx]||0)+1.2,p.z,(R()-.5)*15,R()*8,(R()-.5)*15,.3,.1,.9,1)}
    continue;
   }
   // TITAN FORTRESS BARRIER: Heavy ramming & massive knockback
   if(p.ultActive>0&&p.ultType===1){
    const nx=dx/d,nz=dz/d;
    q.vx+=nx*42*dt;q.vz+=nz*42*dt;contactHit(q,28,p);
    if(p.isP){shake=Math.max(shake,.5);addKF('💥 FORTRESS RAM!','#ff8a1a')}
    continue;
   }
   if(q.ultActive>0&&q.ultType===1){
    const nx=dx/d,nz=dz/d;
    p.vx-=nx*42*dt;p.vz-=nz*42*dt;contactHit(p,28,q);
    if(q.isP){shake=Math.max(shake,.5);addKF('💥 FORTRESS RAM!','#ff8a1a')}
    continue;
   }
   const nx=dx/d,nz=dz/d,o=(3.6-d)/2;p.x-=nx*o;p.z-=nz*o;q.x+=nx*o;q.z+=nz*o;const rv=(p.vx-q.vx)*nx+(p.vz-q.vz)*nz;
   if(rv>0){p.vx-=nx*rv*.6;p.vz-=nz*rv*.6;q.vx+=nx*rv*.6;q.vz+=nz*rv*.6;if(rv>20){if(!p.r)hit(p,rv*.2,q);if(!q.r)hit(q,rv*.2,p);const cy=TY[p.idx]||0;for(let k=0;k<8;k++)pa((p.x+q.x)/2,cy+1,(p.z+q.z)/2,(R()-.5)*20,R()*10,(R()-.5)*20,.4,1,.9,.4);if(p.isP||q.isP){shake=Math.max(shake,.4);if(!audioMuted){snd(110,.22,'triangle',.2,.2);snd(260,.12,'sawtooth',.15,.3)}}}}}
 }
 for(const c of cars){c.sh-=dt;c.mn-=dt;c.m.sh.visible=c.sh>0;if(c.sh>0)c.m.sh.material.opacity=Math.max(.25,c.m.sh.material.opacity-dt)}
 
 // Pickups
 for(const p of pu){
  p.pending=Math.max(0,p.pending-dt);p.m.rotation.y+=dt*1.4;if(p.t>0){p.t-=dt;p.m.visible=false;continue}p.m.visible=true;
  const q=P[p.i],n=NR[p.i],px=q.x+n.x*p.lat,pz=q.z+n.z*p.lat,py=q.y;
  p.m.position.set(px,py+1.6+Math.sin(performance.now()/300+p.i)*.3,pz);
  for(const c of cars)if(!c.dead&&!c.fin&&Math.hypot(c.x-px,c.z-pz)<(c.magnet>0?14:4)){
   if(mpo){if(c.isP&&p.pending<=0){NET.send({t:'pickup',index:pu.indexOf(p)});p.pending=.3}if(c.isP)break;continue}
   p.t=12;collectPower(c,p.ty);break
  }
 }
 for(let k=mines.length-1;k>=0;k--){
  const m=mines[k];m.t+=dt;if(m.t>25){removeEntity(m.m);mines.splice(k,1);continue}m.m.material.color.setHex(((m.t*4)|0)%2?0xff2030:0x551018);
  for(const c of cars)if(!c.dead&&(c!==m.o||m.t>2.5)&&m.t>.8&&Math.hypot(c.x-m.x,c.z-m.z)<3.6){const cy=TY[c.idx]||0;boom(m.x,m.z,0,cy);hit(c,45,m.o);removeEntity(m.m);mines.splice(k,1);break}
 }
 for(let k=oilSlicks.length-1;k>=0;k--){
  const o=oilSlicks[k];o.t+=dt;
  if(o.t>o.life){removeEntity(o.m);oilSlicks.splice(k,1);continue}
  o.m.material.opacity=.35+.15*Math.sin(o.t*3);
  for(const c of cars)if(!c.dead&&(c!==o.o||o.t>2)&&Math.hypot(c.x-o.x,c.z-o.z)<3.8){
   c.vx+=(R()-.5)*22;c.vz+=(R()-.5)*22;if(c.isP){shake=Math.max(shake,.25);if((c.oilNotice||0)<elapsed){c.oilNotice=elapsed+1.5;addKF('OIL SLICK — COUNTERSTEER','#ffb020')}}
  }
 }
 if(state=='race'&&(mode===2||mode===3)){
  const al=cars.filter(c=>!c.dead);if(mode==2&&(pl0.dead||al.length<=1))endGame(al[0]===pl0?'Last one standing':'Eliminated',al[0]===pl0);
  if(mode==3){if(pl0.dead)endGame('Wave '+wave+' reached',false);else if(al.length==1){wt+=dt;if(wt>3){wt=0;wave++;pl0.hp=Math.min(100,pl0.hp+30);cars=cars.filter(c=>{if(c!==pl0){removeEntity(c.m);return false}return true});bots(Math.min(8,2+wave),Math.min(.8+wave*.03,1.05),(pl0.idx+60)%N);addKF('🌊 Wave '+wave+'!','#19e6ff')}}}
 }
 if(mpo&&(ns-=dt)<=0){ns=.05;NET.send({t:'s',x:+pl0.x.toFixed(1),z:+pl0.z.toFixed(1),h:+pl0.h.toFixed(2),vf:+pl0.vf.toFixed(1),vl:+pl0.vl.toFixed(1),lap:pl0.lap,idx:pl0.idx})}
 
 // 3D Projectile Updates (missiles and bullets follow 3D elevation)
 let warn=false;
 for(let k=prs.length-1;k>=0;k--){
  const p=prs[k];p.ox=p.x;p.oy=p.y;p.oz=p.z;p.life-=dt;let dead=p.life<=0;
  if(p.ty){
   if(p.t&&(p.t.dead||(p.t.ultActive>0&&p.t.ultType===2)))p.t=null;
   if(p.t&&!p.t.dead){
    let e=Math.atan2(p.t.x-p.x,p.t.z-p.z)-p.a;e=Math.atan2(Math.sin(e),Math.cos(e));p.a+=cl(e,-2.5*dt,2.5*dt);
    const tgtY=(TY[p.t.idx]||0)+1.2;p.y+=cl(tgtY-p.y,-30*dt,30*dt);
    if(p.t===pl0)warn=true;
   }
   p.s=Math.min(130,p.s+50*dt);
   pa(p.x,p.y,p.z,(R()-.5)*3,1,(R()-.5)*3,.5,1,.6,.2);pa(p.x,p.y,p.z,0,1.5,0,.8,.35,.35,.38);
  } else {
   let bNearIdx=p.idx;
   for(let si=-4;si<=4;si++){const ii=(p.idx+si+N)%N;if(P[ii]&&(P[ii].x-p.x)**2+(P[ii].z-p.z)**2<(P[bNearIdx].x-p.x)**2+(P[bNearIdx].z-p.z)**2)bNearIdx=ii}
   p.idx=bNearIdx;p.y+=p.vy*dt;
  }
  p.x+=Math.sin(p.a)*p.s*dt;p.z+=Math.cos(p.a)*p.s*dt;p.m.position.set(p.x,p.y,p.z);p.m.rotation.y=p.a;p.m.rotation.x=-Math.atan2(p.vy,p.s);
  const ground=P[p.idx];if(!p.ty&&Math.hypot(p.x-ground.x,p.z-ground.z)<HW&&p.y<ground.y+.1)dead=true;
  if(!dead)for(const c of cars){
   if(c!==p.o&&!c.dead){
    const dist=Math.hypot(c.x-p.x,c.z-p.z),cY=(TY[c.idx]||0)+1.2,distY=Math.abs(cY-p.y);
    if(!mpo&&c.ultActive>0&&c.ultType===1&&dist<5.2&&distY<5.2){
     // Titan Fortress Barrier: deflect projectile back 180 degrees
     p.o=c;p.a+=PI;p.s=Math.max(p.s*1.25,110);
     p.t=null;p.vy=-p.vy;
     for(let i=0;i<8;i++)pa(p.x,p.y,p.z,(R()-.5)*16,R()*8,(R()-.5)*16,.35,1,.8,.2);
     snd(850,.14,'sawtooth',.2,1.6,c);
     if(c.isP)addKF('🛡️ Reflected projectile!','#ff8a1a');
     continue;
    }
    if(KartCore.segmentDistance(p.ox,p.oy,p.oz,p.x,p.y,p.z,c.x,cY,c.z)<(p.ty?3.5:2.8)){
     if(p.o.r){}
     else if(c.r){/* Server simulates projectile damage. */}
     else hit(c,p.damage,p.o);
     if(p.ty)boom(p.x,p.z,0,p.y);else{for(let j=0;j<4;j++)pa(p.x,p.y,p.z,(R()-.5)*10,R()*4,(R()-.5)*10,.16,.3,1,1);if(p.o.isP){$('crosshair').classList.add('hit');later(()=>$('crosshair').classList.remove('hit'),100)}}
     dead=true;break;
    }
   }
  }
  if(dead){removeEntity(p.m);prs.splice(k,1)}
 }
 
 for(let k=rings.length-1;k>=0;k--){const r=rings[k];r.t+=dt;const u=r.t/.5;r.m.scale.setScalar(1+u*r.s);r.m.material.opacity=1-u;if(u>=1){removeEntity(r.m);rings.splice(k,1)}}
 for(let i=0;i<PM;i++){if(pl[i]>0){pl[i]-=dt;const k=Math.max(pl[i]/pL[i],0);pv[i*3+1]-=9*dt;for(let j=0;j<3;j++){pp[i*3+j]+=pv[i*3+j]*dt;pc[i*3+j]=pb[i*3+j]*k}}else pc[i*3]=pc[i*3+1]=pc[i*3+2]=0}
 pg.attributes.position.needsUpdate=pg.attributes.color.needsUpdate=true;
 

 warnT-=dt;if(warn&&warnT<=0){warnT=.4;snd(900,.15,'square',.08,1)}$('warn').hidden=!warn;
 if(state=='race'&&(mode<2||mode===4)&&pl0.fin){const r=rank(pl0);endGame(['','1st place','2nd place','3rd place'][r]||r+'th place',r==1)}
}

function render(dt){
 const c=pl0;let fov=72;const cy=TY[c.idx]||0;
 if(state=='menu'){
  cam.setViewOffset(innerWidth,innerHeight,innerWidth>900?-innerWidth*.22:0,0,innerWidth,innerHeight);
  const t=performance.now()/1000*.4;cam.position.set(c.x+Math.sin(t)*9,cy+3.5,c.z+Math.cos(t)*9);cam.lookAt(c.x,cy+1,c.z);fov=55;
 } else {
  cam.clearViewOffset();
  const fx=Math.sin(c.h),fz=Math.cos(c.h),sp=Math.hypot(c.vx,c.vz),k=cl(dt*6,0,1),sh=prefs.motion?shake*.7:0;
  if(camMode===0){
   const bk=9+sp*.03;
   cam.position.x+=(c.x-fx*bk+fz*c.vl*.1-cam.position.x)*k+(R()-.5)*sh;
   cam.position.y+=(Math.max(cy+4.4+sp*.012,1.8)-cam.position.y)*k+(R()-.5)*sh;
   cam.position.z+=(c.z-fz*bk-fx*c.vl*.1-cam.position.z)*k+(R()-.5)*sh;
   cam.lookAt(c.x+fx*10,cy+1.5,c.z+fz*10);fov=68+sp*.17+(c.bo<100&&(K.ShiftLeft||touchBoost)&&c.bo>0?9:0);
  } else if(camMode===1){
   const bk=16+sp*.04;
   cam.position.x+=(c.x-fx*bk-cam.position.x)*k+(R()-.5)*sh;
   cam.position.y+=(Math.max(cy+9+sp*.015,3)-cam.position.y)*k+(R()-.5)*sh;
   cam.position.z+=(c.z-fz*bk-cam.position.z)*k+(R()-.5)*sh;
   cam.lookAt(c.x+fx*15,cy+1,c.z+fz*15);fov=60+sp*.12;
  } else {
   cam.position.x+=(c.x+fx*1.5-cam.position.x)*k*2;
   cam.position.y+=(cy+1.55-cam.position.y)*k*2;
   cam.position.z+=(c.z+fz*1.5-cam.position.z)*k*2;
   cam.lookAt(c.x+fx*30,cy+1.3,c.z+fz*30);fov=85+sp*.2;
  }
  if(eg&&!audioMuted&&!paused){eo.frequency.value=45+sp*3.2+((K.ShiftLeft||touchBoost)?25:0);eg.gain.value=state=='race'?.035:.015}
 }
 shake=Math.max(0,shake-dt*2.2);cam.fov+=(fov-cam.fov)*cl(dt*5,0,1);cam.updateProjectionMatrix();sky.position.copy(cam.position);rd.render(sc,cam);
 if(state=='menu')return;
 
 // Countdown
 if(state=='count'){
  const num=clk>.4?Math.ceil(clk-.4):0;
  if(num>0&&num!==lastCdNum){
   lastCdNum=num;$('cd').textContent=num;$('cd').className='num';void $('cd').offsetWidth;$('cd').className='num';
   if(!audioMuted)snd(780,.1,'square',.14,1);
  } else if(num<=0&&lastCdNum!==0){
   lastCdNum=0;$('cd').textContent='GO!';$('cd').className='go';
   if(!audioMuted){snd(1046.5,.35,'triangle',.25,1.2);later(()=>{if(!audioMuted)snd(1318.5,.4,'sine',.22,1.2)},60)}
  }
 } else if(state=='race'&&elapsed>.9)$('cd').textContent='';
 
 $('spd').textContent=Math.round(Math.abs(c.vf)*3.6);$('sl').style.opacity=prefs.motion?cl((Math.abs(c.vf)-55)/60+((K.ShiftLeft||touchBoost)&&c.bo>0?.4:0),0,.85):0;$('hp').style.width=c.hp+'%';$('bo').style.width=c.bo+'%';$('hp').style.background=c.hp<30?'#ff2a6d':'#35ff9a';
 let msT=c.ms>0?'Missile '+c.ms.toFixed(1)+'s':'Missile ✓';if(!mpo)msT+=c.mn>0?'  Mine '+c.mn.toFixed(0)+'s':'  Mine ✓';if(c.sh>0)msT+='  🛡️';msT+=c.emp>0?'  EMP '+c.emp.toFixed(0)+'s':'  EMP ✓';$('ms').textContent=mode===0||mode===4?'WEAPONS DISABLED':msT;const active=['rapid','plasma','magnet'].filter(k=>c[k]>0).map(k=>k.toUpperCase()+' '+Math.ceil(c[k])+'s');$('power-status').textContent=active.join(' · ');$('auto-status').textContent=mode===0||mode===4?'':prefs.autoFire!==false?(lockT?'AUTO · TARGET DETECTED':'AUTO · SCANNING'):'MANUAL · AIM ASSIST';
 $('pos').textContent=(mode===2||mode===3)?'Alive '+cars.filter(o=>!o.dead).length:rank(c)+'/'+cars.length;$('lap').textContent=mode==3?'Wave '+wave+'  Kills '+c.kills:mode==2?'Kills '+c.kills:'Lap '+Math.min(c.lap+1,LAPS)+'/'+LAPS;
 $('png').textContent=mpo?NET.ping+' ms':'';$('tm').textContent=state=='count'?'0:00.0':(state==='end'?ptime:elapsed).toFixed(1);
 
 // Ultimate HUD badge update
 const ub=$('ult-badge'),un=$('ult-name'),us=$('ult-status'),ubar=$('ult-bar');
 if(ub&&un&&us&&ubar&&c.d){
  un.textContent=c.d.ult||'ULTIMATE';
  const cdMax=c.d.ultCdMax||20;
  if(mode===0||mode===4){ub.classList.remove('active','ready');us.textContent='RACING ONLY';ubar.style.width='0%'}else if(c.ultActive>0){
   ub.classList.add('active');ub.classList.remove('ready');
   us.textContent='ACTIVE '+c.ultActive.toFixed(1)+'s';
   ubar.style.width=((c.ultActive/(c.d.ultDur||3))*100)+'%';
   ubar.style.background='linear-gradient(90deg, #ff0077, #ffd700)';
  }else if(c.ultCd>0){
   ub.classList.remove('active','ready');
   us.textContent='RECHARGE '+c.ultCd.toFixed(1)+'s';
   const pct=Math.max(0,Math.min(100,(1-c.ultCd/cdMax)*100));
   ubar.style.width=pct+'%';
   ubar.style.background='linear-gradient(90deg, #35b0ff, #19e6ff)';
  }else{
   ub.classList.remove('active');ub.classList.add('ready');
   us.textContent='READY [X / Z]';
   ubar.style.width='100%';
   ubar.style.background='linear-gradient(90deg, #35ff9a, #ffd700)';
  }
 }
 
 // Lock-on 3D elevation fix
 // Dynamic HUD Crosshair & Targeting Reticle
 const chEl=$('crosshair'), tcEl=$('tgt-card'), chTag=$('ch-tag');
 if(state=='race'&&!c.dead&&chEl&&mode!==0&&mode!==4){
  chEl.hidden=false;
  const fx=Math.sin(c.h),fz=Math.cos(c.h);
  const aimY=(TY[c.idx]||0)+1.3;
  const aimPos=new T.Vector3(c.x+fx*40,aimY,c.z+fz*40).project(cam);
  if(aimPos.z<1){
   const cxScr=(aimPos.x*.5+.5)*innerWidth,cyScr=(-aimPos.y*.5+.5)*innerHeight;
   chEl.style.left=cxScr+'px';chEl.style.top=cyScr+'px';
  }
  if(lockT&&lockTm>=.16){
   chEl.className='locked';
   if(chTag)chTag.textContent=(lockT.name||lockT.d.n)+(prefs.autoFire!==false?' [AUTO FIRE]':' [AIM ASSIST]');
  }else if(lockT){
   chEl.className='aimed';
   const d=Math.round(Math.hypot(lockT.x-c.x,lockT.z-c.z));
   if(chTag)chTag.textContent=(lockT.name||lockT.d.n)+' '+d+'m';
  }else{
   chEl.className='';
   if(chTag)chTag.textContent='';
  }
  if(lockT&&tcEl){
   tcEl.hidden=false;
   const d=Math.round(Math.hypot(lockT.x-c.x,lockT.z-c.z));
   $('tgt-name').textContent=lockT.name||lockT.d.n;
   $('tgt-dist').textContent=d+'m';
   $('tgt-hp').style.width=Math.max(0,Math.min(100,lockT.hp))+'%';
   $('tgt-hp').style.background=lockT.colHex||'#ff2a6d';
  }else if(tcEl)tcEl.hidden=true;
 }else{
  if(chEl)chEl.hidden=true;
  if(tcEl)tcEl.hidden=true;
 }

 // Live Race Leaderboard
 const lbEl=$('leaderboard');uiTick-=dt;
 if(lbEl&&state=='race'&&uiTick<=0){uiTick=.12;
  const sorted=[...cars].sort((a,b)=>rank(a)-rank(b)).slice(0,5);
  lbEl.innerHTML=sorted.map(r=>{
   const rk=rank(r);
   const col=r.colHex||'#19e6ff';
   const isMe=r===pl0;
   const stStr=r.dead>0?'☠️':r.fin?'🏁':rk===1?'LEADER':(r===pl0?'YOU':((r.lap*N+r.idx)-(pl0.lap*N+pl0.idx)>0?'+':'−')+Math.round(Math.abs((r.lap*N+r.idx)-(pl0.lap*N+pl0.idx))*trackLength/N)+'m');
   return `<div class="lb-row${isMe?' me':''}">
     <span class="lb-rank">${rk}</span>
     <span class="lb-pip" style="background:${col};color:${col}"></span>
     <span class="lb-name">${KartCore.escape(r.name||r.d.n)}</span>
     <span class="lb-gap">${stStr}</span>
   </div>`;
  }).join('');
 }else if(lbEl&&state!=='race')lbEl.innerHTML='';

 const lk=$('lk');
 if(lockT&&state=='race'){
  const ty=(TY[lockT.idx]||0)+1.5;const v=new T.Vector3(lockT.x,ty,lockT.z).project(cam);
  if(v.z<1){lk.hidden=false;lk.style.left=(v.x*.5+.5)*innerWidth+'px';lk.style.top=(-v.y*.5+.5)*innerHeight+'px';lk.className=lockTm>=.16?'l':'';lk.textContent=lockTm>=.16?'TARGET LOCK':'ACQUIRING'}
  else lk.hidden=true;
 } else lk.hidden=true;
 
 // Proportional, Theme-colored Minimap
 mx2.clearRect(0,0,170,170);
 const maxSpan=Math.max(bx1-bx0,bz1-bz0)||1;
 const cx0=(bx0+bx1)/2,cz0=(bz0+bz1)/2;
 const mp=(x,z)=>[85+(x-cx0)/maxSpan*140,85+(z-cz0)/maxSpan*140];
 
 const td=TRACK_DEFS[curTrack];
 mx2.strokeStyle='#'+(td?td.edg.toString(16).padStart(6,'0'):'19e6ff');
 mx2.lineWidth=3.5;
 mx2.beginPath();
 P.forEach((p,i)=>{const[a,b]=mp(p.x,p.z);i?mx2.lineTo(a,b):mx2.moveTo(a,b)});
 mx2.closePath();
 mx2.stroke();
 
 // Finish line marker on minimap
 if(P[0]){const[fa,fb]=mp(P[0].x,P[0].z);mx2.fillStyle='#ffffff';mx2.fillRect(fa-3,fb-3,6,6)}
 
 // Cars on minimap
 for(const o of cars){
  if(o.dead)continue;
  const[a,b]=mp(o.x,o.z);
  if(o.isP){
   mx2.fillStyle='#ffffff';mx2.beginPath();mx2.arc(a,b,5.5,0,PI*2);mx2.fill();
   mx2.fillStyle=o.colHex||'#19e6ff';mx2.beginPath();mx2.arc(a,b,4.2,0,PI*2);mx2.fill();
   mx2.strokeStyle='#ffffff';mx2.lineWidth=2;mx2.beginPath();mx2.moveTo(a,b);
   mx2.lineTo(a+Math.sin(o.h)*9,b+Math.cos(o.h)*9);mx2.stroke();
  }else{
   mx2.fillStyle='#ffffff';mx2.beginPath();mx2.arc(a,b,4.2,0,PI*2);mx2.fill();
   mx2.fillStyle=o.colHex||'#ff2a8a';mx2.beginPath();mx2.arc(a,b,3.2,0,PI*2);mx2.fill();
  }
 }
 // Oil slicks on minimap
 for(const o of oilSlicks){
  const[a,b]=mp(o.x,o.z);mx2.fillStyle='#ffb020';mx2.beginPath();mx2.arc(a,b,2.5,0,PI*2);mx2.fill();
 }
}

let last=performance.now(),accumulator=0;function loop(now){requestAnimationFrame(loop);const dt=Math.min((now-last)/1000,.1);last=now;accumulator+=dt;let steps=0;while(accumulator>=1/60&&steps++<6){if(state!=='menu'&&state!=='end')step(1/60);accumulator-=1/60}render(Math.min(dt,.05));$('touch').hidden=!isMobile||state!=='race'||paused||!$('pause').hidden;document.body.dataset.state=state;document.body.dataset.tilt=window.KartTilt?.enabled?'on':'off';
 if(prefs.fps){$('fps').textContent=Math.round(1/Math.max(.001,dt))+' FPS'}
}


/* ---------- PAUSE MENU ---------- */
$('resume').onclick=()=>{paused=false;$('pause').hidden=true;resetInput();startMusic()};$('hud-pause').onclick=togglePause;
$('quitm').onclick=()=>{
 cancelTimers();resetInput();paused=false;$('pause').hidden=true;stopMusic();NET.close();mpo=null;
 for(const c of cars)removeEntity(c.m);for(const p of prs)removeEntity(p.m);for(const m of mines)removeEntity(m.m);for(const p of pu)removeEntity(p.m);for(const o of oilSlicks)removeEntity(o.m);
 for(const r of rings)removeEntity(r.m);rings.length=0;prs=[];mines=[];pu=[];oilSlicks=[];state='menu';$('menu').hidden=false;$('hud').hidden=$('end').hidden=true;weather='clear';menuCar();
};

/* ---------- MENU SETUP ---------- */
$('tracks').innerHTML=TRACK_DEFS.map((td,i)=>`<button class="tb-track${i===curTrack?' on':''}" data-t="${i}">${td.ic} ${td.n}</button>`).join('');
function selTrack(i){curTrack=i;document.querySelectorAll('.tb-track').forEach((e,k)=>e.classList.toggle('on',k===i));loadTrack(i);if(pl0){place(pl0,3,0);pl0.m.position.set(pl0.x,TY[pl0.idx],pl0.z)}window.updateTrack?.(i)}
document.querySelectorAll('.tb-track').forEach(e=>e.onclick=()=>selTrack(+e.dataset.t));

$('modes').innerHTML=MODES.map((m,i)=>`<button class="mb" data-m="${i}">${m}</button>`).join('');
function selM(i){mode=i;document.querySelectorAll('.mb').forEach((e,k)=>e.classList.toggle('on',k==i))}
document.querySelectorAll('.mb').forEach(e=>e.onclick=()=>selM(+e.dataset.m));selM(1);

$('cars').innerHTML=CARS.map((d,i)=>`<button type="button" class="cc" aria-label="Select ${d.n}" aria-pressed="false" data-i="${i}"><h3 style="color:#${d.c.toString(16).padStart(6,'0')}">${d.n}</h3><div class="st"><span>Speed</span><i style="width:${d.spd/1.2*100}%"></i><span>Armor</span><i style="width:${d.arm/1.6*100}%"></i><span>Accel</span><i style="width:${d.acc/1.2*100}%"></i><span>Handling</span><i style="width:${d.hdl/1.2*100}%"></i></div><div class="ult-tag">⚡ ${d.ult}</div><div class="ult-desc">${d.desc}</div></button>`).join('');
function sel(i){selCar=i;document.querySelectorAll('.cc').forEach((e,k)=>{e.classList.toggle('on',k==i);e.setAttribute('aria-pressed',String(k==i))});menuCar();window.updateVehicle?.(CARS[i],i)}
document.querySelectorAll('.cc').forEach(e=>e.onclick=()=>sel(+e.dataset.i));

const PAINTS=['#19e6ff','#ff2a8a','#ff8a1a','#39ff14','#ffd700','#a66bff','#ffffff','#22252a'];
$('paints').innerHTML=PAINTS.map((c,i)=>`<button aria-label="Paint ${c}" class="pswatch${(customPaint===c||(!customPaint&&i===0))?' on':''}" data-c="${c}" style="background:${c}"></button>`).join('');
function selPaint(c){customPaint=c;try{localStorage.setItem('tk_paint',c)}catch(e){}document.querySelectorAll('.pswatch').forEach(e=>e.classList.toggle('on',e.dataset.c===c));if(pl0){const hexNum=parseInt(c.slice(1),16);pl0.col=hexNum;pl0.colHex=c;pl0.m.base.set(c);pl0.m.paint.color.set(c);if(pl0.m.ug)pl0.m.ug.material.color.set(hexNum)}}
document.querySelectorAll('.pswatch').forEach(e=>e.onclick=()=>selPaint(e.dataset.c));

function clean(){cancelTimers();for(const m of mines)removeEntity(m.m);for(const p of pu)removeEntity(p.m);for(const r of rings)removeEntity(r.m);mines=[];pu=[];rings.length=0;for(const c of cars)removeEntity(c.m);for(const p of prs)removeEntity(p.m);for(const o of oilSlicks)removeEntity(o.m);prs=[];oilSlicks=[]}
function lobby(){$('online').close();state='menu';resetInput();$('touch').hidden=true;$('menu').hidden=$('end').hidden=$('hud').hidden=true;$('lob').hidden=false;$('lc').textContent=NET.code;
 $('lp').innerHTML=NET.players.map(p=>`<div class="lobby-driver"><span style="color:${p.paint}">●</span> ${KartCore.escape(p.name)} <small>${p.id===NET.host?'HOST':'DRIVER'} · ${CARS[p.car].n}</small></div>`).join('');$('ls').hidden=NET.host!==NET.me;$('ls').disabled=NET.players.length<2;$('lobby-note').textContent=NET.players.length<2?'Waiting for a second driver…':'Host controls the circuit. Clear weather. Combat race.'}
NET.on=m=>{
 if(m.t==='room'){NET.me=m.you;NET.host=m.host;NET.code=m.code;NET.players=m.players;if(!mpo||state==='menu')lobby()}
 else if(m.t==='go'){mpo=m.order;mode=1;pickupRng=KartCore.seeded(m.seed);loadTrack(m.track);$('lob').hidden=true;clean();start()}
 else if(m.t==='s'){const o=cars.find(c=>c.id===m.f);if(o&&KartCore.validState(m)){o.tx=m.x;o.tz=m.z;o.th=m.h;o.vf=m.vf;o.vl=m.vl;o.lap=m.lap;o.hp=m.hp;o.dead=m.dead?1:0}}
 else if(m.t==='ev'){const o=cars.find(c=>c.id===m.f);if(o&&state==='race'&&m.k!==2)proj(o,m.k,m.a,m.tg===NET.me?pl0:cars.find(c=>c.id===m.tg),m.vy,true);else if(o&&m.k===2)boom(o.x,o.z,0,TY[o.idx])}
 else if(m.t==='health'){const c=m.id===NET.me?pl0:cars.find(c=>c.id===m.id);if(c){const wasDead=c.dead;c.hp=m.hp;c.sh=m.sh||0;c.inv=m.inv||0;c.dead=m.dead?3.5:0;c.m.visible=!m.dead;if(c.dead||wasDead)c.vx=c.vz=c.vf=c.vl=0;if(c.dead&&!wasDead)boom(c.x,c.z,1,TY[c.idx]);if(m.killer===NET.me&&!wasDead&&m.dead){pl0.kills++;addKF('TAKEDOWN +50','#b6ff3b')}}}
 else if(m.t==='ability'){const c=m.id===NET.me?pl0:cars.find(c=>c.id===m.id);if(c)activateUlt(c,true)}
 else if(m.t==='pickup'){const p=pu[m.index];if(p){p.t=12;const c=m.id===NET.me?pl0:cars.find(c=>c.id===m.id);if(c)collectPower(c,p.ty)}}
 else if(m.t==='progress'){const c=m.id===NET.me?pl0:cars.find(c=>c.id===m.id);if(c){c.lap=m.lap;c.fin=m.place||0;if(c===pl0&&c.fin)endGame(c.fin===1?'1st place':c.fin+' place',c.fin===1)}}
 else if(m.t==='reset'){mpo=null;stopMusic();clean();menuCar();state='menu'}
 else if(m.t==='gone'){const o=cars.find(c=>c.id===m.id);if(o){removeEntity(o.m);cars=cars.filter(c=>c!==o)}addKF('A driver left the race','#b5c4d0')}
 else if(m.t==='err'){window.toast(m.m);$('net-status').textContent=m.m}
 else if(m.t==='closed'){mpo=null;$('lob').hidden=true;$('menu').hidden=false;$('hud').hidden=$('end').hidden=true;stopMusic();clean();menuCar();state='menu';window.toast('Connection closed. You can still play solo.')}
};
function connectRoom(join){const name=$('driver-name').value.trim()||'Racer',code=$('room-code').value.trim();if(join&&!code){window.toast('Enter a room code.');return}$('net-status').textContent='Connecting…';NET.open(()=>NET.send({t:join?'join':'create',name,code,car:selCar,paint:pl0.colHex,track:curTrack}),$('server-url').value.trim())}
$('mpc').onclick=()=>connectRoom(false);$('mpj').onclick=()=>connectRoom(true);
$('ls').onclick=()=>NET.send({t:'start'});$('leave-room').onclick=()=>{NET.close();mpo=null;$('lob').hidden=true;$('menu').hidden=false;clean();menuCar();state='menu'};
$('go').onclick=()=>{NET.close();mpo=null;start()};$('again').onclick=()=>{if(mpo){if(NET.me!==NET.host){window.toast('Waiting for the host to start a rematch.');return}NET.send({t:'rematch'})}else start()};
$('results-menu').onclick=$('quitm').onclick;
window.Game={start,selectCar:sel,selectTrack:selTrack,selectMode:selM,snapshot:()=>({state,paused,elapsed,lap:pl0.lap,hp:pl0.hp,cars:cars.length,geometries:rd.info.memory.geometries,textures:rd.info.memory.textures,position:{x:pl0.x,z:pl0.z},track:curTrack,vehicle:pl0.d.n}),applySettings:()=>{rd.setPixelRatio(Math.min(devicePixelRatio,prefs.quality==='high'?2:prefs.quality==='low'?1:1.35));rs();if(master)master.gain.value=prefs.volume/100;audioMuted=prefs.volume===0}};
loadTrack(0);sel(0);requestAnimationFrame(loop);
})();
