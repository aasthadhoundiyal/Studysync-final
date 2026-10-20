# StudySync Frontend

StudySync is a modern, responsive academic knowledge-sharing platform for university students. It integrates peer-to-peer note sharing, threaded discussions, an AI Study Suite (Interactive AI Quiz generation, AI Summaries, and Keyword Extraction powered by Gemini), a daily streak and points gamification system, and an Administrative Moderation & Governance Hub.

---

## Tech Stack & Architecture

- **Core**: React 19, React Router v7, Vite
- **Styling**: Tailwind CSS with custom academic palette (`brand`, `surface`), Lucide React icons
- **State & Contexts**:
  - `AuthContext`: Session persistence, JWT tokens, user role evaluation (`admin` vs `user`), auto-logout on unauthorized events.
  - `ToastContext`: Dynamic floating toast alerts for actions, feedback, and reversals.
  - `NotificationContext`: Real-time unread badges, tab visibility synchronization, optimistic mark-read actions.
- **Centralized API Client** (`src/api/client.js`):
  - Injects JWT Bearer tokens automatically.
  - Handles multipart uploads, query strings, and standard error handling.
  - Intercepts 401s to broadcast `studysync:unauthorized` events for clean session cleanup.

---

## Getting Started

### 1. Prerequisites
- Node.js (v18 or higher)
- Backend running on `http://localhost:5000` (with MongoDB active)

### 2. Environment Configuration
Create or inspect `.env` in the `client/` root:
```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_UPLOADS_BASE_URL=http://localhost:5000
VITE_APP_NAME=StudySync
```

### 3. Installation & Development
```bash
# Install dependencies
npm install

# Start Vite development server
npm run dev
```
The application will be available at `http://localhost:5173/`.

### 4. Build for Production
```bash
npm run build
```

---

## Demo Accounts

For local demonstration and evaluation:

| Role | Username / Identifier | Password | Access & Features |
|---|---|---|---|
| **Platform Administrator** | `admin` (or `admin@studysync.local`) | `Admin@12345` | Full access, Admin Moderation & Governance Hub (`/admin`), appeals review, queue moderation, user suspension/reactivation. |
| **Student** | `test_student_88` | (Registered via `/register`) | Feed, note creation, attachments, bookmarks, peer comments, AI Quiz taking, streak tracking. |
