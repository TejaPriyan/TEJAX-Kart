/* Motion data stays on the device. Permission is requested only by an explicit tap. */
(function(root){'use strict';
function createTiltController(env,core,onStatus=()=>{}){
 let enabled=false,neutral=null,last=null,lastAt=0,filtered=0,target=0,timeout=null,request=0;
 let options={sensitivity:25,invert:false,autoAccelerate:true};
 const angle=()=>env.screen?.orientation?.angle??env.orientation??0;
 const now=()=>env.performance.now();
 function report(text){onStatus(text)}
 function calibrate(){neutral=last;target=filtered=0;report(last===null?'Hold your phone comfortably. Waiting for motion…':'Calibrated. Tilt left or right to steer.')}
 function changed(){last=null;neutral=null;target=filtered=0;lastAt=0;report('Orientation changed. Hold the phone neutral to recalibrate.')}
 function reading(event){const value=core.screenTilt(event.beta,event.gamma,angle());if(value===null||!enabled)return;last=value;lastAt=now();env.clearTimeout(timeout);if(neutral===null){neutral=value;report('Tilt steering ready. Tilt left or right; hold BRAKE to slow down.')}target=core.tiltInput(value,neutral,options.sensitivity,options.invert)}
 function disable(message='Touch steering active.') {request++;enabled=false;neutral=last=null;lastAt=0;target=filtered=0;env.clearTimeout(timeout);env.removeEventListener('deviceorientation',reading);env.removeEventListener('orientationchange',changed);env.screen?.orientation?.removeEventListener?.('change',changed);report(message)}
 async function enable(){disable('Requesting motion access…');const id=request;
  if(!env.isSecureContext){report('Tilt needs a secure HTTPS connection. Touch controls remain available.');return false}
  const api=env.DeviceOrientationEvent;if(!api){report('Motion sensors are unavailable here. Use touch controls.');return false}
  try{if(typeof api.requestPermission==='function'&&await api.requestPermission()!=='granted'){report('Motion permission was not granted. Use touch controls or enable motion in browser settings.');return false}}catch{report('Motion access could not start. Touch controls remain available.');return false}
  if(id!==request)return false;enabled=true;env.addEventListener('deviceorientation',reading);env.addEventListener('orientationchange',changed);env.screen?.orientation?.addEventListener?.('change',changed);report('Hold your phone comfortably while sensors connect…');timeout=env.setTimeout(()=>{if(last===null)disable('No motion readings received. Touch steering is active.')},2500);return true;
 }
 function sample(dt){const active=enabled&&last!==null&&now()-lastAt<1500;if(!active){filtered=0;return {active:false,steer:0,throttle:0}}filtered+=(target-filtered)*(1-Math.exp(-12*Math.min(.1,dt)));return {active:true,steer:filtered,throttle:options.autoAccelerate?1:0}}
 return {enable,disable,calibrate,sample,configure(values){options={...options,...values};if(last!==null&&neutral!==null)target=core.tiltInput(last,neutral,options.sensitivity,options.invert)},get enabled(){return enabled},reset(){filtered=target=0;neutral=null;last=null;lastAt=0}};
}
if(typeof module!=='undefined')module.exports=createTiltController;else{root.KartTilt=createTiltController(root,root.KartCore,text=>{const el=root.document.getElementById('tilt-status');if(el)el.textContent=text});}
})(typeof window!=='undefined'?window:globalThis);
