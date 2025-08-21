const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587", 10),
  secure: false,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

exports.sendMail = async ({ to, subject, html }) => {
  return transporter.sendMail({ from: `Vikramshila <${process.env.SMTP_USER}>`, to, subject, html });
};
