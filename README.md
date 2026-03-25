# Scriptorium Backend API

This backend provides a RESTful API for user authentication, email verification, password management, book management, music management, and reflections (user notes and moods on media items).

Base URL: https://scriptorium-backend-six.vercel.app/

---

## Table of Contents

1. Health Check

2. User Authentication

- Register
- Verify Email
- Login
- Forgot Password
- Reset Password

3. Book Management

- Search Google Books
- Save a Book
- Get a Book
- Add Book to User Shelf
- Remove Book from User Shelf
- Get User Shelf
- Get All User Shelves

4. Music Management

- Search Music
- Get Track
- Add Track to Shelf
- Remove Track from Shelf
- Get User Shelf
- Get All User Shelves

5. Reflections

- Add Reflection
- Get User Reflections
- Get Reflections by Item
- Get Specific Reflection
- Update Reflection
- Remove Reflection

---

### Notes

1. **JWT Token Usage:** All routes that modify or read user-specific data require a valid JWT token in the `Authorization` header:
   **Headers:** Authorization: jwt &lt;JWT_TOKEN&gt;
   **Request Body:**

```json
{ "bookId": "bookId", "shelf": "favorites" }
```

**Response (Success):**

```json
{
  "message": "Book removed from shelf successfully",
  "shelf": "favorites",
  "bookId": "bookId"
}
```

2. **Shelf Names:** Currently supported shelves: `"favorites"` and `"wishlist"`.
3. **Google Books Search:** This does not require authentication.
4. **Progress Tracking:** Reflections can optionally include progress (current, total, unit) for the media item.
5. **Mood/Feelings:** Reflections can include arrays of strings (moodTags, feelings) and optional metadata.

## Health Check `GET /`

Returns the health status of the API: { "status": "UsersAPI OK" }

---

## User Authentication

### Register `POST /api/user/register`

**Request Body:**

```json
{
  "userName": "johnDoe",
  "email": "john@example.com",
  "password": "password123",
  "password2": "password123"
}
```

**Response:**

```json
{ "message": "Verification email sent!" }
```

> Note: A verification email will be sent to the user. User must verify email before logging in.

---

### Verify Email `GET /api/user/verify?token=<verificationToken>`

**Response:**

```json
{
  "message": "Email successfully verified!",
  "user": "johnDoe"
}
```

### Login `POST /api/user/login`

**Request Body:**

