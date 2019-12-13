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
//   )
// })