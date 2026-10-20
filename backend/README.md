# StudySync Backend API

A full-featured REST API for the StudySync study-community platform — Node.js, Express 5, MongoDB.

---

## Quick Start

### Prerequisites
- Node.js >= 18
- MongoDB running locally on port 27017

```bash
cd backend
npm install
cp .env.example .env   # edit .env — minimum: MONGO_URI and JWT_SECRET
npm run seed:admin     # create the default admin account
npm run dev            # start with nodemon
```

API runs at http://localhost:5000

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| NODE_ENV | No | development | development or production |
| PORT | No | 5000 | HTTP port |
| MONGO_URI | YES | — | MongoDB connection string |
| CLIENT_URL | No | http://localhost:5173 | Comma-separated CORS origins |
| JWT_SECRET | YES | — | Long random string (generate below) |
| JWT_EXPIRES_IN | No | 7d | Token lifetime |
| BCRYPT_SALT_ROUNDS | No | 10 | bcrypt work factor |
| ADMIN_USERNAME | No | admin | Seeded admin username |
| ADMIN_EMAIL | No | — | Seeded admin email |
| ADMIN_PASSWORD | No | — | Seeded admin password |
| STREAK_TZ | No | UTC | IANA timezone for streak boundaries |
| GEMINI_API_KEY | No | — | Google Gemini key (AI features degrade gracefully when absent) |

Generate a JWT secret:
  node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

---

## NPM Scripts

| Script | Description |
|---|---|
| npm start | Start production server |
| npm run dev | Start with nodemon |
| npm run seed:admin | Create default admin from .env |
| npm run recount:likes | Repair likesCount counters |

---

## API Reference

All endpoints are prefixed with /api.
Authentication: Authorization: Bearer <token>

### Standard Response Shapes

Success:
  { "success": true, "<resource>": { ... } }

Paginated:
  { "success": true, "posts": [...], "pagination": { "page":1,"limit":10,"total":42,"totalPages":5,"hasMore":true } }

Error:
  { "success": false, "message": "...", "details": [{ "field": "email", "message": "..." }] }

HTTP status codes:
  200 OK | 201 Created | 400 Bad request | 401 Unauthenticated
  403 Forbidden | 404 Not found | 409 Conflict | 413 Too large | 503 AI unavailable

---

### Health
  GET /api/health    -- server + DB + AI status (no auth)

---

### Auth  /api/auth
  POST /register     -- { username, email, password }  -> { token, user }
  POST /login        -- { identifier, password }       -> { token, user }
  POST /logout       -- [auth] invalidate token
  POST /refresh-token

---

### Users  /api/users
  GET  /me                    [auth]  own profile
  PATCH /me                   [auth]  update profile (username, bio, profilePicture)
  PATCH /me/username          [auth]  change username
  PATCH /me/bio               [auth]  update bio
  PUT  /me/profile-picture    [auth]  upload avatar (multipart field: profilePicture)
  DELETE /me/profile-picture  [auth]  remove avatar
  GET  /me/streak             [auth]  streak info
  POST /me/streak/restore     [auth]  use a monthly restore token
  GET  /me/bookmarks          [auth]  saved posts (paginated)
  GET  /:identifier           [opt]   public profile
  GET  /:identifier/posts     [opt]   user posts

Profile response includes: _id, username, bio, points, level, levelName,
  currentStreak, longestStreak, streakRestoresRemaining, role, createdAt

---

### Posts  /api/posts
  GET  /                [opt]  feed  ?sort=newest|oldest|trending &tag= &q= &page= &limit=
  GET  /:id             [opt]  single post
  POST /                [auth] create  body: { title, content, tags[] }
                               or multipart/form-data with attachments[] files
  DELETE /:id           [auth] delete own (admin: any)
  GET  /:id/like        [opt]  like status
  POST /:id/like        [auth] like
  DELETE /:id/like      [auth] unlike
  GET  /:id/share       [opt]  share status
  POST /:id/share       [auth] record share
  POST /:id/bookmark    [auth] bookmark
  DELETE /:id/bookmark  [auth] remove bookmark

---

### Comments  /api/posts/:postId/comments
  GET  /                      [opt]  top-level comments
  POST /                      [auth] add comment { content }
  DELETE /:commentId          [auth] soft-delete (admin: any)
  GET  /:commentId/replies    [opt]  replies
  POST /:commentId/replies    [auth] add reply { content }

---

