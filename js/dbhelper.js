    let data;
    let reviews;


/**
 * Common database helper functions.
 */
class DBHelper {

  /**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */
  static get DATABASE_URL() {
    const port = 1337; // Change this to your server port
    return `http://localhost:${port}/restaurants`;
  }

  static fetchReviews(id = '') {
    return new Promise((resolve, reject) => {
      const dbPromise = DBHelper.initializeDB();
      dbPromise.then(db => {
        let tx = db.transaction(db.objectStoreNames, 'readonly');
        const key = id !== '' && id > 0 ? parseInt(id) : '';
        tx.objectStore('reviews').index('restaurant_id').getAll(key)
        .then(reviews => {
          if (reviews.length === 0) {
            fetch(`http://localhost:1337/reviews/${id !== '' && id > 0 ? `?restaurant_id=${id}` : ''}`)
            .then(response => {
              if (response.ok) {
                response.json()
                .then(reviews => {
                  dbPromise.then(db => { 
                    let tx = db.transaction('reviews', 'readwrite'); 
                    let objectStore = tx.objectStore('reviews'); 
                    reviews.forEach(review => { 
                      objectStore.put(review); 
                    });
                    resolve(reviews);
                  });
                })
              }
            })
            .catch(error => {
              console.log(error)
            });
          }
          resolve(reviews);
        })
      })
    });
  }

  /**
   * Fetch all restaurants.
   */
  static fetchRestaurants() {
    return new Promise((resolve, reject) => {
     const dbPromise = DBHelper.initializeDB();
      dbPromise.then(db => {
        let tx = db.transaction(db.objectStoreNames, 'readonly');
        tx.objectStore('restaurants').getAll()
        .then(data => {
          if (data.length === 0) {
            fetch(DBHelper.DATABASE_URL)
            .then(response => response.json())
            .then(restaurants => {
              dbPromise.then((db) => { 
                let tx = db.transaction('restaurants', 'readwrite'); 
                let objectStore = tx.objectStore('restaurants'); 
                restaurants.forEach(restaurant => { 
                  objectStore.put(restaurant); 
                });
                resolve(restaurants);
              });
            });
          } else {
            resolve(data);
          };
        })     
      });
    });
  }

  static initializeDB() {
    var dbPromise = idb.open('restaurants', 1, function(upgradeDb){ 
      if (!upgradeDb.objectStoreNames.contains('restaurants')) { 
        const restaurantsObject = upgradeDb.createObjectStore('restaurants', {keyPath: 'id'}); 
        restaurantsObject.createIndex('offline', 'offline', { unique: false }); 
        const reviewsObject = upgradeDb.createObjectStore('reviews', {keyPath: 'id'}); 
        reviewsObject.createIndex('restaurant_id', 'restaurant_id', { unique: false })
        reviewsObject.createIndex('offline', 'offline', { unique: false })
      } 
    });
    return dbPromise;
  }

  static setFavorite(id, isFavorite) {
    if (navigator.onLine) {
      fetch(`${DBHelper.DATABASE_URL}/${id}/?is_favorite=${isFavorite}`, {
        method: 'PUT',
      }).then(response => {
        if (response.ok) {
          response.json()
          .then(restaurant => {
            DBHelper.initializeDB()
            .then(db => {
              let tx = db.transaction('restaurants', 'readwrite');
              const objectStore = tx.objectStore('restaurants');
              objectStore.put(restaurant);
            })
          })
        }
      });
    } else {
      DBHelper.initializeDB()
      .then(db => {
        let tx = db.transaction('restaurants', 'readwrite'); 
        let objectStore = tx.objectStore('restaurants'); 
        objectStore.openCursor(id)
        .then(cursor => {
          let restaurant = cursor._cursor.value;
          restaurant.is_favorite = isFavorite;
          restaurant.offline = 1;
          if (cursor === undefined) {
            objectStore.add(restaurant);
          } else {
            cursor.update(restaurant)
          }
        })
      });
    }
  }

