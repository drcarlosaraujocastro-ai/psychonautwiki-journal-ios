const CACHE='pwj-web-v1';
const CORE=['./','./index.html','./app.css','./app.js','./manifest.webmanifest','./icon.svg','./data/substances.json'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(async c=>{for(const u of CORE){try{await c.add(u)}catch{}}}).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;}).catch(()=>caches.match('./index.html'))));});
