self.addEventListener('install', event => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
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
