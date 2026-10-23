const test=require('node:test'),assert=require('node:assert/strict'),{once}=require('node:events'),{WebSocket}=require('ws');
const {server,wss,rooms,message}=require('../server');
test('real WebSocket room lifecycle and authority checks',async t=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const port=server.address().port,clients=[];
 t.after(async()=>{clients.forEach(s=>s.terminate());wss.clients.forEach(s=>s.terminate());await new Promise(r=>server.close(r))});
 async function connect(){const ws=new WebSocket('ws://127.0.0.1:'+port),queue=[];let waiter;ws.on('message',b=>{const m=JSON.parse(b);if(waiter&&waiter.type===m.t){const f=waiter;waiter=null;clearTimeout(f.timer);f.resolve(m)}else queue.push(m)});await once(ws,'open');clients.push(ws);return {ws,send:m=>ws.send(JSON.stringify(m)),next:type=>{const index=queue.findIndex(m=>m.t===type);if(index>=0)return Promise.resolve(queue.splice(index,1)[0]);return new Promise((resolve,reject)=>{waiter={type,resolve,timer:setTimeout(()=>reject(Error('Timeout: '+type)),2000)}})}}}
 const a=await connect();a.send({t:'create',name:'Host',car:-1,track:0});assert.match((await a.next('err')).m,/vehicle/);assert.equal(rooms.size,0);
 a.send({t:'create',name:'<Host>',car:4,track:2,paint:'#b6ff3b'});const room=await a.next('room');assert.equal(room.players[0].name,'Host');assert.equal(room.players[0].car,4);
 const b=await connect();b.send({t:'join',code:room.code,name:'Guest',car:1,paint:'#ff8a1a'});await b.next('room');await a.next('room');
 b.send({t:'start'});await new Promise(r=>setTimeout(r,30));assert.equal(rooms.get(room.code).live,false);
 a.send({t:'start'});const go=await a.next('go'),other=await b.next('go');assert.equal(go.track,2);assert.deepEqual(go,other);assert.equal(go.order.length,2);
 const r=rooms.get(room.code),host=r.players[0],guest=r.players[1];r.started=Date.now()-100;
 message(host,{t:'hit',to:guest.id,d:9999});assert.equal(guest.hp,100);
 message(host,{t:'s',...host.state,idx:-1});assert.equal(host.state.idx,3);
 host.seenState=true;message(host,{t:'s',...host.state,x:1000,z:1000});assert.notEqual(host.state.x,1000);
 message(host,{t:'s',...host.state,lap:3,fin:1});assert.equal(host.lap,0);assert.equal(host.finish,0);
 message(host,{t:'ability'});const ready=host.abilityReady;message(host,{t:'ability'});assert.equal(host.abilityReady,ready);assert.ok(ready>Date.now());
 message(host,{t:'pickup',index:7});assert.equal(r.pickups[7].ready,0);
 const c=await connect();c.send({t:'join',code:room.code,name:'Late',car:0});assert.match((await c.next('err')).m,/already racing/);
 // Collect the four new pickups at their server-computed locations.
 const T=require('../dist/vendor/three.min.js'),td=require('../dist/track-data.json')[2],curve=new T.CatmullRomCurve3(td.pts.map(p=>new T.Vector3(...p)),true,'catmullrom',.5),points=curve.getSpacedPoints(500);points.pop();
 for(const index of [4,5,6,7]){const pickup=r.pickups[index],pt=points[pickup.idx],prev=points[(pickup.idx+499)%500],next=points[(pickup.idx+1)%500],dx=next.x-prev.x,dz=next.z-prev.z,l=Math.hypot(dx,dz);host.state={...host.state,idx:pickup.idx,x:pt.x+dz/l*pickup.lat,z:pt.z-dx/l*pickup.lat};message(host,{t:'pickup',index});assert.ok(pickup.ready>Date.now())}
 assert.ok(host.rapidUntil>Date.now());assert.ok(host.plasmaUntil>Date.now());assert.ok(host.magnetUntil>Date.now());assert.ok(host.abilityReady<=Date.now());
 host.state={...host.state,idx:3,x:points[3].x,z:points[3].z,h:Math.atan2(points[9].x-points[3].x,points[9].z-points[3].z)};guest.state={...guest.state,idx:9,x:points[9].x,z:points[9].z};host.gunReady=0;message(host,{t:'ev',k:0,a:999,tg:guest.id});const shot=r.shots.at(-1);assert.equal(shot.damage,9);assert.ok(Math.abs(shot.a-host.state.h)<.5,'server computes aim instead of trusting arbitrary input');assert.ok(host.gunReady-Date.now()<=45);const count=r.shots.length;message(host,{t:'ev',k:0,a:0});assert.equal(r.shots.length,count,'rapid fire still has a cooldown');
 a.send({t:'rematch'});await a.next('reset');assert.equal(r.live,false);a.send({t:'start'});await a.next('go');assert.equal(r.live,true);assert.equal(host.lap,0);
 const response=await fetch('http://127.0.0.1:'+port+'/game.html');assert.equal(response.status,200);assert.match(await response.text(),/START YOUR ENGINE/);assert.equal((await fetch('http://127.0.0.1:'+port+'/../package.json')).status,404);
 const sitemap=await fetch('http://127.0.0.1:'+port+'/sitemap.xml');assert.match(sitemap.headers.get('content-type'),/xml/);assert.match(await sitemap.text(),/<urlset/);assert.equal((await fetch('http://127.0.0.1:'+port+'/downloads/tejax-kart-offline.zip')).status,404);
});
