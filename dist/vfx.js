/* Procedural PBR textures, atmospheric shaders, ribbon trails, and selective neon bloom post-processing. */
(function(root){
'use strict';
const T=root.THREE;
const PI=Math.PI;

function mkCanvas(w,h){
 const c=document.createElement('canvas');
 c.width=w;c.height=h;
 return [c,c.getContext('2d')];
}

function makeTex(canvas,repeatX=1,repeatY=1,srgb=true){
 const tex=new T.CanvasTexture(canvas);
 tex.wrapS=T.RepeatWrapping;
 tex.wrapT=T.RepeatWrapping;
 if(tex.repeat)tex.repeat.set(repeatX,repeatY);
 if(srgb&&T.sRGBEncoding)tex.encoding=T.sRGBEncoding;
 tex.anisotropy=4;
 tex.needsUpdate=true;
 return tex;
}

/* ---------- PROCEDURAL ROAD PBR TEXTURES ---------- */
function createRoadTextures(theme){
 const [colC,cx]=mkCanvas(256,512);
 const [bumpC,bx]=mkCanvas(256,512);
 const [roughC,rx]=mkCanvas(256,512);

 const palettes={
  city:{base:'#1a2132',groove:'#121826',grain1:'#26314a',grain2:'#0e1320',kerbA:'#19e6ff',kerbB:'#101828',line:'#ffd88a',roughBase:145,roughGroove:95},
  canyon:{base:'#2c282b',groove:'#211e20',grain1:'#453836',grain2:'#1a1618',kerbA:'#ff5a45',kerbB:'#ffe0a3',line:'#fff2db',roughBase:225,roughGroove:195},
  glacier:{base:'#1b3148',groove:'#14263a',grain1:'#386182',grain2:'#0e1c2c',kerbA:'#46f0ff',kerbB:'#dff8ff',line:'#8ef6ff',roughBase:105,roughGroove:65},
  volcano:{base:'#1b1418',groove:'#120d10',grain1:'#3a221c',grain2:'#0e090b',kerbA:'#ff551a',kerbB:'#2a1614',line:'#ffaa33',roughBase:175,roughGroove:120},
  orbital:{base:'#171d36',groove:'#11162a',grain1:'#2e3866',grain2:'#0d1020',kerbA:'#b66bff',kerbB:'#b6ff3b',line:'#ffe680',roughBase:115,roughGroove:70}
 };
 const p=palettes[theme]||palettes.city;

 // Base asphalt fill
 cx.fillStyle=p.base;cx.fillRect(0,0,256,512);
 bx.fillStyle='#808080';bx.fillRect(0,0,256,512);
 rx.fillStyle=`rgb(${p.roughBase},${p.roughBase},${p.roughBase})`;rx.fillRect(0,0,256,512);

 // Worn tire grooves along both racing lanes
 const drawGroove=(xPos,w)=>{
  const g=cx.createLinearGradient(xPos-w,0,xPos+w,0);
  g.addColorStop(0,'transparent');g.addColorStop(.5,p.groove);g.addColorStop(1,'transparent');
  cx.fillStyle=g;cx.fillRect(xPos-w,0,w*2,512);
  const rg=rx.createLinearGradient(xPos-w,0,xPos+w,0);
  rg.addColorStop(0,'transparent');rg.addColorStop(.5,`rgb(${p.roughGroove},${p.roughGroove},${p.roughGroove})`);rg.addColorStop(1,'transparent');
  rx.fillStyle=rg;rx.fillRect(xPos-w,0,w*2,512);
 };
 drawGroove(74,26);drawGroove(182,26);

 // Deterministic aggregate grain / frost veins / canyon dust
 let s=theme==='canyon'?9917:theme==='glacier'?5431:1337;
 const rnd=()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296};
 for(let i=0;i<2800;i++){
  const x=rnd()*256,y=rnd()*512,sz=1+rnd()*2.2;
  cx.fillStyle=rnd()>.5?p.grain1:p.grain2;
  cx.globalAlpha=.22+rnd()*.25;
  cx.fillRect(x,y,sz,sz*(theme==='glacier'?3:1.4));
  const bVal=105+Math.floor(rnd()*50);
  bx.fillStyle=`rgb(${bVal},${bVal},${bVal})`;
  bx.fillRect(x,y,sz,sz);
  const rVal=Math.max(40,Math.min(250,p.roughBase+Math.floor((rnd()-.5)*46)));
  rx.fillStyle=`rgb(${rVal},${rVal},${rVal})`;
  rx.fillRect(x,y,sz+1,sz+1);
 }
 cx.globalAlpha=1;

 // Subtle horizontal tarmac expansion seams
 cx.fillStyle='#00000033';
 bx.fillStyle='#555555';
 for(let y=0;y<512;y+=128){cx.fillRect(14,y,228,2);bx.fillRect(14,y,228,2)}

 // Painted shoulder rumble kerbs (left & right strips)
 const stripeH=32;
 for(let y=0;y<512;y+=stripeH){
  const alt=((y/stripeH)|0)%2===0;
  cx.fillStyle=alt?p.kerbA:p.kerbB;
  cx.fillRect(0,y,14,stripeH);
  cx.fillRect(242,y,14,stripeH);
  bx.fillStyle=alt?'#cccccc':'#606060';
  bx.fillRect(0,y,14,stripeH);
  bx.fillRect(242,y,14,stripeH);
 }

 // Crisp inner track edge lines
 cx.fillStyle=p.kerbA;
 cx.fillRect(16,0,3,512);
 cx.fillRect(237,0,3,512);

 // Center dashed racing divider
 cx.fillStyle=p.line;
 cx.globalAlpha=.7;
 for(let y=12;y<512;y+=64)cx.fillRect(126,y,4,34);
 cx.globalAlpha=1;

 return {
  map:makeTex(colC,1,1,true),
  bumpMap:makeTex(bumpC,1,1,false),
  roughnessMap:makeTex(roughC,1,1,false)
 };
}

/* ---------- GROUND TERRAIN TEXTURES ---------- */
function createGroundTexture(theme){
 const [c,x]=mkCanvas(256,256);
 if(theme==='city'){
  x.fillStyle='#070c17';x.fillRect(0,0,256,256);
  x.strokeStyle='#152745';x.lineWidth=2;
  for(let i=0;i<=256;i+=32){x.beginPath();x.moveTo(i,0);x.lineTo(i,256);x.stroke();x.beginPath();x.moveTo(0,i);x.lineTo(256,i);x.stroke()}
  x.strokeStyle='#19e6ff28';x.lineWidth=1;
  x.strokeRect(1,1,254,254);
 }else if(theme==='canyon'){
  x.fillStyle='#995d44';x.fillRect(0,0,256,256);
  let s=4411;const rnd=()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296};
  for(let y=0;y<256;y+=6){
   x.fillStyle=y%12===0?'#aa6c50':'#864e37';
   x.globalAlpha=.35;x.fillRect(0,y,256,3);
  }
  for(let i=0;i<900;i++){x.fillStyle=rnd()>.5?'#ba7a5a':'#6d3b29';x.globalAlpha=.3;x.fillRect(rnd()*256,rnd()*256,3+rnd()*6,2)}
  x.globalAlpha=1;
 }else if(theme==='volcano'){
  x.fillStyle='#190e0e';x.fillRect(0,0,256,256);
  let s=6191;const rnd=()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296};
  x.strokeStyle='#ff4d1a';x.lineWidth=3;x.globalAlpha=.55;
  for(let k=0;k<6;k++){x.beginPath();let px=rnd()*256,py=0;x.moveTo(px,py);for(let step=0;step<8;step++){px+=(rnd()-.5)*44;py+=32;x.lineTo(px,py)}x.stroke()}
  x.strokeStyle='#ffb43b';x.lineWidth=1.2;x.globalAlpha=.4;
  for(let k=0;k<5;k++){x.beginPath();let px=0,py=rnd()*256;x.moveTo(px,py);for(let step=0;step<8;step++){px+=32;py+=(rnd()-.5)*36;x.lineTo(px,py)}x.stroke()}
  for(let i=0;i<500;i++){x.fillStyle=rnd()>.6?'#301816':'#0f0808';x.globalAlpha=.35;x.fillRect(rnd()*256,rnd()*256,4+rnd()*8,3+rnd()*6)}
  x.globalAlpha=1;
 }else if(theme==='orbital'){
  x.fillStyle='#060a1e';x.fillRect(0,0,256,256);
  let s=7741;const rnd=()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296};
  for(let i=0;i<180;i++){x.fillStyle=rnd()>.5?'#1e2e66':'#382678';x.globalAlpha=.24;x.beginPath();x.arc(rnd()*256,rnd()*256,12+rnd()*28,0,PI*2);x.fill()}
  x.strokeStyle='#b66bff28';x.lineWidth=1;x.globalAlpha=1;
  for(let i=0;i<=256;i+=64){x.beginPath();x.moveTo(i,0);x.lineTo(i,256);x.stroke();x.beginPath();x.moveTo(0,i);x.lineTo(256,i);x.stroke()}
 }else{
  x.fillStyle='#132a44';x.fillRect(0,0,256,256);
  let s=8821;const rnd=()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296};
  for(let i=0;i<700;i++){x.fillStyle=rnd()>.4?'#2a5378':'#78c8f0';x.globalAlpha=.22;x.fillRect(rnd()*256,rnd()*256,6+rnd()*14,2+rnd()*4)}
  x.globalAlpha=1;
 }
 return makeTex(c,38,38,true);
}

