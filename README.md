# Student Information Management System: Three-Tier Cloud Deployment

User -> **Netlify** (frontend) -> **Render** (Node/Express API) -> **MongoDB Atlas** (`studentDB.students`)

```
student-management-system/
├── backend/    (Render)   server.js, config/, models/, routes/, controllers/
└── frontend/   (Netlify)  index.html, styles.css, app.js, config.js, netlify.toml
```

## Deployment sequence

### 1. MongoDB Atlas
1. Create a free **M0 cluster**.
2. **Database Access** -> Add user (e.g. `studentUser`) with a strong password, role **Read and write to any database** (or scope to `studentDB` only).
3. **Network Access** -> Add IP `0.0.0.0/0` (Render free tier has no fixed IP).
4. **Connect -> Drivers** -> copy the string and put the DB name in it:
   `mongodb+srv://studentUser:<password>@cluster0.xxxxx.mongodb.net/studentDB?retryWrites=true&w=majority`
   (The `students` collection is created automatically on first insert.)

### 2. Test the backend locally (optional)
```bash
cd backend
cp .env.example .env      # fill in MONGODB_URI, set FRONTEND_URL=http://localhost:8080
npm install && npm start
curl localhost:5000/health
```

### 3. Deploy backend on Render
1. Push this repo to GitHub (`.env` is git-ignored).
2. Render -> **New -> Web Service** -> select the repo.
3. Settings: **Root Directory** `backend`, **Build Command** `npm install`, **Start Command** `npm start`.
4. **Environment variables**:
   | Key | Value |
   |---|---|
   | `MONGODB_URI` | your Atlas connection string |
   | `FRONTEND_URL` | your Netlify URL (add after step 5; no trailing slash) |
   | `PORT` | leave unset (Render injects it) |
5. Deploy, then open `https://<your-service>.onrender.com/health`. It should return `{"success":true,"database":"connected"}`.

### 4. Point the frontend at the API
Edit `frontend/config.js`:
```js
window.API_BASE_URL = "https://<your-service>.onrender.com";
```

### 5. Deploy frontend on Netlify
- **Drag and drop** the `frontend/` folder at app.netlify.com/drop, **or** New site from Git with **Base directory** `frontend`, no build command, **Publish directory** `.`
- Copy the Netlify URL (e.g. `https://student-management-system.netlify.app`).

### 6. Configure CORS
Back on Render, set `FRONTEND_URL` to the exact Netlify URL (comma-separate multiple origins) and redeploy. Requests from any other origin get **403**.

## API

| Operation | Method | Endpoint |
|---|---|---|
| Create | POST | `/api/students` |
| Read all (optional `?search=`) | GET | `/api/students` |
| Read one | GET | `/api/students/:id` (`ST101` or Mongo `_id`) |
| Update | PUT | `/api/students/:id` |
| Delete | DELETE | `/api/students/:id` |

Quick curl test:
```bash
API=https://<your-service>.onrender.com
curl -X POST $API/api/students -H "Content-Type: application/json" \
  -d '{"studentId":"ST101","name":"Rahul Sharma","email":"rahul@example.com","department":"CSE","semester":5}'
curl $API/api/students
curl -X PUT $API/api/students/ST101 -H "Content-Type: application/json" -d '{"semester":6}'
curl -X DELETE $API/api/students/ST101
```

## Test cases (from the assignment)
1. **Add** ST101 via the Add Student page -> "Student added successfully".
2. **Display**: the Student List page shows all records (`GET /api/students`).
3. **Update**: Edit ST101, semester 5 -> 6, then check the document in Atlas.
4. **Delete**: delete ST101, then confirm it's gone in Atlas.
5. **DB verification**: Atlas -> Browse Collections -> `studentDB.students`.

## Security measures implemented
- HTTPS on Netlify and Render; no DB credentials anywhere in frontend code.
- `MONGODB_URI`, `FRONTEND_URL` stored as Render environment variables; `.env` git-ignored.
- CORS locked to the Netlify origin(s).
- Server-side validation, whitelisted fields, forced primitive types (NoSQL-injection safe), regex-escaped search, 10 KB body limit.
- `helmet` security headers; generic error messages (no stack traces or DB details leaked).
- Frontend renders data with `textContent` (XSS safe).

## Notes
- Render's free tier sleeps after ~15 min idle; the first request may take 30-60 s (the UI warns about this).
- `studentId` is unique and immutable after creation; duplicates return **409**.
