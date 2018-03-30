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

  static fetchReviews(id) {
    return new Promise((resolve, reject) => {
      let reviews = DBHelper.reviews;
      if (reviews === undefined) {
        fetch(`http://localhost:1337/reviews/?restaurant_id=${id}`)
        .then(response => response.json())
        .then(data => resolve(data));
      }
    });
  }

  /**
   * Fetch all restaurants.
   */
  static fetchRestaurants() {
    return new Promise((resolve, reject) => {
      let restaurants = DBHelper.data;
      if (restaurants === undefined) {
        fetch(DBHelper.DATABASE_URL)
        .then(response => response.json())
        .then(data => {
          restaurants = data;
          resolve(restaurants);
        })
        .catch(error => { 
          console.log(`Request failed. Error: ${error}`);
          reject(error);
        });
      } else {
        resolve(restaurants);
      }       
    });
  }

  static initializeDB() {
    var dbPromise = idb.open('restaurants', 1, function(upgradeDb){ 
      if (!upgradeDb.objectStoreNames.contains('restaurants')) { 
        upgradeDb.createObjectStore('restaurants', {keyPath: 'id'}); 
        upgradeDb.createObjectStore('reviews', {keyPath: 'id'}); 
        upgradeDb.createObjectStore('offline_reviews', {keyPath: 'id'}); 
        upgradeDb.createObjectStore('offline_favorite', {keyPath: 'id'}); 
      } 
    });
    return dbPromise;
  }

  static setFavorite(id, isFavorite) {
    if (navigator.onLine) {
      fetch(`${DBHelper.DATABASE_URL}/${id}/?is_favorite=${isFavorite}`, {
        method: 'PUT',
      }).then(() => {
        fetch(`${DBHelper.DATABASE_URL}/${id}/`);
      });
    } else {
      const fav = {
        id: id,
        is_favorite: isFavorite,
      }
      DBHelper.initializeDB()
      .then(db => {
        let tx = db.transaction('offline_favorite', 'readwrite'); 
        let objectStore = tx.objectStore('offline_favorite'); 
          objectStore.openCursor(fav.id)
          .then(cursor => {
            if (cursor === undefined) {
              objectStore.add(fav);
            } else {
              cursor.update(fav)
            }
          })
     
      });
    }

    DBHelper.initializeDB()
    .then(db => {
      let tx = db.transaction('restaurants', 'readwrite'); 
      let objectStore = tx.objectStore('restaurants'); 
      return objectStore.openCursor(id);
    }).then(cursor => {
      cursor.update(self.restaurant);
      window.cursor = cursor;
    });
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
        DBHelper.fetchReview(review)
        .then(response => {
          response.json()
          .then(data => {
            DBHelper.putReviewToIndexedDb(data);
            resolve(data);
          })
        })
        .catch(error => {
          console.log(error)
          reject(error);
        });
      } else {
        DBHelper.addReviewToIndexedDb(review);
      }
    })
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

  static putReviewToIndexedDb(review) {
    review.type = 'review';
    console.log(review)
    DBHelper.initializeDB()
    .then(db => {
      let tx = db.transaction('reviews', 'readwrite'); 
      let objectStore = tx.objectStore('reviews'); 
      objectStore.put(review);
    });
  }

  static addReviewToIndexedDb(review) {
    review.type = 'review';
    review.id = Date.now();
    DBHelper.initializeDB()
    .then(db => {
      let tx = db.transaction('offline_reviews', 'readwrite'); 
      let objectStore = tx.objectStore('offline_reviews'); 
      objectStore.add(review);
    });
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
              restaurant.reviews = reviews;
              resolve(restaurant);
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

