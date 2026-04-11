const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS   // App password (NOT your real password)
  }
});

async function sendMail(to, subject, html) {
  await transporter.sendMail({
    from: `"School Admin" <${process.env.MAIL_USER}>`,
    to,
    subject,
    html
  });
}

module.exports = { sendMail };
