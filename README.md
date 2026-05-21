# Campus Placement Platform

Full-stack monorepo for managing campus recruitment exams. The backend is an Express.js REST API; the frontend is a React 18 SPA built with Vite.

## Repository structure

```
campus-placement-platform/
├── backend/          Express.js API (Node.js + Sequelize + PostgreSQL)
└── frontend/         React 18 SPA (Vite + Zustand + shadcn/ui)
```

---

## Prerequisites

| Tool | Minimum version |
|------|----------------|
| Node.js | 18 |
| npm | 9 |
| PostgreSQL | 14 |

---

## Setup

### 1. Clone the repository

```bash
git clone <repo-url>
cd campus-placement-platform
```

### 2. Configure the backend environment

```bash
cd backend
cp .env.example .env
```

Open `backend/.env` and fill in every value. See the [Environment variables](#environment-variables) section below.

### 3. Configure the frontend environment

```bash
cd ../frontend
cp .env.example .env
```

The only variable is `VITE_API_URL` — set it to the URL where the backend API is running (e.g. `http://localhost:5000/api`).

### 4. Install dependencies and run database setup

```bash
# Backend
cd backend
npm install
npm run setup   # runs: npx sequelize-cli db:migrate && node scripts/setup.js
```

`npm run setup` migrates the database schema and seeds the admin user defined in your `.env`.

```bash
# Frontend
cd ../frontend
npm install
```

### 4b. Download face-api.js models (required for exam proctoring)

The candidate exam page uses [face-api.js](https://github.com/justadudewhohacks/face-api.js) with the **TinyFaceDetector** model for in-browser face detection. The model weights are not bundled — you must download them manually:

1. Create the models directory: `mkdir -p frontend/public/models`
2. Download the following two files from the [face-api.js weights folder](https://github.com/justadudewhohacks/face-api.js/tree/master/weights) and place them in `frontend/public/models/`:
   - `tiny_face_detector_model-weights_manifest.json`
   - `tiny_face_detector_model-shard1`

Without these files the proctoring camera will show "Camera Off" and face-detection violations will not be logged, but the rest of the exam will still function.

### 5. Start development servers

```bash
# Terminal 1 — API server
cd backend && npm run dev

# Terminal 2 — SPA dev server
cd frontend && npm run dev
```

| Service | Default URL |
|---------|-------------|
| REST API | `http://localhost:5000` |
| React SPA | `http://localhost:5173` |

### 6. Log in as admin

Use the credentials you set in `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `backend/.env`.

Default from `.env.example`:
- Email: `admin@campus.com`
- Password: `Admin@123456`

---

## Environment variables

### `backend/.env`

| Variable | Description | Example |
|---|---|---|
| `PORT` | Port the Express server listens on | `5000` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/campus_placement` |
| `JWT_SECRET` | Long random string used to sign JWTs | *(generate with `openssl rand -hex 64`)* |
| `JWT_EXPIRES_IN` | JWT expiry duration | `24h` |
| `ADMIN_EMAIL` | Email for the seeded admin account | `admin@campus.com` |
| `ADMIN_PASSWORD` | Password for the seeded admin account | `Admin@123456` |
| `ADMIN_NAME` | Display name for the seeded admin | `Platform Admin` |
| `JUDGE0_URL` | Base URL for the Judge0 code-execution service | `https://judge0.binarybit.in` |
| `FRONTEND_URL` | Allowed CORS origin | `http://localhost:5173` |
| `BCRYPT_ROUNDS` | bcrypt salt rounds (12 is a safe default) | `12` |

The server validates that all required variables are present at startup and exits with a descriptive error if any are missing.

### `frontend/.env`

| Variable | Description | Example |
|---|---|---|
| `VITE_API_URL` | Base URL of the backend API | `http://localhost:5000/api` |

---

## API reference

All responses follow this envelope:

```json
{ "success": true, "message": "...", "data": { ... } }
```

Error responses use `"success": false` and an optional `"errors"` array for validation failures.

### Authentication

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/auth/login` | — | Login (rate-limited: 5 req / 15 min per IP) |
| `GET` | `/api/auth/me` | JWT | Get current user profile |

Login body: `{ email, password }`
Login response data: `{ token, user: { id, name, email, role } }`

### Admin — Registration links

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/admin/registration-links` | Generate a new one-time registration link |
| `GET` | `/api/admin/registration-links` | List all registration links |
| `DELETE` | `/api/admin/registration-links/:id` | Deactivate a link |

### Admin — Candidates

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/admin/candidates` | List candidates (filters: `stream`, `batch`, `search`, `page`, `limit`) |
| `GET` | `/api/admin/candidates/:id` | Get candidate details including exam history |

### Admin — Questions

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/admin/questions` | Create a question |
| `GET` | `/api/admin/questions` | List questions (filters: `section`, `type`, `difficulty`, `search`, `page`, `limit`) |
| `GET` | `/api/admin/questions/:id` | Get a single question |
| `PUT` | `/api/admin/questions/:id` | Update a question |
| `DELETE` | `/api/admin/questions/:id` | Delete a question |
| `POST` | `/api/admin/questions/bulk` | Bulk import (body: array of question objects) |

Question sections: `quantitative` | `verbal` | `technical` | `coding`
Question types: `mcq` | `written` | `coding`
Difficulties: `easy` | `medium` | `hard`

### Admin — Exams

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/admin/exams` | Create an exam |
| `GET` | `/api/admin/exams` | List exams (filter: `status`) |
| `GET` | `/api/admin/exams/:id` | Get exam with questions grouped by section |
| `PUT` | `/api/admin/exams/:id` | Update exam |
| `POST` | `/api/admin/exams/:id/launch` | Launch exam for candidates; body: `{ candidate_ids: [uuid, ...] }` |
| `GET` | `/api/admin/exams/:id/results` | Get all candidate results for an exam |

### Candidate registration

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/register/validate/:token` | — | Check if a registration token is valid |
| `POST` | `/api/register/:token` | — | Complete registration |

### Candidate — Exam session

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/exam/start` | Start or resume an exam session; body: `{ exam_id, passcode }` |
| `POST` | `/api/exam/answer` | Save an answer; body: `{ candidate_exam_id, question_id, selected_option?, answer_text? }` |
| `POST` | `/api/exam/submit` | Submit a completed exam; body: `{ candidate_exam_id }` |
| `GET` | `/api/exam/session/:candidate_exam_id` | Get a session with existing answers |
| `GET` | `/api/exam/my-exams` | Get all exams assigned to the current candidate |

### Candidate — Code execution

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/code/run` | Execute code against `sample_input` (result not persisted) |
| `POST` | `/api/code/submit` | Execute code against all test cases, score, and persist result |

Code run/submit body: `{ source_code, language, candidate_exam_id, question_id, sample_input? }`
Supported languages: `python` | `javascript` | `cpp`

---

## Judge0 integration

The platform uses a self-hosted [Judge0](https://github.com/judge0/judge0) instance for code execution. Set `JUDGE0_URL` in `backend/.env` to point to your instance.

| Language | Judge0 language ID |
|----------|--------------------|
| Python 3 | 71 |
| JavaScript (Node.js) | 63 |
| C++ (GCC) | 54 |

---

## Tech stack

**Backend**

| Package | Purpose |
|---------|---------|
| Express.js | HTTP framework |
| Sequelize + pg | ORM + PostgreSQL driver |
| jsonwebtoken + bcryptjs | Auth |
| express-validator | Request validation |
| express-rate-limit | Login brute-force protection |
| helmet + cors | Security headers + CORS |
| morgan | HTTP request logging |

**Frontend**

| Package | Purpose |
|---------|---------|
| React 18 + Vite | UI framework + build tool |
| React Router v6 | Client-side routing |
| Zustand | Global state management |
| shadcn/ui + Tailwind CSS | Component library + styling |
| Axios | HTTP client with auth interceptors |
| react-hook-form + Zod | Forms and validation |
| @monaco-editor/react | In-browser code editor |
