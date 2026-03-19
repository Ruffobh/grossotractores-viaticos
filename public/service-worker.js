self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', () => {
  // Give the SW immediate control
})

self.addEventListener('fetch', (event) => {
  // A fetch handler is required by Chrome to trigger the PWA 'beforeinstallprompt'
  // But we let the browser handle all network requests natively.
  return
})
