(()=>{'use strict';let promptEvent,reloading=false;
const status=text=>{const el=document.getElementById('offline-status');if(el)el.textContent=text};
addEventListener('beforeinstallprompt',e=>{e.preventDefault();promptEvent=e});
document.querySelectorAll('[data-install]').forEach(b=>b.onclick=async()=>{if(promptEvent){const event=promptEvent;promptEvent=null;try{await event.prompt()}catch{location.href='mobile.html'}}else{const help=document.getElementById('install-help');if(help)help.showModal();else location.href='mobile.html#install'}});
if(!('serviceWorker'in navigator)||!isSecureContext){status('OFFLINE SAVE NEEDS HTTPS · PLAY ONLINE');return}
if(['localhost','127.0.0.1'].includes(location.hostname)&&!location.search.includes('offline-test'))return;
navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).then(async registration=>{
 const update=()=>{const button=document.getElementById('apply-update');if(!button)return;button.hidden=!(registration.waiting&&navigator.serviceWorker.controller);if(!button.hidden)button.onclick=()=>{if(!registration.waiting)return;reloading=true;registration.waiting.postMessage({type:'SKIP_WAITING'})}};
 update();registration.addEventListener('updatefound',()=>{const worker=registration.installing;worker?.addEventListener('statechange',()=>{if(worker.state==='installed'||worker.state==='activated')update();if(worker.state==='redundant')status('OFFLINE SAVE FAILED · RECONNECT AND RELOAD')})});
 const ready=await navigator.serviceWorker.ready;
 const worker=ready.active;if(!worker)return;
 const channel=new MessageChannel();channel.port1.onmessage=e=>{if(e.data?.type==='OFFLINE_READY'){status('OFFLINE READY · SOLO GAME SAVED ON THIS DEVICE');channel.port1.close()}};worker.postMessage({type:'CHECK_OFFLINE'},[channel.port2]);
}).catch(()=>status('OFFLINE SAVE UNAVAILABLE · RECONNECT AND RELOAD'));
navigator.serviceWorker.addEventListener('controllerchange',()=>{if(reloading)location.reload()});
})();
