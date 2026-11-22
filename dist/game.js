(()=>{
const T=THREE,$=i=>document.getElementById(i),R=Math.random,PI=Math.PI,cl=(v,a,b)=>Math.max(a,Math.min(b,v)),HW=14;
let LAPS=3,bestS1=Infinity,bestS2=Infinity,lapSector=0,sectorStart=0;
let state='menu',pl0=null,cars=[];
const prefs=window.KartSettings;
let elapsed=0,contactHits=new Map(),pickupRng=Math.random,trackLength=1,uiTick=0;
const roundTimers=new Set();
function later(fn,ms){const id=setTimeout(()=>{roundTimers.delete(id);fn()},ms);roundTimers.add(id);return id}
function cancelTimers(){for(const id of roundTimers)clearTimeout(id);roundTimers.clear()}
const protectedTextures=new Set();
function removeEntity(o){if(!o)return;o.removeFromParent?o.removeFromParent():o.parent?.remove(o);const gs=new Set(),ms=new Set(),ts=new Set();o.traverse(n=>{if(n.geometry)gs.add(n.geometry);for(const m of(Array.isArray(n.material)?n.material:[n.material]))if(m){ms.add(m);for(const v of Object.values(m))if(v?.isTexture&&!protectedTextures.has(v))ts.add(v)}});gs.forEach(x=>x.dispose());ms.forEach(x=>x.dispose());ts.forEach(x=>x.dispose())}
function contactHit(target,amount,owner){const key=owner.uid+':'+target.uid;if((contactHits.get(key)||0)>elapsed)return false;contactHits.set(key,elapsed+.65);hit(target,amount,owner);return true}
let carUID=0;

const CARS=window.KartModels.cars;
const rd=new T.WebGLRenderer({canvas:$('c'),antialias:prefs.quality!=='low',powerPreference:'high-performance'});
rd.setPixelRatio(Math.min(devicePixelRatio,prefs.quality==='high'?1.75:prefs.quality==='low'?1:1.25));
rd.outputEncoding=T.sRGBEncoding;rd.toneMapping=T.ACESFilmicToneMapping;rd.toneMappingExposure=.92;
if(rd.shadowMap){rd.shadowMap.enabled=prefs.quality!=='low';rd.shadowMap.type=T.PCFSoftShadowMap}
const composer=window.KartVFX?window.KartVFX.createComposer(rd):{enabled:false,resize(){},render(s,c){rd.render(s,c)},setFX(){}};

const sc=new T.Scene();sc.background=new T.Color(0x070b18);sc.fog=new T.Fog(0x070b18,90,520);
const envCache={},roadTexCache={},groundTexCache={};
let curEnvMap=window.KartVFX?window.KartVFX.createThemeEnvMap('city'):null;
if(curEnvMap){envCache.city=curEnvMap;protectedTextures.add(curEnvMap);sc.environment=curEnvMap}
const checkTex=window.KartVFX?window.KartVFX.createCheckeredTexture():null;
if(checkTex)protectedTextures.add(checkTex);
const boostPadTex=window.KartVFX?.createBoostPadTexture?window.KartVFX.createBoostPadTexture():null;
if(boostPadTex)protectedTextures.add(boostPadTex);
const rampTex=window.KartVFX?.createRampTexture?window.KartVFX.createRampTexture():null;
if(rampTex)protectedTextures.add(rampTex);
const tmpV3=new T.Vector3(),zeroMat=new T.Matrix4().makeScale(0,0,0),ghostTmp={x:0,z:0,idx:0},camTmp={x:0,z:0,idx:0};

const cam=new T.PerspectiveCamera(70,1,.5,1600);
const rs=()=>{rd.setSize(innerWidth,innerHeight);cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix();const dpr=rd.getPixelRatio?rd.getPixelRatio():1;composer.resize(innerWidth*dpr,innerHeight*dpr)};addEventListener('resize',rs);rs();

const hl=new T.HemisphereLight(0x6a8cff,0x1a1020,.95);sc.add(hl);
const dl=new T.DirectionalLight(0xbcd0ff,.8);dl.position.set(-100,200,80);
if(dl.shadow&&dl.shadow.camera){
 dl.castShadow=prefs.quality!=='low';
 const smSz=prefs.quality==='high'?1024:512;
 dl.shadow.mapSize.set(smSz,smSz);
 dl.shadow.camera.left=-46;dl.shadow.camera.right=46;dl.shadow.camera.top=46;dl.shadow.camera.bottom=-46;
 dl.shadow.camera.near=10;dl.shadow.camera.far=210;dl.shadow.bias=-.0005;
}
sc.add(dl);if(dl.target)sc.add(dl.target);
let baseDLIntensity=.8;

const playerLight=new T.PointLight(0x19e6ff,0,22);sc.add(playerLight);
const fxLight=new T.PointLight(0xff8833,0,58);sc.add(fxLight);
let fxLightT=0,fxLightBase=0;
function flashLight(x,y,z,col,intensity=3.2,dur=.34){
 if(prefs.quality==='low')return;
 fxLight.color.setHex(col);fxLight.position.set(x,y+2.6,z);fxLight.intensity=intensity;fxLightBase=intensity;fxLightT=dur;
}

const gr=new T.Mesh(new T.PlaneGeometry(2400,2400),new T.MeshStandardMaterial({color:0xffffff,roughness:.96}));
gr.rotation.x=-PI/2;gr.position.y=-.05;gr.receiveShadow=true;sc.add(gr);

/* ---------- SKY SYSTEM ---------- */
let sky,skyTex,skyCanvas=document.createElement('canvas');skyCanvas.width=4;skyCanvas.height=256;
skyTex=new T.CanvasTexture(skyCanvas);if(T.sRGBEncoding)skyTex.encoding=T.sRGBEncoding;protectedTextures.add(skyTex);
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
 },
 {
  n:'Obsidian Caldera',ic:'🌋',bg:0x1a0a10,fn:110,ff:560,hs:0xff9a60,hg:0x310a0e,hi:1.05,sc:0xffb880,si:1.05,gc:0x221114,asp:0x1d1822,edg:0xff601a,out:0xffba30,stp:0xffa238,grp:.96,thm:'volcano',
  sky:['#0c0508','#290c0e','#7d2214','#1a0808'],
  pts:[[0,2.0,0],[150,5.0,-45],[290,13.0,20],[340,21.0,150],[250,15.0,280],[110,8.0,240],[-10,16.0,330],[-160,22.0,300],[-280,12.0,190],[-250,5.0,50],[-140,3.0,-65]]
 },
 {
  n:'Orbital Skyway',ic:'🌌',bg:0x080a22,fn:150,ff:760,hs:0xaeb8ff,hg:0x120e38,hi:1.1,sc:0xe0e2ff,si:1.0,gc:0x0b0f20,asp:0x1e2444,edg:0xb680ff,out:0xb6ff3b,stp:0xffe88c,grp:1.04,thm:'orbital',
  sky:['#02030e','#0b1038','#2e1c6b','#060a1e'],
  pts:[[0,10.0,0],[180,16.0,-30],[330,26.0,55],[360,22.0,210],[240,12.0,330],[70,18.0,295],[-80,28.0,365],[-245,24.0,285],[-310,14.0,140],[-210,9.0,10],[-120,11.0,-85]]
 },
 {
  n:'Sunset Marina',ic:'🌴',bg:0x242440,fn:130,ff:680,hs:0xffb080,hg:0x173c50,hi:1.12,sc:0xffd5a8,si:1.12,gc:0x0e4158,asp:0x212b3c,edg:0x1ef2ff,out:0xff8a3d,stp:0xffe89c,grp:1.0,thm:'marina',
  sky:['#18143b','#6e2d5c','#ff8c5a','#103a4f'],
  pts:[[0,2.0,0],[170,4.0,-35],[315,12.0,35],[350,16.0,185],[255,8.0,305],[105,3.0,270],[-25,4.0,340],[-195,9.0,295],[-285,15.0,175],[-245,7.0,40],[-125,2.5,-60]]
 }
];

let curTrack=0,trackGrip=1,N=500,P=[],TN=[],NR=[],TY=[],BANK=[];
let bx0=1e9,bx1=-1e9,bz0=1e9,bz1=-1e9;
let activeRoadMat=null,baseRoadRoughness=.55,baseRoadEnv=.9,trackAnimators=[],boostPads=[],jumpRamps=[];
const mmBg=document.createElement('canvas');mmBg.width=mmBg.height=170;const mmBgCtx=mmBg.getContext('2d');
const trackGroup=new T.Group();sc.add(trackGroup);

function ribbon(a,b,yOff,color,dash,mat,tileLen=22){
 const pos=[],uvs=[],idx=[];let k=0,distAcc=0;
 for(let i=0;i<N;i++){
  const j=(i+1)%N,segLen=P[i].distanceTo(P[j]);
  const v0=distAcc/tileLen,v1=(distAcc+segLen)/tileLen;
  distAcc+=segLen;
  if(dash&&i%dash>dash/2)continue;
  const p0=P[i],n0=NR[i],p1=P[j],n1=NR[j],s0=Math.sin(BANK[i]||0),s1=Math.sin(BANK[j]||0);
  pos.push(p0.x+n0.x*a,p0.y+yOff+s0*a,p0.z+n0.z*a, p0.x+n0.x*b,p0.y+yOff+s0*b,p0.z+n0.z*b);
  pos.push(p1.x+n1.x*a,p1.y+yOff+s1*a,p1.z+n1.z*a, p1.x+n1.x*b,p1.y+yOff+s1*b,p1.z+n1.z*b);
  uvs.push(0,v0, 1,v0, 0,v1, 1,v1);
  idx.push(k,k+2,k+1,k+1,k+2,k+3);k+=4
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));g.setIndex(idx);g.computeVertexNormals();
 const mesh=new T.Mesh(g,mat||new T.MeshBasicMaterial({color,side:T.DoubleSide}));
 if(mat)mesh.receiveShadow=true;
 trackGroup.add(mesh);
 return mesh;
}

function wallRibbon(dist,height,color,op){
 const pos=[],uvs=[],idx=[];let k=0,distAcc=0;
 for(let i=0;i<N;i++){
  const j=(i+1)%N,segLen=P[i].distanceTo(P[j]);
  const u0=distAcc/18,u1=(distAcc+segLen)/18;
  distAcc+=segLen;
  const p0=P[i],n0=NR[i],p1=P[j],n1=NR[j],b0=Math.sin(BANK[i]||0)*dist,b1=Math.sin(BANK[j]||0)*dist;
  const wx0=p0.x+n0.x*dist,wz0=p0.z+n0.z*dist,wx1=p1.x+n1.x*dist,wz1=p1.z+n1.z*dist;
  pos.push(wx0,p0.y+b0+.05,wz0, wx0,p0.y+b0+height,wz0, wx1,p1.y+b1+.05,wz1, wx1,p1.y+b1+height,wz1);
  uvs.push(u0,0, u0,1, u1,0, u1,1);
  idx.push(k,k+2,k+1,k+1,k+2,k+3);k+=4;
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));g.setIndex(idx);g.computeVertexNormals();
 const wallTex=window.KartVFX?window.KartVFX.createGuardrailTexture(color):null;
 const mat=wallTex
  ? new T.MeshBasicMaterial({map:wallTex,transparent:true,opacity:op||.88,side:T.DoubleSide,depthWrite:false})
  : new T.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.4,transparent:!!op,opacity:op||.85,side:T.DoubleSide});
 if(wallTex)trackAnimators.push(t=>{wallTex.offset.x=-(t*.45)%1});
 trackGroup.add(new T.Mesh(g,mat));
}

