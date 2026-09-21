// 家計簿アプリ（kakeibo-1-3.html）用 Service Worker
// キャッシュを更新したいときは CACHE の値（例: kakeibo-v4）を上げてください
const CACHE = 'kakeibo-v3';
const ASSETS = ['./kakeibo-1-3.html', './manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.allSettled(ASSETS.map(a => c.add(a).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // GET以外・chrome拡張は対象外
  if (e.request.method !== 'GET' || url.protocol === 'chrome-extension:') return;

  // Googleフォント：ネットワーク優先、失敗時はキャッシュ
  if (url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com')) {
    e.respondWith(
      fetch(e.request)
        .then(res => { caches.open(CACHE).then(c => c.put(e.request, res.clone())); return res; })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // アプリ本体：キャッシュ優先、なければネットワーク取得してキャッシュに保存
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res && res.status === 200) {
          caches.open(CACHE).then(c => c.put(e.request, res.clone()));
        }
        return res;
      }).catch(() => cached);
    })
  );
});