/* ---------- BOOST PAD & JUMP RAMP TEXTURES ---------- */
function createBoostPadTexture(){
 const [c,x]=mkCanvas(128,256);
 x.fillStyle='#061b26';x.fillRect(0,0,128,256);
 x.strokeStyle='#19e6ff';x.lineWidth=6;x.strokeRect(3,3,122,250);
 for(let y=24;y<256;y+=64){
  x.fillStyle='#b6ff3b';
  x.beginPath();x.moveTo(20,y+28);x.lineTo(64,y-10);x.lineTo(108,y+28);x.lineTo(108,y+44);x.lineTo(64,y+6);x.lineTo(20,y+44);x.closePath();x.fill();
  x.fillStyle='#19e6ff';
  x.beginPath();x.moveTo(32,y+44);x.lineTo(64,y+16);x.lineTo(96,y+44);x.lineTo(96,y+52);x.lineTo(64,y+24);x.lineTo(32,y+52);x.closePath();x.fill();
 }
 return makeTex(c,1,1,true);
}

function createRampTexture(){
 const [c,x]=mkCanvas(128,256);
 x.fillStyle='#171c2b';x.fillRect(0,0,128,256);
 for(let y=0;y<256;y+=32){
  x.fillStyle=(y/32)%2===0?'#ff8a1a':'#1e273d';
  x.fillRect(0,y,16,32);x.fillRect(112,y,16,32);
 }
 x.fillStyle='#ffd447';
 for(let y=34;y<256;y+=72){
  x.beginPath();x.moveTo(26,y+24);x.lineTo(64,y-14);x.lineTo(102,y+24);x.lineTo(88,y+24);x.lineTo(64,y);x.lineTo(40,y+24);x.closePath();x.fill();
 }
 return makeTex(c,1,1,true);
}