```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**

```json
{
  "message": "login successful",
  "token": "<JWT_TOKEN>"
}
```

**Usage Notes:** - The `token` is a JWT containing the user information: { "\_id": "<userId>", "userName": "johnDoe", "email": "john@example.com" }. The frontend should store this token (e.g., localStorage or cookie) and send it in the `Authorization` header for protected routes: Authorization: jwt <JWT_TOKEN>

---

### Forgot Password `POST /api/user/forgot-password`

**Request Body:**

```json
{
  "email": "john@example.com"
}
```

**Response:**

```json
{
  "message": "Password reset email sent!"
}
```

---

### Reset Password `POST /api/user/reset-password`

**Request Body:**

```json
{
  "token": "<resetToken>",
  "password": "newPassword123",
  "password2": "newPassword123"
}
```

**Response:**

```json
{
  "message": "Password successfully reset!"
}
```

---

## Book Management

All book management routes require a valid JWT token in the `Authorization` header: Authorization: jwt <JWT_TOKEN>

---

### Search Google Books `GET /api/books/search?q=<search_query>`

**Response:**

```json
{
  "books": [
    {
      "_id": "bookId",
      "title": "Book Title",
      "authors": ["Author1", "Author2"],
      "publisher": "Publisher Name",
      "publishedDate": "2020-01-01",
      "description": "Book description",
      "pageCount": 320,
      "averageRating": 4.5,
      "ratingsCount": 50,
      "categories": ["Category1", "Category2"],
      "imageLinks": { "thumbnail": "url" }
    }
  ]
}
```

---

### Save a Book `POST /api/books`

**Request Body Example:**
{
"\_id": "bookId",
"title": "Book Title",
"subtitle": "Optional subtitle",
"authors": ["Author1", "Author2"],
"publisher": "Publisher Name",
"publishedDate": "2020-01-01",
"description": "Book description",
"pageCount": 320,
"averageRating": 4.5,
"ratingsCount": 50,
"categories": ["Category1"],
"imageLinks": {
"thumbnail": "url",
"smallThumbnail": "url"
}
}
**Response:** { "message": "Book saved successfully", "book": { ... } }

---

### Get a Book `GET /api/books/:id`

**Response:**

```json
{
  "_id": "bookId",
  "title": "Book Title",
  "authors": ["Author1", "Author2"]
}
```

---

### Add Book to User Shelf `POST /api/books/shelf/add`

**Request Body (all fields come from Google API):**  
{
"shelf": "favorites", // or "wishlist"

"\_id": "bookId",
"title": "Book Title",
"subtitle": "Optional subtitle",
"authors": ["Author1", "Author2"],
"publisher": "Publisher Name",
"publishedDate": "2020-01-01",
"description": "Book description",
"pageCount": 320,
"averageRating": 4.5,
"ratingsCount": 50,
"categories": ["Category1"],
"imageLinks": {
"thumbnail": "url",
"smallThumbnail": "url"
}
}

**Response:** { "message": "Book added to shelf successfully", "shelf": "favorites", "bookId": "bookId" }
**note** when a user add a book to its shelf, we check if its already in our database and also save to our Books document if not

---

### Remove Book from User Shelf `POST /api/books/shelf/remove`

**Request Body:**

```json
{
  "bookId": "bookId",
  "shelf": "favorites"
}
```

**Response:**

```json
{
  "message": "Book removed from shelf successfully",
  "shelf": "favorites",
  "bookId": "bookId"
}
```

---

### Get User Shelf `GET /api/books/shelf/:shelf`

**Example:** GET /api/books/shelf/favorites
**Response:**

```json
[{ "_id": "bookId", "title": "Book Title", "authors": ["Author1"] }]
```

---

### Get All User Shelves `GET /api/books/shelf`

**Response:**

```json
{
  "favorites": [ ... ],
  "wishlist": [ ... ]
}
```

## Advanced Search

### Advanced Google Books Search

`GET /api/books/advanced/search`

Performs advanced search using the Google Books API with optional filters.

---

### Query Parameters

| Parameter   | Description                       | Example             |
| ----------- | --------------------------------- | ------------------- |
| `q`         | General search query              | `q=philosophy`      |
| `title`     | Search by book title              | `title=Revolution`  |
| `author`    | Filter by author                  | `author=Nietzsche`  |
| `category`  | Filter by category                | `category=History`  |
| `publisher` | Filter by publisher               | `publisher=Penguin` |
| `page`      | Pagination page (default: 1)      | `page=2`            |
| `limit`     | Number of results (default: 20)   | `limit=20`          |
| `orderBy`   | Sorting (`relevance` or `newest`) | `orderBy=newest`    |

---

### Example Request

```http
GET /api/books/advanced/search?author=Fanon&category=Politics&page=1
```

---

## Music Management

All music routes require a valid JWT token.

### Search Music

`GET /api/music/search?q=<search_query>`

**Response:**

```json
{
  "tracks": [
    {
      "\_id": "trackId",
      "title": "Track Title",
      "artist": "Artist Name",
      "album": "Album Name",
      "duration": 240,
      "releaseDate": "2022-01-01",
      "genres": ["Genre1", "Genre2"]
    }
  ]
}
```

### Get Track

`GET /api/music/:id`

**Response:**

```json
{
  "\_id": "trackId",
  "title": "Track Title",
  "artist": "Artist Name",
  "album": "Album Name",
  "duration": 240,
  "releaseDate": "2022-01-01",
  "genres": ["Genre1"]
}
```

### Add Track to User Shelf

`POST /api/music/shelf/add`

**Request Body:**

```json
{
  "trackId": "trackId",
  "shelf": "favorites"
}
```

**Response:**

```json
{
  "message": "Track added to shelf successfully",
  "shelf": "favorites",
  "trackId": "trackId"
}
```

### Remove Track from User Shelf

`POST /api/music/shelf/remove`

**Request Body:**

```json
{
  "trackId": "trackId",
  "shelf": "favorites"
}
```

**Response:**

```json
{
  "message": "Track removed from shelf successfully",
  "shelf": "favorites",
  "trackId": "trackId"
}
```

### Get User Shelf

`GET /api/music/shelf/:shelf`

**Example:**

`GET /api/music/shelf/favorites`

**Response:**

```json
[{ "_id": "trackId", "title": "Track Title", "artist": "Artist Name" }]
```

### Get All User Shelves

`GET /api/music/shelf`

**Response:**

```json
{
"favorites": [ ... ],
"wishlist": [ ... ]
}
```

## Advanced Music Search

### `GET /api/music/advanced/search`

Performs advanced track search using the MusicBrainz API.

| Parameter | Description          | Example                  |
| --------- | -------------------- | ------------------------ |
| `q`       | General search query | `q=rock`                 |
| `title`   | Track title          | `title=Paranoid Android` |
| `artist`  | Artist name          | `artist=Radiohead`       |
| `release` | Album title          | `release=OK Computer`    |
| `year`    | Release year         | `year=1997`              |
| `page`    | Pagination page      | `page=2`                 |
| `limit`   | Results per page     | `limit=25`               |

# Movie Management API

All movie routes require a valid JWT token unless otherwise specified.

---

## Endpoints

### Search Movies (OMDb)

`GET /api/movie/search?q=<search_query>`

Performs a basic search for movies using the OMDb API.

**Query Parameters**

| Parameter | Description         | Example       |
| --------- | ------------------- | ------------- |
| `q`       | Search query string | `q=Inception` |

**Response**

```json
{
  "movies": [
    {
      "_id": "tt1375666",
      "title": "Inception",
      "year": "2010",
      "poster": "https://example.com/poster.jpg",
      "type": "movie"
    }
  ]
}
```

---

### Advanced Movie Search

`GET /api/movie/advanced/search`

Performs advanced movie search with optional filters including actor, genre, year, and type.

**Query Parameters**

| Parameter | Description                       | Example           |
| --------- | --------------------------------- | ----------------- |
| `q`       | General search query              | `q=Batman`        |
| `title`   | Exact movie title                 | `title=Inception` |
| `actor`   | Actor's name                      | `actor=DiCaprio`  |
| `genre`   | Movie genre                       | `genre=Action`    |
| `year`    | Release year                      | `year=2010`       |
| `type`    | Type of media (`movie`, `series`) | `type=movie`      |
| `page`    | Pagination page (default: 1)      | `page=2`          |

**Response**

```json
{
  "totalResults": 2,
  "page": 1,
  "movies": [
    {
      "_id": "tt1375666",
      "title": "Inception",
      "year": "2010",
      "poster": "https://example.com/poster.jpg",
      "type": "movie"
    }
  ]
}
```

---

### Save Movie

`POST /api/movie/`

Saves a movie to the database.

**Request Body**

```json
{
  "_id": "tt1375666",
  "title": "Inception",
  "year": "2010",
  "poster": "https://example.com/poster.jpg",
  "type": "movie"
}
```

**Response**

```json
{
  "_id": "tt1375666",
  "title": "Inception",
  "year": "2010",
  "poster": "https://example.com/poster.jpg",
  "type": "movie"
}
```

---

### Get All User Shelves

`GET /api/movie/shelf`

Retrieves all movie shelves for the authenticated user.

**Response**

```json
{
  "watched": [],
  "favorites": [],
  "toWatch": []
}
```

---

### Get Specific User Shelf

`GET /api/movie/shelf/:shelf`

Retrieves all movies from a specific user shelf.

**Parameters**

| Parameter | Description            |
| --------- | ---------------------- |
| `shelf`   | Name of the user shelf |

**Response**

```json
[
  {
    "_id": "tt1375666",
    "title": "Inception",
    "year": "2010",
    "poster": "https://example.com/poster.jpg",
    "type": "movie"
  }
]
```

---

### Get Movie By ID

`GET /api/movie/:id`

Fetches movie details by its ID.

**Parameters**

| Parameter | Description   |
| --------- | ------------- |
| `id`      | IMDB movie ID |

**Response**

```json
{
  "_id": "tt1375666",
  "title": "Inception",
  "year": "2010",
  "poster": "https://example.com/poster.jpg",
  "type": "movie"
}
```

---

### Add Movie to User Shelf

`POST /api/movie/shelf/add`

Adds a movie to a user-defined shelf. If the movie does not exist in the database, it will be saved first.

**Request Body**

```json
{
  "shelf": "favorites",
  "_id": "tt1375666",
  "title": "Inception",
  "year": "2010",
  "poster": "https://example.com/poster.jpg",
  "type": "movie"
}
```

**Response**

```json
{
  "message": "Movie added",
  "shelf": "favorites",
  "movie": {
    "_id": "tt1375666",
    "title": "Inception",
    "year": "2010",
    "poster": "https://example.com/poster.jpg",
    "type": "movie"
  }
}
```

---

### Remove Movie from User Shelf

`POST /api/movie/shelf/remove`

Removes a movie from a user-defined shelf.

**Request Body**

```json
{
  "movieId": "tt1375666",
  "shelf": "favorites"
}
```

**Response**

```json
{
  "message": "Movie removed",
  "shelf": "favorites",
  "movieId": "tt1375666"
}
```

## Reflections

Reflections are user notes or thoughts about a media item, optionally including progress, mood tags, feelings, and metadata.

### Add Reflection

`POST /api/reflections/add`

**Request Body:**

```json
{
  "itemId": "bookId",
  "itemType": "book",
  "text": "This book made me feel nostalgic and hopeful...",
  "moodTags": ["melancholic", "nostalgic"],
  "feelings": ["lonely", "hopeful"],
  "progress": { "current": 5, "total": 12, "unit": "chapters" },
  "metadata": { "location": "Toronto", "weather": "snowing" },
  "date": "2026-02-15T18:00:00Z"
}
```

**Response:**

```json
{
"message": "Reflection added successfully",
"reflection": { ... }
}
```

### Get All User Reflections

`GET /api/reflections/user`

**Response:**

```json
[
  {
    "\_id": "reflectionId",
    "item": "bookId",
    "itemType": "book",
    "text": "...",
    "moodTags": ["melancholic"],
    "feelings": ["lonely"],
    "progress": { "current": 5, "total": 12, "unit": "chapters" },
    "metadata": { "location": "Toronto" },
    "date": "2026-02-15T18:00:00Z"
  }
]
```

### Get Reflections by Item

`GET /api/reflections/item/:itemId?itemType=book`

**Response:**

```json
[
  {
    "\_id": "reflectionId",
    "user": "userId",
    "item": "bookId",
    "itemType": "book",
    "text": "...",
    "moodTags": [],
    "feelings": [],
    "progress": { "current": 5, "total": 12, "unit": "chapters" },
    "metadata": {},
    "date": "2026-02-15T18:00:00Z"
  }
]
```

### Get Specific Reflection

`GET /api/reflections/:id`

**Response:**

```json
{
  "\_id": "reflectionId",
  "user": "userId",
  "item": "bookId",
  "itemType": "book",
  "text": "...",
  "moodTags": [],
  "feelings": [],
  "progress": { "current": 5, "total": 12, "unit": "chapters" },
  "metadata": {},
  "date": "2026-02-15T18:00:00Z"
}
```

### Update Reflection

`PUT /api/reflections/update/:id`

**Request Body:**

```json
{
  "text": "Updated reflection text",
  "moodTags": ["excited"]
}
```

**Response:**

```json
{
"message": "Reflection updated successfully",
"reflection": { ... }
}
```

### Remove Reflection

`DELETE /api/reflections/remove/:id`

**Response:**

```json
{ "message": "Reflection removed successfully" }
```

---
