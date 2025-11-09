# Re:UseNet REST API

This directory contains the REST API implementation for the Re:UseNet platform.

## Structure

```
api/
├── controllers/       # Request handlers and business logic orchestration
│   ├── item.controller.ts
│   ├── user.controller.ts
│   ├── exchange.controller.ts
│   └── matching.controller.ts
├── routes/           # Route definitions and middleware application
│   ├── item.routes.ts
│   ├── user.routes.ts
│   ├── exchange.routes.ts
│   ├── matching.routes.ts
│   └── index.ts
├── middleware/       # Express middleware functions
│   ├── auth.middleware.ts
│   ├── rateLimit.middleware.ts
│   ├── security.middleware.ts
│   ├── validation.middleware.ts
│   ├── errorHandler.middleware.ts
│   └── index.ts
└── dtos/            # Data Transfer Objects for validation
    ├── item.dto.ts
    ├── user.dto.ts
    ├── exchange.dto.ts
    └── matching.dto.ts
```

## API Endpoints

### Items API (`/api/items`)

- `POST /api/items` - Create a new item (authenticated, verified)
- `GET /api/items` - Search items with filtering and pagination
- `GET /api/items/:id` - Get item details
- `PUT /api/items/:id` - Update item details (authenticated, verified)
- `PUT /api/items/:id/status` - Update item status (authenticated, verified)
- `DELETE /api/items/:id` - Delete an item (authenticated, verified)
- `GET /api/items/user/:userId` - Get user's items
- `GET /api/items/tags` - Get popular tags

### Users API (`/api/users`)

- `POST /api/users/register` - Register a new user
- `POST /api/users/verify` - Verify user email
- `POST /api/users/resend-verification` - Resend verification email (authenticated)
- `GET /api/users/profile` - Get current user's profile (authenticated)
- `PUT /api/users/profile` - Update current user's profile (authenticated)
- `PUT /api/users/location` - Update current user's location (authenticated)
- `GET /api/users/search` - Search users by display name
- `GET /api/users/:userId` - Get user profile by ID

### Exchanges API (`/api/exchanges`)

- `POST /api/exchanges` - Initiate a new exchange (authenticated, verified)
- `GET /api/exchanges/history` - Get user's exchange history (authenticated)
- `GET /api/exchanges/active` - Get user's active exchanges (authenticated)
- `GET /api/exchanges/unrated` - Get user's unrated exchanges (authenticated)
- `GET /api/exchanges/:id` - Get exchange details (authenticated)
- `PUT /api/exchanges/:id/accept` - Accept an exchange request (authenticated, verified)
- `POST /api/exchanges/:id/complete` - Complete an exchange (authenticated, verified)
- `POST /api/exchanges/:id/cancel` - Cancel an exchange (authenticated)
- `POST /api/exchanges/:id/rate` - Rate an exchange (authenticated, verified)

### Matching API (`/api/matching`)

- `GET /api/matching/suggestions` - Get personalized item recommendations (authenticated, verified)
- `GET /api/matching/similar/:itemId` - Find similar items
- `GET /api/matching/matches/:itemId` - Find potential user matches for an item (authenticated, verified)
- `POST /api/matching/notify/:itemId` - Notify potential matches about an item (authenticated, verified)
- `POST /api/matching/categorize/:itemId` - Categorize an item using AI (authenticated, verified)

## Authentication

The API uses JWT bearer token authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Authentication Middleware

- `authenticate` - Validates JWT token and attaches user info to request
- `optionalAuthenticate` - Validates token if present, continues without if not
- `requireVerified` - Ensures the authenticated user has verified their email
- `requireRole(...roles)` - Ensures the authenticated user has specific roles

## Rate Limiting

Different rate limits are applied to different endpoint types:

- **Standard Rate Limiter**: 100 requests per 15 minutes (configurable)
- **Auth Rate Limiter**: 5 requests per 15 minutes (for login/register)
- **Upload Rate Limiter**: 20 requests per hour (for file uploads)
- **Search Rate Limiter**: 30 requests per minute (for search operations)

## Validation

Request validation is performed using `class-validator` and `class-transformer`. DTOs define the expected structure and validation rules for each endpoint.

## Error Handling

All errors are returned in a consistent format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {},
    "timestamp": "2024-01-01T00:00:00.000Z",
    "requestId": "req_123456789"
  }
}
```

Common HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (missing or invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `422` - Unprocessable Entity (business logic errors)
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error

## Security Features

- **Helmet**: Security headers (XSS protection, clickjacking prevention, etc.)
- **CORS**: Configurable cross-origin resource sharing
- **Rate Limiting**: Protection against brute force and DoS attacks
- **Input Validation**: All inputs are validated and sanitized
- **JWT Authentication**: Secure token-based authentication
- **Request ID**: Unique ID for each request for tracking and debugging

## File Uploads

File uploads are handled using `multer` with the following constraints:

- Maximum file size: 10MB per file
- Maximum files per request: 10
- Allowed file types: Images only (image/*)
- Storage: Memory storage (files are processed and uploaded to cloud storage)

## Response Format

Successful responses follow this format:

```json
{
  "success": true,
  "data": {},
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

Paginated responses include additional metadata:

```json
{
  "success": true,
  "data": {
    "items": [],
    "totalCount": 100,
    "hasMore": true,
    "limit": 20,
    "offset": 0
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```
