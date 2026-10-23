(()=>{'use strict';let ws=null,timer=null,timeout=null;
const N=window.NET={me:0,host:0,code:'',players:[],ping:0,on:null,shot:0,
 close(){const old=ws;ws=null;clearInterval(timer);clearTimeout(timeout);if(old){old.onclose=old.onmessage=old.onerror=null;old.close()}},
 open(then,address){N.close();let url;try{url=new URL(address||((location.protocol==='https:'?'wss://':'ws://')+(location.host||'localhost:3000')));if(!['ws:','wss:'].includes(url.protocol)||url.username||url.password)throw Error()}catch{N.on?.({t:'err',m:'Use a ws:// or wss:// server address.'});return}
 const socket=ws=new WebSocket(url);let opened=false;
 timeout=setTimeout(()=>{if(ws===socket&&!opened){N.close();N.on?.({t:'err',m:'Server unavailable. Start the included LAN server, or play solo.'})}},7000);
 socket.onopen=()=>{if(ws!==socket)return;opened=true;clearTimeout(timeout);timer=setInterval(()=>N.send({t:'p',ts:performance.now()}),2000);then()};
 socket.onmessage=e=>{if(ws!==socket)return;try{const m=JSON.parse(e.data);if(m.t==='p')N.ping=Math.round(performance.now()-m.ts);else N.on?.(m)}catch(error){console.warn('Ignored invalid server message',error)}};
 socket.onerror=()=>{if(!opened){N.close();N.on?.({t:'err',m:'Could not connect. Multiplayer needs the included LAN server.'})}};
 socket.onclose=()=>{if(ws!==socket)return;N.close();N.on?.({t:'closed'})};
 },send(o){if(ws?.readyState===WebSocket.OPEN)ws.send(JSON.stringify(o))}
};})();
