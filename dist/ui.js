'use strict';
(()=>{
 const defaults={quality:matchMedia('(pointer:coarse)').matches?'low':'medium',difficulty:'normal',weather:'clear',volume:45,motion:!matchMedia('(prefers-reduced-motion:reduce)').matches,fps:false,keys:{},autoFire:true,tiltSensitivity:25,tiltAuto:true,tiltInvert:false};
 let saved={};try{saved=JSON.parse(localStorage.getItem('tk-settings'))||{}}catch{}
 const prefs=window.KartSettings={...defaults,...saved};if(!['low','medium','high'].includes(prefs.quality))prefs.quality=defaults.quality;if(!['rookie','normal','expert'].includes(prefs.difficulty))prefs.difficulty='normal';if(!['clear','rain','storm','dynamic'].includes(prefs.weather))prefs.weather='clear';prefs.volume=Number.isFinite(+prefs.volume)?KartCore.clamp(+prefs.volume,0,100):45;prefs.keys=typeof prefs.keys==='object'&&prefs.keys?prefs.keys:{};
 const $=id=>document.getElementById(id);let toastTimer;
 window.toast=text=>{clearTimeout(toastTimer);$('toast').textContent=text;$('toast').hidden=false;toastTimer=setTimeout(()=>$('toast').hidden=true,4200)};
 const tracks=['NEON STREETS · TECHNICAL','DESERT SWITCHBACKS · FAST','ALPINE RIDGE · LOW GRIP'];
 window.updateTrack=i=>$('track-info').textContent=tracks[i];
 window.updateVehicle=(d,i)=>{$('vehicle-name').textContent=d.n;$('vehicle-desc').textContent=d.desc;$('v-speed').textContent=Math.round(60*d.spd*3.6);$('v-armor').textContent=Math.round(d.arm*100);$('vehicle-name').style.color='#'+d.c.toString(16).padStart(6,'0')};
 window.updateCareer=()=>{let c;try{c=KartCore.career(localStorage.getItem('tk'))}catch{c=KartCore.career(null)}$('career').textContent=c.r?`${c.r} RUNS / ${c.w} WINS / ${c.c.toLocaleString()} CREDITS`:'YOUR CAREER STARTS HERE'};updateCareer();
 $('open-settings').onclick=()=>{$('settings').showModal()};$('pit-tilt').onclick=()=>$('settings').showModal();$('help-open').onclick=()=>$('help').showModal();$('online-open').onclick=()=>$('online').showModal();
 ['quality','difficulty','weather','volume'].forEach(k=>$(k).value=prefs[k]);$('auto-fire').checked=prefs.autoFire!==false;$('motion').checked=prefs.motion;$('show-fps').checked=prefs.fps;
 const tiltOptions=()=>({sensitivity:+$('tilt-sensitivity').value,autoAccelerate:$('tilt-auto').checked,invert:$('tilt-invert').checked});
 $('tilt-sensitivity').value=KartCore.clamp(+prefs.tiltSensitivity||25,12,45);$('tilt-auto').checked=!!prefs.tiltAuto;$('tilt-invert').checked=!!prefs.tiltInvert;
 window.KartTilt.configure(tiltOptions());
 $('enable-tilt').onclick=()=>{window.KartTilt.configure(tiltOptions());window.KartTilt.enable()};$('disable-tilt').onclick=()=>window.KartTilt.disable();$('calibrate-tilt').onclick=$('quick-calibrate').onclick=()=>window.KartTilt.calibrate();
 for(const id of ['tilt-sensitivity','tilt-auto','tilt-invert'])$(id).oninput=()=>window.KartTilt.configure(tiltOptions());
 const fields={'key-gas':'KeyW','key-brake':'KeyS','key-left':'KeyA','key-right':'KeyD'};
 for(const [id,action] of Object.entries(fields)){const e=$(id);e.value=Object.keys(prefs.keys).find(k=>prefs.keys[k]===action)||action;e.onkeydown=event=>{if(event.code==='Tab')return;event.preventDefault();event.stopPropagation();if(!/^Key[A-Z]$/.test(event.code)||['KeyQ','KeyE','KeyF','KeyT','KeyG','KeyX','KeyZ','KeyC','KeyR'].includes(event.code)){toast('Choose a letter not used by a weapon, camera or restart.');return}if(Object.keys(fields).some(k=>k!==id&&$(k).value===event.code)){toast('That key is already assigned.');return}e.value=event.code}};
 $('save-settings').onclick=()=>{for(const k of ['quality','difficulty','weather'])prefs[k]=$(k).value;prefs.autoFire=$('auto-fire').checked;prefs.volume=+$('volume').value;prefs.motion=$('motion').checked;prefs.fps=$('show-fps').checked;prefs.tiltSensitivity=+$('tilt-sensitivity').value;prefs.tiltAuto=$('tilt-auto').checked;prefs.tiltInvert=$('tilt-invert').checked;prefs.keys={};for(const[id,action]of Object.entries(fields))prefs.keys[$(id).value]=action;try{localStorage.setItem('tk-settings',JSON.stringify(prefs))}catch{}window.Game?.applySettings();$('fps').hidden=!prefs.fps;$('settings').close();toast('Settings saved. Difficulty and weather apply to your next run.')};$('fps').hidden=!prefs.fps;
 $('modes').addEventListener('click',e=>{const i=e.target.dataset.m;if(i!==undefined)$('mode-info').textContent=['Three clean laps. Pure racing. No weapons.','Three laps. Weapons live. Make every corner count.','No respawns. The last driver standing wins.','Survive escalating waves. Repairs between rounds.','Your car. Your circuit. Three laps against the clock.'][+i]});
 const fail=message=>{$('load-error').hidden=false;$('error-message').textContent=message};
 addEventListener('error',e=>{console.error('Game error:',e.message);if(!window.Game)fail('The game could not start. Reload this page with WebGL enabled, or try an up-to-date browser.')});
 $('c').addEventListener('webglcontextlost',e=>{e.preventDefault();fail('Graphics were interrupted. Reload the game and choose Performance graphics for this device.')});
 for(const d of document.querySelectorAll('dialog'))d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close()}});
})();
