let restaurant;
var map;

/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
  fetchRestaurantFromURL()
  .then((restaurant, error) => {
    self.map = new google.maps.Map(document.getElementById('map'), {
      zoom: 16,
      center: restaurant.latlng,
      scrollwheel: false
    });
    fillBreadcrumb();
    DBHelper.mapMarkerForRestaurant(self.restaurant, self.map);
  })
  .catch(error => {
    console.log(error);
  });
}

/**
 * Get current restaurant from page URL.
 */
fetchRestaurantFromURL = (callback) => {
  return new Promise((resolve, reject) => {
    if (self.restaurant) { // restaurant already fetched!
      resolve(self.restaurant)
    }
    const id = getParameterByName('id');
    if (!id) { // no id found in URL
      error = 'No restaurant id in URL'
      reject(error);
    } else {
      return DBHelper.fetchRestaurantById(id)
      .then((restaurant, error) => {
        self.restaurant = restaurant;
        if (!restaurant) {
          reject(error)
        }
        fillRestaurantHTML();
        resolve(restaurant)
      });
    }
  });
}

/**
 * Create restaurant HTML and add it to the webpage
 */
fillRestaurantHTML = (restaurant = self.restaurant) => {
  const icon = document.getElementById('favorite');

  icon.addEventListener('click', (e) => {
    const favorite = self.restaurant.is_favorite === true ? false : true;
    self.restaurant.is_favorite = favorite;
    DBHelper.setFavorite(restaurant.id, favorite);
    setFavorite(e.path[0], favorite);
  });
  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;
  name.appendChild(icon);
  setFavorite(icon, restaurant.is_favorite === 'true' ? true : false);


  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;

  const image = document.getElementById('restaurant-img');
  image.className = 'restaurant-img';
  image.alt = `Restaurant ${restaurant.name} (thumbnail)`;
  image.src = DBHelper.imageUrlForRestaurant(restaurant);

  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }
  // fill reviews
  fillReviewsHTML();
}

setFavorite = (icon, isFavorite) => {
  if (isFavorite) {
    icon.innerHTML = 'favorite';
  } else {
    icon.innerHTML = 'favorite_border';
  }
}

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
  const hours = document.getElementById('restaurant-hours');
  for (let key in operatingHours) {
    const row = document.createElement('tr');

    const day = document.createElement('td');
    day.innerHTML = key;
    row.appendChild(day);

    const time = document.createElement('td');
    time.innerHTML = operatingHours[key];
    row.appendChild(time);

    hours.appendChild(row);
  }
}

addReview = () => {
  const name = document.getElementById('name').value;
  const rating = document.getElementById('rating').value;
  const comment = document.getElementById('comment').value;
  const idRestaurant = self.restaurant.id;

  DBHelper.addReview(idRestaurant, name, rating, comment)
  .then(review => {
    const ul = document.getElementById('reviews-list');
    ul.appendChild(createReviewHTML(review));
  })
}

/**
 * Create all reviews HTML and add them to the webpage.
 */
fillReviewsHTML = (reviews = self.restaurant.reviews) => {
  const container = document.getElementById('reviews-container');
  const button = document.getElementById('add-review-button');
  const rating = document.getElementById('rating');
  for (let i = 1; i <= 5; i++) {
    const option = document.createElement('option');
    option.value = i;
    option.innerHTML = i;
    rating.appendChild(option);
  }

  if (!reviews) {
    const noReviews = document.createElement('p');
    noReviews.innerHTML = 'No reviews yet!';
    container.appendChild(noReviews);
    return;
  }
  const ul = document.getElementById('reviews-list');
  reviews.forEach(review => {
    ul.appendChild(createReviewHTML(review));
  });
  container.appendChild(ul);
}

/**
 * Create review HTML and add it to the webpage.
 */
createReviewHTML = (review) => {
  const top = document.createElement('div');
  top.setAttribute('class', 'top');
  const li = document.createElement('li');
  const name = document.createElement('p');
  name.innerHTML = review.name;

  const date = document.createElement('p');
  date.setAttribute('class', 'date');
  const newDate = new Date(review.updatedAt) 
  date.innerHTML = `${newDate.getDay()}/${newDate.getMonth()}/${newDate.getFullYear()}`;

  top.appendChild(name);
  top.appendChild(date);
  li.appendChild(top);

  const rating = document.createElement('p');
  rating.setAttribute('class', 'rating');
  rating.innerHTML = `Rating: ${review.rating}`;
  li.appendChild(rating);

  const comments = document.createElement('p');
  comments.setAttribute('class', 'comments');
  comments.innerHTML = review.comments;
  li.appendChild(comments);

  return li;
}

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
fillBreadcrumb = (restaurant=self.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');
  const li = document.createElement('li');
  li.innerHTML = restaurant.name;
  breadcrumb.appendChild(li);
}

/**
 * Get a parameter by name from page URL.
 */
getParameterByName = (name, url) => {
  if (!url)
    url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results)
    return null;
  if (!results[2])
    return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}
