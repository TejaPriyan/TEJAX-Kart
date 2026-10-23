'use strict';
// LAN server: bounded client movement; server-owned combat, checkpoints and results.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {WebSocketServer,WebSocket}=require('ws'),Core=require('./dist/core'),T=require('./dist/vendor/three.min.js');
const Combat=require('./dist/combat');
const data=require('./dist/track-data.json'),root=path.join(__dirname,'dist'),rooms=new Map();let uid=0;
const ARM=[.8,1.6,.7,1,.75,1.25],ABILITY=[0,1,2,3,0,1],DURATION=[2.5,4,4.5,5,2.5,3.5],COOLDOWN=[20,22,20,24,22,24];
const tracks=data.map(td=>{const c=new T.CatmullRomCurve3(td.pts.map(p=>new T.Vector3(...p)),true,'catmullrom',.5);const p=c.getSpacedPoints(500);p.pop();return p});
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png','.xml':'application/xml; charset=utf-8','.txt':'text/plain; charset=utf-8'};
const server=http.createServer((req,res)=>{
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);return res.end()}
 let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname)}catch{res.writeHead(400);return res.end()}
 const target=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
 if(!target.startsWith(root+path.sep)||pathname.includes('\\')||!mime[path.extname(target)]){res.writeHead(404);return res.end('Not found')}
 fs.stat(target,(err,stat)=>{if(err||!stat.isFile()){res.writeHead(404);return res.end('Not found')}res.writeHead(200,{'Content-Type':mime[path.extname(target)],'Content-Length':stat.size,'X-Content-Type-Options':'nosniff','Cache-Control':'no-cache'});if(req.method==='HEAD')res.end();else fs.createReadStream(target).pipe(res)})
});
const wss=new WebSocketServer({server,maxPayload:4096,perMessageDeflate:false});
function send(s,m){if(s.readyState===WebSocket.OPEN&&s.bufferedAmount<128*1024)s.send(JSON.stringify(m))}
function broadcast(r,m,except){for(const s of r.players)if(s!==except)send(s,m)}
function info(r){for(const s of r.players)send(s,{t:'room',code:r.code,you:s.id,host:r.players[0].id,players:r.players.map(p=>({id:p.id,name:p.name,car:p.car,paint:p.paint}))})}
function leave(s){const r=s.room;if(!r)return;s.room=null;r.players=r.players.filter(p=>p!==s);if(!r.players.length)rooms.delete(r.code);else{info(r);broadcast(r,{t:'gone',id:s.id})}}
const health=s=>broadcast(s.room,{t:'health',id:s.id,hp:s.hp,dead:s.deadUntil>Date.now(),sh:Math.max(0,(s.shieldUntil-Date.now())/1000),inv:Math.max(0,(s.invUntil-Date.now())/1000)});
function damage(s,amount,by){const now=Date.now();if(s.deadUntil>now||s.invUntil>now||s.shieldUntil>now)return;s.hp=Math.max(0,s.hp-amount/ARM[s.car]);if(s.hp<=0){s.deadUntil=now+3500;s.invUntil=s.deadUntil+2500;broadcast(s.room,{t:'health',id:s.id,hp:0,dead:true,killer:by.id});return}health(s)}
function start(r){const now=Date.now();r.live=true;r.seed=crypto.randomBytes(4).readUInt32LE();r.started=now+3400;r.finish=[];r.shots=[];r.contacts=new Map();const rng=Core.seeded(r.seed);r.pickups=Array.from({length:8},(_,i)=>({idx:(i*62+30)%500,lat:(rng()-.5)*12,ready:0}));
 r.players.forEach((s,i)=>{const idx=3+i*4,p=tracks[r.track][idx];Object.assign(s,{hp:100,deadUntil:0,shieldUntil:0,invUntil:0,abilityUntil:0,abilityReady:0,gunReady:0,missileReady:0,empReady:0,rapidUntil:0,plasmaUntil:0,magnetUntil:0,lap:0,checkpoint:0,finish:0,seenState:false,lastState:now,state:{x:p.x,z:p.z,h:0,vf:0,vl:0,idx,lap:0}})});
 broadcast(r,{t:'go',order:r.players.map(p=>p.id),track:r.track,seed:r.seed})}
