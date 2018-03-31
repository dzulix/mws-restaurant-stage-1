const files = [
  '/',
  'js/dbhelper.js',
  'js/main.js',
  'js/restaurant_info.js',
  'dist/img/1.jpeg',
  'dist/img/1-small.jpeg',
  'dist/img/2.jpeg',
  'dist/img/2-small.jpeg',
  'dist/img/3.jpeg',
  'dist/img/3-small.jpeg',
  'dist/img/4.jpeg',
  'dist/img/4-small.jpeg',
  'dist/img/5.jpeg',
  'dist/img/5-small.jpeg',
  'dist/img/6.jpeg',
  'dist/img/6-small.jpeg',
  'dist/img/7.jpeg',
  'dist/img/7-small.jpeg',
  'dist/img/8.jpeg',
  'dist/img/8-small.jpeg',
  'dist/img/9.jpeg',
  'dist/img/9-small.jpeg',
  'dist/img/10.jpeg',
  'dist/img/10-small.jpeg',
  'index.html',
  'restaurant.html'
];

const cacheName = 'mws-restaurant-v1.6';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(cacheName)
      .then((cache) => {
        return cache.addAll(files);
      })
  );
});

self.addEventListener('activate', function(event) {
  console.log('Activating new service worker...');

  var cacheWhitelist = [cacheName];

  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', function(event) {
  console.log(event.request.url);
  event.respondWith(
    caches.match(event.request).then(function(response) {
      if (response) {
        console.log('Found ', event.request.url);
        return response;
      }
      console.log('network request ', event.request.url)
      return fetch(event.request);
    })
    .catch(error => {
      console.log(error);
    })
  );
});

self.addEventListener('sync', function(event) {
  console.log('[[ SYNC ]] :: firing');
  if (event.tag == 'offline-reviews-fetch') {
    console.log('[[ SYNC ]] :: fired');
    event.waitUntil(fetchReviews());
  }
  if (event.tag == 'favorite-fetch') {
    console.log('[[ SYNC ]] :: fired');
    event.waitUntil(fetchFavorite());
  }
  if (event.tag == 'restaurants-fetch') {
    console.log('[[ SYNC ]] :: fired');
    event.waitUntil(fetchData('restaurants', 'http://localhost:1337/restaurants'));
  }
  if (event.tag == 'reviews-fetch') {
    console.log('[[ SYNC ]] :: fired');
    event.waitUntil(fetchData('reviews', 'http://localhost:1337/reviews'));
  }
});

fetchData = (objectStoreName, url) => {
  return new Promise((resolve, reject) => {
    let db;
    let request = indexedDB.open("restaurants");
    request.onerror = event => {
      console.log('Could not open IndexedDB');
    };

    request.onsuccess = event => {
      db = event.target.result;
      let transaction = db.transaction([`${objectStoreName}`]);
      let objectStore = transaction.objectStore(`${objectStoreName}`);
      fetch(`${url}`, {
        method: 'GET',
      })
      .then(response => {
        response.json()
        .then(items => {
          let tx = db.transaction(`${objectStoreName}`, 'readwrite');
          const objectStore = tx.objectStore(`${objectStoreName}`);
          items.forEach(item => {
            objectStore.put(item);
          });
          resolve();
        })
      })
      .catch(error => {
        reject(error);
      })
    }
  });
}

fetchReviews = () => {
  console.log('[[ SYNC ]] :: firing fetchReviews()');
  return new Promise((resolve, reject) => {
    let db;
    let request = indexedDB.open("restaurants");
    request.onerror = event => {
      console.log('Could not open IndexedDB');
    };
    request.onsuccess = event => {
      db = event.target.result;
      let transaction = db.transaction('reviews');
      let objectStore = transaction.objectStore('reviews');
      let request = objectStore.index('offline').getAll(1);
      request.onerror = event => {
        console.log('Object store getAll() error.');
      };
      request.onsuccess = event => {
        request.result.forEach(review => { // fetch reviews
          delete review.offline;
          fetch('http://localhost:1337/reviews/', {
            method: 'POST',
            body: JSON.stringify(review),
          })
          .then(response => {
            if (response.ok) {
              console.log(response)
              self.response = response;
              response.json()
              .then(review => {
                let tx = db.transaction('reviews', 'readwrite'); 
                let objectStore = tx.objectStore('reviews'); 
                objectStore.put(review);
                resolve();
              })
            }
          })
          .catch(error => {
            console.log(error);
            reject(error)
          });
        })
      };
    };
  })
}

fetchFavorite = () => {
  console.log('[[ SYNC ]] :: firing fetchFavorite()');
  return new Promise((resolve, reject) => {
    let db;
    let request = indexedDB.open("restaurants");
    request.onerror = event => {
      console.log('Could not open IndexedDB');
    };
    request.onsuccess = event => {
      db = event.target.result;
      let transaction = db.transaction('restaurants');
      let objectStore = transaction.objectStore('restaurants');
      let request = objectStore.index('offline').getAll(1);
      request.onerror = event => {
        console.log('Object store getAll() error.');
      };
      request.onsuccess = event => {
        request.result.forEach(restaurant => { // fetch favorite
          delete restaurant.offline;
          fetch(`http://localhost:1337/restaurants/${restaurant.id}/?is_favorite=${restaurant.is_favorite}`, {
            method: 'PUT',
            body: JSON.stringify(restaurant),
          })
          .then(response => {
            if (response.ok) {
              let tx = db.transaction('restaurants', 'readwrite');
              const objectStore = tx.objectStore('restaurants');
              objectStore.put(restaurant);
              resolve();
            }
          })
          .catch(error => {
            console.log(error);
            reject(error)
          });
        })
      };
    };
  })
}
