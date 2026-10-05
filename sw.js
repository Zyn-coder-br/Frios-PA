const CACHE_NAME = "frios-pa-v8";
const APP_SHELL = ["./","./index.html","./styles.css?v=8","./app.js?v=8","./cloud.js?v=8","./manifest.json","./icon-192.png","./icon-512.png","./apple-touch-icon.png","./icon.svg","./icon.png"];
self.addEventListener("install", event => { event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).then(()=>self.skipWaiting())); });
self.addEventListener("activate", event => { event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim())); });
self.addEventListener("message", event => { if(event.data?.type === "SKIP_WAITING") self.skipWaiting(); });
self.addEventListener("notificationclick", event => { event.notification.close(); event.waitUntil(clients.matchAll({type:"window",includeUncontrolled:true}).then(list=>{ if(list.length) return list[0].focus(); return clients.openWindow("./"); })); });
self.addEventListener("fetch", event => { const url=new URL(event.request.url); if(url.origin!==location.origin)return; event.respondWith(fetch(event.request).then(response=>{const copy=response.clone();caches.open(CACHE_NAME).then(c=>c.put(event.request,copy)).catch(()=>{});return response;}).catch(()=>caches.match(event.request).then(r=>r||caches.match("./index.html")))); });
