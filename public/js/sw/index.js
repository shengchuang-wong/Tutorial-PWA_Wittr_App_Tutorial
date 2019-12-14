// intercept all network requests
// self.addEventListener('fetch', (event) => {
//   event.respondWith(
//     new Response('Hello <b>world</b>', {
//       headers: {
//         'foo': 'bar',
//         'Content-Type': 'text/html'
//       }
//     })
//   )
// })

// intercept all .jpg request and return custom .gif image
// self.addEventListener('fetch', (event) => {
//   const url = event.request.url
//   if(url.endsWith('.jpg')) {
//     event.respondWith(
//       fetch('https://media2.giphy.com/media/o3Vt7LBQZa8pi/giphy.gif')
//     )
//   }
// })

// custom interceptor
// self.addEventListener('fetch', (event) => {
//   event.respondWith(
//     fetch(event.request).then((response) => {
//       if(response.status === 404) {
//         return fetch('/imgs/dr-evil.gif')
//       }
//       return response
//     }).catch(error => {
//       return new Response('Opps, something went wrong.')
//     })
//   )ic
// })

// cache name
const staticCacheName = 'wittr-static-v15'
export const contentImgsCache = 'wittr-content-imgs'
const allCaches = [
  staticCacheName,
  contentImgsCache
]

// on service worker install, version based
self.addEventListener('install', (event) => {

  event.waitUntil(
    caches.open(staticCacheName).then((cache) => {
      return cache.addAll([
        '/skeleton',
        'js/main.js',
        'css/main.css',
        'imgs/icon.png',
        'https://fonts.gstatic.com/s/roboto/v15/2UX7WLTfW3W8TclTUvlFyQ.woff',
        'https://fonts.gstatic.com/s/roboto/v15/d-6IYplOFocCacKzxwXSOD8E0i7KZn-EPnyo3HZu7kw.woff'
      ]);
    })
  )
})

// when service worker is activated
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(cacheName => {
          
          return cacheName.startsWith('wittr-') && !allCaches.includes(cacheName)
        }).map(cacheName => {
          console.log({
            cacheName
          })
          return caches.delete(cacheName)
        })
      )

    })
  )
})

// when fetch network happen
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url)

  // serve cache data
  if(requestUrl.origin === location.origin) {
    if(requestUrl.pathname === '/') {
      event.respondWith(caches.match('/skeleton'))
      return
    }
    console.log(requestUrl.pathname)
    if(requestUrl.pathname.startsWith('/photos/')) {
      event.respondWith(servePhoto(event.request))
      return
    }
    if(requestUrl.pathname.startsWith('/avatars/')) {
      event.respondWith(serveAvatar(event.request))
      return
    }
  }

  event.respondWith(
    caches.match(event.request).then(response => {
      if (response) return response
      return fetch(event.request)
    })
  )
})

const serveAvatar = request => {
  const storageUrl = request.url.replace(/-\dx\.jpg$/, '')

  return caches.open(contentImgsCache).then(cache => {
    return cache.match(storageUrl).then(response => {
      if (response) return response

      return fetch(request).then(networkResponse => {
        cache.put(storageUrl, networkResponse.clone())
        return networkResponse
      })
    })
  })
}

const servePhoto = (request) => {
  const storageUrl = request.url.replace(/-\d+px\.jpg$/, '')

  return caches.open(contentImgsCache).then(cache => {
    return cache.match(storageUrl).then(response => {
      if (response) return response

      return fetch(request).then(networkResponse => {
        cache.put(storageUrl, networkResponse.clone())
        return networkResponse
      })
    })
  })
}

// when there is a message to service worker
self.addEventListener('message', (event) => {
  if(event.data.action === 'skipWaiting') {
    self.skipWaiting()
  }
})