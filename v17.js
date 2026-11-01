(()=>{'use strict';const d=document,B=d.body,W=window,$=(s,r=d)=>r.querySelector(s);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>'&#'+c.charCodeAt(0)+';');
const LS={g(k,f){try{return JSON.parse(localStorage.getItem(k))??f}catch(e){return f}},s(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
let DATA=W.__f17||{f:[],ft:[],every:6,cats:[]},full=false,muted=true,cur=-1,loc=LS.g('loc17',null),tab='fy',filt=null,list=[],shown=0,user=null,sb=null;
const CAT=()=>Object.fromEntries(DATA.cats||[]);
const feed=$('#feed17');
// ---------- data ----------
function build(){let f=DATA.f.slice();
 if(filt)f=f.filter(x=>filt.t==='c'?x[5]===filt.v:x[6]===filt.v);
 if(tab==='nb'&&loc){const dd=x=>x[7]==null?1e9:Math.hypot(x[7]-loc[0],(x[8]-loc[1])*Math.cos(loc[0]*Math.PI/180));f.sort((a,b)=>dd(a)-dd(b))}
 const h=(location.hash.match(/^#v=([\w-]+)/)||[])[1];if(h&&!filt){const i=f.findIndex(x=>x[1]===h);if(i>0)f.unshift(f.splice(i,1)[0])}
 const out=[],ev=DATA.every||6,ft=DATA.ft||[];let j=0;
 f.forEach((x,i)=>{out.push({v:x});if(ft.length&&(i+1)%ev===0)out.push({ft:ft[j++%ft.length]})});return out}
function km(la,lo){if(!loc||la==null)return'';const R=3958.8,r=Math.PI/180,a=Math.sin((la-loc[0])*r/2)**2+Math.cos(loc[0]*r)*Math.cos(la*r)*Math.sin((lo-loc[1])*r/2)**2;return(2*R*Math.asin(Math.sqrt(a))).toFixed(1)+' mi'}
// ---------- render ----------
function poster(x){return x[0]==='y'?'https://i.ytimg.com/vi/'+x[1]+'/hqdefault.jpg':(x[11]?(x[11].startsWith('http')?x[11]:x[11]):'')}
function card(o,i){const c=d.createElement('section');c.className='c17';c.dataset.i=i;
 if(o.ft){const[s,n,k,ct,t,la,lo]=o.ft;c.classList.add('ftc');c.dataset.la=la||'';c.dataset.lo=lo||'';
  c.innerHTML=`<img class=po src="${esc(t)}" alt="" loading=lazy decoding=async><div class=gr></div><div class=ov><span class=lbl>${DATA.mode==='paid'?'Sponsored':'Example featured spot (this could be you)'}</span><a class=bn href="listing/${esc(s)}/">${esc(n)}</a><p class=mt>${esc(k)} · ${esc(ct)}${loc&&la?' · '+km(la,lo):''}</p><p class=tx><a href="get-featured/" style="color:#fff">Get your business featured here →</a></p></div><div class=rail><button type=button data-a=info aria-label="Info"><span>ⓘ</span><small>Info</small></button><button type=button data-a=dir aria-label=Directions><span>📍</span><small>Map</small></button><button type=button data-a=share aria-label=Share><span>↗</span><small>Share</small></button></div>`;
  c._o={n,k,ct,la,lo,s};return c}
 const x=o.v,[kd,id,t,cr,cru,k,ct,la,lo,s,n]=x,kl=CAT()[k]||k,p=poster(x),L=LS.g('l17',{}),Sv=LS.g('s17',{});
 c.classList.add(kd);c.dataset.id=id;
 const head=n?`<a class=bn href="listing/${esc(s)}/">${esc(n)}</a>`:`<span class=bn>${esc(t||kl)}</span>`;
 c.innerHTML=`${p?`<img class=po src="${esc(p)}" alt="" ${i<2?'':'loading=lazy'} decoding=async>`:''}${kd!=='i'?'<div class=tap></div>':''}<div class=gr></div><div class=ov>${head}<p class=mt>${esc(kl)}${ct?' · '+esc(ct):''}${loc&&la!=null?' · '+km(la,lo):''}</p>${n&&t?`<p class=tx>${esc(t)}</p>`:''}${cr?`<a class=cr href="${esc(cru)}" target=_blank rel="noopener noreferrer">@${esc(cr.replace(/^@/,''))}</a>`:''}</div>
<div class=rail><button type=button class=av data-a=follow aria-label="Follow creator">${esc((cr||'?').replace(/^@/,'')[0].toUpperCase())}<i>+</i></button><button type=button data-a=like aria-label=Like class="${L[id]?'on':''}"><span>❤</span><small>Like</small></button><button type=button data-a=comment aria-label=Comment><span>💬</span><small>Comment</small></button><button type=button data-a=save aria-label=Save class="${Sv[id]?'on':''}"><span>🔖</span><small>Save</small></button><button type=button data-a=share aria-label=Share><span>↗</span><small>Share</small></button><button type=button data-a=dir aria-label="Directions"><span>📍</span><small>Map</small></button><button type=button data-a=info aria-label="Info"><span>ⓘ</span><small>Info</small></button></div>`;
 c._o={x,n:n||t,k:kl,ct,la,lo,s,cr,cru,id};return c}
function more(){const end=Math.min(list.length,shown+8);for(;shown<end;shown++){const c=card(list[shown],shown);feed.appendChild(c);io.observe(c)}}
function render(){feed.querySelectorAll('.c17').forEach(c=>{io.unobserve(c);c.remove()});cur=-1;list=build();shown=0;more();feed.scrollTop=0;nbBanner();if(!list.length)feed.innerHTML='<p style="padding:120px 24px;text-align:center">No videos match yet. <button type=button class=b17 id=clr17>Show everything</button></p>'}
// ---------- playback ----------
function src(x,auto){const[kd,id]=x;const m=muted?1:0;
 if(kd==='y')return`https://www.youtube-nocookie.com/embed/${id}?autoplay=${auto}&mute=${m}&playsinline=1&controls=0&loop=1&playlist=${id}&modestbranding=1&rel=0&iv_load_policy=3&enablejsapi=1&origin=${encodeURIComponent(location.origin)}`;
 if(kd==='t')return`https://www.tiktok.com/player/v1/${id}?autoplay=${auto}&muted=${m}&loop=1&controls=0&rel=0&description=0&music_info=0&progress_bar=0&play_button=0&volume_control=0&fullscreen_button=0&timestamp=0&closed_caption=0`;
 return`https://www.instagram.com/reel/${id}/embed/`}
function cmd(c,f){const fr=c&&c.querySelector('iframe');if(!fr||!fr.contentWindow)return;try{
 if(c.classList.contains('y'))fr.contentWindow.postMessage(JSON.stringify({event:'command',func:f,args:[]}),'*');
 else if(c.classList.contains('t'))fr.contentWindow.postMessage({'x-tiktok-player':true,type:{playVideo:'play',pauseVideo:'pause',mute:'mute',unMute:'unMute'}[f]},'*')}catch(e){}}
function mount(c,auto){if(!c||!c._o||!c._o.x||c.querySelector('iframe'))return;const fr=d.createElement('iframe');fr.className='fr';fr.src=src(c._o.x,auto?1:0);fr.allow='autoplay; encrypted-media; picture-in-picture';fr.setAttribute('allowfullscreen','');fr.title='Video';fr.loading='eager';fr.setAttribute('playsinline','');
 fr.onload=()=>{if(+c.dataset.i===cur){cmd(c,muted?'mute':'unMute');cmd(c,'playVideo')}else cmd(c,'pauseVideo')};c.insertBefore(fr,c.querySelector('.tap')||c.querySelector('.gr'))}
function unmount(c){const fr=c.querySelector('iframe');if(fr)fr.remove()}
function activate(i){if(i===cur)return;const prev=feed.querySelector(`.c17[data-i="${cur}"]`);if(prev)cmd(prev,'pauseVideo');cur=i;
 feed.querySelectorAll('.c17').forEach(c=>{const j=+c.dataset.i;if(j<i-1||j>i+2)unmount(c)});
 const c=feed.querySelector(`.c17[data-i="${i}"]`);if(c){if(c.querySelector('iframe')){cmd(c,muted?'mute':'unMute');cmd(c,'playVideo')}else mount(c,true)}
 [1,2].forEach(k=>mount(feed.querySelector(`.c17[data-i="${i+k}"]`),false));// preload next two only
 if(i>shown-4)more();if(i>4&&!full)loadFull()}
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting&&e.intersectionRatio>.6)activate(+e.target.dataset.i)}),{root:feed,threshold:[.6]});
const snd=$('#snd17');function setSnd(){snd.textContent=muted?'🔇 Tap to unmute':'🔊 Sound on';snd.classList.toggle('u',!muted);snd.setAttribute('aria-label',muted?'Tap to unmute':'Mute')}
snd.onclick=()=>{muted=!muted;setSnd();const c=feed.querySelector(`.c17[data-i="${cur}"]`);cmd(c,muted?'mute':'unMute');cmd(c,'playVideo')};
d.addEventListener('visibilitychange',()=>{const c=feed.querySelector(`.c17[data-i="${cur}"]`);cmd(c,d.hidden?'pauseVideo':'playVideo')});
// ---------- sheets ----------
let sh;function sheet(title,html){if(!sh){sh=d.createElement('div');sh.className='sh17';sh.innerHTML='<div class=bk></div><div class=pn role=dialog aria-modal=true><div class=hd><b></b><button type=button class=x aria-label=Close>✕</button></div><div class=bd></div></div>';B.appendChild(sh);sh.querySelector('.bk').onclick=closeSheet;sh.querySelector('.x').onclick=closeSheet;addEventListener('keydown',e=>{if(e.key==='Escape')closeSheet()})}
 sh.querySelector('b').textContent=title;const bd=sh.querySelector('.bd');bd.innerHTML=html;sh.classList.add('on');return bd}
function closeSheet(){if(sh){sh.classList.remove('on');sh.querySelector('.bd').innerHTML=''}}
function supa(){return sb?Promise.resolve(sb):new Promise((ok,no)=>{const C=W.__rcfg||{};if(!C.url||!C.key)return no();const s=d.createElement('script');s.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';s.onload=async()=>{sb=supabase.createClient(C.url,C.key);try{const{data:{session}}=await sb.auth.getSession();user=session&&session.user}catch(e){}ok(sb)};s.onerror=no;d.head.appendChild(s)})}
const WHY={like:'Sign up to like videos',comment:'Sign up to comment',save:'Sign up to save spots',follow:'Sign up to follow creators',me:'Your profile'};
function authSheet(why){const bd=sheet(WHY[why]||'Create an account',`<p>Create a free account to like, comment, save and follow. Browsing never needs one.</p><form id=au17><input name=dn placeholder="Display name (optional)" autocomplete=nickname maxlength=40><input name=em type=email required placeholder="Email" autocomplete=email><input name=pw type=password placeholder="Password (8+ characters)" autocomplete=current-password><button class=b17 value=up>Create account</button><button class="b17 g" value=in>Sign in</button><button class="b17 g" value=link>Email me a sign-in link</button><p class=fine17 id=aum17 role=status></p></form><p class=fine17>By continuing you agree to the <a href="terms/">Terms</a> and <a href="privacy/">Privacy Policy</a>. <a href="privacy/#notice">Notice at collection</a> · <a href="privacy/do-not-sell/">Do Not Sell or Share My Personal Information</a></p>`);
 const f=bd.querySelector('form');let act='up';f.querySelectorAll('button').forEach(b=>b.onclick=()=>act=b.value);
 f.onsubmit=async e=>{e.preventDefault();const m=$('#aum17'),em=f.em.value.trim(),pw=f.pw.value,redir=location.origin+location.pathname;m.textContent='…';
  try{await supa()}catch(x){m.textContent='Sign-in is unavailable right now. Please try again later.';return}
  let r;try{if(act==='link'||(act==='in'&&!pw))r=await sb.auth.signInWithOtp({email:em,options:{emailRedirectTo:redir}});
   else if(act==='up'){if(pw.length<8){m.textContent='Use at least 8 characters.';return}r=await sb.auth.signUp({email:em,password:pw,options:{emailRedirectTo:redir,data:{display_name:(f.dn.value||'').trim().slice(0,40)}}})}
   else r=await sb.auth.signInWithPassword({email:em,password:pw})}catch(x){m.textContent='Something went wrong. Try again.';return}
  if(r.error){m.textContent=r.error.message;return}if(act==='in'&&pw){user=r.data&&r.data.user;m.textContent='Signed in ✓';setTimeout(closeSheet,700)}else m.textContent='Check your email for a link to finish.'}}
function gated(a,c,btn){if(!user)return authSheet(a);const o=c._o;
 if(a==='like'||a==='save'){const k=a==='like'?'l17':'s17',m=LS.g(k,{});m[o.id]?delete m[o.id]:m[o.id]=1;LS.s(k,m);btn.classList.toggle('on',!!m[o.id])}
 else if(a==='comment')sheet('Comments','<p>Comments open soon for signed-in members.</p>');
 else if(a==='follow'){btn.querySelector('i').textContent='✓'}}
let LL;function leaflet(){return LL||(LL=new Promise((ok,no)=>{if(W.L)return ok();const c=d.createElement('link');c.rel='stylesheet';c.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';d.head.appendChild(c);const s=d.createElement('script');s.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';s.onload=ok;s.onerror=no;d.head.appendChild(s)}))}
function mapSheet(o){const la=+o.la,lo=+o.lo;if(!la){sheet('Map','<p>Map location isn\'t available for this one yet.</p>');return}
 const bd=sheet('Map · '+(o.n||'').slice(0,40),`<div id=mp17 class=mp17></div><p class=fine17>${esc(o.ct||'')}${o.ct?', CA. ':''}${o.s?'':'Pin shows the city area. '}<span id=dst17>${loc?'About '+km(la,lo)+' from you.':''}</span></p><button type=button class="b17 g" id=me17>📍 Show me on the map</button>${o.s?`<a class=b17 href="listing/${esc(o.s)}/">Open spot page</a>`:''}`);
 leaflet().then(()=>{const m=L.map('mp17').setView([la,lo],o.s?15:12);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(m);L.marker([la,lo]).addTo(m);setTimeout(()=>m.invalidateSize(),300);
  bd.querySelector('#me17').onclick=()=>navigator.geolocation&&navigator.geolocation.getCurrentPosition(p=>{const y=[p.coords.latitude,p.coords.longitude];loc=y;LS.s('loc17',y);L.circleMarker(y,{radius:8}).addTo(m);m.fitBounds([y,[la,lo]],{padding:[30,30]});bd.querySelector('#dst17').textContent='About '+km(la,lo)+' from you.'})}).catch(()=>{bd.querySelector('#mp17').outerHTML='<p>Map could not load right now.</p>'})}
function infoSheet(o){sheet(o.s?'About this spot':'About this video',`<p><b>${esc(o.n||'')}</b></p><p>${esc(o.k||'')}${o.ct?' · '+esc(o.ct)+', CA':''}</p>${o.cr?`<p>Video by <a href="${esc(o.cru)}" target=_blank rel="noopener noreferrer">@${esc(o.cr.replace(/^@/,''))}</a></p>`:''}${o.s?`<a class=b17 href="listing/${esc(o.s)}/">Open spot page</a>`:''}<button type=button class="b17 g" id=im17>🗺️ Map</button><a class="b17 g" href="trip/">Add stops to a trip plan</a><p class=fine17>Videos are public posts by their creators, embedded, never re-hosted. <a href="disclosures/">Takedowns</a></p>`).querySelector('#im17').onclick=()=>mapSheet(o)}
function share(o){const u=location.origin+location.pathname.replace(/[^/]*$/,'')+(o.s?'listing/'+o.s+'/':'#v='+(o.id||''));if(navigator.share)navigator.share({title:o.n||'Scroll California',url:u}).catch(()=>{});else{navigator.clipboard&&navigator.clipboard.writeText(u).catch(()=>{});sheet('Share','<p>Link copied:</p><input readonly value="'+esc(u)+'">')}}
feed.addEventListener('click',e=>{if(e.target.id==='clr17'){filt=null;flt();render();return}
 const b=e.target.closest('button[data-a]'),c=e.target.closest('.c17');if(!c)return;
 if(b){const a=b.dataset.a,o=c._o;if(['like','comment','save','follow'].includes(a))gated(a,c,b);else if(a==='share')share(o);else if(a==='dir')mapSheet(o);else if(a==='info')infoSheet(o);return}
 if(e.target.classList.contains('tap')){c._p=!c._p;cmd(c,c._p?'pauseVideo':'playVideo')}});
// ---------- tabs / nearby ----------
function nbBanner(){const old=$('.nb17');if(old)old.remove();if(tab!=='nb'||loc)return;const b=d.createElement('div');b.className='nb17';b.innerHTML='<b>See what\'s closest first</b><div class=fine17 style="color:#bbb">Optional. Keep scrolling either way.</div><button type=button class=b17 id=gl17>📍 Use my location</button><form id=zf17><input name=z inputmode=numeric pattern="[0-9]{5}" maxlength=5 placeholder="or ZIP code" aria-label="ZIP code"><button class="b17 g" style="width:auto;margin:4px 0">Go</button></form><p class=fine17 id=zm17 style="color:#bbb"></p>';
 const fc=feed.querySelector('.c17');(fc||feed).appendChild(b);
 b.querySelector('#gl17').onclick=()=>navigator.geolocation&&navigator.geolocation.getCurrentPosition(p=>{loc=[p.coords.latitude,p.coords.longitude];LS.s('loc17',loc);render()},()=>{$('#zm17').textContent='Location is off. Try a ZIP code.'});
 b.querySelector('form').onsubmit=async e=>{e.preventDefault();const z=e.target.z.value.trim();try{const Z=await(await fetch('zips10.json')).json();if(Z[z]){loc=[Z[z][0],Z[z][1]];LS.s('loc17',loc);render()}else $('#zm17').textContent='We don\'t have that ZIP yet. Try a nearby one.'}catch(x){$('#zm17').textContent='Try again.'}}}
d.querySelectorAll('.tabs17 button').forEach(t=>t.onclick=()=>{tab=t.dataset.tab;d.querySelectorAll('.tabs17 button').forEach(x=>{x.classList.toggle('on',x===t);x.setAttribute('aria-selected',x===t)});render()});
// ---------- search ----------
let sr;function flt(){let p=$('.flt17');if(!filt){if(p)p.remove();return}if(!p){p=d.createElement('button');p.type='button';p.className='flt17';B.appendChild(p);p.onclick=()=>{filt=null;flt();render()}}p.textContent=(filt.l||filt.v)+'  ✕'}
function openSearch(){if(!sr){sr=d.createElement('div');sr.className='sr17';sr.setAttribute('role','dialog');sr.setAttribute('aria-label','Search');sr.innerHTML='<div class=bar><input type=search id=q17 placeholder="Search spots, categories, cities" aria-label=Search autocomplete=off><button type=button class=x>Cancel</button></div><div class=res id=res17></div>';B.appendChild(sr);
  sr.querySelector('.x').onclick=()=>sr.classList.remove('on');sr.querySelector('input').oninput=e=>runSearch(e.target.value);
  sr.addEventListener('click',e=>{const b=e.target.closest('[data-f]');if(!b)return;filt={t:b.dataset.f,v:b.dataset.v,l:b.textContent.trim()};tab='fy';d.querySelectorAll('.tabs17 button').forEach(x=>x.classList.toggle('on',x.dataset.tab==='fy'));sr.classList.remove('on');loadFull().then(()=>{flt();render()})})}
 sr.classList.add('on');loadFull().then(()=>runSearch(sr.querySelector('input').value));setTimeout(()=>sr.querySelector('input').focus(),50)}
function runSearch(q){const r=$('#res17');q=q.trim().toLowerCase();const C=DATA.cats||[],ci=DATA.cities||[],bz=DATA.biz||[];
 if(!q){r.innerHTML='<h4>Categories</h4><div class=chips17>'+C.map(([k,l])=>`<button type=button data-f=c data-v="${esc(k)}">${esc(l)}</button>`).join('')+'</div><h4>Cities</h4><div class=chips17>'+ci.slice(0,40).map(c=>`<button type=button data-f=t data-v="${esc(c)}">${esc(c)}</button>`).join('')+'</div>';return}
 const cm=C.filter(([k,l])=>l.toLowerCase().includes(q)||k.includes(q)).slice(0,6),tm=ci.filter(c=>c.toLowerCase().includes(q)).slice(0,8),bm=bz.filter(b=>(b[1]+' '+b[3]+' '+(CAT()[b[2]]||b[2])).toLowerCase().includes(q)).slice(0,30);
 r.innerHTML=(bm.length?'<h4>Spots</h4>'+bm.map(b=>`<a class=r href="listing/${esc(b[0])}/">${b[4]?`<img src="${esc(b[4])}" alt="" loading=lazy>`:'<img alt="">'}<span>${esc(b[1])}<small>${esc(CAT()[b[2]]||b[2])} · ${esc(b[3])}</small></span></a>`).join(''):'')
  +(cm.length?'<h4>Categories</h4>'+cm.map(([k,l])=>`<button type=button class=r data-f=c data-v="${esc(k)}">${esc(l)}</button>`).join(''):'')
  +(tm.length?'<h4>Cities</h4>'+tm.map(c=>`<button type=button class=r data-f=t data-v="${esc(c)}">${esc(c)}</button>`).join(''):'')
  +(!bm.length&&!cm.length&&!tm.length?'<p style="color:#aaa">No matches. Try a city or a kind of spot, like tacos or barbers.</p>':'')}
$('#srch17').onclick=openSearch;
d.querySelector('.bnav17 [data-n=disc]').addEventListener('click',e=>{e.preventDefault();openSearch()});
$('#live17').onclick=()=>location.href='trip/';
d.querySelector('.bnav17 [data-n=me]').addEventListener('click',e=>{e.preventDefault();sheet('Profile',`<div class=lk17>${user?'<a href="account/">👤 Your account</a>':'<a href="#" id=si17>👤 Sign up or sign in</a>'}<a href="saved/">🔖 Saved spots</a><a href="trip/">🧭 Trip planner</a><a href="map/">🗺️ Map</a><a href="search/">🔎 All spots</a><a href="get-featured/">⭐ Get your business featured</a><a href="about/">ℹ️ About</a><a href="terms/">Terms</a><a href="privacy/">Privacy Policy</a><a href="privacy/#notice">Notice at collection (CCPA)</a><a href="privacy/do-not-sell/">Do Not Sell or Share My Personal Information</a></div>`);const s=$('#si17');if(s)s.onclick=x=>{x.preventDefault();authSheet('me')}});
// ---------- boot ----------
let FP;function loadFull(){return FP||(FP=fetch('feed17.json').then(r=>r.json()).then(j=>{const seen=new Set(DATA.f.map(x=>x[1]));DATA=Object.assign({},j,{f:DATA.f.concat(j.f.filter(x=>!seen.has(x[1])))});full=true;if(!filt&&tab==='fy'&&cur>=0){const keep=list.length;list=build();if(list.length<keep)list=list}else list=build()}).catch(()=>{}))}
setSnd();render();
setTimeout(()=>(W.requestIdleCallback||setTimeout)(()=>loadFull()),1500);
supa().catch(()=>{});
})();
