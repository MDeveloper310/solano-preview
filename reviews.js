/* Reel California accounts + reviews (Supabase). Config in window.__rc = {url,key,base}. */
(function(){
const C=window.__rc||{},B=C.base||'';
const $=(s,r=document)=>r.querySelector(s);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const BAD=/\b(fuck\w*|shit\w*|bitch\w*|cunt\w*|asshole\w*|nigg\w*|fag\w*|retard\w*|whore\w*|slut\w*)\b/i;
const stars=n=>'★★★★★'.slice(0,Math.round(n))+'☆☆☆☆☆'.slice(0,5-Math.round(n));
const rv=$('#sbrev'),ac=$('#sbacct');
if(!rv&&!ac)return;
if(!C.url||!C.key){ // graceful fallback
  if(ac)ac.innerHTML="<div class=card><h3>Accounts launching soon</h3><p class=muted>Member accounts and reviews are coming soon. Your saved spots still work on this device from the <a href='"+B+"saved/'>Saved</a> page.</p></div>";
  return;
}
const fb=$('.rv-fallback');if(fb)fb.style.display='none';
const sc=document.createElement('script');sc.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';sc.onload=init;
sc.onerror=()=>{if(fb)fb.style.display='';};document.head.appendChild(sc);
let sb,user=null,prof=null;
async function init(){
  sb=supabase.createClient(C.url,C.key);
  const {data:{session}}=await sb.auth.getSession();user=session&&session.user;
  if(user){const {data}=await sb.from('profiles').select('*').eq('id',user.id).maybeSingle();prof=data;}
  sb.auth.onAuthStateChange((e,s)=>{const u=s&&s.user;if((u&&u.id)!==(user&&user.id))location.reload();});
  if(rv)biz();if(ac)acct();
}
function authBox(msg){
  return `<div class=rv-auth><p class=muted>${msg}</p><form class=rv-login><label>Email<input name=email type=email required autocomplete=email></label><label>Password <small class=fine>(leave empty for a magic link)</small><input name=pw type=password minlength=8 autocomplete=current-password></label><label class=rv-dn hidden>Display name<input name=dn maxlength=40></label><div class=row><button class=cta name=a value=in>Log in</button><button class=ghost name=a value=up>Sign up</button><button class=ghost name=a value=link>Email me a magic link</button></div><p class="fine rv-msg" role=status></p></form></div>`;
}
function wireAuth(root){
  const f=$('.rv-login',root);if(!f)return;let act='in';
  f.querySelectorAll('button').forEach(b=>b.onclick=()=>{act=b.value;if(act==='up')$('.rv-dn',f).hidden=false;});
  f.onsubmit=async e=>{e.preventDefault();const m=$('.rv-msg',f),em=f.email.value.trim(),pw=f.pw.value,redir=location.origin+location.pathname;m.textContent='…';let r;
    if(act==='link'||(!pw&&act==='in')) r=await sb.auth.signInWithOtp({email:em,options:{emailRedirectTo:redir}});
    else if(act==='up'){if(pw.length<8){m.textContent='Use at least 8 characters.';return;}
      r=await sb.auth.signUp({email:em,password:pw,options:{emailRedirectTo:redir,data:{display_name:(f.dn.value||'').trim().slice(0,40)}}});}
    else r=await sb.auth.signInWithPassword({email:em,password:pw});
    if(r.error){m.textContent=r.error.message;return;}
    m.textContent=(act==='in'&&pw)?'Signed in.':'Check your email for a link to finish.';};
}
async function biz(){
  const slug=rv.dataset.slug,name=rv.dataset.name;let sort='new';
  rv.innerHTML="<div class=rv-sum></div><div class=rv-mine></div><div class=rv-sort>Sort: <button class=chip data-s=new aria-pressed=true>Newest</button> <button class=chip data-s=help aria-pressed=false>Most helpful</button></div><div class=rv-list><p class=muted>Loading reviews…</p></div>";
  rv.querySelectorAll('[data-s]').forEach(b=>b.onclick=()=>{sort=b.dataset.s;rv.querySelectorAll('[data-s]').forEach(x=>x.setAttribute('aria-pressed',x===b));load();});
  let mine=null,voted=new Set();
  async function load(){
    let q=sb.from('reviews').select('id,user_id,rating,body,photo_url,helpful_count,created_at,updated_at,status,profiles(display_name)').eq('business_slug',slug).eq('status','published');
    q=sort==='help'?q.order('helpful_count',{ascending:false}).order('created_at',{ascending:false}):q.order('created_at',{ascending:false});
    const {data,error}=await q.limit(100);const L=data||[];
    if(error){$('.rv-list',rv).innerHTML="<p class=muted>Reviews couldn't load right now.</p>";return;}
    const n=L.length,avg=n?L.reduce((a,r)=>a+r.rating,0)/n:0;
    $('.rv-sum',rv).innerHTML=n?`<p class=rv-avg><span class=rv-st aria-hidden=true>${stars(avg)}</span> <b>${avg.toFixed(1)}</b> · ${n} review${n>1?'s':''}</p>`:"<p class=muted>No reviews yet. Be the first.</p>";
    if(user){const {data:m}=await sb.from('reviews').select('*').eq('business_slug',slug).eq('user_id',user.id).maybeSingle();mine=m;
      const {data:v}=await sb.from('review_votes').select('review_id').eq('user_id',user.id);voted=new Set((v||[]).map(x=>x.review_id));}
    $('.rv-list',rv).innerHTML=L.map(r=>`<article class=rv-item data-id=${r.id}><p><span class=rv-st>${stars(r.rating)}</span> <b>${esc(r.profiles&&r.profiles.display_name||'Member')}</b> <small class=fine>${new Date(r.created_at).toLocaleDateString()}${r.updated_at&&r.updated_at!==r.created_at?' · edited':''}</small></p><p>${esc(r.body)}</p>${r.photo_url&&/^https:\/\//.test(r.photo_url)?`<p><a href="${esc(r.photo_url)}" target=_blank rel="nofollow ugc noopener">📷 View photo</a></p>`:''}<p class=rv-acts><button class=chip data-h ${user&&user.id===r.user_id?'disabled':''} aria-pressed=${voted.has(r.id)}>👍 Helpful (${r.helpful_count})</button> ${user&&user.id===r.user_id?'':'<button class=chip data-r>⚑ Report</button>'}</p></article>`).join('')||'';
    rv.querySelectorAll('[data-h]').forEach(b=>b.onclick=async()=>{if(!user)return need();const id=b.closest('[data-id]').dataset.id;
      if(voted.has(id))await sb.from('review_votes').delete().eq('review_id',id).eq('user_id',user.id);else await sb.from('review_votes').insert({review_id:id,user_id:user.id});load();});
    rv.querySelectorAll('[data-r]').forEach(b=>b.onclick=async()=>{if(!user)return need();const reason=prompt('Why are you reporting this review? (optional)');if(reason===null)return;
      const {error}=await sb.from('reports').insert({review_id:b.closest('[data-id]').dataset.id,user_id:user.id,reason:(reason||'').slice(0,500)});b.textContent=error&&!/duplicate/.test(error.message)?'Try again':'Reported';b.disabled=true;});
    form();
  }
  function need(){$('.rv-mine',rv).scrollIntoView({behavior:'smooth'});}
  function form(){
    const box=$('.rv-mine',rv);
    if(!user){box.innerHTML=authBox('Log in or sign up to write a review, vote and report.');wireAuth(box);return;}
    const r=mine||{};
    box.innerHTML=`<form class=rv-form><p class=fine>Posting as <b>${esc(prof&&prof.display_name||'Member')}</b> · <a href="${B}account/">Account</a> · <button type=button class=linkbtn data-out>Log out</button></p>${r.status&&r.status!=='published'?`<p class=fine>Your review is <b>${esc(r.status)}</b> and isn't public right now.</p>`:''}<fieldset class=rv-rate><legend>Your rating</legend>${[1,2,3,4,5].map(i=>`<label><input type=radio name=rating value=${i} ${r.rating==i?'checked':''} required><span>${i}★</span></label>`).join('')}</fieldset><label>Your review<textarea name=body rows=4 minlength=10 maxlength=3000 required placeholder="What did you get? How was it?">${esc(r.body||'')}</textarea></label><label>Photo URL <small class=fine>(optional, https://)</small><input name=photo type=url pattern="https://.*" value="${esc(r.photo_url||'')}"></label><div class=row><button class=cta>${mine?'Update review':'Post review'}</button>${mine?'<button type=button class=ghost data-del>Delete</button>':''}</div><p class="fine rv-msg" role=status></p></form>`;
    $('[data-out]',box).onclick=()=>sb.auth.signOut();
    const f=$('.rv-form',box);
    if(mine)$('[data-del]',box).onclick=async()=>{if(!confirm('Delete your review?'))return;await sb.from('reviews').delete().eq('id',mine.id);mine=null;load();};
    f.onsubmit=async e=>{e.preventDefault();const m=$('.rv-msg',f),body=f.body.value.trim();
      if(BAD.test(body)){m.textContent='Please remove offensive language. Reviews with it are held for moderation.';return;}
      const row={rating:+f.rating.value,body,photo_url:f.photo.value.trim()||null};
      const res=mine?await sb.from('reviews').update(row).eq('id',mine.id):await sb.from('reviews').insert({...row,user_id:user.id,business_slug:slug,business_name:name});
      m.textContent=res.error?res.error.message:'Saved.';if(!res.error)load();};
  }
  load();
}
async function acct(){
  if(!user){ac.innerHTML="<div class=card><h3>Log in or sign up</h3>"+authBox('One account for reviews, helpful votes and reports.')+"</div>";wireAuth(ac);return;}
  const dn=prof&&prof.display_name||'Member';
  ac.innerHTML=`<div class="card rv-prof"><span class=rv-av aria-hidden=true>${esc(dn.trim().charAt(0).toUpperCase()||'?')}</span><div><h3>${esc(dn)}</h3><p class=fine>${esc(user.email||'')} · only you see this</p></div></div><form class="card rv-dnf"><label>Display name<input name=dn maxlength=40 required value="${esc(dn)}"></label><div class=row><button class=cta>Save</button><button type=button class=ghost data-out>Log out</button></div><p class="fine rv-msg" role=status></p></form><div class=card><h3>My reviews</h3><div class=rv-my><p class=muted>Loading…</p></div></div>`;
  $('[data-out]',ac).onclick=()=>sb.auth.signOut();
  $('.rv-dnf',ac).onsubmit=async e=>{e.preventDefault();const v=e.target.dn.value.trim().slice(0,40);const {error}=await sb.from('profiles').update({display_name:v}).eq('id',user.id);$('.rv-msg',ac).textContent=error?error.message:'Saved.';if(!error)setTimeout(()=>location.reload(),500);};
  const {data}=await sb.from('reviews').select('id,business_slug,business_name,rating,body,status,created_at').eq('user_id',user.id).order('created_at',{ascending:false});
  $('.rv-my',ac).innerHTML=(data||[]).map(r=>`<article class=rv-item><p><span class=rv-st>${stars(r.rating)}</span> <a href="${B}listing/${esc(r.business_slug)}/#reviews"><b>${esc(r.business_name||r.business_slug)}</b></a> <small class=fine>${new Date(r.created_at).toLocaleDateString()} · ${esc(r.status)}</small></p><p>${esc(r.body)}</p></article>`).join('')||"<p class=muted>You haven't written any reviews yet.</p>";
}
})();