function addTunnel(startIdx,endIdx,color,opacity=.28,solid=false){
 const pos=[],idx=[];let k=0;const segs=10,rad=HW+3.2;
 for(let i=startIdx;i<endIdx;i++){
  const i0=i%N,i1=(i+1)%N,p0=P[i0],n0=NR[i0],p1=P[i1],n1=NR[i1];
  for(let s=0;s<segs;s++){
   const a0=s/segs*PI,a1=(s+1)/segs*PI;
   const c0=Math.cos(a0)*rad,y0=Math.sin(a0)*rad*.78,c1=Math.cos(a1)*rad,y1=Math.sin(a1)*rad*.78;
   pos.push(
    p0.x+n0.x*c0,p0.y+y0,p0.z+n0.z*c0, p0.x+n0.x*c1,p0.y+y1,p0.z+n0.z*c1,
    p1.x+n1.x*c0,p1.y+y0,p1.z+n1.z*c0, p1.x+n1.x*c1,p1.y+y1,p1.z+n1.z*c1
   );
   idx.push(k,k+2,k+1,k+1,k+2,k+3);k+=4;
  }
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();
 const mat=solid
  ? new T.MeshStandardMaterial({color,roughness:.9,side:T.DoubleSide})
  : new T.MeshBasicMaterial({color,transparent:true,opacity,side:T.DoubleSide,depthWrite:false,blending:T.AdditiveBlending});
 trackGroup.add(new T.Mesh(g,mat));
 // Illuminated tunnel rib arches
 const ribMat=new T.MeshBasicMaterial({color});
 for(let i=startIdx;i<=endIdx;i+=5){
  const q=P[i%N],ang=Math.atan2(-NR[i%N].z,NR[i%N].x);
  const rib=new T.Mesh(new T.TorusGeometry(rad,.24,5,20,PI),ribMat);
  rib.position.set(q.x,q.y,q.z);rib.rotation.y=ang;trackGroup.add(rib);
 }
}

function loadTrack(ti){
 curTrack=ti;const td=TRACK_DEFS[curTrack];
 sc.background.setHex(td.bg);sc.fog.color.setHex(td.bg);sc.fog.near=td.fn;sc.fog.far=td.ff;
 hl.color.setHex(td.hs);hl.groundColor.setHex(td.hg);hl.intensity=td.hi;
 dl.color.setHex(td.sc);dl.intensity=td.si;baseDLIntensity=td.si;
 trackGrip=td.grp;
 if(td.sky)updateSky(...td.sky);sky.children[0].visible=td.thm!=='canyon';

 // Theme-specific reflections & procedural ground texture
 if(window.KartVFX){
  if(!envCache[td.thm]){envCache[td.thm]=window.KartVFX.createThemeEnvMap(td.thm);protectedTextures.add(envCache[td.thm])}
  curEnvMap=envCache[td.thm];
  sc.environment=prefs.quality==='low'?null:curEnvMap;
  if(!groundTexCache[td.thm]){groundTexCache[td.thm]=window.KartVFX.createGroundTexture(td.thm);protectedTextures.add(groundTexCache[td.thm])}
  gr.material.map=groundTexCache[td.thm];gr.material.color.setHex(0xffffff);gr.material.needsUpdate=true;
 }else{
  gr.material.color.setHex(td.gc);
 }

 trackAnimators=[];
 while(trackGroup.children.length>0)removeEntity(trackGroup.children[0]);
 const curve=new T.CatmullRomCurve3(td.pts.map(([x,y,z])=>new T.Vector3(x,y,z)),true,'catmullrom',.5);
 P=curve.getSpacedPoints(N);P.pop();
 TN=P.map((p,i)=>P[(i+1)%N].clone().sub(P[(i+N-1)%N]).normalize());
 NR=TN.map(t=>{const l=Math.hypot(t.z,t.x)||1;return new T.Vector3(t.z/l,0,-t.x/l)});
 TY=P.map(p=>p.y);trackLength=P.reduce((a,p,i)=>a+p.distanceTo(P[(i+1)%N]),0);
 // Smooth banked corner camber angles (tilts outside edge up on fast curves)
 const rawBank=P.map((_,i)=>{const t0=TN[(i+5)%N],t1=TN[(i-5+N)%N];return cl((t0.x*t1.z-t0.z*t1.x)*.42,-.12,.12)});
 BANK=rawBank.map((_,i)=>{let s=0;for(let k=-4;k<=4;k++)s+=rawBank[(i+k+N)%N];return s/9});
 bx0=1e9;bx1=-1e9;bz0=1e9;bz1=-1e9;
 for(const p of P){bx0=Math.min(bx0,p.x);bx1=Math.max(bx1,p.x);bz0=Math.min(bz0,p.z);bz1=Math.max(bz1,p.z)}

 // Procedural PBR Road Surface with tire grooves, kerbs & dynamic wetness support
 let roadMat;
 if(window.KartVFX){
  if(!roadTexCache[td.thm]){
   const rtx=window.KartVFX.createRoadTextures(td.thm);
   protectedTextures.add(rtx.map);protectedTextures.add(rtx.bumpMap);protectedTextures.add(rtx.roughnessMap);
   roadTexCache[td.thm]=rtx;
  }
  const rtx=roadTexCache[td.thm];
  baseRoadRoughness=td.thm==='canyon'?.92:td.thm==='glacier'?.38:td.thm==='orbital'?.34:td.thm==='volcano'?.68:.58;
  baseRoadEnv=td.thm==='canyon'?.22:td.thm==='glacier'?1.35:td.thm==='orbital'?1.45:td.thm==='volcano'?.85:1.05;
  roadMat=new T.MeshStandardMaterial({
   color:0xffffff,map:rtx.map,bumpMap:rtx.bumpMap,bumpScale:.12,roughnessMap:rtx.roughnessMap,
   roughness:baseRoadRoughness,metalness:(td.thm==='glacier'||td.thm==='orbital')?.22:.08,envMapIntensity:baseRoadEnv,side:T.DoubleSide
  });
 }else{
  baseRoadRoughness=td.thm==='canyon'?.94:.45;baseRoadEnv=td.thm==='canyon'?.15:1;
  roadMat=new T.MeshStandardMaterial({color:td.asp,roughness:baseRoadRoughness,envMapIntensity:baseRoadEnv,side:T.DoubleSide});
  if(td.thm==='canyon')roadMat.color.convertSRGBToLinear();
 }
 activeRoadMat=roadMat;
 ribbon(-HW,HW,.05,0,0,roadMat,20);
 ribbon(-HW,-HW+.65,.09,td.edg);ribbon(HW-.65,HW,.09,td.edg);
 ribbon(-HW-2,-HW,.06,td.out,8);ribbon(HW,HW+2,.06,td.out,8);

 // Checkered Start / Finish Line Decal on the tarmac
 if(checkTex){
  const sf=new T.Mesh(new T.PlaneGeometry(HW*2,5.5),new T.MeshBasicMaterial({map:checkTex,side:T.DoubleSide}));
  sf.rotation.x=-PI/2;sf.rotation.z=Math.atan2(NR[0].x,NR[0].z)-PI/2;
  sf.position.set(P[0].x,P[0].y+.1,P[0].z);
  trackGroup.add(sf);
 }

 // 3D Physical Glowing Energy Guardrail Walls
 wallRibbon(-HW-.2,1.9,td.edg,.86);
 wallRibbon(HW+.2,1.9,td.out,.86);

 // Track Boost Pads (animated glowing nitro strips) & 3D Jump Ramps
 boostPads=[];jumpRamps=[];
 const padMat=boostPadTex
  ? new T.MeshBasicMaterial({map:boostPadTex,transparent:true,opacity:.95,side:T.DoubleSide})
  : new T.MeshBasicMaterial({color:0x19e6ff,side:T.DoubleSide});
 if(boostPadTex)trackAnimators.push(t=>{boostPadTex.offset.y=-(t*2.4)%1});
 const padSlots=[[55,-4],[145,4],[235,0],[330,-4],[425,4]];
 for(const [pi,lat] of padSlots){
  const p=P[pi],n=NR[pi],t0=TN[pi],px=p.x+n.x*lat,pz=p.z+n.z*lat,ang=Math.atan2(t0.x,t0.z);
  const pad=new T.Mesh(new T.PlaneGeometry(5.6,13.5),padMat);
  pad.rotation.order='YXZ';pad.rotation.y=ang;pad.rotation.x=-PI/2;
  pad.position.set(px,p.y+.14,pz);trackGroup.add(pad);
  boostPads.push({idx:pi,lat,x:px,y:p.y,z:pz});
 }
 const rampMat=rampTex
  ? new T.MeshStandardMaterial({map:rampTex,roughness:.45,metalness:.3,emissive:0xff6600,emissiveIntensity:.18})
  : new T.MeshStandardMaterial({color:0xff8a1a,roughness:.5});
 const rampSideMat=new T.MeshBasicMaterial({color:0xffd447});
 const rampSlots=[[105,0],[285,-3.5],[455,3.5]];
 for(const [ri,lat] of rampSlots){
  const p=P[ri],n=NR[ri],t0=TN[ri],rx=p.x+n.x*lat,rz=p.z+n.z*lat,ang=Math.atan2(t0.x,t0.z);
  const rg=new T.Group();
  const deck=new T.Mesh(new T.BoxGeometry(6.8,.35,10.5),rampMat);
  deck.rotation.x=-.22;deck.position.set(0,1.05,0);rg.add(deck);
  for(const s of[-1,1]){
   const rail=new T.Mesh(new T.BoxGeometry(.25,.35,10.5),rampSideMat);
   rail.rotation.x=-.22;rail.position.set(s*3.45,1.25,0);rg.add(rail);
  }
  rg.position.set(rx,p.y+.05,rz);rg.rotation.y=ang;trackGroup.add(rg);
  jumpRamps.push({idx:ri,lat,x:rx,y:p.y,z:rz});
 }

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
  const random=KartCore.seeded(10421);
  const w=document.createElement('canvas');w.width=32;w.height=64;const x=w.getContext('2d');x.fillStyle='#000';x.fillRect(0,0,32,64);
  for(let i=0;i<8;i++)for(let j=0;j<16;j++)if(random()<.45){x.fillStyle=['#ffd27a','#7ad7ff','#ff7ad9'][random()*3|0];x.fillRect(i*4+1,j*4+1,2,2)}
  const bm=new T.InstancedMesh(new T.BoxGeometry(1,1,1),new T.MeshStandardMaterial({color:0x10141f,emissive:0xffffff,emissiveMap:new T.CanvasTexture(w),roughness:.8}),260),o=new T.Object3D();let bi=0,tr=0;const sceneryBounds=[];
  while(bi<260&&tr++<6000){const bx=random()*1000-450,bz=random()*900-350,bw=14+random()*22,bh=20+random()*random()*150,bd=14+random()*22,radius=Math.hypot(bw,bd)*.5;
   if(P.some(q=>Math.hypot(q.x-bx,q.z-bz)<radius+HW+10))continue;
   o.position.set(bx,bh/2,bz);o.scale.set(bw,bh,bd);o.rotation.y=0;o.updateMatrix();bm.setMatrixAt(bi++,o.matrix);sceneryBounds.push({x:bx,z:bz,radius,height:bh})}
  bm.count=bi;bm.userData.sceneryBounds=sceneryBounds;trackGroup.add(bm);
  const lp=new T.InstancedMesh(new T.CylinderGeometry(.25,.3,9,6),new T.MeshStandardMaterial({color:0x333b4d}),100),lh=new T.InstancedMesh(new T.SphereGeometry(.9,8,6),new T.MeshBasicMaterial({color:0xffe9b0}),100);let li=0;
  for(let i=0;i<N;i+=10)for(const s of[-1,1]){const p=P[i],n=NR[i];o.scale.set(1,1,1);o.position.set(p.x+n.x*s*(HW+3.5),p.y+4.5,p.z+n.z*s*(HW+3.5));o.updateMatrix();lp.setMatrixAt(li,o.matrix);o.position.y=p.y+9.2;o.updateMatrix();lh.setMatrixAt(li++,o.matrix)}
  trackGroup.add(lp,lh);
  // Holographic Neo City sky-arches & animated flying traffic streaks
  const archMat=new T.MeshBasicMaterial({color:0x19e6ff,transparent:true,opacity:.72,blending:T.AdditiveBlending});
  for(const idx of [80,175,270,365,445]){
   const p=P[idx],ang=Math.atan2(-NR[idx].z,NR[idx].x);
   const arch=new T.Mesh(new T.TorusGeometry(HW+4,.35,6,28,PI),archMat);
   arch.position.set(p.x,p.y+.4,p.z);arch.rotation.y=ang;trackGroup.add(arch);
  }
  const traffic=new T.InstancedMesh(new T.BoxGeometry(.9,.35,7),new T.MeshBasicMaterial({color:0xffffff}),42);
  const drones=Array.from({length:42},(_,i)=>({r:170+(i%7)*36,h:48+(i%5)*18,ang:i*.7,spd:(i%2?1:-1)*(.12+(i%4)*.04)}));
  for(let i=0;i<42;i++)traffic.setColorAt(i,new T.Color(i%2?0x19e6ff:0xff2a8a));
  trackGroup.add(traffic);
  // Signature Neon Glass Tunnel + Overhead Holographic Light-Train
  addTunnel(195,222,0x19e6ff,.22,false);
  const train=new T.Mesh(new T.BoxGeometry(2.8,2.2,26),new T.MeshBasicMaterial({color:0x19e6ff}));
  trackGroup.add(train);
  trackAnimators.push(t=>{
   const ti=Math.floor((t*18)%N),p=P[ti],tn=TN[ti];
   train.position.set(p.x,p.y+21,p.z);train.rotation.y=Math.atan2(tn.x,tn.z);
  });
  trackAnimators.push(t=>{
   for(let i=0;i<drones.length;i++){
    const d=drones[i],a=d.ang+t*d.spd;
    o.position.set(Math.cos(a)*d.r+40,d.h,Math.sin(a)*d.r+120);
    o.scale.set(1,1,1);o.rotation.set(0,-a+(d.spd>0?0:PI),0);o.updateMatrix();
    traffic.setMatrixAt(i,o.matrix);
   }
   traffic.instanceMatrix.needsUpdate=true;
  });
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
  rocks.count=bands.count=count;rocks.userData.rockBounds=rockBounds;rocks.userData.sceneryBounds=rockBounds;trackGroup.add(rocks,bands);
  const posts=new T.InstancedMesh(new T.BoxGeometry(.45,2.8,.45),new T.MeshStandardMaterial({color:0xffd19a,emissive:0xff6745,emissiveIntensity:.25}),100);let n=0;
  for(let i=0;i<N;i+=10)for(const side of[-1,1]){const q=P[i],normal=NR[i];o.position.set(q.x+normal.x*side*(HW+3.5),q.y+1.4,q.z+normal.z*side*(HW+3.5));o.scale.set(1,1,1);o.rotation.y=0;o.updateMatrix();posts.setMatrixAt(n++,o.matrix)}trackGroup.add(posts);
  // Volumetric Canyon Sun + Sandstone overhead arches
  if(window.KartVFX)trackGroup.add(window.KartVFX.createSunDisc(window.KartModels.soft));
  const archRockMat=new T.MeshStandardMaterial({color:0x9e503d,roughness:.95});
  for(const idx of [90,215,345]){
   const q=P[idx],ang=Math.atan2(-NR[idx].z,NR[idx].x);
   const arch=new T.Mesh(new T.TorusGeometry(HW+8,3.6,6,18,PI),archRockMat);
   arch.position.set(q.x,q.y-1,q.z);arch.rotation.y=ang;trackGroup.add(arch);
  }
  addTunnel(162,184,0x8a4230,.95,true);
 } else if(td.thm==='glacier'){
  const random=KartCore.seeded(30917);
  const iceMat=new T.MeshStandardMaterial({color:0x52b6eb,roughness:.12,metalness:.55,transparent:true,opacity:.9});
  const bm=new T.InstancedMesh(new T.OctahedronGeometry(1),iceMat,220),o=new T.Object3D();let bi=0,tr=0;const sceneryBounds=[];
  while(bi<220&&tr++<6000){const gx=random()*1000-450,gz=random()*900-350,bw=12+random()*18,bh=20+random()*random()*110;
   if(P.some(q=>Math.hypot(q.x-gx,q.z-gz)<bw+HW+10))continue;
   o.position.set(gx,bh/2,gz);o.scale.set(bw,bh,bw);o.rotation.y=random()*PI*2;o.updateMatrix();bm.setMatrixAt(bi++,o.matrix);sceneryBounds.push({x:gx,z:gz,radius:bw,height:bh})}
  bm.count=bi;bm.userData.sceneryBounds=sceneryBounds;trackGroup.add(bm);
  const gp=new T.InstancedMesh(new T.CylinderGeometry(.35,.4,8,6),new T.MeshBasicMaterial({color:0x35e8ff}),100);let li=0;
  for(let i=0;i<N;i+=10)for(const s of[-1,1]){const p=P[i],n=NR[i];o.scale.set(1,1,1);o.position.set(p.x+n.x*s*(HW+3.5),p.y+4,p.z+n.z*s*(HW+3.5));o.updateMatrix();gp.setMatrixAt(li++,o.matrix)}
  trackGroup.add(gp);
  // Shimmering GLSL Aurora Borealis curtain in arctic sky
  if(window.KartVFX){
   const aurora=window.KartVFX.createAuroraMesh();
   trackGroup.add(aurora);
   trackAnimators.push(t=>aurora.userData.update(t));
  }
  addTunnel(248,272,0x55e8ff,.26,false);
 } else if(td.thm==='volcano'){
  const random=KartCore.seeded(41893);
  const rockMat=new T.MeshStandardMaterial({color:0x221418,roughness:.9,metalness:.2,emissive:0x4a1208,emissiveIntensity:.35});
  const spires=new T.InstancedMesh(new T.ConeGeometry(1,1,6),rockMat,190),o=new T.Object3D();let bi=0,tr=0;const sceneryBounds=[];
  while(bi<190&&tr++<6000){const vx=random()*1060-480,vz=random()*960-380,rad=11+random()*20,bh=22+random()*random()*135;
   if(P.some(q=>Math.hypot(q.x-vx,q.z-vz)<rad+HW+12))continue;
   o.position.set(vx,bh/2,vz);o.scale.set(rad,bh,rad);o.rotation.y=random()*PI*2;o.updateMatrix();spires.setMatrixAt(bi++,o.matrix);sceneryBounds.push({x:vx,z:vz,radius:rad,height:bh})}
  spires.count=bi;spires.userData.sceneryBounds=sceneryBounds;trackGroup.add(spires);
  const mp=new T.InstancedMesh(new T.CylinderGeometry(.35,.55,7,6),new T.MeshBasicMaterial({color:0xff5a1a}),100);let li=0;
  for(let i=0;i<N;i+=10)for(const s of[-1,1]){const p=P[i],n=NR[i];o.scale.set(1,1,1);o.position.set(p.x+n.x*s*(HW+3.5),p.y+3.5,p.z+n.z*s*(HW+3.5));o.rotation.y=0;o.updateMatrix();mp.setMatrixAt(li++,o.matrix)}
  trackGroup.add(mp);
  const lavaArchMat=new T.MeshBasicMaterial({color:0xff551a,transparent:true,opacity:.78,blending:T.AdditiveBlending});
  for(const idx of [85,195,310,415]){
   const p=P[idx],ang=Math.atan2(-NR[idx].z,NR[idx].x);
   const arch=new T.Mesh(new T.TorusGeometry(HW+4.5,.45,6,26,PI),lavaArchMat);
   arch.position.set(p.x,p.y+.4,p.z);arch.rotation.y=ang;trackGroup.add(arch);
  }
  const embers=new T.InstancedMesh(new T.BoxGeometry(.5,.5,.5),new T.MeshBasicMaterial({color:0xffaa2a}),48);
  const eSeeds=Array.from({length:48},(_,i)=>({x:(i*97%700)-350,z:(i*131%640)-160,spd:8+(i%6)*3,off:i*1.3}));
  trackGroup.add(embers);
  trackAnimators.push(t=>{
   for(let i=0;i<eSeeds.length;i++){const e=eSeeds[i],y=((t*e.spd+e.off*12)%95)+4;o.position.set(e.x+Math.sin(t+e.off)*6,y,e.z+Math.cos(t*.8+e.off)*6);o.scale.setScalar(.8+Math.sin(t*4+i)*.3);o.rotation.set(t,t*.7,0);o.updateMatrix();embers.setMatrixAt(i,o.matrix)}
   embers.instanceMatrix.needsUpdate=true;
  });
 } else if(td.thm==='orbital'){
  const random=KartCore.seeded(55219);
  const monMat=new T.MeshStandardMaterial({color:0x1b2048,roughness:.25,metalness:.8,emissive:0x4a20aa,emissiveIntensity:.35});
  const mons=new T.InstancedMesh(new T.OctahedronGeometry(1),monMat,170),o=new T.Object3D();let bi=0,tr=0;const sceneryBounds=[];
  while(bi<170&&tr++<6000){const ox=random()*1120-510,oz=random()*1020-410,rad=10+random()*18,bh=24+random()*random()*120;
   if(P.some(q=>Math.hypot(q.x-ox,q.z-oz)<rad+HW+12))continue;
   o.position.set(ox,bh/2+10,oz);o.scale.set(rad,bh,rad);o.rotation.y=random()*PI*2;o.updateMatrix();mons.setMatrixAt(bi++,o.matrix);sceneryBounds.push({x:ox,z:oz,radius:rad,height:bh})}
  mons.count=bi;mons.userData.sceneryBounds=sceneryBounds;trackGroup.add(mons);
  const op=new T.InstancedMesh(new T.CylinderGeometry(.25,.35,10,6),new T.MeshBasicMaterial({color:0xb680ff}),100);let li=0;
  for(let i=0;i<N;i+=10)for(const s of[-1,1]){const p=P[i],n=NR[i];o.scale.set(1,1,1);o.position.set(p.x+n.x*s*(HW+3.5),p.y+5,p.z+n.z*s*(HW+3.5));o.rotation.y=0;o.updateMatrix();op.setMatrixAt(li++,o.matrix)}
  trackGroup.add(op);
  const ringMat=new T.MeshBasicMaterial({color:0xb6ff3b,transparent:true,opacity:.72,blending:T.AdditiveBlending});
  const skyRings=[];
  for(const idx of [65,140,220,305,385,460]){
   const p=P[idx],ang=Math.atan2(-NR[idx].z,NR[idx].x);
   const ring=new T.Mesh(new T.TorusGeometry(HW+5.5,.38,6,32),ringMat);
   ring.position.set(p.x,p.y+5,p.z);ring.rotation.y=ang;trackGroup.add(ring);skyRings.push(ring);
  }
  trackAnimators.push(t=>{for(let i=0;i<skyRings.length;i++)skyRings[i].rotation.z=t*(i%2?0.35:-0.35)});
  addTunnel(208,232,0xb680ff,.2,false);
 } else if(td.thm==='marina'){
  // Sunset Marina: coastal twilight ocean, stylized palm towers, lighthouse spires & harbor bridge arches
  const random=KartCore.seeded(67109);
  const trunkMat=new T.MeshStandardMaterial({color:0x362838,roughness:.85}),crownMat=new T.MeshStandardMaterial({color:0x1b6e5e,emissive:0x0a3832,emissiveIntensity:.35,roughness:.7});
  const trunks=new T.InstancedMesh(new T.CylinderGeometry(.25,.48,1,6),trunkMat,170);
  const crowns=new T.InstancedMesh(new T.ConeGeometry(1,.65,7),crownMat,170);
  const o=new T.Object3D();let bi=0,tr=0;const sceneryBounds=[];
  while(bi<170&&tr++<6000){
   const mx=random()*1080-490,mz=random()*980-390,rad=10+random()*14,bh=18+random()*random()*62;
   if(P.some(q=>Math.hypot(q.x-mx,q.z-mz)<rad+HW+12))continue;
   o.position.set(mx,bh/2,mz);o.scale.set(rad*.32,bh,rad*.32);o.rotation.y=random()*PI*2;o.updateMatrix();trunks.setMatrixAt(bi,o.matrix);
   o.position.set(mx,bh+2,mz);o.scale.set(rad,rad*.9,rad);o.updateMatrix();crowns.setMatrixAt(bi,o.matrix);
   sceneryBounds.push({x:mx,z:mz,radius:rad,height:bh});bi++;
  }
  trunks.count=crowns.count=bi;trunks.userData.sceneryBounds=sceneryBounds;trackGroup.add(trunks,crowns);
  const mp=new T.InstancedMesh(new T.CylinderGeometry(.28,.36,8,6),new T.MeshBasicMaterial({color:0xff8a3d}),100);let li=0;
  for(let i=0;i<N;i+=10)for(const s of[-1,1]){const p=P[i],n=NR[i];o.scale.set(1,1,1);o.position.set(p.x+n.x*s*(HW+3.5),p.y+4,p.z+n.z*s*(HW+3.5));o.rotation.y=0;o.updateMatrix();mp.setMatrixAt(li++,o.matrix)}
  trackGroup.add(mp);
  if(window.KartVFX)trackGroup.add(window.KartVFX.createSunDisc(window.KartModels.soft));
  const bridgeMat=new T.MeshBasicMaterial({color:0x1ef2ff,transparent:true,opacity:.78,blending:T.AdditiveBlending});
  for(const idx of [95,155,345,405]){
   const p=P[idx],ang=Math.atan2(-NR[idx].z,NR[idx].x);
   const arch=new T.Mesh(new T.TorusGeometry(HW+5,.42,6,28,PI),bridgeMat);
   arch.position.set(p.x,p.y+.5,p.z);arch.rotation.y=ang;trackGroup.add(arch);
  }
  addTunnel(235,258,0x1ef2ff,.22,false);
  const gulls=new T.InstancedMesh(new T.BoxGeometry(1.4,.18,.6),new T.MeshBasicMaterial({color:0xffd8b0}),28);
  const gSeeds=Array.from({length:28},(_,i)=>({r:150+(i%6)*38,h:34+(i%5)*10,ang:i*.65,spd:(i%2?1:-1)*(.14+(i%3)*.04)}));
  trackGroup.add(gulls);
  trackAnimators.push(t=>{
   for(let i=0;i<gSeeds.length;i++){const d=gSeeds[i],a=d.ang+t*d.spd;o.position.set(Math.cos(a)*d.r+20,d.h+Math.sin(t*3+i)*2,Math.sin(a)*d.r+130);o.scale.set(1,1,1);o.rotation.set(0,-a,Math.sin(t*6+i)*.25);o.updateMatrix();gulls.setMatrixAt(i,o.matrix)}
   gulls.instanceMatrix.needsUpdate=true;
  });
 }
 // Live Sector 1 & Sector 2 Overhead Split Gates
 const secMat=new T.MeshBasicMaterial({color:0xb6ff3b,transparent:true,opacity:.6,blending:T.AdditiveBlending});
 for(const sIdx of [166,333]){
  const sp0=P[sIdx],ang=Math.atan2(-NR[sIdx].z,NR[sIdx].x);
  const gate=new T.Mesh(new T.TorusGeometry(HW+2.6,.22,5,24,PI),secMat);
  gate.position.set(sp0.x,sp0.y+.2,sp0.z);gate.rotation.y=ang;trackGroup.add(gate);
 }
 const gm=new T.MeshStandardMaterial({color:0x1b2436,metalness:.7,roughness:.3});
 const gantAng=Math.atan2(-NR[0].z,NR[0].x);
 for(const s of[-1,1]){
  const p=new T.Mesh(new T.BoxGeometry(2.2,14.5,2.2),gm);p.position.set(P[0].x+NR[0].x*s*(HW+2),P[0].y+7.25,P[0].z+NR[0].z*s*(HW+2));trackGroup.add(p);
  const strip=new T.Mesh(new T.BoxGeometry(.35,14,.35),new T.MeshBasicMaterial({color:td.edg}));strip.position.set(P[0].x+NR[0].x*s*(HW+.9),P[0].y+7,P[0].z+NR[0].z*s*(HW+.9));trackGroup.add(strip);
 }
 const bn=new T.Mesh(new T.BoxGeometry(HW*2+5,2.6,1.3),new T.MeshStandardMaterial({color:0x111625,metalness:.6,roughness:.3}));bn.position.set(P[0].x,P[0].y+14.2,P[0].z);bn.rotation.y=gantAng;trackGroup.add(bn);
 const banTex=window.KartVFX?window.KartVFX.createGantryBannerTexture(td.n,td.edg):null;
 const bnMat=banTex?new T.MeshBasicMaterial({map:banTex}):new T.MeshBasicMaterial({color:td.edg});
 const bnSign=new T.Mesh(new T.PlaneGeometry(HW*2+4.2,2.1),bnMat);
 bnSign.position.set(P[0].x-TN[0].x*.72,P[0].y+14.2,P[0].z-TN[0].z*.72);bnSign.rotation.y=Math.atan2(-TN[0].x,-TN[0].z);trackGroup.add(bnSign);
 const bnSignBack=new T.Mesh(new T.PlaneGeometry(HW*2+4.2,2.1),bnMat);
 bnSignBack.position.set(P[0].x+TN[0].x*.72,P[0].y+14.2,P[0].z+TN[0].z*.72);bnSignBack.rotation.y=Math.atan2(TN[0].x,TN[0].z);trackGroup.add(bnSignBack);
 // Pre-render static minimap circuit once per track load (zero per-frame 500-vertex Canvas 2D redraw)
 if(mmBgCtx){
  mmBgCtx.clearRect(0,0,170,170);
  const maxSpan=Math.max(bx1-bx0,bz1-bz0)||1,cx0=(bx0+bx1)/2,cz0=(bz0+bz1)/2;
  const mp=(x,z)=>[85+(x-cx0)/maxSpan*140,85+(z-cz0)/maxSpan*140];
  mmBgCtx.strokeStyle='#'+(td?td.edg.toString(16).padStart(6,'0'):'19e6ff');
  mmBgCtx.lineWidth=3.5;mmBgCtx.beginPath();
  P.forEach((p,i)=>{const[a,b]=mp(p.x,p.z);i?mmBgCtx.lineTo(a,b):mmBgCtx.moveTo(a,b)});
  mmBgCtx.closePath();mmBgCtx.stroke();
  if(P[0]){const[fa,fb]=mp(P[0].x,P[0].z);mmBgCtx.fillStyle='#ffffff';mmBgCtx.fillRect(fa-3,fb-3,6,6)}
  mmBgCtx.fillStyle='#b6ff3b';for(const bp of boostPads){const[a,b]=mp(bp.x,bp.z);mmBgCtx.fillRect(a-2,b-2,4,4)}
 }
 if(state==='menu'&&pl0)place(pl0,3,0);
}

