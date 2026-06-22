const express = require("express");
const crypto = require("crypto");
const { readDb, writeDb } = require("../utils/store");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

function populateUser(db, id) {
  if (!id) return null;
  const u = db.users.find((x) => x._id === id);
  return u ? { _id: u._id, name: u.name, email: u.email } : null;
}

function populateTask(db, task) {
  return {
    ...task,
    assignedTo: populateUser(db, task.assignedTo),
    createdBy: populateUser(db, task.createdBy),
  };
}

// Confirms the requester belongs to the project; returns the project,
// null if it doesn't exist, or false if the user isn't a member
function ensureMember(db, projectId, userId) {
  const project = db.projects.find((p) => p._id === projectId);
  if (!project) return null;
  return project.members.includes(userId) ? project : false;
}

// POST /api/projects/:projectId/tasks - create a task card on a board
router.post("/api/projects/:projectId/tasks", protect, (req, res) => {
  try {
    const { title, description, assignedTo } = req.body;
    const db = readDb();
    const project = ensureMember(db, req.params.projectId, req.user._id);

    if (project === null) return res.status(404).json({ message: "Project not found" });
    if (project === false) return res.status(403).json({ message: "You are not a member of this project" });

    const task = {
      _id: crypto.randomUUID(),
      title,
      description: description || "",
      status: "todo",
      project: req.params.projectId,
      assignedTo: assignedTo || null,
      createdBy: req.user._id,
      createdAt: new Date().toISOString(),
    };

    db.tasks.push(task);
    writeDb(db);

    res.status(201).json(populateTask(db, task));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/projects/:projectId/tasks - all task cards for one board
router.get("/api/projects/:projectId/tasks", protect, (req, res) => {
  try {
    const db = readDb();
    const project = ensureMember(db, req.params.projectId, req.user._id);
    if (project === null) return res.status(404).json({ message: "Project not found" });
    if (project === false) return res.status(403).json({ message: "You are not a member of this project" });

    const tasks = db.tasks
      .filter((t) => t.project === req.params.projectId)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
      .map((t) => populateTask(db, t));

    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/tasks/:id - move a card between columns, reassign, or edit text
router.put("/api/tasks/:id", protect, (req, res) => {
  try {
    const db = readDb();
    const task = db.tasks.find((t) => t._id === req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });

    const project = ensureMember(db, task.project, req.user._id);
    if (project === false) return res.status(403).json({ message: "You are not a member of this project" });

    const { title, description, status, assignedTo } = req.body;
    if (title !== undefined) task.title = title;
    if (description !== undefined) task.description = description;
    if (status !== undefined) task.status = status;
    if (assignedTo !== undefined) task.assignedTo = assignedTo || null;

    writeDb(db);
    res.json(populateTask(db, task));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE /api/tasks/:id - remove a card and its comments
router.delete("/api/tasks/:id", protect, (req, res) => {
  try {
    const db = readDb();
    const task = db.tasks.find((t) => t._id === req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });

    const project = ensureMember(db, task.project, req.user._id);
    if (project === false) return res.status(403).json({ message: "You are not a member of this project" });

    db.comments = db.comments.filter((c) => c.task !== task._id);
    db.tasks = db.tasks.filter((t) => t._id !== task._id);
    writeDb(db);

    res.json({ message: "Task deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
