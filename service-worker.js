(() => {
  'use strict';

  const files = [
    '.',
    '/',
    'css/styles.css',
    'js/dbhelper.js',
    'js/main.js',
    'js/restaurant_info.js',
    'img/1.jpg',
    'img/2.jpg',
    'img/3.jpg',
    'img/4.jpg',
    'img/5.jpg',
    'img/6.jpg',
    'img/7.jpg',
    'img/8.jpg',
    'img/9.jpg',
    'img/10.jpg',
    'data/restaurants.json',
    'index.html',
    'restaurant.html'
  ];

  const cacheName = 'mws-restaurant-v1.1';

  self.addEventListener('install', (event) => {
    console.log('Service worker installing...');
    event.waitUntil(
      caches.open(cacheName)
        .then((cache) => {
          return cache.addAll(files);
        })
    );
  });

  self.addEventListener('activate', () => {
    console.log('Service worker activating...');
  });

  self.addEventListener('fetch', (event) => {
    console.log('Service worker is fetching: ', event.request.url);
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request);
      })
    );
  });

})();