function combatState(s,r,now){const p=s.state;return {...p,y:tracks[r.track][p.idx].y+1.7,vx:Math.sin(p.h)*p.vf+Math.cos(p.h)*p.vl,vz:Math.cos(p.h)*p.vf-Math.sin(p.h)*p.vl,dead:s.deadUntil>now,cloaked:ABILITY[s.car]===2&&s.abilityUntil>now,player:s}}
function message(s,m){if(!m||typeof m!=='object'||typeof m.t!=='string')return;const now=Date.now();if(now-s.rateAt>1000){s.rateAt=now;s.rate=0}if(++s.rate>100){s.close(1008,'Rate limit');return}
 if(m.t==='p'){if(Number.isFinite(m.ts))send(s,{t:'p',ts:m.ts});return}
 if(m.t==='create'||m.t==='join'){
  if(!Core.validCar(m.car))return send(s,{t:'err',m:'Choose a valid vehicle.'});
  let r;if(m.t==='create'){if(rooms.size>=100)return send(s,{t:'err',m:'Server is busy.'});if(!Number.isInteger(m.track)||m.track<0||m.track>=tracks.length)return;let code;do{code='TK-'+crypto.randomBytes(3).toString('hex').toUpperCase()}while(rooms.has(code));r={code,players:[],live:false,track:m.track};rooms.set(code,r)}
  else {r=rooms.get(String(m.code||'').toUpperCase());if(!r||r.players.length>=6||r.live)return send(s,{t:'err',m:'Room not found, full, or already racing.'})}
  leave(s);s.name=String(m.name||'Racer').replace(/[<>\x00-\x1f]/g,'').slice(0,16)||'Racer';s.car=m.car;s.paint=/^#[a-f0-9]{6}$/i.test(m.paint)?m.paint:'#b6ff3b';s.room=r;r.players.push(s);info(r);return;
 }
 const r=s.room;if(!r)return;
 if(m.t==='start'){if(r.players[0]===s&&r.players.length>=2&&!r.live)start(r);return}
 if(m.t==='rematch'){if(r.players[0]!==s)return send(s,{t:'err',m:'The host starts the rematch.'});r.live=false;r.shots=[];broadcast(r,{t:'reset'});info(r);return}
 if(!r.live)return;
 if(m.t==='s'){
  if(!Core.validState(m))return;
  const prev=s.state,p=tracks[r.track][m.idx],dist=Math.hypot(m.x-prev.x,m.z-prev.z),seconds=Math.min(2,Math.max(.05,(now-s.lastState)/1000));
  if(dist>seconds*180+12)return;
  if(Math.hypot(m.x-p.x,m.z-p.z)>23)return;
  s.seenState=true;s.lastState=now;s.state={x:m.x,z:m.z,h:m.h,vf:m.vf,vl:m.vl,idx:m.idx,lap:s.lap};
  if(now>=r.started&&!s.finish){const delta=(m.idx-prev.idx+500)%500;if(delta<40&&s.checkpoint<3&&m.idx>=120*(s.checkpoint+1)&&m.idx<120*(s.checkpoint+1)+50)s.checkpoint++;
   if(prev.idx>450&&m.idx<50&&s.checkpoint===3){s.lap++;s.checkpoint=0;if(s.lap===3){r.finish.push(s.id);s.finish=r.finish.length}broadcast(r,{t:'progress',id:s.id,lap:s.lap,place:s.finish});if(r.players.every(p=>p.finish))r.live=false}
  }
  broadcast(r,{t:'s',f:s.id,...s.state,lap:s.lap,hp:s.hp,dead:s.deadUntil>now},s);return;
 }
 if(now<r.started||s.deadUntil>now||s.finish)return;
 if(m.t==='ability'){
  if(now<s.abilityReady)return;s.abilityReady=now+COOLDOWN[s.car]*1000;s.abilityUntil=now+DURATION[s.car]*1000;const ty=ABILITY[s.car];if(ty===0||ty===1)s.invUntil=s.abilityUntil;broadcast(r,{t:'ability',id:s.id});if(ty===2)for(const p of r.shots)if(p.target===s)p.target=null;return;
 }
 if(m.t==='ev'){
  if(![0,1,2].includes(m.k)||!Number.isFinite(m.a))return;
  if(m.k===2){if(now<s.empReady)return;s.empReady=now+10000;for(const other of r.players)if(other!==s&&Math.hypot(other.state.x-s.state.x,other.state.z-s.state.z)<28)damage(other,18,s);broadcast(r,{t:'ev',f:s.id,k:2},s);return}
  const key=m.k?'missileReady':'gunReady';if(now<s[key])return;s[key]=now+(m.k?4000:(s.rapidUntil>now||(s.abilityUntil>now&&ABILITY[s.car]===3))?45:120);
  const shooter=combatState(s,r,now),targets=r.players.filter(p=>p!==s).map(p=>combatState(p,r,now));
  const targetState=Combat.acquire(shooter,targets,(a,b)=>Combat.clearShot(a,b,tracks[r.track])),target=targetState?.player;
  shooter.x+=Math.sin(shooter.h)*3;shooter.z+=Math.cos(shooter.h)*3;
  const aim=Combat.aim(shooter,targetState,m.k?90:235+Math.max(0,s.state.vf));
  r.shots.push({owner:s,ty:m.k,x:shooter.x,y:shooter.y,z:shooter.z,a:aim.a,vy:aim.vy,damage:m.k?35:s.plasmaUntil>now?9:4,speed:m.k?68+Math.max(0,s.state.vf):235+Math.max(0,s.state.vf),idx:s.state.idx,target,until:now+(m.k?6000:950)});
  broadcast(r,{t:'ev',f:s.id,k:m.k,a:aim.a,vy:aim.vy,tg:target?.id},s);return;

 }
 if(m.t==='pickup'){
  if(!Number.isInteger(m.index)||m.index<0||m.index>7)return;const p=r.pickups[m.index];if(now<p.ready)return;const pt=tracks[r.track][p.idx],prev=tracks[r.track][(p.idx+499)%500],next=tracks[r.track][(p.idx+1)%500],dx=next.x-prev.x,dz=next.z-prev.z,l=Math.hypot(dx,dz);if(Math.hypot(s.state.x-(pt.x+dz/l*p.lat),s.state.z-(pt.z-dx/l*p.lat))>(s.magnetUntil>now?14:7))return;
  p.ready=now+12000;const power={hp:s.hp,bo:100,sh:Math.max(0,(s.shieldUntil-now)/1000),ms:Math.max(0,(s.missileReady-now)/1000),ultCd:Math.max(0,(s.abilityReady-now)/1000)};
  for(const name of ['rapid','plasma','magnet'])power[name]=Math.max(0,(s[name+'Until']-now)/1000);
  Combat.applyPower(power,m.index);s.hp=power.hp;s.shieldUntil=now+power.sh*1000;s.missileReady=now+power.ms*1000;s.abilityReady=now+power.ultCd*1000;
  for(const name of ['rapid','plasma','magnet'])s[name+'Until']=now+power[name]*1000;
  broadcast(r,{t:'pickup',index:m.index,id:s.id});health(s);
 }
}
wss.on('connection',s=>{s.id=++uid;s.rateAt=Date.now();s.rate=0;s.alive=true;s.on('pong',()=>s.alive=true);s.on('message',data=>{try{message(s,JSON.parse(data))}catch{send(s,{t:'err',m:'Invalid message.'})}});s.on('close',()=>leave(s));s.on('error',()=>{});if(wss.clients.size>600)s.close(1013,'Server busy')});
let last=Date.now();const tick=setInterval(()=>{const now=Date.now(),dt=Math.min(.1,(now-last)/1000);last=now;for(const r of rooms.values()){if(!r.live)continue;for(const s of r.players){if(s.deadUntil&&now>=s.deadUntil){s.deadUntil=0;s.hp=100;health(s)}}
 for(let i=0;i<r.players.length;i++)for(let j=i+1;j<r.players.length;j++){const a=r.players[i],b=r.players[j],key=a.id+':'+b.id;if(a.deadUntil>now||b.deadUntil>now||now<(r.contacts.get(key)||0)||Math.hypot(a.state.x-b.state.x,a.state.z-b.state.z)>=3.6)continue;r.contacts.set(key,now+650);for(const [attacker,victim]of[[a,b],[b,a]])if(attacker.abilityUntil>now&&[0,1].includes(ABILITY[attacker.car]))damage(victim,ABILITY[attacker.car]===0?15:28,attacker)}
 for(const p of r.shots){if(now>=p.until)continue;const ox=p.x,oy=p.y,oz=p.z;if(p.ty){if(p.target&&(p.target.deadUntil>now||ABILITY[p.target.car]===2&&p.target.abilityUntil>now))p.target=null;if(p.target&&p.target.deadUntil<=now){let e=Math.atan2(p.target.state.x-p.x,p.target.state.z-p.z)-p.a;e=Math.atan2(Math.sin(e),Math.cos(e));p.a+=Core.clamp(e,-2.5*dt,2.5*dt);p.y+=Core.clamp(tracks[r.track][p.target.state.idx].y+1.2-p.y,-30*dt,30*dt)}p.speed=Math.min(130,p.speed+50*dt)}else{const points=tracks[r.track];let best=p.idx;for(let k=-4;k<=4;k++){const i=(p.idx+k+500)%500;if(Math.hypot(points[i].x-p.x,points[i].z-p.z)<Math.hypot(points[best].x-p.x,points[best].z-p.z))best=i}p.idx=best;p.y+=p.vy*dt}p.x+=Math.sin(p.a)*p.speed*dt;p.z+=Math.cos(p.a)*p.speed*dt;
 const ground=tracks[r.track][p.idx];if(!p.ty&&Math.hypot(p.x-ground.x,p.z-ground.z)<14&&p.y<ground.y+.1)p.until=0;
 if(p.until>now)for(const s of r.players){if(s===p.owner||s.deadUntil>now)continue;const y=tracks[r.track][s.state.idx].y+1.7;if(Core.segmentDistance(ox,oy,oz,p.x,p.y,p.z,s.state.x,y,s.state.z)<(p.ty?3.5:2.8)){if(ABILITY[s.car]===1&&s.abilityUntil>now){p.target=p.owner;p.owner=s;p.a+=Math.PI;p.vy=-p.vy}else{damage(s,p.damage,p.owner);p.until=0}break}}
 }r.shots=r.shots.filter(p=>now<p.until);
 }},25);
const heartbeat=setInterval(()=>{for(const s of wss.clients){if(!s.alive){s.terminate();continue}s.alive=false;s.ping()}},30000);
server.on('close',()=>{clearInterval(tick);clearInterval(heartbeat);wss.close()});
if(require.main===module)server.listen(process.env.PORT||3000,'0.0.0.0',()=>console.log('TEJAX KART — http://localhost:'+(process.env.PORT||3000)));
module.exports={server,wss,rooms,message};
