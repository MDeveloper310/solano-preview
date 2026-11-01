(()=>{const d=document,B=d.body,base=(d.querySelector("script[src$='v16.js']").getAttribute('src')||'').replace(/v16\.js$/,'');
const esc=s=>String(s).replace(/[&<>"']/g,c=>'&#'+c.charCodeAt(0)+';');
// ---------- in-site sheet ----------
let sh;function sheet(title,html){if(!sh){sh=d.createElement('div');sh.className='sh16';sh.innerHTML="<div class=bk16></div><div class=pn16 role=dialog aria-modal=true><div class=hd16><b></b><button type=button class=cl16 aria-label=Close>✕</button></div><div class=bd16></div></div>";B.appendChild(sh);
 const close=()=>{sh.classList.remove('on');sh.querySelector('.bd16').innerHTML='';B.classList.remove('lock16')};sh.querySelector('.bk16').onclick=close;sh.querySelector('.cl16').onclick=close;addEventListener('keydown',e=>{if(e.key==='Escape')close()})}
 sh.querySelector('b').textContent=title;sh.querySelector('.bd16').innerHTML=html;sh.classList.add('on');B.classList.add('lock16');sh.querySelector('.cl16').focus();return sh.querySelector('.bd16')}
function embedUrl(u){let m;
 if(m=u.match(/instagram\.com\/(?:[\w.]+\/)?(reel|p|tv)\/([\w-]+)/))return'https://www.instagram.com/'+(m[1]==='tv'?'p':m[1])+'/'+m[2]+'/embed/';
 if(m=u.match(/tiktok\.com\/@[\w.]+\/video\/(\d+)/))return'https://www.tiktok.com/player/v1/'+m[1]+'?autoplay=1';
 if(m=u.match(/(?:v=|shorts\/|embed\/|youtu\.be\/)([\w-]{6,})/))return'https://www.youtube-nocookie.com/embed/'+m[1]+'?autoplay=1&playsinline=1';return null}
function playVid(u,t){const e=embedUrl(u);if(!e)return false;const cr=(u.match(/instagram\.com\/([\w.]+)\/(?:reel|p)\//)||u.match(/tiktok\.com\/(@[\w.]+)/)||[])[1];
 sheet(t||'Watch',`<div class=vf16><iframe src="${esc(e)}" allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowfullscreen loading=eager title="Video"></iframe></div>`+(cr?`<p class=fine>Video by <a href="${esc(u)}" target=_blank rel="noopener noreferrer">${esc(cr[0]==='@'?cr:'@'+cr)}</a> (opens in a new tab)</p>`:''));return true}
let LL;function leaflet(){return LL||(LL=new Promise((ok,no)=>{if(window.L)return ok();const c=d.createElement('link');c.rel='stylesheet';c.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';d.head.appendChild(c);const s=d.createElement('script');s.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';s.onload=ok;s.onerror=no;d.head.appendChild(s)}))}
function showMap(){const la=+B.dataset.lat,lo=+B.dataset.lon,nm=B.dataset.nm||'This spot',ct=B.dataset.ct||'';
 if(!la){const b=sheet('Directions',`<p>Map location isn't available for this spot yet.</p>`);return}
 const b=sheet('Directions · '+nm,`<div id=mp16 class=mp16></div><p class=fine>${esc(nm)}${ct?', '+esc(ct)+', CA':''}. Map is approximate. <span class=loc16></span></p><button type=button class='cta me16'>📍 Show me on the map</button>`);
 leaflet().then(()=>{const m=L.map('mp16').setView([la,lo],15);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(m);L.marker([la,lo]).addTo(m).bindPopup(esc(nm)).openPopup();setTimeout(()=>m.invalidateSize(),250);
  b.querySelector('.me16').onclick=()=>navigator.geolocation&&navigator.geolocation.getCurrentPosition(p=>{const y=[p.coords.latitude,p.coords.longitude];L.circleMarker(y,{radius:8}).addTo(m);m.fitBounds([y,[la,lo]],{padding:[30,30]});const km=m.distance(y,[la,lo])/1609.34;b.querySelector('.loc16').textContent='About '+km.toFixed(1)+' mi away.'})}).catch(()=>{b.querySelector('#mp16').outerHTML='<p>Map could not load right now.</p>'})}
function showExt(u,a){let host='';try{host=new URL(u).hostname.replace(/^www\./,'')}catch(e){}
 const nm=B.dataset.nm;sheet(nm?nm:'More info',`${nm?`<p><b>${esc(nm)}</b>${B.dataset.ct?' · '+esc(B.dataset.ct)+', CA':''}</p>`:''}<p>${esc((a.textContent||'').trim()||host)}</p><p class=fine>Source: ${esc(host)}</p><div class=row16>${B.dataset.lat?"<button type=button class=ghost data-go16=map>🗺️ Map</button>":''}<button type=button class=ghost data-go16=copy>Copy link</button><a class=ghost href="${esc(u)}" target=_blank rel="noopener noreferrer">Open in new tab</a></div>`).addEventListener('click',e=>{const g=e.target.dataset.go16;if(g==='map')showMap();if(g==='copy'){navigator.clipboard&&navigator.clipboard.writeText(u);e.target.textContent='Copied ✓'}})}
d.addEventListener('click',e=>{const a=e.target.closest&&e.target.closest('a[href]');if(!a||e.defaultPrevented)return;let u;try{u=new URL(a.getAttribute('href'),location.href)}catch(x){return}
 if(!/^https?:$/.test(u.protocol)||u.origin===location.origin)return;
 const h=u.hostname,s=u.href;
 if(a.dataset.vid16||embedUrl(s)&&/instagram|tiktok|youtu/.test(h)){if(playVid(s,(a.getAttribute('aria-label')||'').replace(/\(.*?\)/g,'').trim()||'Watch')){e.preventDefault();return}}
 if(a.dataset.map16||/google\.[a-z.]+\/maps|maps\.google|openstreetmap|maps\.apple/.test(s)){e.preventDefault();showMap();return}
 if(/instagram|tiktok|youtube/.test(h)){a.target='_blank';a.rel='noopener noreferrer';return}
 e.preventDefault();showExt(s,a)},true);
// newsletter: post in the background, thank on-site (no redirect)
d.querySelectorAll('form.nl').forEach(f=>f.addEventListener('submit',e=>{e.preventDefault();e.stopImmediatePropagation();const fd=new FormData(f);fd.append('_subject','Newsletter signup');fd.append('_template','table');fd.append('kind','newsletter');
 fetch('https://formsubmit.co/ajax/dd668362a53c8f8c38bcc1fdba5c473c',{method:'POST',body:fd,headers:{Accept:'application/json'}}).catch(()=>{});f.innerHTML="<p class=ok16>✓ You're on the list. Check your inbox to confirm.</p>"},true));
// any native form post to another site → send in background and thank on-site
d.querySelectorAll('form[action^=http]').forEach(f=>{if(new URL(f.action).origin!==location.origin)f.addEventListener('submit',e=>{e.preventDefault();fetch(f.action,{method:'POST',body:new FormData(f),mode:'no-cors'}).catch(()=>{});f.innerHTML="<p class=ok16>✓ Thanks, we got it.</p>"})});
// broken images: hide instead of showing a ? box
const hid=i=>{const c=i.closest('.tile,.card,figure,.bigv,.ftc12');i.remove();if(c&&!c.querySelector('img,video,iframe')&&c.classList.contains('tile'))c.classList.add('noimg16')};
d.querySelectorAll('img').forEach(i=>{if(i.complete&&i.naturalWidth===0&&i.getAttribute('src'))hid(i);else i.addEventListener('error',()=>hid(i),{once:true})});
// empty sections out
d.querySelectorAll('main section,main .sec').forEach(s=>{if(!s.textContent.trim()&&!s.querySelector('img,video,iframe,form,canvas'))s.remove()});
// one bottom overlay at a time, all above the nav
const pick=()=>{let shown=false;[...d.querySelectorAll('.pwa9'),...d.querySelectorAll('.fb15.on'),...d.querySelectorAll('.claimbar8:not([hidden])')].forEach(el=>{el.classList.toggle('o16off',shown);shown=true});d.querySelectorAll('.fb15:not(.on),.claimbar8[hidden]').forEach(el=>el.classList.remove('o16off'))};
new MutationObserver(()=>requestAnimationFrame(pick)).observe(B,{childList:true,subtree:true,attributes:true,attributeFilter:['class','hidden']});pick();
// app-like header shrink on scroll
const tp=d.querySelector('header.top');let ly=0;addEventListener('scroll',()=>{const y=scrollY;if(tp){tp.classList.toggle('sc16',y>8);tp.classList.toggle('up16',y>ly&&y>160)}ly=y},{passive:true});
})();
