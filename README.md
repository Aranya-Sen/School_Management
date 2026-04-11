# 🏫 School Management System

A full-stack School Management System built with **Node.js + Express + SQLite** backend and **vanilla HTML/CSS/JS** frontend.

---

## 📁 Project Structure

```
school-management/
├── backend/
│   ├── server.js           # Entry point
│   ├── db.js               # SQLite setup & schema
│   ├── school.db           # Auto-generated database file
│   ├── package.json
│   ├── middleware/
│   │   └── auth.js         # JWT middleware
│   └── routes/
│       ├── student.js      # Student auth & self-service routes
│       ├── admin.js        # Admin auth & student management
│       ├── fees.js         # Fee management
│       └── attendance.js   # Attendance management
└── frontend/
    ├── index.html          # Login / Register page
    ├── student/
    │   └── dashboard.html  # Student portal
    ├── admin/
    │   └── dashboard.html  # Admin panel
    └── assets/
        ├── css/style.css
        └── js/api.js
```

---

## Deployed Link
---
https://school-management-kb90.onrender.com/
---

## 🔑 Default Credentials

| Role  | Email               | Password  |
|-------|---------------------|-----------|
| Admin | admin@school.com    | admin123  |

> The default admin is seeded automatically on first startup.

---

## 📌 API Endpoints

### Student
| Method | Endpoint                        | Auth     | Description           |
|--------|---------------------------------|----------|-----------------------|
| POST   | /api/student/register           | None     | Register new student  |
| POST   | /api/student/login              | None     | Student login         |
| POST   | /api/student/forgot-password    | None     | Get reset token       |
| POST   | /api/student/reset-password     | None     | Reset via token       |
| PUT    | /api/student/change-password    | Student  | Change password       |
| GET    | /api/student/profile            | Student  | Get own profile       |
| PUT    | /api/student/profile            | Student  | Edit profile          |
| GET    | /api/student/fees               | Student  | View own fees         |
| GET    | /api/student/attendance         | Student  | View own attendance   |

### Admin
| Method | Endpoint                        | Auth  | Description          |
|--------|---------------------------------|-------|----------------------|
| POST   | /api/admin/login                | None  | Admin login          |
| POST   | /api/admin/forgot-password      | None  | Get reset token      |
| POST   | /api/admin/reset-password       | None  | Reset via token      |
| GET    | /api/admin/profile              | Admin | Get admin profile    |
| PUT    | /api/admin/profile              | Admin | Edit admin profile   |
| GET    | /api/admin/students             | Admin | List all students    |
| GET    | /api/admin/students/:id         | Admin | View student profile |
| POST   | /api/admin/students             | Admin | Add new student      |
| PUT    | /api/admin/students/:id         | Admin | Edit student         |
| DELETE | /api/admin/students/:id         | Admin | Delete student       |

### Fees
| Method | Endpoint             | Auth  | Description                        |
|--------|----------------------|-------|------------------------------------|
| GET    | /api/fees            | Admin | List all (filter: ?student_id=X)   |
| GET    | /api/fees/:id        | Admin | Single fee record                  |
| POST   | /api/fees            | Admin | Add fee                            |
| PUT    | /api/fees/:id        | Admin | Update fee                         |
| DELETE | /api/fees/:id        | Admin | Delete fee                         |

### Attendance
| Method | Endpoint                 | Auth  | Description                      |
|--------|--------------------------|-------|----------------------------------|
| GET    | /api/attendance          | Admin | List all (filter: ?student_id=X) |
| GET    | /api/attendance/:id      | Admin | Single record                    |
| POST   | /api/attendance          | Admin | Record attendance                |
| PUT    | /api/attendance/:id      | Admin | Edit attendance                  |
| DELETE | /api/attendance/:id      | Admin | Delete record                    |

---

## 🛡️ Security Notes

- Passwords hashed with **bcryptjs** (salt rounds: 10)
- Auth via **JWT** (8h expiry), passed as `Authorization: Bearer <token>`
- Password reset tokens expire in **1 hour**
- In production: set `JWT_SECRET` env variable and send reset tokens via email (nodemailer is included)

