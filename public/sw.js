const CACHE='voxel-public-shell-v5';
const PUBLIC_ASSETS=['/offline.html','/platform.css','/platform.js','/journey.css','/journey.js','/games.css','/games.js','/game-engine.mjs','/workflow-code.js','/manifest.webmanifest','/assets/favicon.svg','/assets/app-icon-192.png','/assets/app-icon-512.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(PUBLIC_ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('voxel-public-shell-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==self.location.origin)return;
  // Private data and authenticated pages are always network-only.
  if(/^\/(api|mcp|chat|admin|red-room|vault|signin-with-chatgpt|signout-with-chatgpt|callback)(\/|$)/.test(url.pathname))return;
  if(request.mode==='navigate'){
    event.respondWith(fetch(request).catch(()=>caches.match('/offline.html')));return;
  }
  if(PUBLIC_ASSETS.includes(url.pathname))event.respondWith(fetch(request).then(response=>{if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(request,copy)));}return response;}).catch(()=>caches.match(request)));
});
