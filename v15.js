(()=>{const d=document,h=d.documentElement,rm=matchMedia('(prefers-reduced-motion: reduce)').matches;
if(!rm)h.classList.add('m15');
const pb=d.createElement('div');pb.className='pb15';pb.setAttribute('aria-hidden','true');d.body.appendChild(pb);
const imgs=[...d.querySelectorAll('.ftc12 img')];let tk=0;
const onS=()=>{tk=0;const m=h.scrollHeight-innerHeight;pb.style.transform='scaleX('+(m>0?scrollY/m:0)+')';
 if(!rm)imgs.forEach(i=>{const r=i.parentNode.getBoundingClientRect();if(r.bottom>0&&r.top<innerHeight)i.style.setProperty('--py',((r.top+r.height/2-innerHeight/2)*-.08).toFixed(1)+'px')})};
addEventListener('scroll',()=>{if(!tk){tk=1;requestAnimationFrame(onS)}},{passive:true});onS();
// stack index for sticky story cards
d.querySelectorAll('.hw12 li,.why13 li').forEach((l,i,a)=>l.style.setProperty('--i',[...l.parentNode.children].indexOf(l)));
// scroll cue under home hero
const lh=d.querySelector('.lh12');if(lh&&!lh.querySelector('.sc15')){const s=d.createElement('a');s.className='sc15';s.href='#where';s.setAttribute('aria-label','Scroll to start');lh.appendChild(s)}
// reveals: only things below the fold at load, so nothing visible ever flashes
if(!rm&&'IntersectionObserver'in window){const sel='main section,main .card,main .grid,.hw12 li,.why13 li,.proof>span,.tier,.faq details,footer .fcols>*';
 const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in15');io.unobserve(e.target)}}),{rootMargin:'0px 0px -8% 0px'});
 let n=0;d.querySelectorAll(sel).forEach(el=>{if(el.closest('.feed10,#feed,.fd10,[data-feed]')||el.offsetParent===null)return;const r=el.getBoundingClientRect();if(r.top>innerHeight*.92&&n<400){n++;el.classList.add('rv15');io.observe(el)}})}
// count-up for real numbers already printed on the page (.proof)
const cu=el=>{const t=el.textContent,m=t.match(/^(\d[\d,]*)(\+?)$/);if(!m)return;const v=+m[1].replace(/,/g,'');if(rm||v<5)return;const t0=performance.now(),D=1100;
 const f=n=>{const p=Math.min(1,(n-t0)/D),e=1-Math.pow(1-p,3);el.textContent=Math.round(v*e).toLocaleString()+m[2];if(p<1)requestAnimationFrame(f)};el.textContent='0'+m[2];requestAnimationFrame(f)};
if('IntersectionObserver'in window){const io2=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){cu(e.target);io2.unobserve(e.target)}}),{threshold:.6});d.querySelectorAll('.proof b').forEach(b=>io2.observe(b))}
// sticky "Want to be featured?" nudge on listing, region, city and category pages
const p=location.pathname,B=(window.__base!=null?window.__base:'');
const biz=/\/listing\//.test(p),geo=d.querySelector('.ft12,.lhero')&&!/\/(watch|trip|account|me|apply|get-featured|advertise|media-kit|dashboard|claim|privacy|terms)\//.test(p)&&!d.querySelector('.lh12');
let off=0;try{off=+(sessionStorage.getItem('fb15')||0)}catch(e){}
if((biz||geo)&&!off){const b=d.createElement('div');b.className='fb15';b.setAttribute('role','complementary');b.setAttribute('aria-label','Get featured');
 b.innerHTML=(biz?'<p><b>Is this your business?</b><br>Get it featured at the top of your city.</p>':'<p><b>Want to be featured?</b><br>Put your spot at the top of this page.</p>')+'<a class=cta href="'+B+'apply/?tier=top-of-city&src='+(biz?'listing':'page')+'">Get featured</a><button class=x15 type=button aria-label="Dismiss">✕</button>';
 d.body.appendChild(b);let shown=0;
 addEventListener('scroll',()=>{const q=scrollY/(h.scrollHeight-innerHeight||1);if(!shown&&q>.35){shown=1;b.classList.add('on')}},{passive:true});
 b.querySelector('.x15').onclick=()=>{b.classList.remove('on');try{sessionStorage.setItem('fb15','1')}catch(e){}};
 b.querySelector('a').addEventListener('click',()=>{try{window.__v13&&window.__v13.track&&window.__v13.track('cta_featured_nudge')}catch(e){}})}
})();