### Search  /api/search
  GET /?q=&sort=&tag=&page=&limit=   [opt]  full-text search (published posts only)

---

### Notifications  /api/notifications
  GET  /              [auth]  list  ?unreadOnly=true
  GET  /count         [auth]  unread count
  PATCH /:id/read     [auth]  mark one read
  PATCH /read-all     [auth]  mark all read

Notification types: like, comment, reply, share,
  moderation_removed, appeal_reviewed, post_restored

---

### AI Features  (require GEMINI_API_KEY; return 503 when absent)

Quiz  /api/posts/:id/quiz
  GET  /           [auth]  generate or return cached quiz (5-10 MCQs)
  GET  /?force=true[auth]  force regenerate
  DELETE /         [auth]  clear cache (author/admin)

  Question shape: { question, options[4], correctAnswer, explanation, difficulty: easy|medium|hard }

Summary  /api/posts/:id/summary
  GET  /           [auth]  generate or return cached summary
  GET  /?force=true[auth]  force regenerate
  DELETE /         [auth]  clear cache (author/admin)
  Response: { success, cached, summary, generatedAt }

Keywords  /api/posts/:id/keywords
  GET  /           [auth]  extract or return cached keywords
  GET  /?force=true[auth]  force regenerate
  DELETE /         [auth]  clear cache (author/admin)
  Response: { success, cached, keywords: string[], generatedAt }

---

### Appeals  /api/appeals
  POST /      [auth]  submit appeal { contentType: "post"|"comment", contentId, reason (10-1000 chars) }
  GET  /me    [auth]  list own appeals

Rules:
  - Only REMOVED content can be appealed
  - Only the content author may appeal
  - One pending appeal per content item (409 if duplicate)
  - Statuses: pending -> approved (content restored) or rejected (content stays removed)

---

### Admin  /api/admin  (admin role required for ALL endpoints)

Dashboard:
  GET /stats          -- { users, posts, comments } with pending/removed/suspended counts

Content queues:
  GET /posts/pending          pending_review posts
  GET /posts/removed          removed posts
  GET /comments/pending       pending_review comments
  GET /comments/removed       removed comments

Moderation history:
  GET /moderation/history     audit log  ?contentType=post|comment  ?page= &limit=

Post actions:
  POST /posts/:id/approve     pending_review -> published  body: { reason? }
  POST /posts/:id/remove      any -> removed               body: { reason? }
  POST /posts/:id/restore     removed -> published         body: { reason? }

Comment actions:
  POST /comments/:id/remove   published -> removed         body: { reason? }
  POST /comments/:id/restore  removed -> published         body: { reason? }

User management:
  GET  /users                 paginated list  ?search= &page= &limit=
  POST /users/:id/suspend     suspend a user (cannot suspend self or other admin)
  POST /users/:id/reactivate  reactivate a user

Appeals review:
  GET  /appeals/pending           FIFO pending queue
  GET  /appeals                   all appeals  ?status=pending|approved|rejected
  GET  /appeals/:appealId         single appeal detail
  POST /appeals/:appealId/approve approve -> content restored + notification
  POST /appeals/:appealId/reject  reject  -> content stays removed + notification
  Body for approve/reject: { adminNote? }

---

## Content Visibility Rules

| Status          | Public feed | Author | Admin |
|-----------------|-------------|--------|-------|
| published       |  YES        |  YES   |  YES  |
| pending_review  |  NO         |  YES   |  YES  |
| removed         |  NO         |  NO*   |  YES  |

*Author can view single removed post via GET /posts/:id

Comments with moderationStatus: "removed" are excluded from all public
comment/replies responses.

---

## Project Structure

  backend/
  +-- src/
  |   +-- app.js              Express app (CORS, body, routes)
  |   +-- server.js           Entry point
  |   +-- config/             db.js, env.js
  |   +-- controllers/        Thin HTTP handlers
  |   +-- services/           Business logic
  |   +-- models/             Mongoose schemas
  |   +-- routes/             Express routers (index.js = registry)
  |   +-- validators/         express-validator rule sets
  |   +-- middleware/         auth, upload, validate, errorHandler
  |   +-- utils/              ApiError, asyncHandler, pagination, token, files
  +-- scripts/
  |   +-- seedAdmin.js
  |   +-- recountLikes.js
  +-- uploads/                Local file storage (git-ignored)
  +-- .env                    Secrets (git-ignored)
  +-- .env.example            Variable names template
  +-- package.json
  +-- README.md               This file
