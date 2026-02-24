# Frontend - Task Management System

## Introduction
This is the frontend part of the Task Management System.

It is built using React + Vite and connected to backend APIs.
The frontend handles login/register UI, dashboard screen, and task management screen.

## What This Frontend Can Do
1. User Authentication
- User can register account
- User can login account
- Token is saved in `localStorage`

2. Dashboard
- Shows task statistics after login
- Admin and employee get different dashboard data

3. Task Screen
- Show task list
- Show status badges:
  - Pending
  - In Progress
  - Completed
- Update task status
- Admin can create and delete tasks

## How Frontend Connects to Backend
All API requests are handled from `src/api.js`.

Protected APIs send token like this:
`Authorization: Bearer <token>`

This token is received from login API.

## Important Frontend Files
- `src/App.jsx`
  - Main screen logic
  - Shows login/register before authentication
  - Shows dashboard/tasks after login
- `src/Login.jsx`
  - Login form UI and logic
- `src/Register.jsx`
  - Register form UI and logic
- `src/api.js`
  - Common API request function
  - Auth header setup
- `src/App.css`, `src/index.css`
  - Styling and UI design

## Environment Setup
Create `.env` file inside `frontend/`:

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

If not provided, default backend URL is:
`http://localhost:5000/api`

## Run Frontend Locally
```bash
npm install
npm run dev
```

Vite usually starts at:
`http://localhost:5173`

## Build for Production
```bash
npm run build
npm run preview
```

## Security Note (Simple)
- JWT secret key is only for backend.
- Frontend should never store backend secret key.
- Frontend only stores token and user data in localStorage.
