// utils/sendMail.js
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: Number(process.env.SMTP_PORT) === 465, // true for 465, false otherwise
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Send an email (supports attachments)
 * @param {Object} opts
 * @param {string|string[]} opts.to
 * @param {string} opts.subject
 * @param {string} [opts.html]
 * @param {string} [opts.text]
 * @param {Array}  [opts.attachments] - nodemailer attachments array
 * @param {string|string[]} [opts.cc]
 * @param {string|string[]} [opts.bcc]
 * @param {string} [opts.replyTo]
 */
async function sendMail({
  to,
  subject,
  html,
  text,
  attachments = [],
  cc,
  bcc,
  replyTo,
}) {
  const info = await transporter.sendMail({
    from:
      process.env.MAIL_FROM ||
      `"Vikramshila Automobiles" <${process.env.SMTP_USER}>`,
    to,
    cc,
    bcc,
    replyTo,
    subject,
    html,
    text,
    attachments, // <-- now supported
  });

  console.log("Message sent: %s", info.messageId);
  return info;
}

module.exports = sendMail;
module.exports.transporter = transporter; // optional: for transporter.verify()
