# TaskBoard — Collaborative Project Management Tool

A full-stack Trello/Asana-style tool, built for **CodeAlpha Task 3 (Web Development)**.

Users can sign up, create projects, invite teammates by email, organize work
into a To Do / In Progress / Done board, assign tasks to people, and comment
on tasks. Everything is saved by a real backend - not just in the browser.

## Features

- Auth system - signup/login with hashed passwords and JWT sessions
- Create projects and invite teammates by email
- Task cards: create, assign, move between columns, delete
- Comments on each task
- **A real backend** that manages users, projects, tasks, and comments,
  and saves everything to a file on disk so data survives a server restart

> The task sheet also mentions real-time updates with WebSockets as a
> **bonus**. This version covers every core requirement; WebSockets is
> listed under "possible next steps" below as something to add later.

## Tech stack

| Layer    | Tech |
|----------|------|
| Backend  | Node.js, Express, JWT, bcrypt |
| Storage  | A JSON file on disk (`backend/data/db.json`), read and written by the server |
| Frontend | Plain HTML, CSS, JavaScript (no framework) |

### Why a JSON file instead of MongoDB?

A real backend's job is to manage data on the server instead of in the
browser. MongoDB is the common choice, but it needs either installing
MongoDB locally or signing up for a hosted database, and that setup isn't
the point of this task. So this version keeps the same idea - the server
is the only thing that reads and writes the data - but stores it in a
plain JSON file instead. Swapping that file for MongoDB later would only
mean changing `backend/utils/store.js`; none of the routes or the
frontend would need to change.

## Project structure

```
project-management-tool/
├── backend/
│   ├── data/db.json            # created automatically - this is the "database"
│   ├── utils/store.js          # reads/writes db.json
│   ├── utils/config.js         # JWT secret (has a safe default)
│   ├── utils/generateToken.js
│   ├── middleware/authMiddleware.js   # checks the login token
│   ├── routes/                 # auth, projects, tasks, comments
│   ├── server.js               # starts the Express app
│   └── package.json
└── frontend/
    ├── index.html               # Login
    ├── register.html
    ├── dashboard.html           # List of projects
    ├── board.html               # Task board
    ├── css/style.css
    └── js/ (api.js, dashboard.js, board.js)
```

## How the pieces fit together (plain English)

- **User signs up** -> password is hashed with bcrypt -> saved to `db.json`
- **Login** checks the password, and if correct, hands back a JWT token
- The frontend saves that token in the browser and sends it with every
  request after that, in the `Authorization` header
- The backend's `authMiddleware.js` checks that token on every protected
  route, so only logged-in users can see or change anything
- A **Project** has an owner and a list of members
- A **Task** belongs to one Project, has a status (`todo` / `in-progress` /
  `done`), and can be assigned to one member
- A **Comment** belongs to one Task and has an author
- The board page asks the backend "give me all tasks for this project"
  and sorts them into three columns based on their status

## Running it locally

### 1. Backend

```bash
cd backend
npm install
npm start
```

That's it - no database setup, no `.env` file required. You should see:

```
Server running on http://localhost:5000
Data is being saved to backend/data/db.json
```

(If you want to set your own JWT secret instead of the built-in default,
copy `.env.example` to `.env` and edit it - but it's optional.)

### 2. Frontend

No build step - just static files.

```bash
cd frontend
npx serve .
```

Or open `index.html` directly in your browser. It calls the API at
`http://localhost:5000` (change `API_BASE` in `js/api.js` if your backend
runs somewhere else).

### 3. Try it

1. Register two accounts
2. Create a project with the first account
3. Add the second account as a teammate by email
4. Create a task, assign it, move it between columns, leave a comment
5. Open `backend/data/db.json` in a text editor while the server is
   running - you'll see your data sitting there in plain JSON

## API overview

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Log in |
| GET | `/api/auth/me` | Current user |
| POST | `/api/projects` | Create project |
| GET | `/api/projects` | List my projects |
| GET | `/api/projects/:id` | Project detail |
| PUT | `/api/projects/:id/members` | Add teammate by email |
| DELETE | `/api/projects/:id` | Delete project |
| POST | `/api/projects/:projectId/tasks` | Create task |
| GET | `/api/projects/:projectId/tasks` | List tasks on a board |
| PUT | `/api/tasks/:id` | Update title/description/status/assignee |
| DELETE | `/api/tasks/:id` | Delete task |
| POST | `/api/tasks/:taskId/comments` | Add comment |
| GET | `/api/tasks/:taskId/comments` | List comments |

All routes except register/login need an `Authorization: Bearer <token>` header.

## What I learned

- How login/auth actually works under the hood (hashing, JWT, middleware)
- Designing a data model where things reference each other
  (User -> Project -> Task -> Comment)
- Building a REST API with separate routes per resource
- Connecting a plain JS frontend to a backend with `fetch`
- That "backend" really just means "the server is in charge of the data" -
  the storage technology underneath (file, MongoDB, etc.) is a separate
  decision

## Possible next steps

- Swap the JSON file for a real database like MongoDB (the code is
  already structured so only `store.js` would need to change)
- Real-time updates with Socket.io (the bonus from the task sheet)
- Due dates and labels on cards
- Deploying it live (Render/Railway for backend, Netlify/Vercel for frontend)