/* ---------- ENERGY GUARDRAIL TEXTURE ---------- */
function createGuardrailTexture(hexColor){
 const [c,x]=mkCanvas(256,64);
 const css='#'+hexColor.toString(16).padStart(6,'0');
 x.clearRect(0,0,256,64);
 // Translucent tinted energy field
 x.fillStyle=css;x.globalAlpha=.22;x.fillRect(0,0,256,64);
 // Bright glowing top & bottom laser rails
 x.globalAlpha=1;
 x.fillStyle='#ffffff';x.fillRect(0,3,256,4);
 x.fillStyle=css;x.fillRect(0,7,256,6);
 x.fillRect(0,52,256,8);
 // Diagonal chevron energy pulses & vertical pylons
 x.fillStyle=css;x.globalAlpha=.65;
 for(let i=0;i<256;i+=64){
  x.fillRect(i,0,5,64);
  x.beginPath();x.moveTo(i+20,18);x.lineTo(i+36,32);x.lineTo(i+20,46);x.lineTo(i+28,46);x.lineTo(i+44,32);x.lineTo(i+28,18);x.closePath();x.fill();
 }
 x.globalAlpha=1;
 return makeTex(c,1,1,true);
}

/* ---------- START / FINISH CHECKERED & GANTRY TEXTURES ---------- */
function createCheckeredTexture(){
 const [c,x]=mkCanvas(256,64);
 const sz=16;
 for(let r=0;r<4;r++)for(let col=0;col<16;col++){
  x.fillStyle=(r+col)%2===0?'#f4f8ff':'#0b111c';
  x.fillRect(col*sz,r*sz,sz,sz);
 }
 return makeTex(c,1,1,true);
}

