const router = require("express").Router();
const { pool } = require("../db");
const { adminOnly } = require("../middleware/auth");

// ── List all fees (optional filter) ──────────────────────────────────────────
router.get("/", adminOnly, async (req, res) => {
  try {
    const { student_id } = req.query;

    let result;

    if (student_id) {
      result = await pool.query(
        `SELECT f.*, s.name AS student_name, s.roll_number
         FROM fees f
         JOIN students s ON f.student_id = s.id
         WHERE f.student_id = $1
         ORDER BY f.due_date DESC`,
        [student_id]
      );
    } else {
      result = await pool.query(
        `SELECT f.*, s.name AS student_name, s.roll_number
         FROM fees f
         JOIN students s ON f.student_id = s.id
         ORDER BY f.due_date DESC`
      );
    }

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ── Get single fee ────────────────────────────────────────────────────────────
router.get("/:id", adminOnly, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT f.*, s.name AS student_name, s.roll_number
       FROM fees f
       JOIN students s ON f.student_id = s.id
       WHERE f.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ message: "Fee record not found" });

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ── Add fee ──────────────────────────────────────────────────────────────────
router.post("/", adminOnly, async (req, res) => {
  try {
    const { student_id, amount, description, due_date, status, paid_date } = req.body;

    if (!student_id || !amount || !description || !due_date)
      return res.status(400).json({
        message: "student_id, amount, description, due_date are required",
      });

    const student = await pool.query(
      "SELECT id FROM students WHERE id = $1",
      [student_id]
    );

    if (student.rows.length === 0)
      return res.status(404).json({ message: "Student not found" });

    const result = await pool.query(
      `INSERT INTO fees (student_id, amount, description, due_date, status, paid_date)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING *`,
      [student_id, amount, description, due_date, status || "pending", paid_date || null]
    );

    res.status(201).json({
      message: "Fee record added",
      fee: result.rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ── Update fee ───────────────────────────────────────────────────────────────
router.put("/:id", adminOnly, async (req, res) => {
  try {
    const { amount, description, due_date, status, paid_date } = req.body;

    const check = await pool.query(
      "SELECT id FROM fees WHERE id = $1",
      [req.params.id]
    );

    if (check.rows.length === 0)
      return res.status(404).json({ message: "Fee record not found" });

    const result = await pool.query(
      `UPDATE fees
       SET amount=$1, description=$2, due_date=$3, status=$4, paid_date=$5
       WHERE id=$6
       RETURNING *`,
      [amount, description, due_date, status, paid_date || null, req.params.id]
    );

    res.json({
      message: "Fee updated",
      fee: result.rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ── Delete fee ───────────────────────────────────────────────────────────────
router.delete("/:id", adminOnly, async (req, res) => {
  try {
    const check = await pool.query(
      "SELECT id FROM fees WHERE id = $1",
      [req.params.id]
    );

    if (check.rows.length === 0)
      return res.status(404).json({ message: "Fee record not found" });

    await pool.query(
      "DELETE FROM fees WHERE id = $1",
      [req.params.id]
    );

    res.json({ message: "Fee deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;