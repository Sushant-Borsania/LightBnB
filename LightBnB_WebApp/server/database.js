const { Pool } = require("pg");
const pool = new Pool({
  user: "vagrant",
  password: "123",
  host: "localhost",
  database: "lightbnb"
});

const properties = require("./json/properties.json");
const users = require("./json/users.json");

/// Users

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithEmail = function(email) {
  return pool
    .query(
      `
SELECT id, name, email, password FROM users
WHERE email = $1;
`,
      [email]
    )
    .then(res => {
      if (res.rows) {
        return res.rows[0];
      }
      return null;
    });
};
exports.getUserWithEmail = getUserWithEmail;

/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithId = function(id) {
  return pool
    .query(
      `
SELECT id, name, email, password FROM users
WHERE id = $1;
`,
      [id]
    )
    .then(res => {
      if (res.rows) {
        return res.rows[0];
      }
      return null;
    });
};
exports.getUserWithId = getUserWithId;

/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */
const addUser = function(user) {
  const userInput = [...Object.values(user)];
  const addUserQuery = `
  INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING *;
  `;
  return pool
    .query(addUserQuery, userInput)
    .then(res => {
      console.log(res.rows);
      if (res.rows) {
        return res.rows;
      } else {
        return null;
      }
    })
    .catch(err => {
      console.log(err);
    });
};
exports.addUser = addUser;

/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
const getAllReservations = function(guest_id, limit = 10) {
  const query = `SELECT properties.*, reservations.*, avg(rating) as average_rating
  FROM reservations
  JOIN properties ON reservations.property_id = properties.id
  JOIN property_reviews ON properties.id = property_reviews.property_id 
  WHERE reservations.guest_id = $1
  AND reservations.end_date < now()::date
  GROUP BY properties.id, reservations.id
  ORDER BY reservations.start_date
  LIMIT 10;`;
  const id = [guest_id];
  return pool.query(query, id).then(res => {
    return res.rows;
  });
};
exports.getAllReservations = getAllReservations;

/// Properties

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */
const getAllProperties = function(options, limit = 20) {
  // 1
  const queryParams = [];
  // 2
  let queryString = `
    SELECT properties.*, avg(property_reviews.rating) as average_rating
    FROM properties
    JOIN property_reviews ON properties.id = property_id
    `;

  // 3
  if (options.city) {
    queryParams.push(`%${options.city.charAt(0).toUpperCase() + options.city.slice(1)}%`);
    queryString += `${queryParams.length === 1 ? "WHERE" : "AND"} city LIKE $${queryParams.length} `;
    console.log("first query string", queryString);
  }

  if (options.owner_id) {
    queryParams.push(`${options.owner_id}`);
    queryString += `${queryParams.length === 1 ? "WHERE" : "AND"} owner_id = $${queryParams.length} `;
  }

  if (options.minimum_price_per_night) {
    queryParams.push(parseInt(options.minimum_price_per_night) * 100);
    queryString += `${queryParams.length === 1 ? "WHERE" : "AND"} cost_per_night > $${queryParams.length}`;
  }

  if (options.maximum_price_per_night) {
    queryParams.push(parseInt(options.maximum_price_per_night) * 100);
    queryString += `${queryParams.length === 1 ? "WHERE" : "AND"} cost_per_night < $${queryParams.length}`;
  }

  // 4
  queryParams.push(limit);
  queryString += `
    GROUP BY properties.id
    `;

  if (options.minimum_rating) {
    queryParams.push(parseInt(options.minimum_rating));
    queryString += `HAVING avg(property_reviews.rating) >= $${queryParams.length} `;
    queryString += `
    ORDER BY cost_per_night
      LIMIT $${queryParams.length - 1};
      `;
  } else {
    //Resetting the limit variable
    queryString += `
    ORDER BY cost_per_night
     LIMIT $${queryParams.length};
     `;
  }
  
  // 5
  console.log(queryString, queryParams);

  // 6
  return pool.query(queryString, queryParams).then(res => res.rows);
};
exports.getAllProperties = getAllProperties;

/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = function(property) {
  const propertyId = Object.keys(properties).length + 1;
  property.id = propertyId;
  properties[propertyId] = property;
  return Promise.resolve(property);
};
exports.addProperty = addProperty;
