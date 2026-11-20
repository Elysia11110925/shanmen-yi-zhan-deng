const prefix='shanmen-'+new URL(self.registration.scope).pathname+'-';
const version=prefix+'20261121a';
const files=['./','./index.html','./style.css','./app.js','./engine.js','./traits.js','./items.js','./sects.js','./stories.js','./almanac.js','./manifest.webmanifest','./assets/river.webp','./assets/mountain.webp','./assets/marsh.webp','./assets/heaven.webp','./assets/icon-192.png','./assets/icon-512.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(version).then(c=>c.addAll(files)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(xs=>Promise.all(xs.filter(x=>x.startsWith(prefix)&&x!==version).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||!e.request.url.startsWith(self.registration.scope))return;e.respondWith((async()=>{const c=await caches.open(version);if(e.request.mode==='navigate'){try{let r=await fetch(e.request);if(r.ok)return r;}catch{}return await c.match('./index.html')||Response.error();}return await c.match(e.request)||fetch(e.request);})());});