function groundY(x,z,idx){
 const p=P[idx];if(!p)return 0;
 const pNext=P[(idx+1)%N],pPrev=P[(idx-1+N)%N];
 const dx=x-p.x,dz=z-p.z;
 const lat=(dx*NR[idx].x+dz*NR[idx].z),bankOff=Math.sin(BANK[idx]||0)*cl(lat,-HW,HW);
 const fx=pNext.x-p.x,fz=pNext.z-p.z,fl=fx*fx+fz*fz;
 const fDot=fl>1e-5?(dx*fx+dz*fz)/fl:0;
 if(fDot>0)return p.y+(pNext.y-p.y)*cl(fDot,0,1)+bankOff;
 const bx=pPrev.x-p.x,bz=pPrev.z-p.z,bl=bx*bx+bz*bz;
 const bDot=bl>1e-5?(dx*bx+dz*bz)/bl:0;
 if(bDot>0)return p.y+(pPrev.y-p.y)*cl(bDot,0,1)+bankOff;
 return p.y+bankOff;
}

function near(c){
 let b=1e9,bi=c.idx;
 for(let k=-22;k<=22;k++){const i=(c.idx+k+N)%N,p=P[i],d=(p.x-c.x)**2+(p.z-c.z)**2;if(d<b){b=d;bi=i}}
 if(b>2500){for(let i=0;i<N;i++){const p=P[i],d=(p.x-c.x)**2+(p.z-c.z)**2;if(d<b){b=d;bi=i}}}
 c.idx=bi;c.lat=(c.x-P[bi].x)*NR[bi].x+(c.z-P[bi].z)*NR[bi].z;
}

/* ---------- SOFT GLOW & PROTECTED LIVERY TEXTURES ---------- */
const soft=window.KartModels.soft;
protectedTextures.add(soft);
for(const lv of(window.KartModels.liveries||[])){const tx=window.KartModels.getLiveryTexture?.(lv);if(tx)protectedTextures.add(tx)}

