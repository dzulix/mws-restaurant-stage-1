(() => {
  'use strict';

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

  const cacheName = 'mws-restaurant-v1.1';

  self.addEventListener('install', (event) => {
    event.waitUntil(
      caches.open(cacheName)
        .then((cache) => {
          return cache.addAll(files);
        })
    );
  });

  self.addEventListener('activate', () => {
  });

  self.addEventListener('fetch', (event) => {
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request);
      })
    );
  });

})();