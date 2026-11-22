(()=>{'use strict';
let promptEvent,reloading=false;
const status=text=>{const el=document.getElementById('offline-status');if(el)el.textContent=text};
const isStandalone=()=>Boolean((typeof matchMedia==='function'&&matchMedia('(display-mode: standalone)').matches)||navigator.standalone);
const syncInstallButtons=()=>{
 const installed=isStandalone();
 document.querySelectorAll('[data-install]').forEach(b=>{
  if(installed){
   if(b.id==='garage-install')b.hidden=true;
   else{b.textContent='APP INSTALLED ✓';b.disabled=true}
  }else if(promptEvent&&b.id==='garage-install'){
   b.hidden=false;b.textContent='📲 INSTALL APP ⬇';
  }
 });
};
addEventListener('beforeinstallprompt',e=>{e.preventDefault();promptEvent=e;syncInstallButtons()});
addEventListener('appinstalled',()=>{
 promptEvent=null;syncInstallButtons();
 status('APP INSTALLED · OFFLINE SOLO PLAY READY');
 if(typeof window!=='undefined'&&window.toast)window.toast('✅ TEJAX KART installed! Launch anytime from your home screen or desktop.');
});
syncInstallButtons();
document.querySelectorAll('[data-install]').forEach(b=>b.onclick=async()=>{
 if(isStandalone()){if(typeof window!=='undefined'&&window.toast)window.toast('TEJAX KART is already installed!');return}
 if(promptEvent){
  const event=promptEvent;promptEvent=null;
  try{
   await event.prompt();
   const choice=await event.userChoice?.catch?.(()=>null);
   if(choice?.outcome==='accepted')status('INSTALLING TEJAX KART APP…');
  }catch{location.href='mobile.html'}
 }else{
  const help=document.getElementById('install-help');
  if(help?.showModal){
   const note=document.getElementById('install-platform-tip');
   if(note){
    const ua=navigator.userAgent||'';
    if(/iPhone|iPad|iPod/i.test(ua))note.textContent='On iPhone / iPad Safari: tap the Share button (↑) and choose "Add to Home Screen".';
    else if(/Android/i.test(ua))note.textContent='On Android Chrome: tap the ⋮ browser menu and choose "Install app" or "Add to Home screen".';
    else note.textContent='On Desktop Chrome / Edge: click the Install App icon (⊕ / ⬇) in the address bar, or browser menu → "Install TEJAX KART".';
   }
   help.showModal();
  }else location.href='mobile.html#install';
 }
});
if(!('serviceWorker'in navigator)||!isSecureContext){status('OFFLINE SAVE NEEDS HTTPS · PLAY ONLINE');return}
if(['localhost','127.0.0.1'].includes(location.hostname)&&!location.search?.includes('offline-test'))return;
navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).then(async registration=>{
 const update=()=>{
  const button=document.getElementById('apply-update');if(!button)return;
  button.hidden=!(registration.waiting&&navigator.serviceWorker.controller);
  if(!button.hidden)button.onclick=()=>{if(!registration.waiting)return;reloading=true;registration.waiting.postMessage({type:'SKIP_WAITING'})};
 };
 update();
 registration.addEventListener('updatefound',()=>{
  const worker=registration.installing;
  worker?.addEventListener('statechange',()=>{
   if(worker.state==='installed'||worker.state==='activated')update();
   if(worker.state==='redundant')status('OFFLINE SAVE FAILED · RECONNECT AND RELOAD');
  });
 });
 document.addEventListener?.('visibilitychange',()=>{if(!document.hidden&&navigator.onLine!==false)registration.update?.().catch?.(()=>{})});
 const ready=await navigator.serviceWorker.ready;
 const worker=ready.active;if(!worker)return;
 const channel=new MessageChannel();
 channel.port1.onmessage=e=>{
  if(e.data?.type==='OFFLINE_READY'){
   status(isStandalone()?'APP INSTALLED · OFFLINE READY':'OFFLINE READY · INSTALL APP OR PLAY OFFLINE');
   channel.port1.close();
  }
 };
 worker.postMessage({type:'CHECK_OFFLINE'},[channel.port2]);
}).catch(()=>status('OFFLINE SAVE UNAVAILABLE · RECONNECT AND RELOAD'));
navigator.serviceWorker.addEventListener('controllerchange',()=>{if(reloading)location.reload()});
})();
