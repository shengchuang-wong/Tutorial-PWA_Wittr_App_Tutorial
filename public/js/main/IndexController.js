import PostsView from './views/Posts';
import ToastsView from './views/Toasts';
import idb from 'idb';
import { contentImgsCache } from '../sw/index'

// open database
const openDatabase = () => {
  if (!navigator.serviceWorker) return Promise.resolve()

  return idb.open('wittr', 1, upgradeDb => {
    // switch(upgradeDb.oldVersion) {
    // case 0:
    const witterStore = upgradeDb.createObjectStore('wittrs', {
      keyPath: 'id'
    })
    witterStore.createIndex('by-date', 'time')
    // }
  })
}

// initiaialize
export default function IndexController(container) {
  this._container = container;
  this._postsView = new PostsView(this._container);
  this._toastsView = new ToastsView(this._container);
  this._lostConnectionToast = null;
  this._dbPromise = openDatabase()
  this._registerServiceWorker();
  this._cleanImageCache()

  var indexController = this

  setInterval(function () {
    indexController._cleanImageCache()
  }, 1000 * 60 * 5)

  this._showCachedMessages().then(function () {
    indexController._openSocket();
  })
}

IndexController.prototype._registerServiceWorker = function () {

  if (!navigator.serviceWorker) return

  navigator.serviceWorker.register('/sw.js').then((reg) => {
    console.log('registered')

    if (!navigator.serviceWorker.controller) {
      console.log('none')
      return
    }

    // waiting for new update to be triggerred
    if (reg.waiting) {
      console.log('waiting')
      this._updateReady(reg.waiting)
      return
    }

    // when installing new version
    if (reg.installing) {
      console.log('installing')
      this._trackInstalling(reg.installing)
      return
    }

    // when there is a new update
    reg.addEventListener('updatefound', () => {
      console.log('updatefound')
      this._trackInstalling(reg.installing)
    })

  }).catch(() => {
    console.log('Registration failed!')
  })

  // when new updated is applied
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload()
  })
}

IndexController.prototype._trackInstalling = function (worker) {
  console.log('tracking')
  const indexController = this
  worker.addEventListener('statechange', function () {
    console.log('statechange')
    if (worker.state === 'installed') {
      console.log('statechange installed')
      indexController._updateReady(worker)
    }
  })
}

// when update ready, post message to service worker
IndexController.prototype._updateReady = function (worker) {
  const toast = this._toastsView.show('New version available', {
    buttons: ['refresh', 'dismiss']
  })

  toast.answer.then(answer => {
    if (answer != 'refresh') return
    worker.postMessage({ action: 'skipWaiting' })
  })
}

// open a connection to the server for live updates
IndexController.prototype._openSocket = function () {
  var indexController = this;
  var latestPostDate = this._postsView.getLatestPostDate();

  // create a url pointing to /updates with the ws protocol
  var socketUrl = new URL('/updates', window.location);
  socketUrl.protocol = 'ws';

  if (latestPostDate) {
    socketUrl.search = 'since=' + latestPostDate.valueOf();
  }

  // this is a little hack for the settings page's tests,
  // it isn't needed for Wittr
  socketUrl.search += '&' + location.search.slice(1);

  var ws = new WebSocket(socketUrl.href);

  // add listeners
  ws.addEventListener('open', function () {
    if (indexController._lostConnectionToast) {
      indexController._lostConnectionToast.hide();
    }
  });

  ws.addEventListener('message', function (event) {
    requestAnimationFrame(function () {
      indexController._onSocketMessage(event.data);
    });
  });

  ws.addEventListener('close', function () {
    // tell the user
    if (!indexController._lostConnectionToast) {
      indexController._lostConnectionToast = indexController._toastsView.show("Unable to connect. Retrying…");
    }

    // try and reconnect in 5 seconds
    setTimeout(function () {
      indexController._openSocket();
    }, 5000);
  });
};

// serve cahce data
IndexController.prototype._showCachedMessages = function () {
  var indexController = this

  return this._dbPromise.then(function (db) {
    if (!db || indexController._postsView.showingPosts()) return

    const index = db.transaction('wittrs').objectStore('wittrs').index('by-date')
    return index.getAll().then(function (messages) {
      indexController._postsView.addPosts(messages.reverse())
    })

  })
}

// clean cache image
IndexController.prototype._cleanImageCache = function () {
  return this._dbPromise.then(function (db) {
    if (!db) return

    const imagesNeeded = []

    const tx = db.transaction('wittrs')
    return tx.objectStore('wittrs').getAll().then(function (messages) {
      messages.forEach(function (message) {
        if (message.photo) {
          imagesNeeded.push(message.photo)
        } else if (message.avatar) {
          imagesNeeded.push(message.avatar)
        }
      })

      return caches.open(contentImgsCache)
    }).then(function (cache) {
      console.log('cache', JSON.stringify(cache))

      return cache.keys().then(function (requests) {
        console.log('requests', JSON.stringify(requests))

        requests.forEach(function (request) {
          const url = new URL(request.url)
          if (!imagesNeeded.includes(url.pathname)) {
            console.log('delete', request)
            cache.delete(request)
          } else {
            console.log(request.url, 'good')
          }
        })

      })
    })

  })
}

// called when the web socket sends message data
IndexController.prototype._onSocketMessage = function (data) {
  var messages = JSON.parse(data);
  console.log('messages', messages)

  this._dbPromise.then(db => {
    if (!db) return

    const tx = db.transaction('wittrs', 'readwrite')
    const store = tx.objectStore('wittrs')
    messages.forEach(message => {
      store.put(message)
    })

    store.index('by-date').openCursor(null, 'prev').then(function (cursor) {
      return cursor.advance(30)
    }).then(function deleteRest(cursor) {
      if (!cursor) return
      cursor.delete()
      return cursor.continue().then(deleteRest)
    })

  })

  this._postsView.addPosts(messages);
};