const files = [
  'css/styles.css',
  'js/dbhelper.js',
  'js/main.js',
  'js/restaurant_info.js',
  'img/1.jpeg',
  'img/2.jpeg',
  'img/3.jpeg',
  'img/4.jpeg',
  'img/5.jpeg',
  'img/6.jpeg',
  'img/7.jpeg',
  'img/8.jpeg',
  'img/9.jpeg',
  'img/10.jpeg',
  'index.html',
  'restaurant.html'
];

const cacheName = 'mws-restaurant-v1.2';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(cacheName)
      .then((cache) => {
        return cache.addAll(files);
      })
  );
});

self.addEventListener('sync', function(event) {
console.log('[[ SYNC ]] :: firing');
if (event.tag == 'review-fetch') {
  console.log('[[ SYNC ]] :: fired');
  event.waitUntil(fetchReviews());
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
            let tx = db.transaction('offline_reviews', 'readwrite');
            const objectStore = tx.objectStore('offline_reviews');
            objectStore.delete(item.id);
            resolve(response);
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
