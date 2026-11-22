const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function boot(){
 const THREE={...require('../dist/vendor/three.min.js')};THREE.WebGLRenderer=class{constructor(){this.info={memory:{geometries:0,textures:0}}}setPixelRatio(){}setSize(){}render(){}};
 const noop=()=>{},context=new Proxy({createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>o[k]||noop,set:(o,k,v)=>(o[k]=v,true)}),els=new Map(),kfEntries=[];
 function el(id){if(!els.has(id))els.set(id,{id,hidden:true,style:{},dataset:{},value:'',checked:false,textContent:'',innerHTML:'',classList:{add:noop,remove:noop,toggle:noop},getContext:()=>context,appendChild:n=>{if(id==='kf')kfEntries.push(n.textContent)},remove:noop,addEventListener:noop,setAttribute:noop,close:noop,wh:[]});return els.get(id)}
 const document={getElementById:el,createElement:()=>el(Math.random()),querySelectorAll:()=>[],addEventListener:noop,body:{dataset:{}}};
 const settings={quality:'low',difficulty:'normal',weather:'clear',autoFire:false,volume:0,motion:false,keys:{}};
 const audioStats={created:0,disconnected:0};
 class Audio{constructor(){this.destination={};this.state='running';this.currentTime=0}createOscillator(){audioStats.created++;return {connect:noop,disconnect:()=>{audioStats.disconnected++},start:noop,stop:noop,frequency:{value:0,setValueAtTime:noop,exponentialRampToValueAtTime:noop}}}createGain(){audioStats.created++;return {connect:noop,disconnect:()=>{audioStats.disconnected++},gain:{value:0,setValueAtTime:noop,exponentialRampToValueAtTime:noop}}}createBiquadFilter(){audioStats.created++;return {connect:noop,disconnect:()=>{audioStats.disconnected++},frequency:{value:0}}}}
 const net={on:null,shot:0,close:noop,send:noop};
 const ctx={THREE,document,KartCore:require('../dist/core'),KartCombat:require('../dist/combat'),performance:{now:()=>1000},innerWidth:1280,innerHeight:720,devicePixelRatio:1,navigator:{maxTouchPoints:0,getGamepads:()=>[]},localStorage:{getItem:()=>null,setItem:noop},addEventListener:noop,requestAnimationFrame:noop,setTimeout:()=>0,clearTimeout:noop,setInterval:()=>0,clearInterval:noop,console,Math,NET:net,KartSettings:settings,AudioContext:Audio,toast:noop};ctx.window=ctx;
 vm.createContext(ctx);vm.runInContext(fs.readFileSync(require.resolve('../dist/models.js'),'utf8'),ctx);vm.runInContext(fs.readFileSync(require.resolve('../dist/vfx.js'),'utf8'),ctx);let source=fs.readFileSync(require.resolve('../dist/game.js'),'utf8');source=source.replace('const bo=drive(c,dt,i);','if(window.testAuto&&c.isP&&racing)i=ai(c);const bo=drive(c,dt,i);');source=source.replace('loadTrack(0);sel(0);requestAnimationFrame(loop);',`loadTrack(0);sel(0);window.QA={start,step,render,sel,selM,selTrack,activateUlt,fire,detectTarget,collectPower,empBlast,dropOil,place,prefs,togglePause,toggleAudio,startMusic,stopMusic,applyQuality,roadPitch,groundY,cycleCam,pollGamepad,syncCallsign,renderPodium,bots,mine,drive,ai,near,setLookBack(v){lookBack=!!v},get Game(){return window.Game},autopilot(){window.testAuto=true},get player(){return pl0},get cars(){return cars},get elapsed(){return elapsed},get state(){return state},get mines(){return mines},get projectiles(){return prs},get pickups(){return pu},get boostPads(){return boostPads},get jumpRamps(){return jumpRamps},get bank(){return BANK},get cam(){return cam},get camMode(){return camMode},get rocks(){return trackGroup.children.flatMap(o=>o.userData.rockBounds||[])},get scenery(){return trackGroup.children.flatMap(o=>o.userData.sceneryBounds||[])},get lock(){return lockT},get scene(){return sc},get track(){return P},get keys(){return K},get master(){return master},get muted(){return audioMuted},get rainCount(){return rainGeo.drawRange.count},get roadMat(){return activeRoadMat},get animators(){return trackAnimators}};`);vm.runInContext(source,ctx);return Object.assign(ctx.QA,{net,els,kfEntries,audioStats,ctx});
}
test('all vehicles and circuits initialize and survive fixed-step simulation',()=>{const g=boot();for(let car=0;car<6;car++){g.sel(car);g.selTrack(car%6);g.start();for(let i=0;i<240;i++)g.step(1/60);assert.equal(g.state,'race');g.keys.KeyW=1;for(let i=0;i<240;i++)g.step(1/60);g.render(.016);assert.ok(Number.isFinite(g.player.x)&&Number.isFinite(g.player.z));assert.equal(g.cars.length,6)}});
test('countdown and pause do not contribute to race time',()=>{const g=boot();g.start();for(let i=0;i<120;i++)g.step(1/60);assert.equal(g.elapsed,0);for(let i=0;i<180;i++)g.step(1/60);assert.ok(g.elapsed>1&&g.elapsed<2);g.togglePause();const before=g.elapsed;for(let i=0;i<600;i++)g.step(1/60);assert.equal(g.elapsed,before)});
test('Assassin ability deploys two mines despite regular mine cooldown',()=>{const g=boot();g.sel(2);g.start();for(let i=0;i<210;i++)g.step(1/60);g.player.mn=5;g.activateUlt(g.player);assert.equal(g.mines.length,2);assert.notEqual(g.mines[0].x,g.mines[1].x)});
test('time trial has one car and no attack ability',()=>{const g=boot();g.selM(4);g.start();for(let i=0;i<210;i++)g.step(1/60);g.activateUlt(g.player);assert.equal(g.cars.length,1);assert.equal(g.player.ultActive,0)});
test('restarting a race leaves a stable number of scene objects',()=>{const g=boot();g.start();const count=g.scene.children.length;for(let i=0;i<12;i++){g.start();assert.equal(g.scene.children.length,count)}});
test('solo checkpoint order rejects a shortcut finish',()=>{const g=boot();g.start();for(let i=0;i<210;i++)g.step(1/60);const c=g.player;c.half=true;c.idx=490;c.x=g.track[0].x;c.z=g.track[0].z;c.vx=c.vz=0;g.drive(c,1/60,{thr:0,str:0,drift:0,boost:0});assert.equal(c.lap,0)});
test('each circuit completes a full three-lap time trial with the driving AI',()=>{const g=boot();g.selM(4);g.autopilot();for(let track=0;track<6;track++){g.selTrack(track);g.start();for(let i=0;i<60*260&&g.state!=='end';i++)g.step(1/60);assert.equal(g.player.lap,3,'track '+track+' must finish');assert.equal(g.state,'end');assert.ok(g.elapsed>20&&g.elapsed<260)}});
test('actual WASD and arrow input reaches the correct heading rotation',()=>{for(const [key,sign]of [['KeyD',-1],['ArrowRight',-1],['KeyA',1],['ArrowLeft',1]]){const g=boot();g.selM(4);g.start();for(let i=0;i<210;i++)g.step(1/60);const c=g.player,h=c.h;c.vx=Math.sin(h)*30;c.vz=Math.cos(h)*30;c.vf=30;g.keys.KeyW=1;g.keys[key]=1;g.step(1/60);assert.equal(Math.sign(c.h-h),sign,key+' must turn correctly in the game')}});
test('Canyon rock bounds stay clear of every point on the circuit',()=>{const g=boot();g.selTrack(1);assert.equal(g.rocks.length,180);for(const rock of g.rocks){assert.ok(rock.radius>=10&&rock.radius<=29);assert.ok(g.track.every(p=>Math.hypot(rock.x-p.x,rock.z-p.z)>=rock.radius+27))}});
function combatFixture(){const g=boot();g.start();for(let i=0;i<210;i++)g.step(1/60);const p=g.player,t=g.cars[1];for(const c of g.cars.slice(2))c.dead=9999;g.place(p,3,0);g.place(t,12,0);t.skill=0;t.inv=0;p.inv=9999;p.h=Math.atan2(t.x-p.x,t.z-p.z);return {g,p,t}}
test('auto-fire acquires a rival, launches bullets and damages the target',()=>{const {g,p,t}=combatFixture();g.prefs.autoFire=true;const hp=t.hp;for(let i=0;i<70;i++)g.step(1/60);assert.ok(t.hp<hp,'automatically fired bullets must hit');assert.ok(p.mg>0);assert.ok(g.lock===t||t.dead)});
test('manual fire setting, pause and pure racing suppress automatic attacks',()=>{const {g,p}=combatFixture();for(let i=0;i<30;i++)g.step(1/60);assert.equal(g.projectiles.filter(q=>q.o===p).length,0);g.prefs.autoFire=true;g.togglePause();g.fire(p,0);assert.equal(g.projectiles.filter(q=>q.o===p).length,0);g.selM(4);g.start();for(let i=0;i<220;i++)g.step(1/60);g.fire(g.player,0);assert.equal(g.projectiles.length,0)});
test('combat buffs expire, EMP cooldown belongs to each car, and restart clears buffs',()=>{const {g,p,t}=combatFixture();g.collectPower(p,4);g.collectPower(p,5);g.collectPower(p,6);g.empBlast(p);assert.equal(p.emp,10);assert.equal(t.emp,0);g.empBlast(t);assert.equal(t.emp,10);for(let i=0;i<60*13;i++)g.step(1/60);assert.equal(p.rapid,0);assert.equal(p.plasma,0);assert.equal(p.magnet,0);g.collectPower(p,5);g.start();assert.equal(g.player.plasma,0);assert.equal(g.pickups.length,8)});
test('Titan Fortress Ram applies real knockback once per cooldown without kill-feed spam',()=>{const g=boot();g.sel(1);g.start();for(let i=0;i<210;i++)g.step(1/60);const p=g.player,t=g.cars[1];for(const c of g.cars.slice(2))c.dead=9999;g.place(p,3,0);g.place(t,3,0);t.x=p.x+2;t.z=p.z;t.vx=t.vz=0;t.skill=0;g.activateUlt(p);g.kfEntries.length=0;g.step(1/60);const speedAfterRam=Math.hypot(t.vx,t.vz);assert.ok(speedAfterRam>30,'Titan ram must apply strong knockback impulse');for(let i=0;i<10;i++){t.x=p.x+2;t.z=p.z;g.step(1/60)}assert.equal(g.kfEntries.filter(m=>m.includes('FORTRESS RAM')).length,1,'FORTRESS RAM banner must not spam every tick')});
test('AI targeting respects Assassin Shadow Cloak',()=>{const g=boot();g.sel(2);g.start();for(let i=0;i<210;i++)g.step(1/60);const p=g.player,bot=g.cars[1];for(const c of g.cars.slice(2))c.dead=9999;g.place(bot,3,0);g.place(p,10,0);bot.h=Math.atan2(p.x-bot.x,p.z-bot.z);g.ai(bot);assert.equal(bot.tgt,p,'AI detects visible player before cloak');g.activateUlt(p);g.ai(bot);assert.equal(bot.tgt,null,'AI must not target a cloaked Assassin')});
test('unmuting from zero volume restores audio and stopMusic disconnects all nodes',()=>{const g=boot();g.start();for(let i=0;i<210;i++)g.step(1/60);assert.equal(g.muted,true);g.toggleAudio();assert.equal(g.muted,false);assert.ok(g.prefs.volume>0&&g.master.gain.value>0,'unmuting from 0 must restore audible gain');const beforeStop=g.audioStats.disconnected;g.stopMusic();assert.ok(g.audioStats.disconnected-beforeStop>=10,'stopMusic must disconnect oscillators, gains and filters')});
test('all six circuits keep deterministic scenery clear of the track and scale with graphics quality',()=>{const g=boot();for(let t=0;t<6;t++){g.selTrack(t);assert.ok(g.scenery.length>50,'track '+t+' must populate scenery');for(const s of g.scenery)assert.ok(g.track.every(p=>Math.hypot(s.x-p.x,s.z-p.z)>=s.radius+24),'track '+t+' scenery must stay clear of the road')}g.prefs.quality='low';g.applyQuality();const lowRain=g.rainCount;assert.equal(g.scene.environment,null);g.prefs.quality='high';g.applyQuality();assert.ok(g.rainCount>lowRain);assert.ok(g.scene.environment)});
test('car pitch respects facing direction and YXZ Euler order, and 8 survival bots have unique names',()=>{const g=boot();g.selTrack(1);g.start();const c=g.player;assert.equal(c.m.rotation.order,'YXZ');g.place(c,20,0);const forwardPitch=g.roadPitch(c);c.h+=Math.PI;const reversePitch=g.roadPitch(c);assert.ok(Math.abs(forwardPitch+reversePitch)<1e-6,'reversing on a slope must invert pitch sign');g.cars.length=1;g.bots(8,.85,10);const names=new Set(g.cars.slice(1).map(b=>b.name));assert.equal(names.size,8,'8 bots must have 8 distinct callsigns')});
test('multiplayer remote cars animate pitch/steer/boost and EMP pushes local player cleanly',()=>{const g=boot();g.net.me=1;g.net.host=1;g.net.players=[{id:1,name:'P1',car:0,paint:'#19e6ff'},{id:2,name:'P2',car:1,paint:'#ff8a1a'}];g.net.on({t:'go',order:[1,2],track:1,seed:42});for(let i=0;i<210;i++)g.step(1/60);const remote=g.cars.find(c=>c.id===2);g.net.on({t:'s',f:2,x:g.track[20].x,z:g.track[20].z,h:remote.h,vf:50,vl:0,lap:0,idx:20,hp:100,dead:false,st:.8,bo:1,br:0});for(let i=0;i<20;i++)g.step(1/60);assert.equal(remote.m.fl.visible,true,'remote boost flame must animate');assert.ok(Math.abs(remote.m.wh.find(w=>w.f).p.rotation.y)>0.2,'remote front wheels must steer');g.place(g.player,20,0);g.player.x=remote.x+10;g.player.z=remote.z;g.player.vx=g.player.vz=0;g.net.on({t:'ev',f:2,k:2});assert.ok(Math.hypot(g.player.vx,g.player.vz)>20,'remote EMP within 28m must push local player');g.net.on({t:'progress',id:1,lap:3,place:2});assert.equal(g.state,'end')});
test('Phase 2 VFX: procedural PBR roads, wet reflections, turret tracking, suspension, drift sparks & wrong-way',()=>{const g=boot();for(let t=0;t<3;t++){g.selTrack(t);assert.ok(g.roadMat&&g.roadMat.map&&g.roadMat.bumpMap&&g.roadMat.roughnessMap,'track '+t+' must have procedural PBR maps');assert.ok(g.animators.length>=2,'track '+t+' must have animated VFX')}g.selTrack(0);g.prefs.weather='storm';g.start();for(let i=0;i<240;i++)g.step(1/60);assert.ok(g.roadMat.roughness<.35,'storm must lower road roughness for wet reflections');const p=g.player,t=g.cars[1];for(const c of g.cars.slice(2))c.dead=9999;g.place(p,3,0);g.place(t,12,4);t.skill=0;for(let i=0;i<30;i++)g.step(1/60);assert.ok(p.m.turret&&Math.abs(p.m.turret.rotation.y)>0.01,'3D turret must rotate toward target');g.fire(p,0);assert.ok(p.recoil>0,'firing blaster must trigger barrel recoil');p.h+=Math.PI;p.vf=25;g.render(.016);assert.equal(g.els.get('wrong-way').hidden,false,'driving opposite track tangent must show WRONG WAY')});
test('Phase 3 Online: AI bot backfill, 3D nameplates, dead-reckoning & Time Trial holographic ghost',()=>{const g=boot();const sent=[];g.net.send=o=>sent.push(o);g.net.me=1;g.net.host=1;g.net.players=[{id:1,name:'Host',car:0,paint:'#19e6ff'},{id:2,name:'Guest',car:1,paint:'#ff8a1a'}];g.net.on({t:'go',order:[1,2],track:0,mode:1,seed:77,botCount:4});assert.equal(g.cars.length,6,'2 humans + 4 backfill bots must fill 6-kart grid');const remote=g.cars.find(c=>c.id===2);assert.ok(remote.m.nameplate,'remote players must display 3D nameplates');for(let i=0;i<220;i++)g.step(1/60);assert.ok(sent.some(m=>m.t==='bots'&&m.list.length===4),'host must stream backfill bot states');g.net.on({t:'reset'});g.selM(4);g.selTrack(0);g.start();for(let i=0;i<240;i++)g.step(1/60);assert.equal(g.cars.length,1);const ghostData={name:'WR',track:0,car:4,timeMs:45000,ghost:[[0,0,0],[50,0,1.5],[100,10,1.5]]};g.Game.loadGhost(ghostData);g.start();for(let i=0;i<240;i++)g.step(1/60);assert.ok(g.scene.children.some(o=>o.nameplate||o.children?.some(c=>c.isSprite)),'Time Trial ghost must spawn when loaded')});
test('Phase 4: boost pads, jump ramps, 3-tier drift mini-turbo, unique APEX/RALLY ultimates, 4 cameras + look-back & gamepad',()=>{
 const g=boot();
 // 1. Continuous groundY interpolation (no discrete vertical pop between spline nodes)
 g.selTrack(3); // Obsidian Caldera
 assert.equal(g.boostPads.length,5,'each circuit must spawn 5 boost pads');
 assert.equal(g.jumpRamps.length,3,'each circuit must spawn 3 jump ramps');
 const p0=g.track[40],p1=g.track[41];
 const midY=g.groundY((p0.x+p1.x)/2,(p0.z+p1.z)/2,40);
 assert.ok(Math.abs(midY-(p0.y+p1.y)/2)<.15,'groundY must smoothly interpolate between spline points');
 // 2. Boost Pad + Jump Ramp air launch & landing airtime bonus
 g.selM(4);g.start();for(let i=0;i<210;i++)g.step(1/60);
 const pl=g.player,pad=g.boostPads[0],ramp=g.jumpRamps[0];
 pl.bo=40;pl.x=pad.x;pl.z=pad.z;pl.idx=pad.idx;pl.vf=40;pl.vx=Math.sin(pl.h)*40;pl.vz=Math.cos(pl.h)*40;
 g.drive(pl,1/60,{thr:1,str:0,drift:0,boost:0});
 assert.ok(pl.padBoost>1&&pl.bo>50,'driving over boost pad must trigger padBoost and refill nitro');
 pl.x=ramp.x;pl.z=ramp.z;pl.idx=ramp.idx;pl.vf=55;pl.vx=Math.sin(pl.h)*55;pl.vz=Math.cos(pl.h)*55;pl.airY=0;pl.rampCd=0;
 g.drive(pl,1/60,{thr:1,str:0,drift:0,boost:0});
 assert.ok(pl.airY>0&&pl.airVy>10,'hitting jump ramp at speed must launch kart airborne');
 for(let i=0;i<90&&pl.airY>0;i++)g.drive(pl,1/60,{thr:1,str:0,drift:0,boost:0});
 assert.equal(pl.airY,0,'airborne kart must land smoothly back on road');
 // 3. 3-Tier Drift Mini-Turbo release
 pl.driftTime=1.4;pl.driftBoost=0;pl.vf=40;pl.vx=Math.sin(pl.h)*40;pl.vz=Math.cos(pl.h)*40;
 g.drive(pl,1/60,{thr:1,str:0,drift:0,boost:0});
 assert.ok(pl.driftBoost>=1&&pl.driftTier===2,'releasing drift after 1.4s must trigger Tier 2 Super Mini-Turbo');
 // 4. Unique APEX (Slipstream Surge) & RALLY (Seismic Overdrive) ultimates
 g.selM(1);g.sel(4);g.start();for(let i=0;i<210;i++)g.step(1/60);
 const apex=g.player,rival=g.cars[1];for(const c of g.cars.slice(2))c.dead=9999;
 assert.equal(apex.ultType,4);g.place(apex,3,0);g.place(rival,3,0);rival.x=apex.x+4.5;rival.z=apex.z;rival.skill=0;const rHp0=rival.hp;
 g.activateUlt(apex);g.step(1/60);
 assert.ok(rival.hp<rHp0,'APEX Slipstream Surge sonic wake must damage passed rivals within 6.5m');
 g.sel(5);g.start();for(let i=0;i<210;i++)g.step(1/60);
 const rally=g.player,r2=g.cars[1];for(const c of g.cars.slice(2))c.dead=9999;
 assert.equal(rally.ultType,5);g.place(rally,3,0);g.place(r2,3,0);r2.x=rally.x+12;r2.z=rally.z;r2.skill=0;const r2Hp0=r2.hp;
 g.activateUlt(rally);g.step(1/60);
 assert.ok(r2.hp<r2Hp0,'RALLY Seismic Overdrive shockwave pulse must hit rivals within 18m');
 // 5. All 4 camera angles + rear-view look-back + sub-tick render interpolation
 for(let cm=0;cm<4;cm++){g.render(.016,.5);assert.ok(Number.isFinite(g.cam.position.x)&&Number.isFinite(g.cam.position.y));g.cycleCam()}
 assert.equal(g.camMode,0,'4 camera modes must cycle back to CHASE');
 g.setLookBack(true);g.render(.016,1);g.setLookBack(false);
 // 6. Gamepad controller polling
 const btns=Array.from({length:16},(_,idx)=>({pressed:idx===4||idx===5,value:idx===7?0.9:idx===4||idx===5?1:0}));
 g.ctx.navigator.getGamepads=()=>[{connected:true,axes:[0.75,0,0,0],buttons:btns}];
 const gp=g.pollGamepad();
 assert.equal(gp.active,true);assert.ok(gp.str>0.5&&gp.thr>0.8&&gp.drift&&gp.boost,'gamepad axes and triggers must map cleanly');
});
test('Phase 5: Friends-only online (0 bots), real friend names, dynamic HP/rank nameplates, banked Sunset Marina, 6 unique silhouettes & podium',()=>{
 const g=boot();
 // 1. Real player callsign + Friends-only (botCount=0) online race with custom livery/rims
 g.syncCallsign('Teja');
 g.net.me=1;g.net.host=1;
 g.net.players=[{id:1,name:'Teja',car:3,paint:'#b6ff3b',finish:'chrome',livery:'hex',rim:'neon'},{id:2,name:'Alex',car:5,paint:'#ff8a1a',finish:'matte',livery:'bolt',rim:'beadlock'}];
 g.net.on({t:'go',order:[1,2],track:5,mode:1,laps:5,seed:99,botCount:0});
 assert.equal(g.cars.length,2,'Friends-only room with botCount=0 must spawn ONLY joined players and zero bots');
 assert.equal(g.player.name,'Teja','local driver must display their chosen name instead of PLAYER');
 const friend=g.cars.find(c=>c.id===2);
 assert.equal(friend.name,'Alex');
 assert.ok(friend.m.nameplate&&friend.m.nameplate.userData,'friend must have dynamic 3D nameplate');
 assert.ok(g.bank.some(b=>Math.abs(b)>0.02),'Sunset Marina curves must have non-zero banked camber');
 // 2. Live nameplate HP/rank update & braking rotor/airbrake animation
 friend.hp=45;friend.braking=true;friend.vf=40;
 for(let i=0;i<15;i++)g.step(1/60);
 assert.equal(friend.m.nameplate.userData.lastHp,45,'3D nameplate must track friend HP changes');
 assert.ok(friend.m.wing&&friend.m.wing.rotation.x>0.05,'rear wing must tilt as airbrake when braking');
 // 3. Post-race podium table displays real friend names
 g.renderPodium();
 assert.match(g.els.get('podium').innerHTML,/Teja/);
 assert.match(g.els.get('podium').innerHTML,/Alex/);
 // 4. All 6 chassis build cleanly across all liveries & rim styles
 for(let ci=0;ci<6;ci++){
  const m=g.ctx.KartModels.create(g.ctx.KartModels.cars[ci],0x19e6ff,'gloss',g.ctx.KartModels.liveries[ci%5],g.ctx.KartModels.rims[ci%4]);
  assert.ok(m.body&&m.wing&&m.rotors&&m.turret,'chassis '+ci+' must expose body, wing, rotors and turret');
 }
});