function createGantryBannerTexture(trackName,accentHex){
 const [c,x]=mkCanvas(512,64);
 const css='#'+accentHex.toString(16).padStart(6,'0');
 x.fillStyle='#07101c';x.fillRect(0,0,512,64);
 x.strokeStyle=css;x.lineWidth=4;x.strokeRect(2,2,508,60);
 x.fillStyle=css;x.fillRect(10,10,10,44);x.fillRect(492,10,10,44);
 x.font='900 28px Bahnschrift, Segoe UI, sans-serif';
 x.textAlign='center';x.textBaseline='middle';
 x.fillStyle='#ffffff';
 x.fillText('TEJAX KART  //  '+trackName.toUpperCase(),256,34);
 return makeTex(c,1,1,true);
}

/* ---------- THEME ENVIRONMENT CUBEMAP ---------- */
function createThemeEnvMap(theme){
 const stops={
  city:[['#070d24',0],['#1e3668',.42],['#55216e',.52],['#102a3c',.62],['#050912',1]],
  canyon:[['#2e5480',0],['#e89b72',.44],['#ffe5b4',.5],['#7c422c',.56],['#29120b',1]],
  glacier:[['#041428',0],['#18667a',.4],['#72f6ff',.5],['#1c4160',.58],['#071422',1]],
  volcano:[['#120508',0],['#4d1412',.42],['#ff6a26',.52],['#38120c',.62],['#0e0506',1]],
  orbital:[['#04071c',0],['#261868',.42],['#b66bff',.5],['#142454',.6],['#040712',1]]
 }[theme]||[['#070d24',0],['#1e3668',.45],['#102a3c',.55],['#050912',1]];
 const faces=Array.from({length:6},()=>{
  const [canvas,x]=mkCanvas(64,64);
  const g=x.createLinearGradient(0,0,0,64);
  for(const [col,st] of stops)g.addColorStop(st,col);
  x.fillStyle=g;x.fillRect(0,0,64,64);
  return canvas;
 });
 const env=new T.CubeTexture(faces);
 if(T.sRGBEncoding)env.encoding=T.sRGBEncoding;
 env.needsUpdate=true;
 return env;
}

