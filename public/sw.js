// Service Worker mínimo para instalabilidade PWA (Godoy Prime Indica)
const CACHE_NAME = 'godoy-prime-indica-v1'

self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', (event) => {
  // Pass-through fetch for full client-server sync with PocketBase
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request)
    }),
  )
})
