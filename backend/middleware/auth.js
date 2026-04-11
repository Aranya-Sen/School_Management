const jwt = require("jsonwebtoken");

const SECRET = process.env.JWT_SECRET || "school_secret_key_change_in_prod";

// ── Generate token ────────────────────────────────────────────────────────────
const generateToken = (payload) =>
  jwt.sign(payload, SECRET, { expiresIn: "8h" });

// ── Verify any logged-in user ─────────────────────────────────────────────────
const verifyToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer <token>

  if (!token) return res.status(401).json({ message: "No token provided" });

  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    return res.status(403).json({ message: "Invalid or expired token" });
  }
};

// ── Admin-only guard ──────────────────────────────────────────────────────────
const adminOnly = (req, res, next) => {
  verifyToken(req, res, () => {
    if (req.user.role !== "admin")
      return res.status(403).json({ message: "Admin access required" });
    next();
  });
};

// ── Student-only guard ────────────────────────────────────────────────────────
const studentOnly = (req, res, next) => {
  verifyToken(req, res, () => {
    if (req.user.role !== "student")
      return res.status(403).json({ message: "Student access required" });
    next();
  });
};

module.exports = { generateToken, verifyToken, adminOnly, studentOnly };
