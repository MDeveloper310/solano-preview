const C='rc-v5';const SHELL=['./','v2.css','v4.css','v4.js','v5.js','data.json','favicon.svg','brand/logo.svg','search/','saved/','offline/'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==location.origin)return;
if(e.request.mode==='navigate'){e.respondWith(fetch(e.request).then(r=>{const cp=r.clone();caches.open(C).then(c=>c.put(e.request,cp));return r}).catch(()=>caches.match(e.request).then(r=>r||caches.match('offline/'))));return}
e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(n=>{if(n.ok&&/\.(jpg|png|css|js|json|svg)$/.test(u.pathname)){const cp=n.clone();caches.open(C).then(c=>c.put(e.request,cp))}return n})))});