/* ---------- OPPONENT ROSTER, PAINTS, FINISHES, LIVERIES & RIMS ---------- */
let customPaint=null,customFinish='gloss',customLivery='stripes',customRim='alloy';
try{
 customPaint=localStorage.getItem('tk_paint');if(!/^#[0-9a-f]{6}$/i.test(customPaint))customPaint=null;
 const savedFin=localStorage.getItem('tk_finish');if(savedFin&&window.KartModels.finishes?.[savedFin])customFinish=savedFin;
 const savedLiv=localStorage.getItem('tk_livery');if(savedLiv&&window.KartModels.liveries?.includes(savedLiv))customLivery=savedLiv;
 const savedRim=localStorage.getItem('tk_rim');if(savedRim&&window.KartModels.rims?.includes(savedRim))customRim=savedRim;
}catch(e){}

const BOT_ROSTER = [
 { n: 'VIPER', c: 0xff1744, hex: '#ff1744' },     // Neon Crimson
 { n: 'BLAZE', c: 0xff9100, hex: '#ff9100' },     // Solar Amber
 { n: 'NEXUS', c: 0x00e5ff, hex: '#00e5ff' },     // Electric Cyan
 { n: 'PHANTOM', c: 0xd500f9, hex: '#d500f9' },   // Cyber Violet
 { n: 'RAZOR', c: 0x00e676, hex: '#00e676' },     // Acid Green
 { n: 'VALKYRIE', c: 0xffd600, hex: '#ffd600' },   // Gold Ion
 { n: 'SPECTER', c: 0x651fff, hex: '#651fff' },    // Deep Indigo
 { n: 'NOVA', c: 0x00bfa5, hex: '#00bfa5' }        // Hyper Teal
];

/* ---------- CAR MODEL & RIBBON TRAILS ---------- */
const mkCar=(d,col,isP,style)=>window.KartModels.create(d,col,style?.finish||(isP?customFinish:'gloss'),style?.livery||(isP?customLivery:'stripes'),style?.rim||(isP?customRim:'alloy'));
const trailL=window.KartVFX?window.KartVFX.createRibbonTrail(0xff2a55,24,.18):{mesh:null,push(){},reset(){}};
const trailR=window.KartVFX?window.KartVFX.createRibbonTrail(0xff2a55,24,.18):{mesh:null,push(){},reset(){}};
if(trailL.mesh)sc.add(trailL.mesh,trailR.mesh);

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
function qualityRainCount(){return prefs.quality==='high'?RAIN_N:prefs.quality==='low'?260:520}
function applyQuality(){
 rd.setPixelRatio(Math.min(devicePixelRatio,prefs.quality==='high'?1.75:prefs.quality==='low'?1:1.25));
 sc.environment=prefs.quality==='low'?null:curEnvMap;
 rainGeo.setDrawRange(0,qualityRainCount()*2);
 composer.enabled=prefs.quality!=='low';
 if(rd.shadowMap){
  rd.shadowMap.enabled=prefs.quality!=='low';
  if(dl.shadow){
   dl.castShadow=prefs.quality!=='low';
   const smSz=prefs.quality==='high'?1024:512;
   if(dl.shadow.mapSize.width!==smSz){dl.shadow.mapSize.set(smSz,smSz);if(dl.shadow.map){dl.shadow.map.dispose();dl.shadow.map=null}}
  }
 }
 if(prefs.quality==='low'){playerLight.intensity=0;fxLight.intensity=0}
 const dpr=rd.getPixelRatio?rd.getPixelRatio():1;
 composer.resize(innerWidth*dpr,innerHeight*dpr);
}
function updateWeather(dt){
 if(mpo){weather='clear';wetGrip=1;rain.visible=false;$('wx').textContent='';if(activeRoadMat){activeRoadMat.roughness=baseRoadRoughness;activeRoadMat.envMapIntensity=baseRoadEnv}return}
 if(prefs.weather==='dynamic'){weatherT-=dt;if(weatherT<=0){weatherT=25+R()*35;weather=['clear','rain','storm'][Math.floor(R()*3)]}}
 const isWet=weather!=='clear';
 if(activeRoadMat){
  const targetRough=isWet?Math.min(baseRoadRoughness,.18):baseRoadRoughness;
  const targetEnv=isWet?Math.max(baseRoadEnv,1.85):baseRoadEnv;
  activeRoadMat.roughness+=(targetRough-activeRoadMat.roughness)*cl(dt*2,0,1);
  activeRoadMat.envMapIntensity+=(targetEnv-activeRoadMat.envMapIntensity)*cl(dt*2,0,1);
 }
 if(weather==='clear'){rain.visible=false;wetGrip=1;$('wx').textContent='';return}
 rain.visible=true;wetGrip=weather==='storm'?.55:.75;
 $('wx').textContent=weather==='storm'?'⛈️ STORM':'🌧️ RAIN';
 const cx=pl0?pl0.x:0,cz=pl0?pl0.z:0,spd=weather==='storm'?80:50,rn=qualityRainCount();
 rainGeo.setDrawRange(0,rn*2);
 for(let i=0;i<rn;i++){const b=i*6;
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
const pa=(x,y,z,vx,vy,vz,life,r,g,b)=>{if(prefs.quality==='low'&&(pn&1)){pn++;return}const i=pn++%PM,j=i*3;pp[j]=x;pp[j+1]=y;pp[j+2]=z;pv[j]=vx;pv[j+1]=vy;pv[j+2]=vz;pb[j]=r;pb[j+1]=g;pb[j+2]=b;pl[i]=pL[i]=life};
const rings=[];let shake=0;
function boom(x,z,big,cy){const y0=cy||0,n=big?1:.35;
 for(let i=0;i<40*n;i++){const a=R()*PI*2,s=R()*16,u=R()*12;pa(x,y0+1.5,z,Math.cos(a)*s,u,Math.sin(a)*s,.5+R()*.5,1,.45,.1)}
 for(let i=0;i<30*n;i++){const a=R()*PI*2,s=15+R()*35;pa(x,y0+1.5,z,Math.cos(a)*s,R()*25,Math.sin(a)*s,.6+R()*.5,1,.9,.5)}
 for(let i=0;i<22*n;i++){const a=R()*PI*2,s=R()*7;pa(x,y0+2,z,Math.cos(a)*s,4+R()*7,Math.sin(a)*s,1.4+R(),.32,.32,.36)}
 const m=new T.Mesh(new T.RingGeometry(.8,1,32),new T.MeshBasicMaterial({color:0xffaa55,transparent:true,side:T.DoubleSide}));m.rotation.x=-PI/2;m.position.set(x,y0+.3,z);sc.add(m);rings.push({m,t:0,s:big?45:18});
 flashLight(x,y0,z,0xff8833,big?4.5:2.4,big?.42:.25);
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
 if(!audioMuted){
  if(prefs.volume<=0){prefs.volume=45;const vol=$('volume');if(vol)vol.value='45'}
  aud();
  if(master)master.gain.value=prefs.volume/100;
 }
 $('mubtn').textContent=audioMuted?'🔇':'🔊';
 $('p-mute').textContent=audioMuted?'Audio: OFF 🔇':'Audio: ON 🔊';
 if(audioMuted){stopMusic();if(eg)eg.gain.value=0}
 else if(state==='race'){startMusic()}
}
$('mubtn').onclick=e=>{e.stopPropagation();toggleAudio()};
$('p-mute').onclick=toggleAudio;

/* ---------- ADAPTIVE SYNTH SOUNDTRACK ---------- */
let musicNodes=[],musicOn=false;
function startMusic(){
 if(!AC||musicOn||audioMuted)return;musicOn=true;
 const bss=AC.createOscillator();bss.type='triangle';bss.frequency.value=55;
 const bf=AC.createBiquadFilter();bf.type='lowpass';bf.frequency.value=260;
 const bg=AC.createGain();bg.gain.value=.032;bss.connect(bf);bf.connect(bg);bg.connect(master);bss.start();musicNodes.push(bss,bf,bg);
 for(const freq of[110,130.81,164.81]){const o=AC.createOscillator();o.type='sine';o.frequency.value=freq;
  const g=AC.createGain();g.gain.value=.01;const f=AC.createBiquadFilter();f.type='lowpass';f.frequency.value=350;
  o.connect(f);f.connect(g);g.connect(master);o.start();musicNodes.push(o,f,g)}
 const arpOsc=AC.createOscillator();arpOsc.type='sawtooth';const ag=AC.createGain();ag.gain.value=.012;
 const af=AC.createBiquadFilter();af.type='lowpass';af.frequency.value=700;
 arpOsc.connect(af);af.connect(ag);ag.connect(master);arpOsc.start();musicNodes.push(arpOsc,af,ag);
 const notes=[220,261.63,329.63,392,329.63,261.63,220,174.61],bassNotes=[55,55,65.41,73.42,55,55,49,61.74];let ni=0;
 const arpInt=setInterval(()=>{if(!musicOn||!AC){clearInterval(arpInt);return}
  const sp=pl0?Math.abs(pl0.vf):0,fast=cl(sp/85,0,1),finalLap=pl0&&pl0.lap>=LAPS-1;
  const boosting=pl0&&(pl0.boosting||pl0.padBoost>0||pl0.driftBoost>0||pl0.ultActive>0);
  const mult=finalLap?1.122:1; // +2 semitones final lap lift
  const note=notes[ni%notes.length]*mult*(boosting&&(ni%2===1)?1.5:1);
  arpOsc.frequency.setValueAtTime(note,AC.currentTime);
  bss.frequency.setValueAtTime(bassNotes[(ni>>1)%bassNotes.length]*mult,AC.currentTime);
  af.frequency.value=480+fast*950+(boosting?420:0);
  bf.frequency.value=220+fast*280;
  ag.gain.value=.009+fast*.012+(boosting?.006:0);
  // Subtle crisp percussion pulse when racing at speed
  if(state==='race'&&!paused&&fast>.35&&(ni%2===0)){snd(ni%4===0?92:1650,.045,ni%4===0?'triangle':'square',ni%4===0?.045:.014,ni%4===0?.45:.9)}
  ni++},165);musicNodes.push({stop:()=>clearInterval(arpInt)})}
function stopMusic(){musicOn=false;musicNodes.forEach(n=>{try{if(n.stop)n.stop();if(n.disconnect)n.disconnect()}catch(e){}});musicNodes=[]}

/* ---------- STATE ---------- */
let prs=[],selCar=0,mpo=null,ns=0,mode=1,wave=0,wt=0,pu=[],mines=[],clk=0,fo=0,lockT=null,lockTm=0,ptime=0,warnT=0;
let camMode=0,paused=false,oilSlicks=[],lastCdNum=-1,driftSndT=0,bestLap=Infinity,lapStart=0;
let camLookX=0,camLookY=0,camLookZ=0,camRoll=0,camSnap=true,lookBack=false;
const CAM_NAMES=['CHASE','WIDE','HOOD','ACTION'];
const K={},M=[0,0,0],PUC=KartCombat.powers.map(p=>p.color),MODES=['Race','Combat','Elimination','Survival','Time trial'];
function cycleCam(){
 camMode=(camMode+1)%CAM_NAMES.length;camSnap=true;
 const ci=$('caminfo');if(ci){ci.textContent='📷 '+CAM_NAMES[camMode];ci.style.opacity='1';later(()=>{ci.style.opacity='0'},1500)}
}

/* ---------- GAMEPAD / CONTROLLER SUPPORT ---------- */
const gpPrev={cam:false,pause:false,ult:false,msl:false,emp:false,mine:false,oil:false};
const gpState={active:false,thr:0,str:0,drift:false,boost:false,fire:false,lookBack:false};
addEventListener('gamepadconnected',e=>window.toast?.('🎮 Controller connected: '+(e.gamepad?.id||'Gamepad').slice(0,26)));
function pollGamepad(){
 gpState.active=false;gpState.thr=0;gpState.str=0;gpState.drift=gpState.boost=gpState.fire=gpState.lookBack=false;
 const pads=navigator.getGamepads?.();if(!pads)return gpState;
 let gp=null;for(let i=0;i<pads.length;i++)if(pads[i]&&pads[i].connected){gp=pads[i];break}
 if(!gp)return gpState;
 gpState.active=true;
 const ax0=gp.axes?.[0]||0,dead=.15;
 let str=Math.abs(ax0)>dead?Math.sign(ax0)*(Math.abs(ax0)-dead)/(1-dead):0;
 if(gp.buttons?.[14]?.pressed)str=-1;if(gp.buttons?.[15]?.pressed)str=1;
 const btn=i=>!!gp.buttons?.[i]?.pressed,val=i=>gp.buttons?.[i]?.value||0;
 const gas=Math.max(val(7),btn(0)?1:0),brk=Math.max(val(6),btn(2)?1:0);
 gpState.str=cl(str,-1,1);
 gpState.thr=brk>.2?-brk:gas>.15?gas:0;
 gpState.drift=btn(4);
 gpState.boost=btn(5)||btn(1);
 gpState.fire=btn(12);
 gpState.lookBack=btn(11);
 const pCam=btn(8),pPause=btn(9),pUlt=btn(3),pMsl=btn(12),pEmp=btn(13),pMine=btn(10);
 if(pCam&&!gpPrev.cam&&state!=='menu'&&state!=='count')cycleCam();
 if(pPause&&!gpPrev.pause&&state==='race')togglePause();
 if(pUlt&&!gpPrev.ult&&state==='race'&&!paused&&pl0)activateUlt(pl0);
 if(pMsl&&!gpPrev.msl&&state==='race'&&!paused&&pl0)fire(pl0,1);
 if(pEmp&&!gpPrev.emp&&state==='race'&&!paused&&pl0)empBlast(pl0);
 if(pMine&&!gpPrev.mine&&state==='race'&&!paused&&pl0)mine(pl0);
 gpPrev.cam=pCam;gpPrev.pause=pPause;gpPrev.ult=pUlt;gpPrev.msl=pMsl;gpPrev.emp=pEmp;gpPrev.mine=pMine;
 return gpState;
}

/* ---------- KILL FEED ---------- */
function addKF(text,color){color=color||'#ff2a8a';
 const d=document.createElement('div');d.className='kfm';d.style.borderColor=color;d.textContent=text;$('kf').appendChild(d);
 later(()=>{d.classList.add('out');later(()=>d.remove(),600)},2800)}

/* ---------- INPUT ---------- */
addEventListener('keydown',e=>{if(document.querySelector?.('dialog[open]')||['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName))return;const code=prefs.keys[e.code]||e.code;if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(code))e.preventDefault();K[code]=1;if(e.repeat)return;
 if(e.code=='KeyR'&&state!='menu'&&!mpo)start();
 if(e.code=='KeyC'&&state!='menu'&&state!=='count')cycleCam();
 if(e.code=='KeyV')lookBack=true;
 if((code=='KeyX'||code=='KeyZ')&&state=='race'&&!paused&&pl0)activateUlt(pl0);
 if(e.code=='Escape'&&state=='race')togglePause()});
addEventListener('keyup',e=>{K[prefs.keys[e.code]||e.code]=0;if(e.code=='KeyV')lookBack=false});
function resetInput(){Object.keys(K).forEach(k=>K[k]=0);M.fill(0);lookBack=false;touchStr=touchThr=touchDrift=touchBoost=touchFire=touchMsl=touchGas=touchBrake=0;window.KartTilt?.reset()}
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
 tbind('tgas',v=>touchGas=v);tbind('tbrake',v=>touchBrake=v);tbind('tboost',v=>touchBoost=v);tbind('tfire',v=>touchFire=v);tbind('tmsl',v=>touchMsl=v);tbind('tdrift',v=>touchDrift=v);tbind('tult',v=>{if(v&&pl0)activateUlt(pl0)});tbind('tmine',v=>{if(v)mine(pl0)});tbind('temp',v=>{if(v)empBlast(pl0)});tbind('toil',v=>{if(v)dropOil(pl0)});$('tcam').onclick=cycleCam}

/* ---------- CAR FACTORY ---------- */
function mk(d,isP,col,botName,colHex,style){
 const carCol=isP?(customPaint?parseInt(customPaint.slice(1),16):d.c):(col!==undefined?col:d.c);
 const m=mkCar(d,carCol,isP,style);
 m.rotation.order='YXZ';
 if(isP&&customPaint){m.base.set(customPaint);m.paint.color.set(customPaint)}
 sc.add(m);const muzzle=new T.Mesh(new T.ConeGeometry(.22,.9,6).rotateX(PI/2),new T.MeshBasicMaterial({color:0xcaffff,transparent:true,opacity:.92,blending:T.AdditiveBlending,depthWrite:false}));if(m.barrels){muzzle.position.set(0,0,1.08);m.barrels.add(muzzle)}else{muzzle.position.set(0,1.7,3.1);m.add(muzzle)}muzzle.visible=false;m.muzzle=muzzle;const s=new T.Mesh(new T.SphereGeometry(3,16,12),new T.MeshBasicMaterial({color:0x35b0ff,transparent:true,opacity:.25,blending:T.AdditiveBlending,depthWrite:false}));s.position.y=1.2;s.visible=false;m.add(s);m.sh=s;
 const fsh=new T.Mesh(new T.DodecahedronGeometry(3.6,1),new T.MeshBasicMaterial({color:0xffaa20,wireframe:true,transparent:true,opacity:.85,blending:T.AdditiveBlending}));
 fsh.position.y=1.2;fsh.visible=false;m.add(fsh);m.fsh=fsh;
 const ultType=d.ability??CARS.findIndex(x=>x.n===d.n);
 const cHex=isP?(customPaint||'#'+d.c.toString(16).padStart(6,'0')):(colHex||'#'+carCol.toString(16).padStart(6,'0'));
 const myName=(($('garage-name')?.value||$('driver-name')?.value||'').trim())||'Racer';
 const name=isP?myName:(botName||d.n);
 return{uid:++carUID,sh:0,mn:0,d,m,isP,name,col:carCol,colHex:cHex,x:0,z:0,h:0,prevX:0,prevY:0,prevZ:0,prevH:0,airY:0,airVy:0,padBoost:0,driftBoost:0,driftTier:0,rampCd:0,seismicT:0,pitch:0,vx:0,vz:0,vf:0,vl:0,prevVf:0,suspPitch:0,suspRoll:0,driftTime:0,recoil:0,hp:100,bo:100,boosting:false,braking:false,lap:0,checkpoint:0,idx:0,lat:0,dead:0,inv:0,mg:0,ms:0,off:0,kills:0,fin:0,finTime:0,rapid:0,plasma:0,magnet:0,emp:0,oil:0,flash:0,skill:1,lane:0,st:0,spin:0,ultCd:0,ultActive:0,ultType:ultType<0?0:ultType}
}
function place(c,i,lat){const p=P[i];c.x=p.x+NR[i].x*lat;c.z=p.z+NR[i].z*lat;c.h=Math.atan2(TN[i].x,TN[i].z);c.vx=c.vz=c.vf=c.vl=0;c.idx=i;c.airY=0;c.airVy=0;c.prevX=c.x;c.prevZ=c.z;c.prevH=c.h;c.prevY=groundY(c.x,c.z,i)}
function menuCar(){if(pl0)removeEntity(pl0.m);pl0=mk(CARS[selCar],true);place(pl0,3,0);pl0.m.position.set(pl0.x,groundY(pl0.x,pl0.z,pl0.idx),pl0.z);pl0.m.rotation.y=pl0.h;cars=[pl0]}
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

function drawNameplate(canvas,label,hex,hp=100,rk=0){
 const x=canvas.getContext('2d');
 x.clearRect(0,0,256,72);
 x.fillStyle='#08121be0';x.fillRect(4,6,248,58);
 x.strokeStyle=hex||'#19e6ff';x.lineWidth=3;x.strokeRect(4,6,248,58);
 const tag=rk>0?('#'+rk+' '+String(label||'RACER').slice(0,13)):String(label||'RACER').slice(0,15);
 x.font='bold 22px Bahnschrift, Segoe UI, sans-serif';x.textAlign='center';x.textBaseline='middle';
 x.fillStyle='#ffffff';x.fillText(tag,128,28);
 // Live HP bar inside nameplate
 x.fillStyle='#ffffff22';x.fillRect(18,48,220,9);
 const pct=cl(hp/100,0,1);
 x.fillStyle=pct<.3?'#ff2a6d':pct<.6?'#ffb020':'#35ff9a';
 x.fillRect(18,48,Math.round(220*pct),9);
}
function addNameplate(m,label,hex){
 const c=document.createElement('canvas');c.width=256;c.height=72;
 drawNameplate(c,label,hex,100,0);
 const tex=new T.CanvasTexture(c);
 const sp=new T.Sprite(new T.SpriteMaterial({map:tex,transparent:true,depthWrite:false}));
 sp.scale.set(4.8,1.35,1);sp.position.y=3.45;
 sp.userData={canvas:c,tex,label,hex,lastHp:100,lastRk:0};
 m.add(sp);m.nameplate=sp;
}
function updateNameplate(car,rk){
 const sp=car.m?.nameplate;if(!sp||!sp.userData)return;
 const hpB=Math.round(car.hp/5)*5;
 if(hpB===sp.userData.lastHp&&rk===sp.userData.lastRk)return;
 sp.userData.lastHp=hpB;sp.userData.lastRk=rk;
 drawNameplate(sp.userData.canvas,car.name||sp.userData.label,car.colHex||sp.userData.hex,car.hp,rk);
 sp.userData.tex.needsUpdate=true;
}
let mpBotCount=0,botSyncT=0,activeGhost=null,ghostMesh=null,ghostRecord=[],ghostSampleT=0;
function mkGhostMesh(carIdx){
 const d=CARS[carIdx]||CARS[0],m=mkCar(d,0x19e6ff,false);
 m.rotation.order='YXZ';
 m.traverse(ch=>{if(ch.material){ch.material=ch.material.clone();ch.material.transparent=true;ch.material.opacity=.32;if(ch.material.color)ch.material.color.setHex(0x36f0ff);if(ch.material.emissive)ch.material.emissive.setHex(0x19e6ff)}});
 addNameplate(m,'GHOST · '+(activeGhost?.name||'WR'),'#19e6ff');
 sc.add(m);return m;
}
function start(){
 cancelTimers();contactHits.clear();resetInput();elapsed=0;uiTick=0;lockT=null;lockTm=0;dl.intensity=baseDLIntensity;$('flash').style.opacity='0';$('empfl').style.opacity='0';$('cd').textContent='';
 trailL.reset();trailR.reset();const dlEl=$('dmg-layer');if(dlEl)dlEl.innerHTML='';const ww=$('wrong-way');if(ww)ww.hidden=true;
 if(ghostMesh){removeEntity(ghostMesh);ghostMesh=null}ghostRecord=[];ghostSampleT=0;botSyncT=0;
 if(!mpo)LAPS=3;
 bestS1=Infinity;bestS2=Infinity;lapSector=0;sectorStart=0;
 for(const r of rings)removeEntity(r.m);rings.length=0;pl.fill(0);pc.fill(0);
 for(let i=0;i<SK;i++)sk.setMatrixAt(i,zeroMat);sk.instanceMatrix.needsUpdate=true;
 if(!mpo)pickupRng=KartCore.seeded(Date.now());
 $('touch').hidden=!isMobile;$('pause-label').textContent=mpo?'PIT MENU • RACE CONTINUES':'PAUSED';
 cam.clearViewOffset?.();camSnap=true;camRoll=0;accumulator=0;

 for(const c of cars)removeEntity(c.m);for(const p of prs)removeEntity(p.m);for(const m of mines)removeEntity(m.m);for(const p of pu)removeEntity(p.m);for(const o of oilSlicks)removeEntity(o.m);
 prs=[];mines=[];pu=[];oilSlicks=[];fo=0;wave=1;wt=0;lastCdNum=-1;paused=false;$('pause').hidden=true;$('kf').innerHTML='';
 bestLap=Infinity;lapStart=0;$('bestlap').textContent='';
 weather=mpo?'clear':(prefs.weather==='dynamic'?(R()<.3?'rain':'clear'):prefs.weather);weatherT=20+R()*30;
 pl0=mk(CARS[selCar],true);cars=[pl0];const my=mpo?mpo.indexOf(NET.me):0;place(pl0,3+my*4,mpo?(my%2?-5:5):0);
 if(mpo){
  for(const o of NET.players)if(o.id!=NET.me){const r=mk(CARS[o.car],false,parseInt(o.paint.slice(1),16),o.name,o.paint,{finish:o.finish,livery:o.livery,rim:o.rim}),k=mpo.indexOf(o.id);r.r=1;r.id=o.id;addNameplate(r.m,o.name,o.paint);place(r,3+k*4,k%2?-5:5);r.tx=r.x;r.tz=r.z;r.th=r.h;cars.push(r)}
  if(mpBotCount>0){
   const base=3+mpo.length*4;
   for(let bi=0;bi<mpBotCount;bi++){
    const botInfo=BOT_ROSTER[bi%BOT_ROSTER.length],carDef=CARS[bi%CARS.length];
    const b=mk(carDef,false,botInfo.c,botInfo.n+' [AI]',botInfo.hex);
    b.isNetBot=true;b.botIdx=bi;b.skill=.86+(bi%3)*.03;b.lane=((bi%3)-1)*4;
    if(NET.me!==NET.host){b.r=1}
    addNameplate(b.m,b.name,b.colHex);
    place(b,(base+bi*4)%N,bi%2?-5:5);b.tx=b.x;b.tz=b.z;b.th=b.h;
    cars.push(b);
   }
  }
 }else if(mode!==4){
  bots(mode==3?3:5,prefs.difficulty==='rookie'?.72:prefs.difficulty==='expert'?1:.86);
 }else if(activeGhost&&activeGhost.track===curTrack&&Array.isArray(activeGhost.ghost)&&activeGhost.ghost.length>1){
  ghostMesh=mkGhostMesh(activeGhost.car);
 }
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
function spawnDmgPop(target,amount,isCrit){
 const layer=$('dmg-layer');if(!layer||!target)return;
 const v=tmpV3.set(target.x,groundY(target.x,target.z,target.idx)+(target.airY||0)+2.5,target.z).project(cam);
 if(v.z>=1)return;
 const el=document.createElement('div');
 el.className='dmg-pop'+(isCrit?' crit':'');
 el.textContent='-'+Math.max(1,Math.round(amount));
 el.style.left=((v.x*.5+.5)*innerWidth+(R()-.5)*22)+'px';
 el.style.top=((-v.y*.5+.5)*innerHeight)+'px';
 layer.appendChild(el);
 later(()=>el.remove(),650);
}
function showDmgDir(attacker){
 if(!pl0||!attacker||attacker===pl0)return;
 let rel=Math.atan2(attacker.x-pl0.x,attacker.z-pl0.z)-pl0.h;
 rel=Math.atan2(Math.sin(rel),Math.cos(rel));
 const id=Math.abs(rel)<PI*.25?'dmg-top':Math.abs(rel)>PI*.75?'dmg-bot':rel>0?'dmg-left':'dmg-right';
 const el=$(id);if(!el)return;
 el.style.opacity='.9';later(()=>{el.style.opacity='0'},280);
}
function hit(c,amt,by,server=false){
 if(mpo&&!server&&!c.isNetBot)return;
 if(c.dead||c.inv>0)return;
 if(c.sh>0){c.m.sh.material.opacity=.8;return}
 const actual=amt/c.d.arm;
 c.hp-=actual;
 const cy=TY[c.idx]||0;
 for(let i=0;i<6;i++)pa(c.x,cy+1.4,c.z,(R()-.5)*20,R()*12,(R()-.5)*20,.4,1,.8,.3);
 if(by?.isP&&!c.isP)spawnDmgPop(c,actual,amt>=20);
 if(c.isP){shake=Math.max(shake,.35);showDmgDir(by);$('flash').style.opacity=.55;later(()=>$('flash').style.opacity=0,120)}
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
  const target=detectTarget(c,c.isP?lockT:c.tgt),aim=aimAt(c,target,0);proj(c,0,aim.a,target,aim.vy);c.recoil=1;
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
function empVisual(c,applyLocalPush=false){
 const cy=TY[c.idx]||0;
 for(let i=0;i<3;i++){later(()=>{const m2=new T.Mesh(new T.RingGeometry(.8,1.5,32),new T.MeshBasicMaterial({color:0x19e6ff,transparent:true,side:T.DoubleSide}));
  m2.rotation.x=-PI/2;m2.position.set(c.x,cy+1,c.z);sc.add(m2);rings.push({m:m2,t:0,s:22+i*7})},i*70)}
 for(let i=0;i<25;i++){const a=R()*PI*2,s=R()*18;pa(c.x,cy+2,c.z,Math.cos(a)*s,R()*12,Math.sin(a)*s,.5+R()*.3,.1,.9,1)}
 const nearPl=pl0&&Math.hypot(pl0.x-c.x,pl0.z-c.z)<28;
 if(applyLocalPush&&pl0&&c!==pl0&&!pl0.dead&&nearPl){const d=Math.hypot(pl0.x-c.x,pl0.z-c.z)||1;pl0.vx+=(pl0.x-c.x)/d*25;pl0.vz+=(pl0.z-c.z)/d*25;shake=Math.max(shake,.4)}
 if(c.isP||nearPl){$('empfl').style.opacity='.6';later(()=>$('empfl').style.opacity='0',200)}
 flashLight(c.x,cy,c.z,0x19e6ff,4.0,.38);
 snd(150,.7,'square',.18,.08,c);snd(2000,.25,'sine',.08,.5,c);
}
function empBlast(c){if(c.dead||c.emp>0||mode===0||mode===4||paused||state!=='race')return;c.emp=10;
 for(const o of cars){if(o===c||o.dead||o.r)continue;const d=Math.hypot(o.x-c.x,o.z-c.z);
  if(d<28){const nx=(o.x-c.x)/(d||1),nz=(o.z-c.z)/(d||1);o.vx+=nx*25;o.vz+=nz*25;hit(o,18,c)}}
 empVisual(c,false);
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
  c.m.traverse(ch=>{if(ch.material&&ch!==c.m.sh&&ch!==c.m.fsh){const m=ch.material;if(m.userData.cloakBase===undefined)m.userData.cloakBase=m.opacity;m.transparent=true;m.opacity=.18}});
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
 }else if(c.ultType===4){
  // APEX: SLIPSTREAM SURGE (Mach speed, zero lateral slip, sonic wake blasts passed rivals)
  c.inv=Math.min(1.4,dur*.45);c.bo=100;
  const fx=Math.sin(c.h),fz=Math.cos(c.h);
  c.vx+=fx*30;c.vz+=fz*30;
  for(let i=0;i<34;i++){const a=R()*PI*2,s=10+R()*20;pa(c.x,cy+1.2,c.z,Math.cos(a)*s,R()*5,Math.sin(a)*s,.55,.71,1,.23)}
  const m2=new T.Mesh(new T.RingGeometry(1,4.8,32),new T.MeshBasicMaterial({color:0xb6ff3b,transparent:true,side:T.DoubleSide}));
  m2.rotation.x=-PI/2;m2.position.set(c.x,cy+1,c.z);sc.add(m2);rings.push({m:m2,t:0,s:42});
  if(c.isP){shake=Math.max(shake,.45);addKF('⚡ SLIPSTREAM SURGE!','#b6ff3b')}
  else addKF('⚡ '+c.d.n+' triggered Slipstream Surge!','#b6ff3b');
  snd(520,.45,'sawtooth',.28,2.8,c);snd(1320,.38,'sine',.2,.7,c);
 }else if(c.ultType===5){
  // RALLY: SEISMIC OVERDRIVE (All-terrain immunity, armor surge & pulsing 18m seismic shockwaves)
  c.inv=dur;c.seismicT=0;
  for(let i=0;i<30;i++){const a=R()*PI*2,s=8+R()*16;pa(c.x,cy+1.2,c.z,Math.cos(a)*s,2+R()*7,Math.sin(a)*s,.7,1,.83,.44)}
  const m2=new T.Mesh(new T.RingGeometry(1.2,5.0,32),new T.MeshBasicMaterial({color:0xffd470,transparent:true,side:T.DoubleSide}));
  m2.rotation.x=-PI/2;m2.position.set(c.x,cy+1,c.z);sc.add(m2);rings.push({m:m2,t:0,s:36});
  if(c.isP){shake=Math.max(shake,.5);addKF('🌋 SEISMIC OVERDRIVE!','#ffd470')}
  else addKF('🌋 '+c.d.n+' unleashed Seismic Overdrive!','#ffd470');
  snd(130,.7,'sawtooth',.32,.35,c);snd(520,.45,'triangle',.22,1.4,c);
 }
}

function renderPodium(){
 const pod=$('podium');if(!pod)return;
 if(cars.length<=1){pod.innerHTML='';return}
 const sorted=[...cars].sort((a,b)=>rank(a)-rank(b));
 pod.innerHTML=sorted.map((r,idx)=>{
  const rk=idx+1,isMe=r===pl0;
  const tag=r.fin?(r.finTime?(r.finTime/1000).toFixed(1)+'s':'🏁 FINISHED'):r.dead>100?'☠️ ELIMINATED':('Lap '+Math.min(r.lap+1,LAPS)+'/'+LAPS);
  return `<div class="pod-row${isMe?' me':''}"><b>#${rk}</b><span style="color:${KartCore.escape(r.colHex||'#19e6ff')}">●</span><b>${KartCore.escape(r.name||r.d.n)}</b><small>${r.d.n} · ${r.kills||0} KO · ${tag}</small></div>`;
 }).join('');
}
function endGame(t,win){if(state!='race')return;state='end';stopMusic();ptime=elapsed;let s;try{s=KartCore.career(localStorage.getItem('tk'))}catch(e){s=KartCore.career(null)};
 const cr=pl0.kills*50+(win?500:100);s.r++;s.w+=win?1:0;s.k+=pl0.kills;s.c+=cr;try{localStorage.setItem('tk',JSON.stringify(s))}catch(e){console.warn('storage unavailable',e)}
 addKF(win?'🏆 Victory!':'Race Complete',win?'#35ff9a':'#19e6ff');
 const baseSummary='Time '+ptime.toFixed(1)+' s &nbsp; Kills '+pl0.kills+' &nbsp; +'+cr+' credits<br>Career: '+s.r+' races, '+s.w+' wins, '+s.k+' kills, '+s.c+' credits';
 later(()=>{$('et').textContent=t;$('es').innerHTML=baseSummary;renderPodium();$('end').hidden=false;$('touch').hidden=true;window.updateCareer?.()},900);
 if(mode===4&&!mpo&&ptime>=25&&typeof NET.submitScore==='function'){
  const callsign=savedCallsign();
  NET.submitScore({track:curTrack,name:callsign,car:selCar,paint:pl0.colHex,timeMs:Math.round(ptime*1000),bestLapMs:Math.round((bestLap<Infinity?bestLap:ptime/3)*1000),ghost:ghostRecord},$('server-url')?.value?.trim())
   .then(res=>{if(res?.rank&&$('es'))$('es').innerHTML=baseSummary+'<br><b style="color:#b6ff3b">🏆 Global Time Trial Rank #'+res.rank+'</b>'})
   .catch(()=>{});
 }
}
const mine=(c,ability=false,side=0)=>{if(c.dead||(!ability&&c.mn>0)||mode===0||mode===4||mpo||paused||state!=='race')return;if(!ability)c.mn=6;const cy=TY[c.idx]||0;const m=new T.Mesh(new T.CylinderGeometry(1,1.2,.4,10),new T.MeshBasicMaterial({color:0xff2030}));
 const mx=c.x-Math.sin(c.h)*3.5+Math.cos(c.h)*side,mz=c.z-Math.cos(c.h)*3.5-Math.sin(c.h)*side;m.position.set(mx,cy+.3,mz);sc.add(m);mines.push({m,o:c,x:mx,y:cy+.3,z:mz,t:0})};

/* ---------- PHYSICS ---------- */
function drive(c,dt,i){
 const fx=Math.sin(c.h),fz=Math.cos(c.h),rx=fz,rz=-fx,d=c.d;
 let vf=c.vx*fx+c.vz*fz,vl=c.vx*rx+c.vz*rz;
 c.padBoost=Math.max(0,(c.padBoost||0)-dt);
 c.driftBoost=Math.max(0,(c.driftBoost||0)-dt);
 c.rampCd=Math.max(0,(c.rampCd||0)-dt);
 const bo=i.boost&&c.bo>0&&!c.dead;c.bo=bo?c.bo-dt*28:Math.min(100,c.bo+dt*7);
 if(c.ultActive>0&&(c.ultType===3||c.ultType===4))c.bo=100;
 const rallyUlt=c.ultActive>0&&c.ultType===5,apexUlt=c.ultActive>0&&c.ultType===4;
 const padMult=c.padBoost>0?1.35:1;
 const driftMult=c.driftBoost>0?(c.driftTier===3?1.38:c.driftTier===2?1.28:1.18):1;
 const boostMult=Math.max(bo?1.45:1,padMult,driftMult);
 let mx=60*d.spd*c.skill*boostMult*((c.off&&!rallyUlt)?.55:1)*(c.hp<25?.75:1);
 if(c.ultActive>0&&c.ultType===0){mx*=1.8;vf+=65*dt}
 else if(apexUlt){mx*=1.62;vf+=58*dt}
 else if(rallyUlt){mx*=1.3;vf+=36*dt}
 if(c.padBoost>0)vf+=44*dt;
 if(c.driftBoost>0)vf+=(c.driftTier===3?42:c.driftTier===2?32:22)*dt;
 if(i.thr<0&&vf>1)vf-=75*dt;else vf+=i.thr*36*d.acc*(boostMult>1?2:1)*(c.hp<50?.85:1)*dt;if(!i.thr)vf*=1-.35*dt;
 vf=cl(vf,-22,mx);
 const latGrip=apexUlt?16:(i.drift&&c.airY<=.1)?1.1:9;
 const surfaceGrip=rallyUlt?1:(wetGrip*trackGrip);
 vl*=Math.exp(-latGrip*surfaceGrip*dt);
 
 // Screen-relative steering: D/right decreases yaw when driving forward.
 const airSteer=c.airY>.2?.42:1;
 c.h+=KartCore.headingDelta(i.str*airSteer,vf,d.hdl,i.drift&&c.airY<=.1,dt);
 c.vx=fx*vf+rx*vl;c.vz=fz*vf+rz*vl;c.vf=vf;c.vl=vl;c.x+=c.vx*dt;c.z+=c.vz*dt;c.st=i.str;
 
 const p0=c.idx;near(c);const advance=(c.idx-p0+N)%N;if(advance<40&&c.checkpoint<3&&c.idx>=120*(c.checkpoint+1)&&c.idx<120*(c.checkpoint+1)+50)c.checkpoint++;
 // Live Sector 1 & Sector 2 Split Deltas for player
 if(c.isP&&state==='race'&&advance<40){
  if(lapSector===0&&c.idx>=166&&c.idx<210){
   lapSector=1;const st=elapsed-sectorStart;sectorStart=elapsed;
   const dStr=bestS1<Infinity?(st<=bestS1?' (-'+(bestS1-st).toFixed(2)+'s 🟢)':' (+'+(st-bestS1).toFixed(2)+'s 🔴)'):'';
   if(st<bestS1)bestS1=st;addKF('⏱️ S1 '+st.toFixed(2)+'s'+dStr,st<=bestS1?'#35ff9a':'#ff9a5a');
  }else if(lapSector===1&&c.idx>=333&&c.idx<380){
   lapSector=2;const st=elapsed-sectorStart;sectorStart=elapsed;
   const dStr=bestS2<Infinity?(st<=bestS2?' (-'+(bestS2-st).toFixed(2)+'s 🟢)':' (+'+(st-bestS2).toFixed(2)+'s 🔴)'):'';
   if(st<bestS2)bestS2=st;addKF('⏱️ S2 '+st.toFixed(2)+'s'+dStr,st<=bestS2?'#35ff9a':'#ff9a5a');
  }
 }
 if(c.idx<N*.1&&p0>N*.9&&c.checkpoint===3){
  if(!mpo||c.isNetBot)c.lap++;c.checkpoint=0;
  if(c.isP){
   lapSector=0;sectorStart=elapsed;
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
  if((!mpo||c.isNetBot)&&c.lap>=LAPS&&!c.fin){c.fin=++fo;if(c.isP)addKF('🏁 Lap '+LAPS+' complete!','#35ff9a')}
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
 const cy=groundY(c.x,c.z,c.idx);

 // Track Boost Pads trigger
 if(state==='race'&&!c.dead&&c.airY<1.5&&c.padBoost<.85){
  for(let k=0;k<boostPads.length;k++){
   const bp=boostPads[k];
   if((c.x-bp.x)**2+(c.z-bp.z)**2<44){
    c.padBoost=1.4;c.bo=Math.min(100,c.bo+25);
    c.vx+=fx*22;c.vz+=fz*22;c.vf=Math.min(mx*1.35,c.vf+22);
    const m2=new T.Mesh(new T.RingGeometry(.8,2.2,24),new T.MeshBasicMaterial({color:0xb6ff3b,transparent:true,side:T.DoubleSide}));
    m2.rotation.x=-PI/2;m2.position.set(c.x,cy+.4,c.z);sc.add(m2);rings.push({m:m2,t:0,s:20});
    if(c.isP){shake=Math.max(shake,.22);addKF('⚡ BOOST PAD!','#b6ff3b')}
    snd(640,.22,'sawtooth',.16,2.1,c);
    break;
   }
  }
 }

 // 3D Jump Ramps launch & arcade vertical air physics
 if(state==='race'&&!c.dead&&c.airY<=.25&&c.rampCd<=0&&c.vf>22){
  for(let k=0;k<jumpRamps.length;k++){
   const rp=jumpRamps[k];
   if((c.x-rp.x)**2+(c.z-rp.z)**2<46){
    c.airVy=cl(c.vf*.34,10,23);c.airY=.35;c.rampCd=1.2;
    for(let j=0;j<10;j++)pa(c.x,cy+.5,c.z,(R()-.5)*12,4+R()*8,(R()-.5)*12,.4,1,.75,.15);
    if(c.isP){shake=Math.max(shake,.2);addKF('🚀 AIR LAUNCH!','#ffd447')}
    snd(340,.28,'triangle',.18,2.4,c);
    break;
   }
  }
 }
 if(c.airY>0||c.airVy>0){
  c.airY+=c.airVy*dt;c.airVy-=38*dt;
  if(c.airY<=0){
   const hard=c.airVy<-9;c.airY=0;c.airVy=0;
   if(hard){
    c.suspPitch=.075;c.bo=Math.min(100,c.bo+15);c.padBoost=Math.max(c.padBoost,.5);
    for(let j=0;j<10;j++)pa(c.x,cy+.3,c.z,(R()-.5)*14,2+R()*5,(R()-.5)*14,.32,1,.85,.4);
    if(c.isP){shake=Math.max(shake,.25);addKF('✨ AIRTIME BONUS +15 NITRO','#19e6ff')}
    snd(110,.16,'triangle',.2,.35,c);
   }
  }
 }

 // 3-Tier Drift Sparks & Mini-Turbo Release
 if(i.drift&&Math.abs(vl)>4.5&&!c.off&&c.airY<=.1){
  c.driftTime=(c.driftTime||0)+dt;
  if(c.driftTime>.3){
   const spCol=c.driftTime>=2?[0.88,0.22,1]:c.driftTime>=1.15?[1,0.52,0.08]:[0.12,0.86,1];
   for(const s of[-1,1])pa(c.x-fx*1.7+rx*s*1.12,cy+.32,c.z-fz*1.7+rz*s*1.12,-fx*10+(R()-.5)*6,2+R()*5,-fz*10+(R()-.5)*6,.26,spCol[0],spCol[1],spCol[2]);
  }
 }else{
  if(!i.drift&&(c.driftTime||0)>=.45&&!c.dead&&state==='race'){
   const tier=c.driftTime>=2?3:c.driftTime>=1.15?2:1;
   c.driftTier=tier;
   c.driftBoost=tier===3?1.65:tier===2?1.1:.65;
   c.bo=Math.min(100,c.bo+(tier===3?35:tier===2?22:12));
   c.vx+=fx*(tier*10);c.vz+=fz*(tier*10);c.vf=Math.min(mx*1.4,c.vf+tier*10);
   const rCol=tier===3?0xd500f9:tier===2?0xff8a1a:0x19e6ff;
   if(tier>=2){
    const m2=new T.Mesh(new T.RingGeometry(.7,2.0,20),new T.MeshBasicMaterial({color:rCol,transparent:true,side:T.DoubleSide}));
    m2.rotation.x=-PI/2;m2.position.set(c.x,cy+.4,c.z);sc.add(m2);rings.push({m:m2,t:0,s:14+tier*6});
   }
   if(c.isP){
    shake=Math.max(shake,.12*tier);
    addKF(tier===3?'💜 ULTRA MINI-TURBO!':tier===2?'🔥 SUPER MINI-TURBO!':'⚡ MINI-TURBO!',tier===3?'#e066ff':tier===2?'#ff8a1a':'#19e6ff');
   }
   snd(420+tier*160,.22,'sawtooth',.14+.04*tier,1.8,c);
  }
  c.driftTime=0;
 }
 if(Math.abs(vl)>9&&!c.off&&c.airY<=.1){
  skid(c,fx,fz,rx,rz);pa(c.x-fx*1.6+rx*1,cy+.4,c.z-fz*1.6+rz*1,0,1.5,0,.7,.55,.55,.6);pa(c.x-fx*1.6-rx*1,cy+.4,c.z-fz*1.6-rz*1,0,1.5,0,.7,.55,.55,.6);
  if(c.isP&&Math.abs(vl)>10&&!audioMuted){driftSndT-=dt;if(driftSndT<=0){driftSndT=.08;snd(220+Math.abs(vl)*6,.07,'sawtooth',.035,.85)}}
 }
 const anyBoost=bo||c.padBoost>0||c.driftBoost>0||apexUlt;
 if(anyBoost)pa(c.x-fx*3.2,cy+c.airY+.9,c.z-fz*3.2,-fx*8,1,-fz*8,.35,apexUlt?.7:1,apexUlt?1:.5,apexUlt?.2:.1);if(c.hp<40&&R()<.5)pa(c.x,cy+c.airY+1.2,c.z,0,5,0,1,.3,.3,.3);if(c.hp<20&&R()<.3)pa(c.x,cy+c.airY+1,c.z,(R()-.5)*10,6,(R()-.5)*10,.3,1,.8,.2);
 return anyBoost
}

function roadPitch(c){
 const nxt=(c.idx+3)%N,prv=(c.idx-3+N)%N;
 const dy=(TY[nxt]||0)-(TY[prv]||0),dhoriz=Math.hypot(P[nxt].x-P[prv].x,P[nxt].z-P[prv].z)||1;
 const dir=Math.sin(c.h)*TN[c.idx].x+Math.cos(c.h)*TN[c.idx].z;
 return -Math.atan2(dy*dir,dhoriz);
}

function ai(c){
 // Wall recovery: if bot is wedged against outer wall at low speed, reverse & steer away
 if(Math.abs(c.lat)>HW-1&&Math.abs(c.vf)<8){return{thr:-.8,str:Math.sign(c.lat),drift:false,boost:false}}
 const j=(c.idx+13)%N;let tx=P[j].x+NR[j].x*c.lane-c.x,tz=P[j].z+NR[j].z*c.lane-c.z;
 const ch=mode==3?pl0:mode==2?cars.filter(o=>o!==c&&!o.dead).sort((a,b)=>Math.hypot(a.x-c.x,a.z-c.z)-Math.hypot(b.x-c.x,b.z-c.z))[0]:null;if(ch&&!ch.dead){tx=ch.x-c.x;tz=ch.z-c.z}let e=Math.atan2(tx,tz)-c.h;e=Math.atan2(Math.sin(e),Math.cos(e));const a=Math.abs(e);
 c.tgt=detectTarget(c,c.tgt);
 const bd=c.tgt?Math.hypot(c.tgt.x-c.x,c.tgt.z-c.z):Infinity;
 if(c.tgt){if(bd<60&&R()<.7)fire(c,0);if(bd>25)fire(c,1)}
 if(R()<.003&&c.vf>30)mine(c);
 if(R()<.001&&mode>=1)empBlast(c);
 if(R()<.002&&c.vf>25)dropOil(c);
 if(c.ultCd<=0&&c.ultActive<=0&&state=='race'){
  if(c.ultType===0&&c.vf>25&&R()<.006)activateUlt(c);
  else if(c.ultType===1&&cars.some(o=>o!==c&&!o.dead&&Math.hypot(o.x-c.x,o.z-c.z)<18)&&R()<.008)activateUlt(c);
  else if(c.ultType===2&&(cars.some(o=>o!==c&&!o.dead&&Math.hypot(o.x-c.x,o.z-c.z)<15)||lockT===c)&&R()<.008)activateUlt(c);
  else if(c.ultType===3&&a<.18&&c.vf>28&&R()<.006)activateUlt(c);
  else if(c.ultType===4&&c.vf>28&&R()<.006)activateUlt(c);
  else if(c.ultType===5&&cars.some(o=>o!==c&&!o.dead&&Math.hypot(o.x-c.x,o.z-c.z)<20)&&R()<.008)activateUlt(c);
 }
 return{thr:a>.9&&c.vf>40?-.4:1,str:-cl(e*2.5,-1,1),drift:a>.6&&c.vf>35,boost:c.bo>40&&a<.12&&c.vf>30}
}

/* ---------- MAIN LOOP ---------- */
const mmc=$('mm'),mx2=mmc.getContext('2d');

function step(dt){
 if(paused)return;clk-=dt;if(state==='race')elapsed+=dt;
 if(state=='count'&&clk<=0){state='race';elapsed=0;lapStart=0}
 const racing=state=='race';
 const gp=pollGamepad();
 const detected=racing&&!pl0.dead&&mode!==0&&mode!==4?detectTarget(pl0,lockT):null;if(detected&&detected===lockT)lockTm+=dt;else{lockT=detected;lockTm=0}
 updateWeather(dt);
 for(const c of cars){
  c.prevX=c.x;c.prevZ=c.z;c.prevH=c.h;c.prevY=groundY(c.x,c.z,c.idx)+(c.airY||0);
  c.mg-=dt;c.ms-=dt;c.inv-=dt;for(const key of ['rapid','plasma','magnet','emp','oil','flash'])c[key]=Math.max(0,c[key]-dt);
  if(c.ultCd>0)c.ultCd-=dt;
  if(c.ultActive>0){
   c.ultActive-=dt;
   const cy=groundY(c.x,c.z,c.idx)+(c.airY||0);
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
   }else if(c.ultType===4){
    // APEX SLIPSTREAM SURGE: sonic wake zaps passed rivals within 6.5m
    const fx=Math.sin(c.h),fz=Math.cos(c.h);
    pa(c.x-fx*2.8+(R()-.5)*1.6,cy+.9,c.z-fz*2.8+(R()-.5)*1.6,-fx*18,1.2,-fz*18,.28,.71,1,.23);
    for(const o of cars){
     if(o===c||o.dead||o.r)continue;
     const dx=o.x-c.x,dz=o.z-c.z,d=Math.hypot(dx,dz);
     if(d<6.5&&d>.1&&contactHit(o,16,c)){
      o.vx+=dx/d*24;o.vz+=dz/d*24;
      if(c.isP){shake=Math.max(shake,.3);addKF('⚡ SONIC WAKE!','#b6ff3b')}
     }
    }
   }else if(c.ultType===5){
    // RALLY SEISMIC OVERDRIVE: pulsing 18m golden seismic shockwaves every 0.85s
    c.inv=Math.max(c.inv,.2);c.seismicT=(c.seismicT||0)-dt;
    if(c.seismicT<=0){
     c.seismicT=.85;
     const m2=new T.Mesh(new T.RingGeometry(1,2.4,28),new T.MeshBasicMaterial({color:0xffd470,transparent:true,side:T.DoubleSide}));
     m2.rotation.x=-PI/2;m2.position.set(c.x,cy+.5,c.z);sc.add(m2);rings.push({m:m2,t:0,s:24});
     snd(140,.28,'triangle',.16,.4,c);
     for(const o of cars){
      if(o===c||o.dead||o.r)continue;
      const dx=o.x-c.x,dz=o.z-c.z,d=Math.hypot(dx,dz);
      if(d<18&&d>.1){
       o.vx+=dx/d*22;o.vz+=dz/d*22;hit(o,14,c);
       if(c.isP){shake=Math.max(shake,.28);addKF('🌋 SEISMIC PULSE!','#ffd470')}
      }
     }
    }
   }
   if(c.ultActive<=0){
    c.ultActive=0;
    if(c.m.fsh)c.m.fsh.visible=false;
    if(c.ultType===2){c.m.traverse(ch=>{if(ch.material&&ch.material.userData.cloakBase!==undefined)ch.material.opacity=ch.material.userData.cloakBase})}
   }
  }
  c.m.muzzle.visible=c.flash>0;c.m.muzzle.material.color.setHex(c.plasma>0?0xff66d4:0x99efff);
  if(c.r){
   // Smooth dead-reckoning extrapolation + damped interpolation for online play
   if(!c.dead&&Math.abs(c.vf)>.5){c.tx+=Math.sin(c.th)*c.vf*dt;c.tz+=Math.cos(c.th)*c.vf*dt}
   const k=1-Math.exp(-12*dt);c.x+=(c.tx-c.x)*k;c.z+=(c.tz-c.z)*k;let e=c.th-c.h;e=Math.atan2(Math.sin(e),Math.cos(e));c.h+=e*k;c.spin+=c.vf*dt/.52;near(c);
   const cy=groundY(c.x,c.z,c.idx);c.pitch=(c.pitch||0)+(roadPitch(c)-(c.pitch||0))*(1-Math.exp(-10*dt));
   c.m.position.set(c.x,cy,c.z);c.m.rotation.x=c.pitch;c.m.rotation.y=c.h;c.m.rotation.z=cl(-c.vl*.012-(BANK[c.idx]||0),-.24,.24);
   for(const w of c.m.wh){w.w.rotation.x=c.spin;if(w.f)w.p.rotation.y=-(c.st||0)*.4}
   c.m.fl.visible=!!c.boosting;if(c.boosting)c.m.fl.scale.y=2.2+R()*.9;
   c.m.tm.color.setHex(c.braking?0xff6a6a:0xb0121e);c.m.paint.color.copy(c.m.base).multiplyScalar(.3+.7*c.hp/100);
   if(c.m.rotors)c.m.rotors.color.setHex(c.braking&&c.vf>8?0xff4a18:c.col);
   if(c.m.wing)c.m.wing.rotation.x+=((c.braking&&c.vf>15?.32:0)-c.m.wing.rotation.x)*(1-Math.exp(-12*dt));
   if(c.m.nameplate)updateNameplate(c,rank(c));
   c.m.visible=!c.dead;continue
  }
  if(c.dead>0){if(mpo&&!c.isNetBot)continue;c.dead-=dt;if(c.dead<=0){place(c,c.idx,0);c.hp=100;c.inv=2.5;c.m.visible=true}continue}
  let i={thr:0,str:0,drift:0,boost:0};
  if(racing){
   if(c.isP){
    if(state=='race'&&$('pause').hidden){
     const tilt=window.KartTilt?.sample(dt)||{active:false,steer:0,throttle:0};
     const kbThr=(K.KeyS||K.ArrowDown||touchBrake||touchThr<-.2)?-1:(K.KeyW||K.ArrowUp||touchGas||touchThr>.2||tilt.throttle?1:0);
     const kbStr=(K.KeyD||K.ArrowRight?1:0)-(K.KeyA||K.ArrowLeft?1:0)+(tilt.active?tilt.steer:touchStr);
     i={
      thr:kbThr||(gp.active?gp.thr:0),
      str:cl(kbStr+(gp.active?gp.str:0),-1,1),
      drift:K.Space||touchDrift||(gp.active&&gp.drift),
      boost:K.ShiftLeft||K.ShiftRight||touchBoost||(gp.active&&gp.boost)
     };
     if(M[0]||K.KeyF||touchFire||(gp.active&&gp.fire)||(prefs.autoFire!==false&&lockT&&lockTm>=.16))fire(c,0);if(M[2]||K.KeyE||touchMsl)fire(c,1);if(K.KeyQ)mine(c);if(K.KeyT)empBlast(c);if(K.KeyG)dropOil(c);if(K.KeyX||K.KeyZ)activateUlt(c);
    }
   } else i=ai(c);
  }
  const bo=drive(c,dt,i);c.boosting=!!bo;c.braking=i.thr<0;c.spin+=c.vf*dt/.52;
  const cy=groundY(c.x,c.z,c.idx)+(c.airY||0);

  // Dynamic chassis suspension (accel pitch, corner roll, high-speed vibration)
  const accel=(c.vf-(c.prevVf||0))/dt;c.prevVf=c.vf;
  const sDamp=1-Math.exp(-10*dt);
  c.suspPitch=(c.suspPitch||0)+(cl(-accel*.0022,-.075,.075)-(c.suspPitch||0))*sDamp;
  c.suspRoll=(c.suspRoll||0)+(cl(-c.vl*.008,-.1,.1)-(c.suspRoll||0))*sDamp;
  if(c.m.body){
   c.m.body.rotation.x=c.suspPitch;
   c.m.body.rotation.z=c.suspRoll;
   c.m.body.position.y=c.airY>.1?0:Math.sin(elapsed*26+c.uid)*Math.min(Math.abs(c.vf)/140,.025);
  }

  // 3D Roof Turret target tracking & firing barrel recoil
  c.recoil=Math.max(0,(c.recoil||0)-dt*9);
  if(c.m.turret){
   const tgt=c.isP?lockT:c.tgt;
   let desiredYaw=0;
   if(tgt&&!tgt.dead&&mode!==0&&mode!==4){
    desiredYaw=Math.atan2(tgt.x-c.x,tgt.z-c.z)-c.h;
    desiredYaw=cl(Math.atan2(Math.sin(desiredYaw),Math.cos(desiredYaw)),-1.15,1.15);
   }
   c.m.turret.rotation.y+=(desiredYaw-c.m.turret.rotation.y)*(1-Math.exp(-14*dt));
   if(c.m.barrels)c.m.barrels.position.z=.38-c.recoil*.24;
  }

  // Taillight & Nitro Ribbon Trails behind player kart
  if(c.isP&&state==='race'&&!c.dead){
   const fx=Math.sin(c.h),fz=Math.cos(c.h),rx=fz,rz=-fx;
   const speedNorm=cl((Math.abs(c.vf)-20)/50,0,1);
   const intensity=bo?.95:(c.ultActive>0&&(c.ultType===0||c.ultType===4))?1:speedNorm*.55;
   const trailCol=(c.ultActive>0&&c.ultType===4)?0xb6ff3b:(c.ultActive>0&&c.ultType===5)?0xffd470:(c.ultActive>0&&c.ultType===0)?0x19e6ff:(c.ultActive>0&&c.ultType===3)?0xb066ff:c.driftBoost>0?(c.driftTier===3?0xd500f9:c.driftTier===2?0xff8a1a:0x19e6ff):bo?0xff9420:0xff2244;
   trailL.push(c.x-fx*2.55-rx*.62,cy+.94,c.z-fz*2.55-rz*.62,rx,rz,intensity,trailCol);
   trailR.push(c.x-fx*2.55+rx*.62,cy+.94,c.z-fz*2.55+rz*.62,rx,rz,intensity,trailCol);
  }
  
  // Smooth continuous hill pitch + airborne launch pitch
  const targetPitch=c.airY>.1?cl(-c.airVy*.018,-.38,.28):roadPitch(c);
  c.pitch=(c.pitch||0)+(targetPitch-(c.pitch||0))*(1-Math.exp(-10*dt));
  
  c.m.position.set(c.x,cy,c.z);
  c.m.rotation.x=c.pitch;
  c.m.rotation.y=c.h;
  c.m.rotation.z=cl(-c.vl*.012-(BANK[c.idx]||0),-.24,.24);
  c.m.visible=c.inv<=0||((c.inv*8)|0)%2==0;
  for(const w of c.m.wh){w.w.rotation.x=c.spin;if(w.f)w.p.rotation.y=-c.st*.4}
  c.m.fl.visible=!!bo;if(bo)c.m.fl.scale.y=2.2+R()*.9;c.m.tm.color.setHex(i.thr<0?0xff7575:0xb0121e);c.m.paint.color.copy(c.m.base).multiplyScalar(.3+.7*c.hp/100);
  if(c.m.rotors)c.m.rotors.color.setHex(i.thr<0&&c.vf>8?0xff4a18:c.col);
  if(c.m.wing)c.m.wing.rotation.x+=((i.thr<0&&c.vf>15?.32:0)-c.m.wing.rotation.x)*(1-Math.exp(-12*dt));
  if(c.m.nameplate)updateNameplate(c,rank(c));
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
    if(contactHit(q,28,p)){q.vx+=nx*42;q.vz+=nz*42;if(p.isP){shake=Math.max(shake,.5);addKF('💥 FORTRESS RAM!','#ff8a1a')}}
    continue;
   }
   if(q.ultActive>0&&q.ultType===1){
    const nx=dx/d,nz=dz/d;
    if(contactHit(p,28,q)){p.vx-=nx*42;p.vz-=nz*42;if(q.isP){shake=Math.max(shake,.5);addKF('💥 FORTRESS RAM!','#ff8a1a')}}
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
  for(const c of cars)if(!c.dead&&(c!==o.o||o.t>2)&&!(c.ultActive>0&&c.ultType===5)&&(c.airY||0)<.5&&Math.hypot(c.x-o.x,c.z-o.z)<3.8){
   c.vx+=(R()-.5)*22;c.vz+=(R()-.5)*22;if(c.isP){shake=Math.max(shake,.25);if((c.oilNotice||0)<elapsed){c.oilNotice=elapsed+1.5;addKF('OIL SLICK — COUNTERSTEER','#ffb020')}}
  }
 }
 if(!mpo&&state=='race'&&(mode===2||mode===3)){
  const al=cars.filter(c=>!c.dead);if(mode==2&&(pl0.dead||al.length<=1))endGame(al[0]===pl0?'Last one standing':'Eliminated',al[0]===pl0);
  if(mode==3){if(pl0.dead)endGame('Wave '+wave+' reached',false);else if(al.length==1){wt+=dt;if(wt>3){wt=0;wave++;pl0.hp=Math.min(100,pl0.hp+30);cars=cars.filter(c=>{if(c!==pl0){removeEntity(c.m);return false}return true});bots(Math.min(8,2+wave),Math.min(.8+wave*.03,1.05),(pl0.idx+60)%N);addKF('🌊 Wave '+wave+'!','#19e6ff')}}}
 }
 // Time Trial ghost recording & holographic ghost playback
 if(mode===4&&!mpo&&state==='race'){
  ghostSampleT+=dt;
  if(ghostSampleT>=.2&&ghostRecord.length<1200){ghostSampleT-=.2;ghostRecord.push([+pl0.x.toFixed(1),+pl0.z.toFixed(1),+pl0.h.toFixed(2)])}
  if(ghostMesh&&activeGhost?.ghost?.length>1){
   const pts=activeGhost.ghost,pos=elapsed/.2,i0=Math.min(pts.length-2,Math.max(0,Math.floor(pos))),f=cl(pos-i0,0,1);
   const a=pts[i0],b=pts[i0+1],gx=a[0]+(b[0]-a[0])*f,gz=a[1]+(b[1]-a[1])*f;
   let dh=b[2]-a[2];dh=Math.atan2(Math.sin(dh),Math.cos(dh));
   const gh=a[2]+dh*f;ghostTmp.x=gx;ghostTmp.z=gz;ghostTmp.idx=ghostMesh.userData.idx||0;near(ghostTmp);ghostMesh.userData.idx=ghostTmp.idx;
   ghostMesh.position.set(gx,groundY(gx,gz,ghostTmp.idx),gz);ghostMesh.rotation.y=gh;
   ghostMesh.visible=pos<pts.length-1;
  }
 }
 if(mpo&&(ns-=dt)<=0){ns=.05;NET.send({t:'s',x:+pl0.x.toFixed(1),z:+pl0.z.toFixed(1),h:+pl0.h.toFixed(2),vf:+pl0.vf.toFixed(1),vl:+pl0.vl.toFixed(1),lap:pl0.lap,idx:pl0.idx,st:+pl0.st.toFixed(2),bo:pl0.boosting?1:0,br:pl0.braking?1:0})}
 if(mpo&&NET.me===NET.host&&mpBotCount>0&&(botSyncT-=dt)<=0){
  botSyncT=.07;
  const list=cars.filter(c=>c.isNetBot).map(b=>({i:b.botIdx,x:+b.x.toFixed(1),z:+b.z.toFixed(1),h:+b.h.toFixed(2),vf:+b.vf.toFixed(1),vl:+b.vl.toFixed(1),lap:b.lap,idx:b.idx,hp:Math.round(b.hp),d:b.dead>0?1:0,st:+b.st.toFixed(2),bo:b.boosting?1:0}));
  if(list.length)NET.send({t:'bots',list});
 }
 
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

let menuYaw=.55,menuPitch=.34,menuVel=0,menuDrag=false,menuDragX=0,menuDragY=0;
{
 const menuEl=$('menu');
 if(menuEl&&menuEl.addEventListener){
  menuEl.addEventListener('pointerdown',e=>{if(state!=='menu'||e.target.closest?.('button,a,input,select,dialog,.garage-main'))return;menuDrag=true;menuDragX=e.clientX;menuDragY=e.clientY;menuVel=0;menuEl.classList.add('dragging')});
  addEventListener('pointermove',e=>{if(!menuDrag)return;const dx=e.clientX-menuDragX,dy=e.clientY-menuDragY;menuDragX=e.clientX;menuDragY=e.clientY;menuYaw-=dx*.01;menuPitch=cl(menuPitch+dy*.006,.12,.68);menuVel=-dx*.006});
  const endM=()=>{if(!menuDrag)return;menuDrag=false;menuEl.classList.remove('dragging')};
  addEventListener('pointerup',endM);addEventListener('pointercancel',endM);
 }
}

function render(dt,alpha=1){
 const c=pl0;let fov=72;
 const a=cl(alpha,0,1);
 if(state==='race'||state==='count'){
  for(let ci=0;ci<cars.length;ci++){
   const o=cars[ci];if(o.dead)continue;
   const ox=o.prevX+(o.x-o.prevX)*a,oz=o.prevZ+(o.z-o.prevZ)*a;
   const ty0=groundY(o.x,o.z,o.idx)+(o.airY||0),oy=o.prevY+(ty0-o.prevY)*a;
   let dh=o.h-o.prevH;dh=Math.atan2(Math.sin(dh),Math.cos(dh));
   o.m.position.set(ox,oy,oz);o.m.rotation.y=o.prevH+dh*a;
  }
 }
 const px=state==='menu'?c.x:(c.prevX+(c.x-c.prevX)*a);
 const pz=state==='menu'?c.z:(c.prevZ+(c.z-c.prevZ)*a);
 const targetY=groundY(c.x,c.z,c.idx)+(c.airY||0);
 const cy=state==='menu'?targetY:(c.prevY+(targetY-c.prevY)*a);
 let dph=c.h-c.prevH;dph=Math.atan2(Math.sin(dph),Math.cos(dph));
 const ph=state==='menu'?c.h:(c.prevH+dph*a);
 const anyBoost=!!(c.boosting||c.padBoost>0||c.driftBoost>0||(c.ultActive>0&&(c.ultType===0||c.ultType===4)));
 const tSec=performance.now()/1000;
 for(const fn of trackAnimators)fn(tSec);

 // Keep shadow frustum & dynamic lights centered around active kart
 if(dl.target){
  dl.position.set(px-42,cy+82,pz+34);
  dl.target.position.set(px,cy,pz);
  dl.target.updateMatrixWorld?.();
 }
 if(prefs.quality!=='low'){
  playerLight.color.setHex((c.ultActive>0&&c.ultType===4)?0xb6ff3b:(c.ultActive>0&&c.ultType===5)?0xffd470:(c.ultActive>0&&c.ultType===0)?0x19e6ff:anyBoost?0xff9420:c.col);
  playerLight.position.set(px,cy+1.2,pz);
  playerLight.intensity=state==='menu'?1.3:(anyBoost?2.2:1.15);
  if(fxLightT>0){fxLightT=Math.max(0,fxLightT-dt);fxLight.intensity=fxLightBase*(fxLightT/.38)}else fxLight.intensity=0;
 }

 if(state=='menu'){
  cam.setViewOffset(innerWidth,innerHeight,innerWidth>900?-innerWidth*.22:0,0,innerWidth,innerHeight);
  if(!menuDrag){menuYaw+=menuVel+dt*.32;menuVel*=.92}
  const dist=9.2;
  cam.position.set(px+Math.sin(menuYaw)*Math.cos(menuPitch)*dist,cy+1.1+Math.sin(menuPitch)*dist,pz+Math.cos(menuYaw)*Math.cos(menuPitch)*dist);
  cam.lookAt(px,cy+1,pz);fov=54;camSnap=true;
 } else {
  cam.clearViewOffset();
  const fx=Math.sin(ph),fz=Math.cos(ph),rx=fz,rz=-fx,sp=Math.hypot(c.vx,c.vz);
  const sh=prefs.motion?shake*.65:0,rear=!!(lookBack||gpState.lookBack);
  const kPos=camSnap||rear?1:(1-Math.exp(-9.5*dt));
  const kLook=camSnap||rear?1:(1-Math.exp(-16*dt));
  let tx,ty,tz,lx,ly,lz,targetRoll=0;
  if(rear){
   tx=px+fx*8.6;ty=cy+3.5;tz=pz+fz*8.6;
   lx=px-fx*18;ly=cy+1.4;lz=pz-fz*18;
   fov=70+sp*.14;
  } else if(camMode===0){
   // CHASE: Dynamic corner lead, smooth hill clearance & drift roll
   const bk=8.8+sp*.032,sideLead=-(c.st||0)*1.3-cl(c.vl*.07,-1.6,1.6);
   tx=px-fx*bk+rx*sideLead;tz=pz-fz*bk+rz*sideLead;
   camTmp.x=tx;camTmp.z=tz;camTmp.idx=c.idx;near(camTmp);
   const roadFloor=groundY(tx,tz,camTmp.idx)+1.55;
   ty=Math.max(cy+3.9+sp*.011,roadFloor);
   lx=px+fx*11+rx*((c.st||0)*2.0);ly=cy+1.45-Math.sin(c.pitch||0)*3.5;lz=pz+fz*11+rz*((c.st||0)*2.0);
   fov=68+sp*.16+(anyBoost?9:0);
   targetRoll=prefs.motion?cl(-(c.st||0)*.032-c.vl*.0016,-.05,.05):0;
  } else if(camMode===1){
   // WIDE: Tactical overview for combat & drift lines
   const bk=15.2+sp*.04;
   tx=px-fx*bk;tz=pz-fz*bk;
   camTmp.x=tx;camTmp.z=tz;camTmp.idx=c.idx;near(camTmp);
   ty=Math.max(cy+8.4+sp*.014,groundY(tx,tz,camTmp.idx)+3.0);
   lx=px+fx*16;ly=cy+1.2;lz=pz+fz*16;
   fov=60+sp*.12+(anyBoost?6:0);
  } else if(camMode===2){
   // HOOD: Rigidly nose-mounted, zero canopy/turret clipping, true slope pitch
   tx=px+fx*2.15;ty=cy+1.62;tz=pz+fz*2.15;
   lx=px+fx*32;ly=cy+1.48-Math.sin(c.pitch||0)*32;lz=pz+fz*32;
   fov=82+sp*.17+(anyBoost?8:0);
   cam.position.set(tx+(R()-.5)*sh*.35,ty+(R()-.5)*sh*.35,tz+(R()-.5)*sh*.35);
   camLookX=lx;camLookY=ly;camLookZ=lz;
   cam.lookAt(camLookX,camLookY,camLookZ);
  } else {
   // ACTION: Low pursuit bumper cam for maximum speed thrill
   const bk=5.8+sp*.022,sideLead=-(c.st||0)*.75;
   tx=px-fx*bk+rx*sideLead;tz=pz-fz*bk+rz*sideLead;
   camTmp.x=tx;camTmp.z=tz;camTmp.idx=c.idx;near(camTmp);
   ty=Math.max(cy+2.35,groundY(tx,tz,camTmp.idx)+1.25);
   lx=px+fx*14;ly=cy+1.25-Math.sin(c.pitch||0)*4.2;lz=pz+fz*14;
   fov=76+sp*.18+(anyBoost?10:0);
   targetRoll=prefs.motion?cl(-(c.st||0)*.045-c.vl*.002,-.065,.065):0;
  }
  if(camMode!==2||rear){
   cam.position.x+=(tx-cam.position.x)*kPos+(R()-.5)*sh;
   cam.position.y+=(ty-cam.position.y)*kPos+(R()-.5)*sh;
   cam.position.z+=(tz-cam.position.z)*kPos+(R()-.5)*sh;
   camLookX+=(lx-camLookX)*kLook;camLookY+=(ly-camLookY)*kLook;camLookZ+=(lz-camLookZ)*kLook;
   cam.lookAt(camLookX,camLookY,camLookZ);
   camRoll+=(targetRoll-camRoll)*(1-Math.exp(-8*dt));
   if(Math.abs(camRoll)>.0005)cam.rotation.z+=camRoll;
  }
  camSnap=false;
  if(eg&&!audioMuted&&!paused){eo.frequency.value=45+sp*3.2+(anyBoost?26:0)+(c.airY>.2?18:0);eg.gain.value=state=='race'?.035:.015}
 }
 shake=Math.max(0,shake-dt*2.4);
 const nextFov=cam.fov+(fov-cam.fov)*(1-Math.exp(-6*dt));
 if(Math.abs(nextFov-cam.fov)>.01){cam.fov=nextFov;cam.updateProjectionMatrix()}
 sky.position.copy(cam.position);
 const chroma=prefs.motion&&state!=='menu'?cl((c.ultActive>0&&(c.ultType===0||c.ultType===4)?.85:0)+(anyBoost?.38:0)+shake*.85,0,1.2):0;
 composer.setFX(prefs.quality==='high'?.66:.48,chroma,.24+(anyBoost?.14:0));
 composer.render(sc,cam);
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
 
 const spdKmh=Math.round(Math.abs(c.vf)*3.6);
 $('spd').textContent=spdKmh;
 const arc=$('spd-arc');if(arc){arc.style.strokeDashoffset=String(157.1*(1-cl(spdKmh/360,0,1)));arc.classList.toggle('boost',anyBoost)}
 const ww=$('wrong-way');if(ww){const dirDot=Math.sin(c.h)*TN[c.idx].x+Math.cos(c.h)*TN[c.idx].z;ww.hidden=!(state==='race'&&!c.dead&&c.vf>12&&dirDot<-.55)}
 $('sl').style.opacity=prefs.motion?cl((Math.abs(c.vf)-55)/60+(anyBoost?.4:0),0,.85):0;$('hp').style.width=c.hp+'%';$('bo').style.width=c.bo+'%';$('hp').style.background=c.hp<30?'#ff2a6d':'#35ff9a';
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
 
 // Dynamic HUD Crosshair & Targeting Reticle (zero-GC projection)
 const chEl=$('crosshair'), tcEl=$('tgt-card'), chTag=$('ch-tag');
 if(state=='race'&&!c.dead&&chEl&&mode!==0&&mode!==4&&!lookBack&&!gpState.lookBack){
  chEl.hidden=false;
  const fx=Math.sin(ph),fz=Math.cos(ph);
  const aimPos=tmpV3.set(px+fx*40,cy+1.3,pz+fz*40).project(cam);
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
 if(lockT&&state=='race'&&!lookBack&&!gpState.lookBack){
  const ty=groundY(lockT.x,lockT.z,lockT.idx)+(lockT.airY||0)+1.5;const v=tmpV3.set(lockT.x,ty,lockT.z).project(cam);
  if(v.z<1){lk.hidden=false;lk.style.left=(v.x*.5+.5)*innerWidth+'px';lk.style.top=(-v.y*.5+.5)*innerHeight+'px';lk.className=lockTm>=.16?'l':'';lk.textContent=lockTm>=.16?'TARGET LOCK':'ACQUIRING'}
  else lk.hidden=true;
 } else lk.hidden=true;
 
 // Pre-cached Minimap blit + dynamic cars & hazards
 mx2.clearRect(0,0,170,170);
 mx2.drawImage?.(mmBg,0,0);
 const maxSpan=Math.max(bx1-bx0,bz1-bz0)||1;
 const cx0=(bx0+bx1)/2,cz0=(bz0+bz1)/2;
 const mp=(x,z)=>[85+(x-cx0)/maxSpan*140,85+(z-cz0)/maxSpan*140];
 
 // Cars on minimap
 for(const o of cars){
  if(o.dead)continue;
  const[mxp,myp]=mp(o.x,o.z);
  if(o.isP){
   mx2.fillStyle='#ffffff';mx2.beginPath();mx2.arc(mxp,myp,5.5,0,PI*2);mx2.fill();
   mx2.fillStyle=o.colHex||'#19e6ff';mx2.beginPath();mx2.arc(mxp,myp,4.2,0,PI*2);mx2.fill();
   mx2.strokeStyle='#ffffff';mx2.lineWidth=2;mx2.beginPath();mx2.moveTo(mxp,myp);
   mx2.lineTo(mxp+Math.sin(o.h)*9,myp+Math.cos(o.h)*9);mx2.stroke();
  }else{
   mx2.fillStyle='#ffffff';mx2.beginPath();mx2.arc(mxp,myp,4.2,0,PI*2);mx2.fill();
   mx2.fillStyle=o.colHex||'#ff2a8a';mx2.beginPath();mx2.arc(mxp,myp,3.2,0,PI*2);mx2.fill();
  }
 }
 // Oil slicks on minimap
 for(const o of oilSlicks){
  const[mxp,myp]=mp(o.x,o.z);mx2.fillStyle='#ffb020';mx2.beginPath();mx2.arc(mxp,myp,2.5,0,PI*2);mx2.fill();
 }
}

let last=performance.now(),accumulator=0,fpsSmooth=60,fpsTick=0,lastBodyState='',lastBodyTilt='';
function loop(now){
 requestAnimationFrame(loop);
 const dt=Math.min((now-last)/1000,.1);last=now;accumulator+=dt;
 let steps=0;
 while(accumulator>=1/60&&steps++<6){if(state!=='menu'&&state!=='end')step(1/60);accumulator-=1/60}
 const alpha=(state==='race'||state==='count')?cl(accumulator*60,0,1):1;
 render(Math.min(dt,.05),alpha);
 $('touch').hidden=!isMobile||state!=='race'||paused||!$('pause').hidden;
 const tiltStr=window.KartTilt?.enabled?'on':'off';
 if(lastBodyState!==state){lastBodyState=state;document.body.dataset.state=state}
 if(lastBodyTilt!==tiltStr){lastBodyTilt=tiltStr;document.body.dataset.tilt=tiltStr}
 if(prefs.fps){
  fpsSmooth=fpsSmooth*.88+(1/Math.max(.001,dt))*.12;
  if((fpsTick-=dt)<=0){fpsTick=.22;$('fps').textContent=Math.round(fpsSmooth)+' FPS'}
 }
}


/* ---------- PAUSE MENU ---------- */
$('resume').onclick=()=>{paused=false;$('pause').hidden=true;resetInput();startMusic()};$('hud-pause').onclick=togglePause;
$('quitm').onclick=()=>{
 resetInput();paused=false;$('pause').hidden=true;stopMusic();NET.close();mpo=null;mpBotCount=0;activeGhost=null;
 clean();state='menu';$('menu').hidden=false;$('hud').hidden=$('end').hidden=true;weather='clear';menuCar();
};

/* ---------- MENU SETUP ---------- */
$('tracks').innerHTML=TRACK_DEFS.map((td,i)=>`<button class="tb-track${i===curTrack?' on':''}" data-t="${i}">${td.ic} ${td.n}</button>`).join('');
function selTrack(i){curTrack=i;document.querySelectorAll('.tb-track').forEach((e,k)=>e.classList.toggle('on',k===i));loadTrack(i);if(pl0){place(pl0,3,0);pl0.m.position.set(pl0.x,groundY(pl0.x,pl0.z,pl0.idx),pl0.z)}window.updateTrack?.(i)}
document.querySelectorAll('.tb-track').forEach(e=>e.onclick=()=>selTrack(+e.dataset.t));

$('modes').innerHTML=MODES.map((m,i)=>`<button class="mb" data-m="${i}">${m}</button>`).join('');
function selM(i){mode=i;document.querySelectorAll('.mb').forEach((e,k)=>e.classList.toggle('on',k==i))}
document.querySelectorAll('.mb').forEach(e=>e.onclick=()=>selM(+e.dataset.m));selM(1);

$('cars').innerHTML=CARS.map((d,i)=>`<button type="button" class="cc" aria-label="Select ${d.n}" aria-pressed="false" data-i="${i}"><h3 style="color:#${d.c.toString(16).padStart(6,'0')}">${d.n}</h3><div class="st"><span>Speed</span><i style="width:${d.spd/1.2*100}%"></i><span>Armor</span><i style="width:${d.arm/1.6*100}%"></i><span>Accel</span><i style="width:${d.acc/1.2*100}%"></i><span>Handling</span><i style="width:${d.hdl/1.2*100}%"></i></div><div class="ult-tag">⚡ ${d.ult}</div><div class="ult-desc">${d.desc}</div></button>`).join('');
function sel(i){selCar=i;document.querySelectorAll('.cc').forEach((e,k)=>{e.classList.toggle('on',k==i);e.setAttribute('aria-pressed',String(k==i))});menuCar();window.updateVehicle?.(CARS[i],i)}
document.querySelectorAll('.cc').forEach(e=>e.onclick=()=>sel(+e.dataset.i));

const PAINTS=['#19e6ff','#ff2a8a','#ff8a1a','#39ff14','#ffd700','#a66bff','#ffffff','#22252a'];
$('paints').innerHTML=PAINTS.map((c,i)=>`<button aria-label="Paint ${c}" class="pswatch${(customPaint===c||(!customPaint&&i===0))?' on':''}" data-c="${c}" style="background:${c}"></button>`).join('');
function selPaint(c){customPaint=c;try{localStorage.setItem('tk_paint',c)}catch(e){}document.querySelectorAll('.pswatch').forEach(e=>e.classList.toggle('on',e.dataset.c===c));if(pl0){const hexNum=parseInt(c.slice(1),16);pl0.col=hexNum;pl0.colHex=c;pl0.m.base.set(c);pl0.m.paint.color.set(c);if(pl0.m.ug)pl0.m.ug.material.color.set(hexNum);if(pl0.m.em)pl0.m.em.color.set(hexNum);window.KartModels.applyFinish?.(pl0.m.paint,customFinish,hexNum)}}
document.querySelectorAll('.pswatch').forEach(e=>e.onclick=()=>selPaint(e.dataset.c));

const FINISH_LIST=['gloss','matte','chrome','pearl'];
const finEl=$('finishes');
if(finEl){
 finEl.innerHTML=FINISH_LIST.map(f=>`<button type="button" class="fin-btn${customFinish===f?' on':''}" data-f="${f}">${f}</button>`).join('');
 function selFinish(f){customFinish=f;try{localStorage.setItem('tk_finish',f)}catch(e){}document.querySelectorAll('#finishes .fin-btn').forEach(e=>e.classList.toggle('on',e.dataset.f===f));if(pl0)window.KartModels.applyFinish?.(pl0.m.paint,f,pl0.col,customLivery)}
 document.querySelectorAll('#finishes .fin-btn').forEach(e=>e.onclick=()=>selFinish(e.dataset.f));
}
const LIVERY_LIST=window.KartModels.liveries||['solid','stripes','hex','bolt','carbon'];
const livEl=$('liveries');
if(livEl){
 livEl.innerHTML=LIVERY_LIST.map(l=>`<button type="button" class="fin-btn${customLivery===l?' on':''}" data-l="${l}">${l}</button>`).join('');
 function selLivery(l){customLivery=l;try{localStorage.setItem('tk_livery',l)}catch(e){}document.querySelectorAll('#liveries .fin-btn').forEach(e=>e.classList.toggle('on',e.dataset.l===l));if(pl0)window.KartModels.applyFinish?.(pl0.m.paint,customFinish,pl0.col,l)}
 document.querySelectorAll('#liveries .fin-btn').forEach(e=>e.onclick=()=>selLivery(e.dataset.l));
}
const RIM_LIST=window.KartModels.rims||['alloy','turbo','neon','beadlock'];
const rimEl=$('rims');
if(rimEl){
 rimEl.innerHTML=RIM_LIST.map(r=>`<button type="button" class="fin-btn${customRim===r?' on':''}" data-r="${r}">${r}</button>`).join('');
 function selRim(r){customRim=r;try{localStorage.setItem('tk_rim',r)}catch(e){}document.querySelectorAll('#rims .fin-btn').forEach(e=>e.classList.toggle('on',e.dataset.r===r));if(state==='menu')menuCar()}
 document.querySelectorAll('#rims .fin-btn').forEach(e=>e.onclick=()=>selRim(e.dataset.r));
}

function clean(){cancelTimers();trailL.reset();trailR.reset();if(ghostMesh){removeEntity(ghostMesh);ghostMesh=null}for(const m of mines)removeEntity(m.m);for(const p of pu)removeEntity(p.m);for(const r of rings)removeEntity(r.m);mines=[];pu=[];rings.length=0;for(const c of cars)removeEntity(c.m);for(const p of prs)removeEntity(p.m);for(const o of oilSlicks)removeEntity(o.m);prs=[];oilSlicks=[]}
function lobby(){
 $('online').close();state='menu';resetInput();$('touch').hidden=true;$('menu').hidden=$('end').hidden=$('hud').hidden=true;$('lob').hidden=false;$('lc').textContent=NET.code;
 const isHost=NET.host===NET.me,canStart=NET.players.length>=2||NET.fillBots;
 const botFill=NET.fillBots?Math.max(0,6-NET.players.length):0;
 const badge=$('lob-badge');
 if(badge){
  badge.textContent=NET.fillBots?`🤖 ${NET.players.length}/6 + ${botFill} AI BOTS`:`👥 ${NET.players.length}/6 FRIENDS ONLY · 0 BOTS`;
  badge.classList.toggle('bots',!!NET.fillBots);
 }
 $('lp').innerHTML=NET.players.map(p=>`<div class="lobby-driver"><span style="color:${KartCore.escape(p.paint)}">●</span> <b>${KartCore.escape(p.name)}</b> ${p.id===NET.me?'<span class="ready-pill" style="border-color:#19e6ff88;color:#19e6ff;background:#19e6ff18">YOU</span>':''} ${p.ready?'<span class="ready-pill">READY</span>':''}<small>${p.id===NET.host?'👑 HOST':'DRIVER'} · ${CARS[p.car]?.n||'SCOUT'} (${KartCore.escape(p.livery||'stripes')})</small>${isHost&&p.id!==NET.me?`<button type="button" class="kick-btn" data-kick="${p.id}" title="Remove player">✕</button>`:''}</div>`).join('');
 $('lp').querySelectorAll?.('[data-kick]').forEach(b=>b.onclick=()=>NET.send({t:'kick',id:+b.dataset.kick}));
 $('ls').hidden=!isHost;$('ls').disabled=!canStart;
 const lt=$('lob-track'),lm=$('lob-mode'),ll=$('lob-laps'),lb=$('lob-bots'),lpub=$('lob-public');
 if(lt){lt.value=String(NET.track??curTrack);lt.disabled=!isHost}
 if(lm){lm.value=String(NET.mode??1);lm.disabled=!isHost}
 if(ll){ll.value=String(NET.laps||3);ll.disabled=!isHost}
 if(lb){lb.checked=!!NET.fillBots;lb.disabled=!isHost}
 if(lpub){lpub.checked=!!NET.isPublic;lpub.disabled=!isHost}
 const meP=NET.players.find(p=>p.id===NET.me);
 if(meP){
  if($('lob-name')&&document.activeElement!==$('lob-name'))$('lob-name').value=meP.name;
  if($('lob-car'))$('lob-car').value=String(meP.car);
  if($('lob-livery'))$('lob-livery').value=meP.livery||customLivery;
  if($('lob-rim'))$('lob-rim').value=meP.rim||customRim;
 }
 const rb=$('lob-ready');if(rb)rb.textContent=meP?.ready?'READY ✓':'SET READY';
 $('lobby-note').textContent=canStart?`${TRACK_DEFS[NET.track||0]?.n||'Neo City'} · ${['Race','Combat','Elimination'][NET.mode??1]} · ${NET.laps||3} Laps · ${NET.fillBots?'AI bots ON':'Friends Only (No Bots)'}`:'Share the invite link — waiting for a friend to join (or enable AI bots)…';
}
NET.on=m=>{
 if(m.t==='room'){NET.me=m.you;NET.host=m.host;NET.code=m.code;NET.players=m.players;if(Number.isInteger(m.track))NET.track=m.track;if(Number.isInteger(m.mode))NET.mode=m.mode;if([1,3,5].includes(m.laps))NET.laps=m.laps;if(typeof m.fillBots==='boolean')NET.fillBots=m.fillBots;if(typeof m.isPublic==='boolean')NET.isPublic=m.isPublic;if(!mpo||state==='menu')lobby()}
 else if(m.t==='host'){NET.host=m.id;window.toast('👑 '+(m.name||'Next driver')+' is now room host!');if(!mpo||state==='menu')lobby()}
 else if(m.t==='chat'){const lc=$('lob-chat');if(lc){const row=document.createElement('div');row.innerHTML=`<b style="color:${KartCore.escape(m.paint||'#19e6ff')}">${KartCore.escape(m.name)}:</b> ${KartCore.escape(m.text)}`;lc.appendChild(row);lc.scrollTop=lc.scrollHeight}}
 else if(m.t==='go'){mpo=m.order;mode=Number.isInteger(m.mode)?m.mode:1;LAPS=[1,3,5].includes(m.laps)?m.laps:3;mpBotCount=m.botCount|0;pickupRng=KartCore.seeded(m.seed);loadTrack(m.track);$('lob').hidden=true;clean();start()}
 else if(m.t==='s'){const o=cars.find(c=>c.id===m.f);if(o&&KartCore.validState(m)){o.tx=m.x;o.tz=m.z;o.th=m.h;o.vf=m.vf;o.vl=m.vl;o.lap=m.lap;o.hp=m.hp;o.dead=m.dead?1:0;o.st=Number.isFinite(m.st)?cl(m.st,-1,1):0;o.boosting=!!m.bo;o.braking=!!m.br}}
 else if(m.t==='bots'&&Array.isArray(m.list)){for(const b of m.list){const o=cars.find(c=>c.isNetBot&&c.botIdx===b.i);if(o&&o.r){const wasDead=o.dead;o.tx=b.x;o.tz=b.z;o.th=b.h;o.vf=b.vf;o.vl=b.vl;o.lap=b.lap;o.hp=b.hp;o.dead=b.d?1:0;o.st=cl(b.st||0,-1,1);o.boosting=!!b.bo;if(o.dead&&!wasDead)boom(o.x,o.z,1,TY[o.idx])}}}
 else if(m.t==='ev'){const o=cars.find(c=>c.id===m.f);if(o&&state==='race'&&m.k!==2)proj(o,m.k,m.a,m.tg===NET.me?pl0:cars.find(c=>c.id===m.tg),m.vy,true);else if(o&&m.k===2)empVisual(o,true)}
 else if(m.t==='health'){const c=m.id===NET.me?pl0:cars.find(c=>c.id===m.id);if(c){const wasDead=c.dead;c.hp=m.hp;c.sh=m.sh||0;c.inv=m.inv||0;c.dead=m.eliminated?9e9:(m.dead?3.5:0);c.m.visible=!m.dead;if(c.dead||wasDead)c.vx=c.vz=c.vf=c.vl=0;if(wasDead&&!c.dead&&c===pl0)place(c,c.idx,0);if(c.dead&&!wasDead){boom(c.x,c.z,1,TY[c.idx]);const kObj=m.killer===NET.me?pl0:cars.find(x=>x.id===m.killer);if(kObj)kObj.kills=(kObj.kills||0)+1;if(m.killer===NET.me)addKF('💥 Destroyed '+(m.victimName||c.name)+' +50!','#b6ff3b');else if(c===pl0&&m.killerName)addKF('☠️ '+m.killerName+' destroyed you!','#ff4444');else if(m.killerName)addKF('💥 '+m.killerName+' eliminated '+(m.victimName||c.name),'#8fa3c4')}if(m.eliminated&&c===pl0&&state==='race')endGame('Eliminated',false)}}
 else if(m.t==='ability'){const c=m.id===NET.me?pl0:cars.find(c=>c.id===m.id);if(c)activateUlt(c,true)}
 else if(m.t==='pickup'){const p=pu[m.index];if(p){p.t=12;const c=m.id===NET.me?pl0:cars.find(c=>c.id===m.id);if(c)collectPower(c,p.ty)}}
 else if(m.t==='progress'){const c=m.id===NET.me?pl0:cars.find(c=>c.id===m.id);if(c){c.lap=m.lap;c.fin=m.place||0;if(m.timeMs)c.finTime=m.timeMs;if(Number.isFinite(m.kills))c.kills=m.kills;if(state==='end')renderPodium();if(c===pl0&&c.fin)endGame(m.elimWin?'Last one standing':KartCore.ordinal(c.fin)+' place',c.fin===1)}}
 else if(m.t==='reset'){mpo=null;mpBotCount=0;stopMusic();clean();menuCar();state='menu'}
 else if(m.t==='gone'){const o=cars.find(c=>c.id===m.id);if(o){removeEntity(o.m);cars=cars.filter(c=>c!==o)}addKF((m.name||'A friend')+' left the race','#b5c4d0')}
 else if(m.t==='err'){window.toast(m.m);$('net-status').textContent=m.m}
 else if(m.t==='closed'){mpo=null;mpBotCount=0;$('lob').hidden=true;$('menu').hidden=false;$('hud').hidden=$('end').hidden=true;stopMusic();clean();menuCar();state='menu';window.toast('Connection closed. You can still play solo.')}
};
function syncCallsign(val){
 const v=String(val||'').replace(/[<>\x00-\x1f]/g,'').trim().slice(0,16)||'Racer';
 try{localStorage.setItem('tk_name',v)}catch{}
 if($('driver-name')&&$('driver-name').value!==v)$('driver-name').value=v;
 if($('garage-name')&&$('garage-name').value!==v)$('garage-name').value=v;
 if(pl0)pl0.name=v;
 return v;
}
function savedCallsign(){
 const raw=($('driver-name')?.value||$('garage-name')?.value||'').trim()||'Racer';
 return syncCallsign(raw);
}
try{const sn=localStorage.getItem('tk_name');if(sn)syncCallsign(sn)}catch{}
if($('garage-name'))$('garage-name').onchange=e=>syncCallsign(e.target.value);
if($('driver-name'))$('driver-name').onchange=e=>syncCallsign(e.target.value);
function connectRoom(join,overrideCode,overridePublic,overrideBots){
 const name=savedCallsign(),srv=($('server-url')?.value||'').trim();
 let code=(overrideCode||$('room-code')?.value||'').trim().toUpperCase();
 if(join&&!code){window.toast('Enter a room code.');return}
 if(!join&&!code)code=NET.makeCode?NET.makeCode():'TK-000001';
 const isPublic=overridePublic!==undefined?overridePublic:!!$('mp-public')?.checked;
 const fillBots=overrideBots!==undefined?overrideBots:!!$('mp-bots')?.checked;
 $('net-status').textContent='Connecting to '+code+'…';
 const lc=$('lob-chat');if(lc)lc.innerHTML='';
 NET.open(()=>NET.send({t:join?'join':'create',name,code,car:selCar,paint:pl0.colHex,finish:customFinish,livery:customLivery,rim:customRim,track:curTrack,mode:mode<=2?mode:1,laps:3,isPublic,fillBots}),srv,code);
}
async function quickMatch(){
 const name=savedCallsign(),srv=($('server-url')?.value||'').trim();
 $('net-status').textContent='Finding global lobby…';
 try{
  const res=await NET.quickMatch(curTrack,mode<=2?mode:1,name,srv);
  connectRoom(res.action==='join',res.code,true,true);
 }catch(err){
  $('net-status').textContent='Quick Match failed: '+err.message;
  window.toast('Could not reach matchmaking server.');
 }
}
async function refreshRooms(){
 const box=$('room-browser');if(!box||typeof NET.listRooms!=='function')return;
 box.innerHTML='<p class="muted">Scanning global lobbies…</p>';
 try{
  const {rooms}=await NET.listRooms(($('server-url')?.value||'').trim());
  if(!rooms||!rooms.length){box.innerHTML='<p class="muted">No open public lobbies right now — click Quick Match to start one!</p>';return}
  box.innerHTML=rooms.map(r=>`<div class="mp-row"><div><b>${KartCore.escape(r.code)}</b> · ${KartCore.escape(r.hostName)}<br><small>${TRACK_DEFS[r.track]?.n||'Neo City'} · ${['Race','Combat','Elimination'][r.mode]||'Combat'} · ${r.players}/${r.maxPlayers} drivers</small></div><button type="button" data-join="${KartCore.escape(r.code)}">JOIN</button></div>`).join('');
  box.querySelectorAll('[data-join]').forEach(b=>b.onclick=()=>connectRoom(true,b.dataset.join));
 }catch{box.innerHTML='<p class="muted">Global room list offline. Play solo or enter a LAN server URL below.</p>'}
}
async function loadLeaderboard(trackIdx=curTrack){
 const box=$('global-lb');if(!box||typeof NET.getLeaderboard!=='function')return;
 document.querySelectorAll('.lb-trk').forEach(b=>b.classList.toggle('on',+b.dataset.lbt===trackIdx));
 box.innerHTML='<p class="muted">Loading global Time Trial records…</p>';
 try{
  const {entries}=await NET.getLeaderboard(trackIdx,($('server-url')?.value||'').trim());
  if(!entries||!entries.length){box.innerHTML='<p class="muted">No records on this circuit yet — set the first World Record in Time Trial!</p>';return}
  box.innerHTML=entries.map((e,idx)=>`<div class="mp-row"><b>#${idx+1}</b><span style="color:${KartCore.escape(e.paint)}">●</span><div><b>${KartCore.escape(e.name)}</b> · ${(e.timeMs/1000).toFixed(2)}s<br><small>${CARS[e.car]?.n||'SCOUT'} · Best lap ${(e.bestLapMs/1000).toFixed(2)}s</small></div>${e.hasGhost?`<button type="button" class="secondary" data-ghost="${e.id}" data-gtrack="${trackIdx}">RACE GHOST</button>`:''}</div>`).join('');
  box.querySelectorAll('[data-ghost]').forEach(b=>b.onclick=async()=>{
   try{
    const g=await NET.getGhost(+b.dataset.ghost,($('server-url')?.value||'').trim());
    activeGhost=g;$('online').close();selTrack(+b.dataset.gtrack);selM(4);NET.close();mpo=null;start();
    window.toast('Racing ghost of '+g.name+' ('+(g.timeMs/1000).toFixed(2)+'s)!');
   }catch{window.toast('Could not load ghost replay.')}
  });
 }catch{box.innerHTML='<p class="muted">Global leaderboard unavailable offline.</p>'}
}
if($('mpc'))$('mpc').onclick=()=>connectRoom(false);
if($('mpj'))$('mpj').onclick=()=>connectRoom(true);
if($('mp-quick'))$('mp-quick').onclick=quickMatch;
if($('refresh-rooms'))$('refresh-rooms').onclick=refreshRooms;
document.querySelectorAll('.mp-tab').forEach(b=>b.onclick=()=>{
 const tab=b.dataset.mptab;
 document.querySelectorAll('.mp-tab').forEach(x=>x.classList.toggle('on',x===b));
 if($('mp-tab-play'))$('mp-tab-play').hidden=tab!=='play';
 if($('mp-tab-lb'))$('mp-tab-lb').hidden=tab!=='lb';
 if(tab==='lb')loadLeaderboard(curTrack);else refreshRooms();
});
document.querySelectorAll('.lb-trk').forEach(b=>b.onclick=()=>loadLeaderboard(+b.dataset.lbt));
const onlineOpenBtn=$('online-open');
if(onlineOpenBtn){const prevClick=onlineOpenBtn.onclick;onlineOpenBtn.onclick=()=>{prevClick?.();refreshRooms()}}
if($('copy-invite'))$('copy-invite').onclick=()=>{
 const invite=`${location.origin}${location.pathname}?room=${encodeURIComponent(NET.code)}`;
 navigator.clipboard?.writeText(invite).then(()=>window.toast('Invite link copied: '+NET.code)).catch(()=>window.toast('Room code: '+NET.code));
};
if($('lob-ready'))$('lob-ready').onclick=()=>NET.send({t:'ready'});
const sendCfg=()=>NET.send({t:'config',track:+($('lob-track')?.value||0),mode:+($('lob-mode')?.value||1),laps:+($('lob-laps')?.value||3),fillBots:!!$('lob-bots')?.checked,isPublic:!!$('lob-public')?.checked});
if($('lob-track'))$('lob-track').onchange=sendCfg;
if($('lob-mode'))$('lob-mode').onchange=sendCfg;
if($('lob-laps'))$('lob-laps').onchange=sendCfg;
if($('lob-bots'))$('lob-bots').onchange=sendCfg;
if($('lob-public'))$('lob-public').onchange=sendCfg;
const sendProfile=()=>{
 const nm=syncCallsign($('lob-name')?.value||savedCallsign());
 const cIdx=+($('lob-car')?.value??selCar);if(Number.isInteger(cIdx)&&cIdx!==selCar)sel(cIdx);
 const lv=$('lob-livery')?.value||customLivery;if(lv!==customLivery){customLivery=lv;try{localStorage.setItem('tk_livery',lv)}catch{}}
 const rm=$('lob-rim')?.value||customRim;if(rm!==customRim){customRim=rm;try{localStorage.setItem('tk_rim',rm)}catch{}}
 NET.send({t:'profile',name:nm,car:selCar,paint:pl0.colHex,finish:customFinish,livery:customLivery,rim:customRim});
};
if($('lob-name'))$('lob-name').onchange=sendProfile;
if($('lob-car'))$('lob-car').onchange=sendProfile;
if($('lob-livery'))$('lob-livery').onchange=sendProfile;
if($('lob-rim'))$('lob-rim').onchange=sendProfile;
document.querySelectorAll('.em-btn').forEach(b=>b.onclick=()=>NET.send({t:'chat',i:+b.dataset.em}));
$('ls').onclick=()=>NET.send({t:'start'});$('leave-room').onclick=()=>{NET.close();mpo=null;mpBotCount=0;$('lob').hidden=true;$('menu').hidden=false;clean();menuCar();state='menu'};
$('go').onclick=()=>{NET.close();mpo=null;mpBotCount=0;activeGhost=null;start()};$('again').onclick=()=>{if(mpo){if(NET.me!==NET.host){window.toast('Waiting for the host to start a rematch.');return}NET.send({t:'rematch'})}else start()};
$('results-menu').onclick=$('quitm').onclick;
window.Game={start,selectCar:sel,selectTrack:selTrack,selectMode:selM,cycleCamera:cycleCam,loadGhost:g=>{activeGhost=g},snapshot:()=>({state,paused,elapsed,lap:pl0.lap,hp:pl0.hp,cars:cars.length,camMode,geometries:rd.info.memory.geometries,textures:rd.info.memory.textures,position:{x:pl0.x,y:groundY(pl0.x,pl0.z,pl0.idx)+(pl0.airY||0),z:pl0.z},track:curTrack,vehicle:pl0.d.n}),applySettings:()=>{applyQuality();rs();if(master)master.gain.value=prefs.volume/100;audioMuted=prefs.volume===0}};
// Support direct shareable invite URLs (?room=TK-XXXXXX) & PWA shortcuts (?open=online)
try{
 const qs=new URLSearchParams(location.search||'');
 const inviteRoom=qs.get('room');
 if(inviteRoom&&/^TK-[A-Z0-9]{4,8}$/i.test(inviteRoom)){
  if($('room-code'))$('room-code').value=inviteRoom.toUpperCase();
  if($('online')?.showModal){$('online').showModal();refreshRooms();$('driver-name')?.focus?.();window.toast('Enter your name & click JOIN ROOM CODE for '+inviteRoom.toUpperCase()+'!')}
 }else if(qs.get('open')==='online'&&$('online')?.showModal){
  $('online').showModal();refreshRooms();
 }
}catch{}
applyQuality();loadTrack(0);sel(0);requestAnimationFrame(loop);
})();