/* ---------- GLACIER AURORA SHADER MESH ---------- */
function createAuroraMesh(){
 const geo=new T.CylinderGeometry(640,640,170,64,6,true);
 const mat=new T.ShaderMaterial({
  transparent:true,
  depthWrite:false,
  side:T.BackSide,
  blending:T.AdditiveBlending,
  fog:false,
  uniforms:{uTime:{value:0}},
  vertexShader:`
   varying vec2 vUv;
   uniform float uTime;
   void main(){
    vUv=uv;
    vec3 p=position;
    float wave=sin(uv.x*25.1327+uTime*.55)*16.0+cos(uv.x*12.566-uTime*.35)*10.0;
    p.y+=wave*(uv.y);
    gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);
   }`,
  fragmentShader:`
   varying vec2 vUv;
   uniform float uTime;
   void main(){
    float w1=sin(vUv.x*31.4159+uTime*.45)*.5+.5;
    float w2=sin(vUv.x*18.8495-uTime*.28+1.4)*.5+.5;
    float curtain=pow(w1*w2,1.6);
    float vFade=smoothstep(0.0,0.28,vUv.y)*smoothstep(1.0,0.35,vUv.y);
    vec3 col=mix(vec3(0.08,0.95,0.75),vec3(0.45,0.25,1.0),vUv.y);
    float alpha=curtain*vFade*0.52;
    gl_FragColor=vec4(col,alpha);
   }`
 });
 const m=new T.Mesh(geo,mat);
 m.position.y=185;
 m.userData.update=t=>{mat.uniforms.uTime.value=t};
 return m;
}

/* ---------- CANYON SUN DISC + HALO ---------- */
function createSunDisc(softTex){
 const g=new T.Group();
 const disc=new T.Mesh(new T.CircleGeometry(46,32),new T.MeshBasicMaterial({color:0xfff3d4,fog:false,depthWrite:false}));
 const halo=new T.Mesh(new T.PlaneGeometry(240,240),new T.MeshBasicMaterial({map:softTex,color:0xff9c54,transparent:true,opacity:.65,blending:T.AdditiveBlending,fog:false,depthWrite:false}));
 halo.position.z=-1;
 g.add(halo,disc);
 g.position.set(-340,240,420);
 g.lookAt(0,40,0);
 return g;
}

/* ---------- RIBBON LIGHT TRAIL (TAILLIGHTS / BOOST) ---------- */
function createRibbonTrail(colorHex,maxSegs=26,width=.18){
 const segs=maxSegs;
 const positions=new Float32Array(segs*2*3);
 const colors=new Float32Array(segs*2*3);
 const indices=[];
 for(let i=0;i<segs-1;i++){
  const a=i*2,b=a+1,c=a+2,d=a+3;
  indices.push(a,b,c,b,d,c);
 }
 const geo=new T.BufferGeometry();
 geo.setAttribute('position',new T.BufferAttribute(positions,3));
 geo.setAttribute('color',new T.BufferAttribute(colors,3));
 geo.setIndex(indices);
 const mat=new T.MeshBasicMaterial({vertexColors:true,transparent:true,opacity:.85,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide});
 const mesh=new T.Mesh(geo,mat);
 mesh.frustumCulled=false;
 const baseCol=new T.Color(colorHex);
 const pts=Array.from({length:segs},()=>({x:0,y:-100,z:0,rx:1,rz:0,a:0}));
 let active=false;

 function reset(){
  for(const p of pts){p.y=-100;p.a=0}
  positions.fill(0);colors.fill(0);
  geo.attributes.position.needsUpdate=true;
  geo.attributes.color.needsUpdate=true;
  active=false;
 }

 function push(x,y,z,rx,rz,intensity,colOverride){
  if(colOverride)baseCol.setHex(colOverride);
  for(let i=segs-1;i>0;i--){
   const dst=pts[i],src=pts[i-1];
   dst.x=src.x;dst.y=src.y;dst.z=src.z;dst.rx=src.rx;dst.rz=src.rz;dst.a=src.a*.88;
  }
  pts[0].x=x;pts[0].y=y;pts[0].z=z;pts[0].rx=rx;pts[0].rz=rz;pts[0].a=intensity;
  if(!active&&intensity>0.01){
   for(let i=1;i<segs;i++){pts[i].x=x;pts[i].y=y;pts[i].z=z;pts[i].rx=rx;pts[i].rz=rz;pts[i].a=0}
   active=true;
  }
  for(let i=0;i<segs;i++){
   const p=pts[i],fade=(1-i/(segs-1))*p.a,hw=width*(1-i/segs*.65);
   const vi=i*6;
   positions[vi]=p.x-p.rx*hw;positions[vi+1]=p.y;positions[vi+2]=p.z-p.rz*hw;
   positions[vi+3]=p.x+p.rx*hw;positions[vi+4]=p.y;positions[vi+5]=p.z+p.rz*hw;
   colors[vi]=baseCol.r*fade;colors[vi+1]=baseCol.g*fade;colors[vi+2]=baseCol.b*fade;
   colors[vi+3]=baseCol.r*fade;colors[vi+4]=baseCol.g*fade;colors[vi+5]=baseCol.b*fade;
  }
  geo.attributes.position.needsUpdate=true;
  geo.attributes.color.needsUpdate=true;
 }
 return {mesh,push,reset};
}

