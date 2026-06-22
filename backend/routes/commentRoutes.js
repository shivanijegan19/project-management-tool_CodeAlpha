const express = require("express");
const crypto = require("crypto");
const { readDb, writeDb } = require("../utils/store");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

function populateUser(db, id) {
  const u = db.users.find((x) => x._id === id);
  return u ? { _id: u._id, name: u.name, email: u.email } : null;
}

// POST /api/tasks/:taskId/comments - leave a comment on a task card
router.post("/api/tasks/:taskId/comments", protect, (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ message: "Comment text is required" });

    const db = readDb();
    const task = db.tasks.find((t) => t._id === req.params.taskId);
    if (!task) return res.status(404).json({ message: "Task not found" });

    const project = db.projects.find((p) => p._id === task.project);
    if (!project || !project.members.includes(req.user._id)) {
      return res.status(403).json({ message: "You are not a member of this project" });
    }

    const comment = {
      _id: crypto.randomUUID(),
      text,
      task: req.params.taskId,
      author: req.user._id,
      createdAt: new Date().toISOString(),
    };

    db.comments.push(comment);
    writeDb(db);

    res.status(201).json({ ...comment, author: populateUser(db, comment.author) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/tasks/:taskId/comments - all comments on one task, oldest first
router.get("/api/tasks/:taskId/comments", protect, (req, res) => {
  try {
    const db = readDb();
    const comments = db.comments
      .filter((c) => c.task === req.params.taskId)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
      .map((c) => ({ ...c, author: populateUser(db, c.author) }));

    res.json(comments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
