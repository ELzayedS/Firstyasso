const CACHE_NAME = 'yl-world-shell-v1';
const APP_SHELL = ['./', './index.html', './manifest.webmanifest', './icons/yl-icon.svg'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('yl-world-shell-') && key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then(response => {
      if (response && response.ok) { const copy = response.clone(); caches.open(CACHE_NAME).then(cache => cache.put('./index.html', copy)); }
      return response;
    }).catch(() => caches.match('./index.html').then(cached => cached || caches.match('./'))));
    return;
  }
  if (url.pathname.includes('/_vercel/')) return;
  event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => {
    if (response && response.ok && response.type === 'basic') { const copy = response.clone(); caches.open(CACHE_NAME).then(cache => cache.put(request, copy)); }
    return response;
  })));
});
self.addEventListener('notificationclick', event => {
  const section = event.notification && event.notification.data && event.notification.data.section;
  event.notification.close();
  const targetSections = ['today-us', 'our-story', 'games', 'letters', 'music', 'places'];
  const safeSection = targetSections.includes(section) ? section : null;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if ('focus' in client) {
        await client.focus();
        if (safeSection) client.postMessage({ type: 'YL_OPEN_SECTION', section: safeSection });
        return;
      }
    }
    const destination = safeSection
      ? new URL('./?openSection=' + encodeURIComponent(safeSection), self.registration.scope).href
      : self.registration.scope;
    await self.clients.openWindow(destination);
  })());
});