  static addReview(restaurant_id, name, rating, comments) {
    return new Promise((resolve, reject) => {
      const review = {
        restaurant_id,
        name,
        rating,
        comments
      }
      if (navigator.onLine) {
        fetch('http://localhost:1337/reviews/', {
          method: 'POST',
          body: JSON.stringify(review),
        }).then(response => {
          if (response.ok) {
            response.json()
            .then(review => {
              DBHelper.initializeDB()
              .then(db => {
                let tx = db.transaction('reviews', 'readwrite');
                const objectStore = tx.objectStore('reviews');
                objectStore.put(review);
                resolve(review);
              })
            })
          }
        })
        .catch(error => {
          DBHelper.addReviewToIndexedDb(review)
          .then((review) => resolve(review));
        });
      } else {
        DBHelper.addReviewToIndexedDb(review)
        .then((review) => resolve(review));
      }
    });
  }

  static fetchReview(review) {
    return new Promise(resolve => {
      fetch('http://localhost:1337/reviews/', {
        method: 'POST',
        body: JSON.stringify(review),
      })
      .then(response => resolve(response))
    })
  }

  static addReviewToIndexedDb(review) {
    return new Promise(resolve => {
      review.offline = 1;
      review.id = Date.now();
      DBHelper.initializeDB()
      .then(db => {
        let tx = db.transaction('reviews', 'readwrite'); 
        let objectStore = tx.objectStore('reviews'); 
        objectStore.add(review);
      });
      resolve(review);
    })
  }

  /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id) {
    // fetch all restaurants with proper error handling.
    return new Promise((resolve,reject) => {
      DBHelper.fetchRestaurants()
      .then((restaurants) => {
          const restaurant = restaurants.find(r => r.id == id);
          if (restaurant) { // Got the restaurant
            DBHelper.fetchReviews(id)
            .then(reviews => {
              self.reviews = reviews;
              resolve(restaurant);
            })
            .catch(error => {
              self.reviews = [];
            });
          } else { // Restaurant does not exist in the database
            reject('Restaurant does not exist');
          }
      })
      .catch(error => {
        console.log(error);      
      });
    });
  }

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  static fetchRestaurantByCuisine(cuisine, callback) {
    // Fetch all restaurants  with proper error handling
    return new Promise((resolve, reject) => {
      DBHelper.fetchRestaurants()
      .then(restaurants => {
        // Filter restaurants to have only given cuisine type
        const results = restaurants.filter(r => r.cuisine_type == cuisine);
        resolve(results);
      })
      .catch(error => {
        console.log(error);
      });
    })
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  static fetchRestaurantByNeighborhood(neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants()
    .then(restaurants => {
      // Filter restaurants to have only given neighborhood
      const results = restaurants.filter(r => r.neighborhood == neighborhood);
      return results;
    })
    .catch(error => {
      console.log(error);
    });
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants()
    .then(restaurants => {
      let results = restaurants;
      if (cuisine != 'all') { // filter by cuisine
        results = results.filter(r => r.cuisine_type == cuisine);
      }
      if (neighborhood != 'all') { // filter by neighborhood
        results = results.filter(r => r.neighborhood == neighborhood);
      }
      callback(null, results);
    })
    .catch(error => {
      console.log(error);
    });
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants()
    .then(restaurants => {
        // Get all neighborhoods from all restaurants
        const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood)
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i)
        callback(null, uniqueNeighborhoods);
    })
    .catch(error => {
      console.log(error);
    });
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants()
    .then(restaurants => {
      // Get all cuisines from all restaurants
      const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type)
      // Remove duplicates from cuisines
      const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i)
      callback(null, uniqueCuisines);

    })
    .catch(error => {
      console.log(error);
    });
  }

  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return (`./restaurant.html?id=${restaurant.id}`);
  }

  /**
   * Restaurant image URL.
   */
  static imageUrlForRestaurant(restaurant, small = '') {
    return restaurant.photograph ? `dist/img/${restaurant.photograph}${small}.jpeg` : `dist/img/${restaurant.id}${small}.jpeg`;
  }

  /**
   * Map marker for a restaurant.
   */
  static mapMarkerForRestaurant(restaurant, map) {
    const marker = new google.maps.Marker({
      position: restaurant.latlng,
      title: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant),
      map: map,
      animation: google.maps.Animation.DROP}
    );
    return marker;
  }

};

