const router = require("express").Router();
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { pool } = require("../db");
const { sendMail } = require("../utils/mailer");
const { generateToken, adminOnly } = require("../middleware/auth");

// ── Login ─────────────────────────────────────────────────────────────────────
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "Email and password required" });

    const result = await pool.query(
      "SELECT * FROM admins WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ message: "Admin not found" });

    const admin = result.rows[0];

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch)
      return res.status(401).json({ message: "Invalid password" });

    const { password: _, ...safe } = admin;
    const token = generateToken({
      id: admin.id,
      role: "admin",
      email: admin.email,
    });

    res.json({ message: "Login successful", token, admin: safe });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ── Create New Admin ──────────────────────────────────────────────────────────
router.post("/create", adminOnly, async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ message: "Required fields missing" });

    // Check existing admin
    const exists = await pool.query(
      "SELECT id FROM admins WHERE email = $1",
      [email]
    );

    if (exists.rows.length > 0)
      return res.status(409).json({ message: "Admin already exists" });

    const hashed = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO admins (name, email, password, phone)
       VALUES ($1,$2,$3,$4)
       RETURNING id, name, email, phone`,
      [name, email, hashed, phone || null]
    );

    res.status(201).json({
      message: "Admin created successfully",
      admin: result.rows[0],
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});
// ── Forgot Password ───────────────────────────────────────────────────────────
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email)
      return res.status(400).json({ message: "Email required" });

    const result = await pool.query(
      "SELECT id FROM admins WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ message: "No admin with that email" });

    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000);

    await pool.query(
      "DELETE FROM reset_tokens WHERE email = $1 AND role = 'admin'",
      [email]
    );

    await pool.query(
      `INSERT INTO reset_tokens (email, role, token, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [email, "admin", token, expires]
    );

    const { sendMail } = require("../utils/mailer");

const resetLink = `http://localhost:3000/reset-password.html?token=${token}`;

await sendMail(
  email,
  "Password Reset Request",
  `
  <h2>Password Reset</h2>
  <p>You requested a password reset.</p>
  <p>Your password change token is:</p>
  <p><b>${token}</b></p>
  <p>This token expires in 1 hour.</p>
  `
);

    res.json({
      message: "Reset token generated",
      reset_token: token,
      note: "In production this would be emailed",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ── Reset Password ────────────────────────────────────────────────────────────
router.post("/reset-password", async (req, res) => {
  try {
    const { token, new_password } = req.body;
    if (!token || !new_password)
      return res.status(400).json({ message: "Token and new password required" });

    const result = await pool.query(
      "SELECT * FROM reset_tokens WHERE token = $1 AND role = 'admin'",
      [token]
    );

    if (result.rows.length === 0)
      return res.status(400).json({ message: "Invalid token" });

    const record = result.rows[0];

    if (new Date(record.expires_at) < new Date())
      return res.status(400).json({ message: "Token expired" });

    const hashed = await bcrypt.hash(new_password, 10);

    await pool.query(
      "UPDATE admins SET password = $1 WHERE email = $2",
      [hashed, record.email]
    );

    await pool.query(
      "DELETE FROM reset_tokens WHERE token = $1",
      [token]
    );

    res.json({ message: "Password reset successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ── Get Admin Profile ─────────────────────────────────────────────────────────
router.get("/profile", adminOnly, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, email, phone, created_at FROM admins WHERE id = $1",
      [req.user.id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ── Edit Admin Profile ────────────────────────────────────────────────────────
router.put("/profile", adminOnly, async (req, res) => {
  try {
    const { name, phone } = req.body;
    if (!name)
      return res.status(400).json({ message: "Name is required" });

    await pool.query(
      "UPDATE admins SET name = $1, phone = $2 WHERE id = $3",
      [name, phone || null, req.user.id]
    );

    const result = await pool.query(
      "SELECT id, name, email, phone, created_at FROM admins WHERE id = $1",
      [req.user.id]
    );

    res.json({ message: "Profile updated", admin: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get all admins
router.get("/", adminOnly, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, email, phone, created_at
      FROM admins
      ORDER BY created_at DESC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ════════════════════════════════════════════════════════════
// STUDENT MANAGEMENT
// ════════════════════════════════════════════════════════════

// List all students
router.get("/students", adminOnly, async (req, res) => {
  const result = await pool.query(
    `SELECT id, name, email, roll_number, class, section, phone, address, created_at
     FROM students ORDER BY created_at DESC`
  );
  res.json(result.rows);
});

// View single student
router.get("/students/:id", adminOnly, async (req, res) => {
  const result = await pool.query(
    `SELECT id, name, email, roll_number, class, section, phone, address, created_at
     FROM students WHERE id = $1`,
    [req.params.id]
  );

  if (result.rows.length === 0)
    return res.status(404).json({ message: "Student not found" });

  res.json(result.rows[0]);
});

// Add student
router.post("/students", adminOnly, async (req, res) => {
  const { name, email, password, roll_number, class: cls, section, phone, address } = req.body;

  if (!name || !email || !password || !roll_number || !cls || !section)
    return res.status(400).json({ message: "Required fields missing" });

  const exists = await pool.query(
    "SELECT id FROM students WHERE email = $1 OR roll_number = $2",
    [email, roll_number]
  );

  if (exists.rows.length > 0)
    return res.status(409).json({ message: "Email or roll number already exists" });

  const hashed = await bcrypt.hash(password, 10);

  const result = await pool.query(
    `INSERT INTO students (name, email, password, roll_number, class, section, phone, address)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id, name, email, roll_number, class, section, phone, address`,
    [name, email, hashed, roll_number, cls, section, phone || null, address || null]
  );

  res.status(201).json({ message: "Student added", student: result.rows[0] });
});

// Update student
router.put("/students/:id", adminOnly, async (req, res) => {
  const { name, email, roll_number, class: cls, section, phone, address } = req.body;

  const result = await pool.query(
    "SELECT id FROM students WHERE id = $1",
    [req.params.id]
  );

  if (result.rows.length === 0)
    return res.status(404).json({ message: "Student not found" });

  const conflict = await pool.query(
    "SELECT id FROM students WHERE (email = $1 OR roll_number = $2) AND id != $3",
    [email, roll_number, req.params.id]
  );

  if (conflict.rows.length > 0)
    return res.status(409).json({ message: "Conflict exists" });

  await pool.query(
    `UPDATE students SET name=$1,email=$2,roll_number=$3,class=$4,section=$5,phone=$6,address=$7 WHERE id=$8`,
    [name, email, roll_number, cls, section, phone || null, address || null, req.params.id]
  );

  res.json({ message: "Student updated" });
});

// Delete student
router.delete("/students/:id", adminOnly, async (req, res) => {
  await pool.query("DELETE FROM students WHERE id = $1", [req.params.id]);
  res.json({ message: "Student deleted" });
});

module.exports = router;