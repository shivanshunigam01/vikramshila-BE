const { SmsClient } = require("@sinch/sms");

const smsClient = new SmsClient({
  projectId: process.env.SINCH_PROJECT_ID,
  keyId: process.env.SINCH_KEY_ID,
  keySecret: process.env.SINCH_KEY_SECRET,
});

module.exports = smsClient;
