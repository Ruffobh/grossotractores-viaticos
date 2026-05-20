self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', () => {
  // Give the SW immediate control
})

self.addEventListener('fetch', (event) => {
  // A fetch handler is required by Chrome to trigger the PWA 'beforeinstallprompt'
  // Using event.respondWith guarantees that Chrome validates this as a working PWA service worker
  event.respondWith(fetch(event.request))
})