/* ---------- LIGHTWEIGHT SELECTIVE BLOOM + CHROMA COMPOSER ---------- */
function createComposer(renderer){
 if(!renderer||typeof renderer.setRenderTarget!=='function'||typeof renderer.getDrawingBufferSize!=='function'){
  return {enabled:false,resize(){},render(sc,cam){renderer.render(sc,cam)},setFX(){},dispose(){}};
 }
 const size=new T.Vector2();
 renderer.getDrawingBufferSize(size);
 const w=Math.max(2,size.x|0),h=Math.max(2,size.y|0);
 const rtOpts={minFilter:T.LinearFilter,magFilter:T.LinearFilter,format:T.RGBAFormat};
 const bloomOpts={minFilter:T.LinearFilter,magFilter:T.LinearFilter,format:T.RGBAFormat,depthBuffer:false,stencilBuffer:false};

 const sceneRT=new T.WebGLRenderTarget(w,h,rtOpts);
 const bloomA=new T.WebGLRenderTarget(Math.max(2,w>>2),Math.max(2,h>>2),bloomOpts);
 const bloomB=new T.WebGLRenderTarget(Math.max(2,w>>2),Math.max(2,h>>2),bloomOpts);

 const orthoCam=new T.OrthographicCamera(-1,1,1,-1,0,1);
 const quadGeo=new T.PlaneGeometry(2,2);
 const passVS=`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}`;

 const threshMat=new T.ShaderMaterial({
  uniforms:{tDiffuse:{value:sceneRT.texture},uThreshold:{value:.52}},
  vertexShader:passVS,
  fragmentShader:`
   uniform sampler2D tDiffuse;uniform float uThreshold;varying vec2 vUv;
   void main(){
    vec3 c=texture2D(tDiffuse,vUv).rgb;
    float lum=max(c.r,max(c.g,c.b));
    float k=smoothstep(uThreshold,uThreshold+.35,lum);
    gl_FragColor=vec4(c*k,1.0);
   }`
 });

 const blurMat=new T.ShaderMaterial({
  uniforms:{tDiffuse:{value:null},uDir:{value:new T.Vector2(1/w,0)}},
  vertexShader:passVS,
  fragmentShader:`
   uniform sampler2D tDiffuse;uniform vec2 uDir;varying vec2 vUv;
   void main(){
    vec3 sum=texture2D(tDiffuse,vUv).rgb*0.227027;
    sum+=texture2D(tDiffuse,vUv+uDir*1.384615).rgb*0.316216;
    sum+=texture2D(tDiffuse,vUv-uDir*1.384615).rgb*0.316216;
    sum+=texture2D(tDiffuse,vUv+uDir*3.230769).rgb*0.070270;
    sum+=texture2D(tDiffuse,vUv-uDir*3.230769).rgb*0.070270;
    gl_FragColor=vec4(sum,1.0);
   }`
 });

 const compMat=new T.ShaderMaterial({
  uniforms:{
   tScene:{value:sceneRT.texture},
   tBloom:{value:bloomA.texture},
   uBloomStrength:{value:.62},
   uChroma:{value:0.0},
   uVignette:{value:.24},
   uExposure:{value:1.05}
  },
  vertexShader:passVS,
  fragmentShader:`
   uniform sampler2D tScene;uniform sampler2D tBloom;
   uniform float uBloomStrength;uniform float uChroma;uniform float uVignette;uniform float uExposure;
   varying vec2 vUv;
   vec3 acesFilm(vec3 x){
    const float a=2.51,b=0.03,c=2.43,d=0.59,e=0.14;
    return clamp((x*(a*x+b))/(x*(c*x+d)+e),0.0,1.0);
   }
   void main(){
    vec2 center=vUv-0.5;
    float dist=length(center);
    vec2 off=center*uChroma*dist*0.024;
    vec3 col;
    if(uChroma>0.001){
     col.r=texture2D(tScene,vUv+off).r;
     col.g=texture2D(tScene,vUv).g;
     col.b=texture2D(tScene,vUv-off).b;
    }else{
     col=texture2D(tScene,vUv).rgb;
    }
    vec3 bloom=texture2D(tBloom,vUv).rgb;
    col+=bloom*uBloomStrength;
    col=acesFilm(col*uExposure);
    col*=1.0-uVignette*smoothstep(0.38,0.96,dist);
    col=pow(clamp(col,0.0,1.0),vec3(1.0/2.2));
    gl_FragColor=vec4(col,1.0);
   }`
 });

 const quadScene=new T.Scene();
 const quad=new T.Mesh(quadGeo,threshMat);
 quadScene.add(quad);

 const composer={
  enabled:true,
  resize(nw,nh){
   const rw=Math.max(2,nw|0),rh=Math.max(2,nh|0);
   sceneRT.setSize(rw,rh);
   bloomA.setSize(Math.max(2,rw>>2),Math.max(2,rh>>2));
   bloomB.setSize(Math.max(2,rw>>2),Math.max(2,rh>>2));
  },
  setFX(bloomStrength,chroma,vignette){
   compMat.uniforms.uBloomStrength.value=bloomStrength;
   compMat.uniforms.uChroma.value=chroma;
   compMat.uniforms.uVignette.value=vignette;
  },
  render(sc,cam){
   if(!composer.enabled){renderer.render(sc,cam);return}
   const bw=bloomA.width,bh=bloomA.height;
   renderer.setRenderTarget(sceneRT);
   renderer.render(sc,cam);

   quad.material=threshMat;
   renderer.setRenderTarget(bloomA);
   renderer.render(quadScene,orthoCam);

   quad.material=blurMat;
   blurMat.uniforms.tDiffuse.value=bloomA.texture;
   blurMat.uniforms.uDir.value.set(1.6/bw,0);
   renderer.setRenderTarget(bloomB);
   renderer.render(quadScene,orthoCam);

   blurMat.uniforms.tDiffuse.value=bloomB.texture;
   blurMat.uniforms.uDir.value.set(0,1.6/bh);
   renderer.setRenderTarget(bloomA);
   renderer.render(quadScene,orthoCam);

   quad.material=compMat;
   renderer.setRenderTarget(null);
   renderer.render(quadScene,orthoCam);
  },
  dispose(){
   sceneRT.dispose();bloomA.dispose();bloomB.dispose();
   quadGeo.dispose();threshMat.dispose();blurMat.dispose();compMat.dispose();
  }
 };
 return composer;
}

const api={
 createRoadTextures,
 createGroundTexture,
 createBoostPadTexture,
 createRampTexture,
 createGuardrailTexture,
 createCheckeredTexture,
 createGantryBannerTexture,
 createThemeEnvMap,
 createAuroraMesh,
 createSunDisc,
 createRibbonTrail,
 createComposer
};

if(typeof module!=='undefined')module.exports=api;
else root.KartVFX=api;
})(typeof globalThis!=='undefined'?globalThis:this);
