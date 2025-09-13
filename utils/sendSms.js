const twilio = require("twilio");

const {
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_FROM_SMS, // e.g. +12025550123
  TWILIO_FROM_WHATSAPP, // e.g. whatsapp:+14155238886  (Twilio sandbox) OR just +14155238886 and we prepend
} = process.env;

let client = null;
if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
  client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
}

module.exports = async function sendSms({ to, body, via = "sms" }) {
  if (!client) {
    console.warn(
      "[sendSms] Twilio not configured; skipping send. To:",
      to,
      "Body:",
      body
    );
    return { sid: "dry-run" };
  }

  const isWhatsApp = via === "whatsapp";
  const from = isWhatsApp
    ? TWILIO_FROM_WHATSAPP?.startsWith("whatsapp:")
      ? TWILIO_FROM_WHATSAPP
      : `whatsapp:${TWILIO_FROM_WHATSAPP}`
    : TWILIO_FROM_SMS;

  const recipient = isWhatsApp
    ? to.startsWith("whatsapp:")
      ? to
      : `whatsapp:${to}`
    : to;

  return client.messages.create({
    to: recipient,
    from,
    body,
  });
};
