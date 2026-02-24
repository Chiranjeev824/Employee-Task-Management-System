# Task Management System

## Project Introduction
This is a full-stack Task Management System project.

In this project:
- Users can register and login
- Admin can manage tasks
- Employee can view and update their tasks
- Dashboard shows useful task statistics

I built this project using React for frontend and Node.js + Express + MongoDB for backend.

## Technologies Used
- Frontend: React (Vite)
- Backend: Node.js, Express.js
- Database: MongoDB with Mongoose
- Authentication: JWT (JSON Web Token)
- Password Security: bcryptjs

## Folder Structure
```text
Task Management/
  backend/
    controllers/
    middleware/
    models/
    routes/
    server.js
  frontend/
    src/
    .env.example
```

## Main Features
1. User Authentication
- Register new user
- Login existing user
- JWT token generated after successful login

2. Role-Based Access
- Admin role:
  - Create task
  - Delete task
  - View all tasks
  - View admin dashboard
- Employee role:
  - View only assigned tasks
  - Update task status
  - View employee dashboard

3. Dashboard
- Admin dashboard:
  - Total tasks
  - Completed tasks
  - Pending tasks
  - Total employees
- Employee dashboard:
  - My tasks
  - My completed tasks
  - My pending tasks

4. Task Management
- Create task (admin only)
- Get tasks
- Update task status
- Delete task (admin only)

## Backend Working Explanation (Simple)

### `server.js`
This file starts the backend server.

It does these jobs:
1. Connects to MongoDB database:
   `mongodb://127.0.0.1:27017/taskdb`
2. Adds middleware:
   - `cors()` for frontend-backend connection
   - `express.json()` to read JSON data from requests
3. Adds route groups:
   - `/api/auth`
   - `/api/tasks`
   - `/api/dashboard`
4. Starts server on port `5000`

### Authentication Flow
1. User logs in using email and password.
2. Backend checks credentials.
3. If valid, backend sends a JWT token.
4. Frontend stores token in localStorage.
5. For protected routes, frontend sends:
   `Authorization: Bearer <token>`
6. `protect` middleware verifies token and adds user info in `req.user`.
7. `adminOnly` middleware checks if user role is admin.

### Task Flow
1. Admin creates task.
2. Admin sees all tasks.
3. Employee sees only tasks assigned to them.
4. Task status can be changed (Pending/In Progress/Completed).
5. Admin can delete task.

### Dashboard Flow
1. Admin opens `/api/dashboard/admin` to get full system counts.
2. Employee opens `/api/dashboard/employee` to get personal task counts.

## API Endpoints

### Auth Routes
- `POST /api/auth/register`
  - Request body:
    `{ name, email, password, role }`
- `POST /api/auth/login`
  - Request body:
    `{ email, password }`
  - Response:
    `token`, `user`

### Task Routes (Protected)
- `POST /api/tasks` (admin only)
- `GET /api/tasks`
- `PUT /api/tasks/:id`
- `DELETE /api/tasks/:id` (admin only)

### Dashboard Routes (Protected)
- `GET /api/dashboard/admin` (admin only)
- `GET /api/dashboard/employee`

## How To Run This Project

## Step 1: Requirements
- Node.js installed (v18 or higher recommended)
- MongoDB running on local machine

## Step 2: Run Backend
```bash
cd backend
npm install
node server.js
```
Backend runs on:
`http://localhost:5000`

## Step 3: Run Frontend
```bash
cd frontend
npm install
```

Create `.env` file inside `frontend/` and add:
```env
VITE_API_BASE_URL=http://localhost:5000/api
```

Now start frontend:
```bash
npm run dev
```
Frontend usually runs on:
`http://localhost:5173`

## Important Notes
- JWT secret key should stay in backend only.
- Frontend should never store backend secret key.
- Frontend sends only JWT token in Authorization header.
- Current backend has fallback JWT secret if `.env` secret is not set.
