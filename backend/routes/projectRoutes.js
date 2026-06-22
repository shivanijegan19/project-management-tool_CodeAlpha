const express = require("express");
const crypto = require("crypto");
const { readDb, writeDb } = require("../utils/store");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

function populateUser(db, id) {
  const u = db.users.find((x) => x._id === id);
  return u ? { _id: u._id, name: u.name, email: u.email } : null;
}

function populateProject(db, project) {
  return {
    ...project,
    owner: populateUser(db, project.owner),
    members: project.members.map((id) => populateUser(db, id)).filter(Boolean),
  };
}

// POST /api/projects - create a new project (creator becomes owner + member)
router.post("/", protect, (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ message: "Project name is required" });

    const db = readDb();
    const project = {
      _id: crypto.randomUUID(),
      name,
      description: description || "",
      owner: req.user._id,
      members: [req.user._id],
      createdAt: new Date().toISOString(),
    };

    db.projects.push(project);
    writeDb(db);

    res.status(201).json(populateProject(db, project));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/projects - list every project the logged-in user belongs to
router.get("/", protect, (req, res) => {
  try {
    const db = readDb();
    const projects = db.projects
      .filter((p) => p.members.includes(req.user._id))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map((p) => populateProject(db, p));

    res.json(projects);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/projects/:id - get one project's details
router.get("/:id", protect, (req, res) => {
  try {
    const db = readDb();
    const project = db.projects.find((p) => p._id === req.params.id);
    if (!project) return res.status(404).json({ message: "Project not found" });

    if (!project.members.includes(req.user._id)) {
      return res.status(403).json({ message: "You are not a member of this project" });
    }

    res.json(populateProject(db, project));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/projects/:id/members - owner adds a teammate by email
router.put("/:id/members", protect, (req, res) => {
  try {
    const { email } = req.body;
    const db = readDb();
    const project = db.projects.find((p) => p._id === req.params.id);
    if (!project) return res.status(404).json({ message: "Project not found" });

    if (project.owner !== req.user._id) {
      return res.status(403).json({ message: "Only the project owner can add members" });
    }

    const userToAdd = db.users.find((u) => u.email === email);
    if (!userToAdd) return res.status(404).json({ message: "No user found with that email" });

    if (project.members.includes(userToAdd._id)) {
      return res.status(400).json({ message: "That user is already a member" });
    }

    project.members.push(userToAdd._id);
    writeDb(db);

    res.json(populateProject(db, project));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE /api/projects/:id - owner deletes the project and everything in it
router.delete("/:id", protect, (req, res) => {
  try {
    const db = readDb();
    const project = db.projects.find((p) => p._id === req.params.id);
    if (!project) return res.status(404).json({ message: "Project not found" });

    if (project.owner !== req.user._id) {
      return res.status(403).json({ message: "Only the project owner can delete this project" });
    }

    const taskIds = db.tasks.filter((t) => t.project === project._id).map((t) => t._id);
    db.comments = db.comments.filter((c) => !taskIds.includes(c.task));
    db.tasks = db.tasks.filter((t) => t.project !== project._id);
    db.projects = db.projects.filter((p) => p._id !== project._id);
    writeDb(db);

    res.json({ message: "Project deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
