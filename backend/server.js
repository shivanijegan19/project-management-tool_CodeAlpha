require("dotenv").config();
const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const projectRoutes = require("./routes/projectRoutes");
const taskRoutes = require("./routes/taskRoutes");
const commentRoutes = require("./routes/commentRoutes");

const app = express();

// Allow the frontend (a different file/port) to call this API
app.use(cors());

// Lets us read JSON sent in request bodies, e.g. req.body.email
app.use(express.json());

// Simple health check - visiting this URL confirms the server is alive
app.get("/", (req, res) => {
  res.send("Project Management Tool API is running");
});

app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use(taskRoutes); // defines /api/projects/:projectId/tasks and /api/tasks/:id
app.use(commentRoutes); // defines /api/tasks/:taskId/comments

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Data is being saved to backend/data/db.json`);
});
