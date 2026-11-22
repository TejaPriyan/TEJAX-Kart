// Global Cloudflare Workers + Local LAN WebSocket & REST client helper.
(()=>{'use strict';
const PUBLIC_HTTP='https://tejax-kart-mp.teja1616150.workers.dev';
const PUBLIC_WS='wss://tejax-kart-mp.teja1616150.workers.dev';
let ws=null,timer=null,timeout=null;

function isLocalHost(){
 const h=location.hostname||'';
 return h==='localhost'||h==='127.0.0.1'||h==='[::1]'||/^192\.168\./.test(h)||/^10\./.test(h)||/^172\.(1[6-9]|2\d|3[01])\./.test(h);
}
function normalizeHttp(custom){
 if(!custom)return (isLocalHost()&&location.port)?location.origin:PUBLIC_HTTP;
 const u=new URL(custom.replace(/^ws:/i,'http:').replace(/^wss:/i,'https:'));
 return u.origin;
}
function normalizeWs(custom,roomCode){
 if(!custom){
  if(isLocalHost()&&location.port){
   return (location.protocol==='https:'?'wss://':'ws://')+location.host;
  }
  return PUBLIC_WS+'/ws?room='+encodeURIComponent(roomCode||'');
 }
 const u=new URL(custom);
 if(!['ws:','wss:'].includes(u.protocol)||u.username||u.password)throw Error('Invalid URL');
 if(u.hostname.endsWith('.workers.dev')||u.pathname==='/ws'){
  u.pathname='/ws';
  if(roomCode)u.searchParams.set('room',roomCode);
 }
 return u.toString();
}
function makeCode(){
 const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
 const arr=new Uint8Array(6);
 (crypto?.getRandomValues?crypto.getRandomValues(arr):arr.forEach((_,i)=>arr[i]=Math.random()*256|0));
 let out='TK-';
 for(let i=0;i<6;i++)out+=chars[arr[i]%chars.length];
 return out;
}

const N=window.NET={
 PUBLIC_HTTP,PUBLIC_WS,
 me:0,host:0,code:'',players:[],ping:0,on:null,shot:0,
 track:0,mode:1,isPublic:false,fillBots:true,
 makeCode,
 apiBase(custom){try{return normalizeHttp(custom)}catch{return PUBLIC_HTTP}},
 async api(path,opts={},custom){
  const base=N.apiBase(custom);
  const res=await fetch(base+path,{...opts,headers:{'Content-Type':'application/json',...(opts.headers||{})}});
  const data=await res.json().catch(()=>({}));
  if(!res.ok)throw new Error(data.error||('HTTP '+res.status));
  return data;
 },
 quickMatch(track,mode,name,custom){return N.api('/api/quickmatch',{method:'POST',body:JSON.stringify({track,mode,name})},custom)},
 listRooms(custom){return N.api('/api/rooms',{method:'GET'},custom)},
 getLeaderboard(track,custom){return N.api('/api/leaderboard?track='+(track|0),{method:'GET'},custom)},
 submitScore(payload,custom){return N.api('/api/leaderboard',{method:'POST',body:JSON.stringify(payload)},custom)},
 getGhost(id,custom){return N.api('/api/ghost?id='+(id|0),{method:'GET'},custom)},
 close(){const old=ws;ws=null;clearInterval(timer);clearTimeout(timeout);if(old){old.onclose=old.onmessage=old.onerror=null;old.close()}},
 open(then,address,roomCode){
  N.close();
  let url;
  try{url=normalizeWs(address,roomCode)}catch{N.on?.({t:'err',m:'Use a ws:// or wss:// server address.'});return}
  const socket=ws=new WebSocket(url);let opened=false;
  timeout=setTimeout(()=>{if(ws===socket&&!opened){N.close();N.on?.({t:'err',m:'Online server unavailable. Check your connection or play solo.'})}},8000);
  socket.onopen=()=>{if(ws!==socket)return;opened=true;clearTimeout(timeout);timer=setInterval(()=>N.send({t:'p',ts:performance.now()}),2000);then()};
  socket.onmessage=e=>{if(ws!==socket)return;try{const m=JSON.parse(e.data);if(m.t==='p')N.ping=Math.round(performance.now()-m.ts);else N.on?.(m)}catch(error){console.warn('Ignored invalid server message',error)}};
  socket.onerror=()=>{if(!opened){N.close();N.on?.({t:'err',m:'Could not connect to multiplayer server.'})}};
  socket.onclose=()=>{if(ws!==socket)return;N.close();N.on?.({t:'closed'})};
 },
 send(o){if(ws?.readyState===WebSocket.OPEN)ws.send(JSON.stringify(o))}
};})();
