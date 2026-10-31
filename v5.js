(()=>{const B=window.__base||'';const J=k=>{try{return JSON.parse(localStorage.getItem(k))||null}catch(_){return null}},SV=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
if('serviceWorker' in navigator)navigator.serviceWorker.register(B+'sw.js',{scope:B||'./'}).catch(()=>{});
const D=['Su','Mo','Tu','We','Th','Fr','Sa'];
function openNow(oh,now=new Date()){if(!oh)return null;oh=oh.trim();if(oh==='24/7')return true;let res=null,ok=false;const day=now.getDay(),mins=now.getHours()*60+now.getMinutes();
 for(const rule of oh.split(';').map(x=>x.trim()).filter(Boolean)){const m=rule.match(/^((?:(?:Mo|Tu|We|Th|Fr|Sa|Su)(?:-(?:Mo|Tu|We|Th|Fr|Sa|Su))?,?)+)?\s*(.*)$/);if(!m)return null;
  let days=[0,1,2,3,4,5,6];if(m[1]){days=[];for(const part of m[1].split(',').filter(Boolean)){const [a,b]=part.split('-').map(x=>D.indexOf(x));if(b===undefined)days.push(a);else{for(let i=a;;i=(i+1)%7){days.push(i);if(i===b)break}}}}
  const t=m[2].trim();if(!days.includes(day))continue;ok=true;if(t==='off'||t==='closed'){res=false;continue}
  const spans=t.split(',');let any=false;for(const sp of spans){const q=sp.match(/^(\d\d):(\d\d)-(\d\d):(\d\d)$/);if(!q)return null;const s=+q[1]*60+ +q[2];let e=+q[3]*60+ +q[4];if(e<=s)e+=1440;if((mins>=s&&mins<e)||(mins+1440>=s&&mins+1440<e))any=true}res=any}
 return ok?res:false}
window.rcOpenNow=openNow;
document.querySelectorAll('[data-hours]').forEach(el=>{const o=openNow(el.dataset.hours);if(o!==null){const b=document.createElement('b');b.className=o?'open':'closed';b.textContent=o?' · Open now':' · Closed now';el.after(b)}});
const tog=(k,s)=>{const a=J(k)||[];const i=a.indexOf(s);i<0?a.unshift(s):a.splice(i,1);SV(k,a);return i<0};
// listing page
if(window.__rc){const s=window.__rc.s;const rec=(J('rc_recent')||[]).filter(x=>x!==s);rec.unshift(s);SV('rc_recent',rec.slice(0,30));
 const fb=document.querySelector('[data-fav]'),bb=document.querySelector('[data-been]'),cb=document.querySelector('[data-col]');
 const paint=()=>{if(fb)fb.innerHTML=((J('rc_fav')||[]).includes(s)?'❤️<span>Saved</span>':'🤍<span>Save</span>');if(bb)bb.innerHTML=((J('rc_been')||[]).includes(s)?'✅<span>Been here</span>':'☑️<span>Been here</span>')};paint();
 fb&&fb.addEventListener('click',()=>{tog('rc_fav',s);paint()});bb&&bb.addEventListener('click',()=>{tog('rc_been',s);paint()});
 cb&&cb.addEventListener('click',()=>{const c=J('rc_cols')||{};const names=Object.keys(c);const n=prompt('Add to collection'+(names.length?' (existing: '+names.join(', ')+')':'')+'. Name:',names[0]||'Date night');if(!n)return;c[n]=c[n]||[];if(!c[n].includes(s))c[n].push(s);SV('rc_cols',c);cb.innerHTML='📁<span>Added</span>'})}
const card=(r,dist)=>`<article class=tile><a href="${B}listing/${r.s}/">${r.t?`<img loading=lazy src="${B}${r.t}" alt="">`:''}<span class=play aria-hidden=true>▶</span></a><a class=meta href="${B}listing/${r.s}/"><b>${r.n.replace(/</g,'&lt;')}</b><span class=chips><i>📍 ${r.c}</i>${dist!=null?`<i>${dist<10?dist.toFixed(1):Math.round(dist)} mi</i>`:''}${r.h&&openNow(r.h)!==null?`<i class=${openNow(r.h)?'open':'closed'}>${openNow(r.h)?'Open':'Closed'}</i>`:''}</span></a></article>`;
const hav=(a,b,c,d)=>{const R=3958.8,t=x=>x*Math.PI/180;const x=Math.sin(t(c-a)/2)**2+Math.cos(t(a))*Math.cos(t(c))*Math.sin(t(d-b)/2)**2;return 2*R*Math.asin(Math.sqrt(x))};
const getData=()=>fetch(B+'data.json').then(r=>r.json());
// search page
const res=document.getElementById('res');
if(res){getData().then(rows=>{const $=id=>document.getElementById(id);let me=null,map=null,layer=null;const qs=new URLSearchParams(location.search);if(qs.get('q'))$('q').value=qs.get('q');if(qs.get('k'))$('fk').value=qs.get('k');
 const cities=()=>{const r=$('fr').value;const cs=[...new Set(rows.filter(x=>!r||x.r===r).map(x=>x.c))].sort();const cur=$('fc').value;$('fc').innerHTML='<option value="">All cities</option>'+cs.map(c=>`<option${c===cur?' selected':''}>${c}</option>`).join('')};
 const run=()=>{const q=$('q').value.toLowerCase().trim(),k=$('fk').value,rg=$('fr').value,c=$('fc').value,o=$('fo').checked,so=$('so').value;
  let L=rows.filter(x=>(!q||(x.n+' '+x.c+' '+x.r+' '+x.k+' '+(x.cr||'')).toLowerCase().includes(q))&&(!k||x.k===k)&&(!rg||x.r===rg)&&(!c||x.c===c)&&(!o||openNow(x.h)===true));
  L.forEach(x=>x._d=me&&x.lat?hav(me[0],me[1],x.lat,x.lon):null);
  if(so==='d'&&me)L.sort((a,b)=>(a._d??1e9)-(b._d??1e9));else if(so==='n')L.sort((a,b)=>a.n.localeCompare(b.n));else L.sort((a,b)=>b.v-a.v);
  $('cnt').textContent=L.length+' spots'+(o?` open now (only ${rows.filter(x=>x.h).length} spots have verified hours)`:'')+(so==='d'&&!me?' · tap Near me to sort by distance':'');
  res.innerHTML=L.map(x=>card(x,x._d)).join('');
  if(map){layer.clearLayers();const pts=[];L.filter(x=>x.lat).forEach(x=>{const m=L_.circleMarker([x.lat,x.lon],{radius:x.pr==='exact'?7:5,color:'#0b0d11',weight:1.5,fillColor:x.pr==='exact'?'#ff8a6f':'#8891a0',fillOpacity:.95}).bindPopup(`${x.t?`<img src="${B}${x.t}" style="width:120px;border-radius:8px;display:block">`:''}<b>${x.n}</b><br>${x.c}${x.pr==='city'?' <small>(approx. city location)</small>':''}<br><a href="${B}listing/${x.s}/">Open →</a>`);layer.addLayer(m);pts.push([x.lat,x.lon])});if(me)pts.push(me);if(pts.length)map.fitBounds(pts,{padding:[30,30],maxZoom:13})}};
 const L_=window.L;
 $('tm').onclick=()=>{const m=$('map');m.hidden=!m.hidden;$('tm').textContent=m.hidden?'🗺️ Map':'▦ List only';if(!m.hidden&&!map&&L_){map=L_.map('map',{scrollWheelZoom:false}).setView([36.7,-119.4],6);L_.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(map);layer=L_.layerGroup().addTo(map);run()}else if(map)setTimeout(()=>map.invalidateSize(),50)};
 $('near').onclick=()=>{if(!navigator.geolocation){$('cnt').textContent='Location not available in this browser.';return}$('near').textContent='Locating…';navigator.geolocation.getCurrentPosition(p=>{me=[p.coords.latitude,p.coords.longitude];$('so').value='d';$('near').textContent='📍 Near me ✓';if(map)L_.circleMarker(me,{radius:8,color:'#fff',fillColor:'#3b82f6',fillOpacity:1}).addTo(map).bindPopup('You');run()},()=>{$('near').textContent='📍 Near me';$('cnt').textContent='Location permission denied. Showing all.'},{timeout:10000})};
 ['q','fk','fr','fc','fo','so'].forEach(i=>$(i).addEventListener(i==='q'?'input':'change',()=>{if(i==='fr')cities();run()}));cities();run();
 if(qs.get('map'))$('tm').click()})}
// saved page
if(document.getElementById('sv-fav')){getData().then(rows=>{const by=Object.fromEntries(rows.map(r=>[r.s,r]));const fill=(id,arr,empty)=>{const el=document.getElementById(id);const L=(arr||[]).map(s=>by[s]).filter(Boolean);el.innerHTML=L.length?L.map(x=>card(x)).join(''):`<p class=muted>${empty}</p>`};
 const draw=()=>{fill('sv-fav',J('rc_fav'),'Tap 🤍 Save on any spot to keep it here.');fill('sv-been',J('rc_been'),'Mark spots you\'ve visited with “Been here”.');fill('sv-rec',J('rc_recent'),'Spots you open will show up here.');
  const c=J('rc_cols')||{};const el=document.getElementById('sv-cols');el.innerHTML=Object.keys(c).length?Object.entries(c).map(([n,a])=>`<h3>${n.replace(/</g,'&lt;')} <small class=muted>${a.length}</small> <button class=ghost data-del="${encodeURIComponent(n)}">Delete</button></h3><div class=grid>${a.map(s=>by[s]).filter(Boolean).map(x=>card(x)).join('')}</div>`).join(''):'<p class=muted>No collections yet. Use 📁 Collect on a spot, or create one here.</p>'};draw();
 document.getElementById('clr').onclick=()=>{SV('rc_recent',[]);draw()};document.getElementById('newcol').onclick=()=>{const n=prompt('Collection name');if(n){const c=J('rc_cols')||{};c[n]=c[n]||[];SV('rc_cols',c);draw()}};
 document.getElementById('sv-cols').addEventListener('click',e=>{const d=e.target.dataset.del;if(d){const c=J('rc_cols')||{};delete c[decodeURIComponent(d)];SV('rc_cols',c);draw()}})})}
})();
(()=>{document.querySelectorAll('video.pv').forEach(v=>{const p=v.dataset.p||'';const m=matchMedia('(max-width: 700px)').matches;const want=p+'media/promo/promo-'+(m?'9x16':'16x9')+'.mp4';v.poster=p+'media/promo/promo-'+(m?'9x16':'16x9')+'.jpg';
 if(!v.currentSrc||!v.currentSrc.endsWith(want.split('/').pop())){v.src=want;v.load();if(v.autoplay)v.play().catch(()=>{})}
 const b=v.parentElement.querySelector('.unmute');b&&b.addEventListener('click',()=>{v.muted=!v.muted;if(!v.muted){v.currentTime=0;v.play()}b.textContent=v.muted?'🔇 Sound on':'🔊 Mute'})})})();
