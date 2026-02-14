# Scriptorium Backend API

This backend provides a RESTful API for user authentication, email verification, password management, and book management (including Google Books search and personal user shelves).

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

---

### Notes

1. **JWT Token Usage:** All routes that modify or read user-specific data require a valid JWT token in the `Authorization` header.
2. **Shelf Names:** Currently supported shelves: `"favorites"` and `"wishlist"`.
3. **Google Books Search:** This does not require authentication.

## Health Check `GET /`

Returns the health status of the API: { "status": "UsersAPI OK" }

---

## User Authentication

### Register `POST /api/user/register`

**Request Body:** { "userName": "johnDoe", "email": "john@example.com", "password": "password123", "password2": "password123" }

**Response:** { "message": "Verification email sent!" } > Note: A verification email will be sent to the user. User must verify email before logging in.

---

### Verify Email `GET /api/user/verify?token=<verificationToken>`

**Response:** { "message": "Email successfully verified!", "user": "johnDoe" }

### Login `POST /api/user/login`

**Request Body:** { "email": "john@example.com", "password": "password123" }

**Response:** { "message": "login successful", "token": "<JWT_TOKEN>" }

**Usage Notes:** - The `token` is a JWT containing the user information: { "\_id": "<userId>", "userName": "johnDoe", "email": "john@example.com" } - The frontend should store this token (e.g., localStorage or cookie) and send it in the `Authorization` header for protected routes: Authorization: jwt <JWT_TOKEN>

---

### Forgot Password `POST /api/user/forgot-password`

**Request Body:** { "email": "john@example.com" } **Response:** { "message": "Password reset email sent!" }

---

### Reset Password `POST /api/user/reset-password`

**Request Body:** { "token": "<resetToken>", "password": "newPassword123", "password2": "newPassword123" }

**Response:** { "message": "Password successfully reset!" } --- ## Book Management All book management routes require a valid JWT token in the `Authorization` header: Authorization: jwt <JWT_TOKEN>

---

### Search Google Books `GET /api/books/search?q=<search_query>`

**Response:** { "books": [ { "\_id": "bookId", "title": "Book Title", "authors": ["Author1", "Author2"], "publisher": "Publisher Name", "publishedDate": "2020-01-01", "description": "Book description", "pageCount": 320, "averageRating": 4.5, "ratingsCount": 50, "categories": ["Category1", "Category2"], "imageLinks": { "thumbnail": "url" } } ] }

---

### Save a Book `POST /api/books`

**Request Body Example:** { "\_id": "bookId", "title": "Book Title", "authors": ["Author1", "Author2"] }
**Response:** { "message": "Book saved successfully", "book": { ... } }

---

### Get a Book `GET /api/books/:id`

**Response:** { "\_id": "bookId", "title": "Book Title", "authors": ["Author1", "Author2"] }

---

### Add Book to User Shelf `POST /api/books/shelf/add`

**Request Body:** { "bookId": "bookId", "shelf": "favorites" // or "wishlist" }
**Response:** { "message": "Book added to shelf successfully", "shelf": "favorites", "bookId": "bookId" }

---

### Remove Book from User Shelf `POST /api/books/shelf/remove`

**Request Body:** { "bookId": "bookId", "shelf": "favorites" }
**Response:** { "message": "Book removed from shelf successfully", "shelf": "favorites", "bookId": "bookId" }

---

### Get User Shelf `GET /api/books/shelf/:shelf`

**Example:** GET /api/books/shelf/favorites
**Response:** [ { "\_id": "bookId", "title": "Book Title", "authors": ["Author1"] } ]

---

### Get All User Shelves `GET /api/books/shelf`

**Response:** { "favorites": [ ... ], "wishlist": [ ... ] }

### Remove Book from User Shelf `POST /api/books/shelf/remove`

**Headers:** Authorization: jwt &lt;JWT_TOKEN&gt;
**Request Body:** `json { "bookId": "bookId", "shelf": "favorites" } `**Response (Success):** `json { "message": "Book removed from shelf successfully", "shelf": "favorites", "bookId": "bookId" } `

---
