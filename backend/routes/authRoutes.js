const express = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { readDb, writeDb } = require("../utils/store");
const generateToken = require("../utils/generateToken");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// POST /api/auth/register - create a new account
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Please fill in all fields" });
    }

    const db = readDb();

    if (db.users.find((u) => u.email === email)) {
      return res.status(400).json({ message: "An account with this email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = {
      _id: crypto.randomUUID(),
      name,
      email,
      password: hashedPassword,
      createdAt: new Date().toISOString(),
    };

    db.users.push(user);
    writeDb(db);

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/auth/login - log in with email + password
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const db = readDb();
    const user = db.users.find((u) => u.email === email);

    if (user && (await bcrypt.compare(password, user.password))) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: "Invalid email or password" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/auth/me - get the logged-in user's own profile
router.get("/me", protect, (req, res) => {
  res.json(req.user);
});

// GET /api/auth/users - simple list so a project owner can pick members
router.get("/users", protect, (req, res) => {
  const db = readDb();
  res.json(db.users.map((u) => ({ _id: u._id, name: u.name, email: u.email })));
});

module.exports = router;
