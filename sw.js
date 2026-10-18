const CACHE='dayweave-v3-album-20261018';
const STATIC=['./','./index.html','./styles.css','./app.js','./cloud.js','./studio.js','./dayweave-v3.js','./personal-cloud.js','./config.js','./icon.svg','./manifest.webmanifest'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(STATIC)));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim()});
self.addEventListener('fetch',e=>{
 const req=e.request,u=new URL(req.url);if(req.method!=='GET'||u.origin!==self.location.origin||u.pathname.includes('/.netlify/functions/'))return;
 e.respondWith(fetch(req).then(res=>{if(res.ok&&STATIC.some(s=>u.pathname.endsWith(s.replace('./','')))){const copy=res.clone();caches.open(CACHE).then(c=>c.put(req,copy))}return res}).catch(()=>caches.match(req)));
});

// Push event receiver. Real offline delivery requires an opt-in subscription + VAPID sending backend.
self.addEventListener('push',event=>{let data={};try{data=event.data?.json()||{}}catch{data={body:event.data?.text()||''}};const title=String(data.title||'序时 · 管家的来信').slice(0,80);const body=String(data.body||'有一封新消息在等你。').slice(0,400);event.waitUntil(self.registration.showNotification(title,{body,tag:String(data.tag||'dayweave-push'),icon:'./icon.svg',data:{path:'./index.html'}}))});
self.addEventListener('notificationclick',event=>{event.notification.close();event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(clients=>{const existing=clients.find(x=>x.url.includes('/index.html'));return existing?existing.focus():self.clients.openWindow('./index.html')}))});
