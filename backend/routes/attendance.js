const router = require("express").Router();
const { pool } = require("../db");
const { adminOnly } = require("../middleware/auth");

// ── List all attendance (optional filter) ────────────────────────────────────
router.get("/", adminOnly, async (req, res) => {
  try {
    const { student_id } = req.query;

    let result;

    if (student_id) {
      result = await pool.query(
        `SELECT a.*, s.name AS student_name, s.roll_number
         FROM attendance a
         JOIN students s ON a.student_id = s.id
         WHERE a.student_id = $1
         ORDER BY a.date DESC`,
        [student_id]
      );
    } else {
      result = await pool.query(
        `SELECT a.*, s.name AS student_name, s.roll_number
         FROM attendance a
         JOIN students s ON a.student_id = s.id
         ORDER BY a.date DESC`
      );
    }

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ── Get single attendance ─────────────────────────────────────────────────────
router.get("/:id", adminOnly, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.*, s.name AS student_name, s.roll_number
       FROM attendance a
       JOIN students s ON a.student_id = s.id
       WHERE a.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ message: "Attendance record not found" });

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ── Add attendance ────────────────────────────────────────────────────────────
router.post("/", adminOnly, async (req, res) => {
  try {
    const { student_id, date, status } = req.body;

    if (!student_id || !date)
      return res.status(400).json({ message: "student_id and date are required" });

    const student = await pool.query(
      "SELECT id FROM students WHERE id = $1",
      [student_id]
    );

    if (student.rows.length === 0)
      return res.status(404).json({ message: "Student not found" });

    const existing = await pool.query(
      "SELECT id FROM attendance WHERE student_id = $1 AND date = $2",
      [student_id, date]
    );

    if (existing.rows.length > 0)
      return res.status(409).json({
        message: "Attendance already recorded for this student on this date",
      });

    const result = await pool.query(
      `INSERT INTO attendance (student_id, date, status)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [student_id, date, status || "present"]
    );

    res.status(201).json({
      message: "Attendance recorded",
      attendance: result.rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ── Edit attendance ───────────────────────────────────────────────────────────
router.put("/:id", adminOnly, async (req, res) => {
  try {
    const { status, date } = req.body;

    const result = await pool.query(
      "SELECT * FROM attendance WHERE id = $1",
      [req.params.id]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ message: "Attendance record not found" });

    const record = result.rows[0];

    // Check duplicate if date changes
    if (date && date !== record.date) {
      const conflict = await pool.query(
        `SELECT id FROM attendance
         WHERE student_id = $1 AND date = $2 AND id != $3`,
        [record.student_id, date, req.params.id]
      );

      if (conflict.rows.length > 0)
        return res.status(409).json({
          message: "Attendance already exists for that date",
        });
    }

    const updated = await pool.query(
      `UPDATE attendance
       SET status = $1, date = $2
       WHERE id = $3
       RETURNING *`,
      [status || record.status, date || record.date, req.params.id]
    );

    res.json({
      message: "Attendance updated",
      attendance: updated.rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ── Delete attendance ─────────────────────────────────────────────────────────
router.delete("/:id", adminOnly, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id FROM attendance WHERE id = $1",
      [req.params.id]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ message: "Record not found" });

    await pool.query(
      "DELETE FROM attendance WHERE id = $1",
      [req.params.id]
    );

    res.json({ message: "Attendance deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ── Bulk Attendance (Roll Call Style) ─────────────────────────────
router.post("/bulk", adminOnly, async (req, res) => {
  try {
    const { date, records } = req.body;

    if (!date || !records || !Array.isArray(records)) {
      return res.status(400).json({ message: "Invalid data" });
    }

    for (let r of records) {
      const { student_id, status } = r;

      // Skip invalid
      if (!student_id) continue;

      // Check if already exists
      const exists = await pool.query(
        "SELECT id FROM attendance WHERE student_id=$1 AND date=$2",
        [student_id, date]
      );

      if (exists.rows.length > 0) {
        // Update instead of error
        await pool.query(
          "UPDATE attendance SET status=$1 WHERE student_id=$2 AND date=$3",
          [status, student_id, date]
        );
      } else {
        // Insert new
        await pool.query(
          "INSERT INTO attendance (student_id, date, status) VALUES ($1,$2,$3)",
          [student_id, date, status || "present"]
        );
      }
    }

    res.json({ message: "Bulk attendance saved" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;