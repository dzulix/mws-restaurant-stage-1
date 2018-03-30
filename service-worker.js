const files = [
  '/',
/*  'dist/css/styles.css',
  'dist/css/reviews.min.css',
  'dist/css/restaurant.min.css',*/
  'dist/js/dbhelper.min.js',
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

const cacheName = 'mws-restaurant-v1.3';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(cacheName)
      .then((cache) => {
        return cache.addAll(files);
      })
  );
});


self.addEventListener('fetch', function(event) {
  console.log(event.request.url);
  event.respondWith(
    caches.match(event.request).then(function(response) {
    return response || fetch(event.request);
    })
  );
});

self.addEventListener('sync', function(event) {
console.log('[[ SYNC ]] :: firing');
if (event.tag == 'reviews-fetch') {
  console.log('[[ SYNC ]] :: fired');
  event.waitUntil(fetchReviews());
}
if (event.tag == 'favorite-fetch') {
  console.log('[[ SYNC ]] :: fired');
  event.waitUntil(fetchFavorite());
}
});

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
      let transaction = db.transaction(["offline_reviews"]);
      let objectStore = transaction.objectStore("offline_reviews");
      let request = objectStore.getAll();
      request.onerror = event => {
        console.log('Object store getAll() error.');
      };
      request.onsuccess = event => {
        request.result.forEach(review => { // fetch reviews
          fetch('http://localhost:1337/reviews/', {
            method: 'POST',
            body: JSON.stringify(review),
          })
          .then(response => {
            console.log(response)
            self.response = response;
            response.json()
            .then(review => {
              let tx = db.transaction('offline_reviews', 'readwrite');
              const objectStore = tx.objectStore('offline_reviews');
              objectStore.delete(review.id);
              resolve();
            })
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
      let transaction = db.transaction(["offline_favorite"]);
      let objectStore = transaction.objectStore("offline_favorite");
      let request = objectStore.getAll();
      request.onerror = event => {
        console.log('Object store getAll() error.');
      };
      request.onsuccess = event => {
        request.result.forEach(favorite => { // fetch reviews
          fetch(`http://localhost:1337/restaurants/${favorite.id}/?is_favorite=${favorite.isFavorite}`, {
            method: 'PUT',
            body: JSON.stringify(favorite),
          })
          .then(response => {
            if (response.ok) {
              let tx = db.transaction('offline_favorite', 'readwrite');
              const objectStore = tx.objectStore('offline_favorite');
              objectStore.delete(favorite.id);
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
