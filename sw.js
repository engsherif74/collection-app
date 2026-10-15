const CACHE='collect-v9';
const SHELL=['./','index.html','manifest.json','css/base.css','css/components.css','css/collector.css','js/core/config.js','js/core/compress.js','js/core/crypto.js','js/core/db.js','js/core/normalize.js','js/core/utils.js','js/collector/app.js','js/collector/unlock.js','js/collector/fileLoader.js','js/collector/browse.js','js/collector/payment.js','js/collector/ledger.js','js/collector/lock.js','pages/print.html','pages/receipt.html','js/collector/dialogs.js','pages/reading.html','js/collector/search.js','js/collector/personal.js','js/collector/export.js','js/collector/reconcile.js','js/collector/updateCheck.js','js/collector/buttons.js','js/collector/details.js','js/collector/names.js','icons/icon-192.png','icons/icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(n=>n!==CACHE).map(n=>caches.delete(n)))));self.clients.claim();});
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  if(e.request.method!=='GET'||u.origin!==location.origin)return;
  if(u.pathname.includes('/data/')||u.pathname.endsWith('version.json')){e.respondWith(fetch(e.request,{cache:'no-store'}));return;}
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(n=>{const c=n.clone();caches.open(CACHE).then(x=>x.put(e.request,c));return n;}).catch(()=>caches.match('index.html'))));
});
