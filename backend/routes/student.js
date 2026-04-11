const router = require("express").Router();
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { pool } = require("../db");
const { sendMail } = require("../utils/mailer");
const { generateToken, studentOnly } = require("../middleware/auth");

// ── Register ──────────────────────────────────────────────────────────────────
router.post("/register", async (req, res) => {
  try {
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
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING id, name, email, roll_number, class, section, phone, address`,
      [name, email, hashed, roll_number, cls, section, phone || null, address || null]
    );

    const student = result.rows[0];

    const token = generateToken({
      id: student.id,
      role: "student",
      email: student.email,
    });

    res.status(201).json({ message: "Registered successfully", token, student });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ── Login ─────────────────────────────────────────────────────────────────────
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await pool.query(
      "SELECT * FROM students WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ message: "Student not found" });

    const student = result.rows[0];

    const isMatch = await bcrypt.compare(password, student.password);
    if (!isMatch)
      return res.status(401).json({ message: "Invalid password" });

    const { password: _, ...safe } = student;

    const token = generateToken({
      id: student.id,
      role: "student",
      email: student.email,
    });

    res.json({ message: "Login successful", token, student: safe });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ── Forgot Password ───────────────────────────────────────────────────────────
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    const result = await pool.query(
      "SELECT id FROM students WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ message: "No student with that email" });

    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000);

    await pool.query(
      "DELETE FROM reset_tokens WHERE email = $1 AND role = 'student'",
      [email]
    );

    await pool.query(
      `INSERT INTO reset_tokens (email, role, token, expires_at)
       VALUES ($1,$2,$3,$4)`,
      [email, "student", token, expires]
    );

    

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

    const result = await pool.query(
      "SELECT * FROM reset_tokens WHERE token = $1 AND role = 'student'",
      [token]
    );

    if (result.rows.length === 0)
      return res.status(400).json({ message: "Invalid token" });

    const record = result.rows[0];

    if (new Date(record.expires_at) < new Date())
      return res.status(400).json({ message: "Token expired" });

    const hashed = await bcrypt.hash(new_password, 10);

    await pool.query(
      "UPDATE students SET password = $1 WHERE email = $2",
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

// ── Change Password ───────────────────────────────────────────────────────────
router.put("/change-password", studentOnly, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;

    const result = await pool.query(
      "SELECT * FROM students WHERE id = $1",
      [req.user.id]
    );

    const student = result.rows[0];

    const isMatch = await bcrypt.compare(current_password, student.password);
    if (!isMatch)
      return res.status(401).json({ message: "Current password incorrect" });

    const hashed = await bcrypt.hash(new_password, 10);

    await pool.query(
      "UPDATE students SET password = $1 WHERE id = $2",
      [hashed, req.user.id]
    );

    res.json({ message: "Password changed successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ── Get Profile ───────────────────────────────────────────────────────────────
router.get("/profile", studentOnly, async (req, res) => {
  const result = await pool.query(
    `SELECT id, name, email, roll_number, class, section, phone, address, created_at
     FROM students WHERE id = $1`,
    [req.user.id]
  );

  res.json(result.rows[0]);
});

// ── Edit Profile ──────────────────────────────────────────────────────────────
router.put("/profile", studentOnly, async (req, res) => {
  const { name, phone, address } = req.body;

  await pool.query(
    "UPDATE students SET name=$1, phone=$2, address=$3 WHERE id=$4",
    [name, phone || null, address || null, req.user.id]
  );

  const result = await pool.query(
    "SELECT id, name, email, roll_number, class, section, phone, address FROM students WHERE id = $1",
    [req.user.id]
  );

  res.json({ message: "Profile updated", student: result.rows[0] });
});

// ── My Fees ───────────────────────────────────────────────────────────────────
router.get("/fees", studentOnly, async (req, res) => {
  const result = await pool.query(
    "SELECT * FROM fees WHERE student_id = $1 ORDER BY due_date DESC",
    [req.user.id]
  );

  res.json(result.rows);
});

// ── My Attendance ─────────────────────────────────────────────────────────────
router.get("/attendance", studentOnly, async (req, res) => {
  const result = await pool.query(
    "SELECT * FROM attendance WHERE student_id = $1 ORDER BY date DESC",
    [req.user.id]
  );

  res.json(result.rows);
});

module.exports = router;