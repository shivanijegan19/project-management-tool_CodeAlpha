const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("./config");

// Creates a login token that stores the user's id, valid for 7 days
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: "7d" });
};

module.exports = generateToken;
