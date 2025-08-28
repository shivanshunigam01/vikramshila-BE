// utils/mailer.js
const nodemailer = require("nodemailer");

// Configure your SMTP transporter
const transporter = nodemailer.createTransport({
  host: "smtp.example.com", // e.g., smtp.gmail.com
  port: 587, // 465 for SSL
  secure: false, // true if port 465
  auth: {
    user: "your_email@example.com",
    pass: "your_email_password",
  },
});

async function sendMail({ to, subject, text, html }) {
  try {
    const info = await transporter.sendMail({
      from: '"Vikramshila Automobiles" <your_email@example.com>',
      to,
      subject,
      text,
      html,
    });
    console.log("Email sent:", info.messageId);
    return info;
  } catch (err) {
    console.error("Email send error:", err);
    throw err;
  }
}

module.exports = { sendMail };
