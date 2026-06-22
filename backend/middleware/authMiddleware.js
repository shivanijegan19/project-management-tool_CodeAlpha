const jwt = require("jsonwebtoken");
const { readDb } = require("../utils/store");
const { JWT_SECRET } = require("../utils/config");

// Checks the Authorization header for a valid token before letting
// the request reach the actual route handler
const protect = (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, JWT_SECRET);

      const db = readDb();
      const user = db.users.find((u) => u._id === decoded.id);

      if (!user) {
        return res.status(401).json({ message: "User no longer exists" });
      }

      // Attach the logged-in user to the request, minus the password
      req.user = { _id: user._id, name: user.name, email: user.email };
      next();
    } catch (error) {
      res.status(401).json({ message: "Not authorized, token failed" });
    }
  } else {
    res.status(401).json({ message: "Not authorized, no token provided" });
  }
};

module.exports = { protect };
