// utils/sendMail.js
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false, // true for 465, false for 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendMail({ to, subject, html }) {
  const info = await transporter.sendMail({
    from: `"Vikramshila Automobiles" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
  });
  console.log("Message sent: %s", info.messageId);
}

module.exports = sendMail;
