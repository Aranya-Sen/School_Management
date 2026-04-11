const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../frontend")));

app.use("/api/student", require("./routes/student"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/fees", require("./routes/fees"));
app.use("/api/attendance", require("./routes/attendance"));

const { pool, initDB } = require("./db");
const bcrypt = require("bcryptjs");

// ─── Seed Admin ────────────────────────────────────────────────────────────
const seedAdmin = async () => {
  const result = await pool.query(
    "SELECT id FROM admins WHERE email = $1",
    ["admin@school.com"]
  );

  if (result.rows.length === 0) {
    const hashedPassword = await bcrypt.hash("admin123", 10);

    await pool.query(
      `INSERT INTO admins (name, email, password, phone)
       VALUES ($1, $2, $3, $4)`,
      ["Super Admin", "admin@school.com", hashedPassword, "0000000000"]
    );

    console.log("✅ Default admin seeded");
  }
};

// ─── Start Server (CORRECT ORDER) ──────────────────────────────────────────
const startServer = async () => {
  await initDB();      // 1️⃣ Create tables
  await seedAdmin();  // 2️⃣ Insert admin

  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
};

startServer();

// Catch-all
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});