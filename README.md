# StudySync — Student Knowledge-Sharing & Study Community

StudySync is a full-stack academic platform where students share notes, ask questions, take AI-generated quizzes, bookmark study materials, track daily study streaks, and earn gamified academic levels.

---

## 🏗️ Architecture & Tech Stack

| Layer | Technology | Default Port | Description |
| :--- | :--- | :--- | :--- |
| **Frontend** | React 19, Vite, TailwindCSS, Lucide Icons | `5173` | Responsive SPA with protected routes, search, gamification, and moderation |
| **Backend** | Node.js, Express 5, Mongoose, JWT, Multer | `5000` | REST API with role-based auth, pagination, and file uploads |
| **Database** | MongoDB | `27017` | Document database for posts, users, comments, bookmarks, and appeals |
| **AI Engine** | Google Gemini API (`@google/genai`) | N/A | Automatic AI summaries, keyword extraction, and quiz generation |

---

## 📋 Prerequisites

1. **Node.js**: v18.0.0 or higher (`node -v`)
2. **npm**: v9.0.0 or higher (`npm -v`)
3. **MongoDB**: Local MongoDB instance running on `mongodb://127.0.0.1:27017/studysync` (or MongoDB Atlas URI)

---

## 🚀 Quick Start (Local Laptop Demo)

### 1. Database Setup
Ensure MongoDB is running locally:
```bash
# Verify MongoDB service status or start mongod:
mongod --dbpath <data-directory-path>
```

### 2. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Install dependencies (if not already installed)
npm install

# Setup environment variables (copy template)
cp .env.example .env

# (Optional) Seed the default administrator account
npm run seed:admin

# Start the backend development server
npm run dev
```
The API server will start on: **`http://localhost:5000`**  
Verify health endpoint: **`http://localhost:5000/api/health`**

### 3. Frontend Setup
Open a new terminal window:
```bash
# Navigate to client directory
cd client

# Install dependencies (if not already installed)
npm install

# Setup environment variables (copy template)
cp .env.example .env

# Start the Vite development server
npm run dev
```
The client application will start on: **`http://localhost:5173`**

---

## 🔐 Demo Credentials

| Role | Username | Email | Password |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin` | `admin@studysync.local` | `Admin@12345` |
| **Student** | Any self-registered user | Register at `/register` | Custom |

*Admins can access the Moderation Dashboard at `http://localhost:5173/admin`.*

---

## 🔑 Environment Variables Reference

### Backend (`backend/.env`)
| Variable | Description | Default |
| :--- | :--- | :--- |
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Backend HTTP port | `5000` |
| `MONGO_URI` | MongoDB connection string | `mongodb://127.0.0.1:27017/studysync` |
| `CLIENT_URL` | Allowed CORS origins (comma-separated) | `http://localhost:5173,http://localhost:3000` |
| `JWT_SECRET` | Secret key for signing auth tokens | Long random hex string |
| `JWT_EXPIRES_IN` | Token lifespan | `7d` |
| `ADMIN_USERNAME` | Default admin username | `admin` |
| `ADMIN_EMAIL` | Default admin email | `admin@studysync.local` |
| `ADMIN_PASSWORD` | Default admin password | `Admin@12345` |
| `GEMINI_API_KEY` | Google Gemini API key (optional) | *AI features degrade gracefully if omitted* |

### Frontend (`client/.env`)
| Variable | Description | Default |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | Base URL for the Express API | `http://localhost:5000/api` |
| `VITE_UPLOADS_BASE_URL`| Base URL for served media files | `http://localhost:5000` |
| `VITE_APP_NAME` | Application display name | `StudySync` |

> ⚠️ **Security Warning**: Never expose backend secrets, database connection strings, or `GEMINI_API_KEY` in `client/.env`.

---

## 🧠 AI Features & Graceful Degradation
* **AI Summary**: Generates multi-bullet summaries for academic study materials.
* **Keyword Extraction**: Identifies key topical tags for rapid discovery.
* **Interactive AI Quiz**: Creates multiple-choice questions with answer explanations, instant scoring, and retakes.
* **Fallback Behavior**: If `GEMINI_API_KEY` is not provided or Gemini is unreachable, AI endpoints return clear HTTP 503 error payloads that the frontend handles gracefully without crashing or degrading core community features.

---

## 🛠️ Verification & Build Commands

* **Frontend Build**: `cd client && npm run build`
* **Frontend Linter**: `cd client && npm run lint`
* **Backend Health Check**: `curl http://localhost:5000/api/health`
