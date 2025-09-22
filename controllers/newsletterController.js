const Newsletter = require("../models/newsletter");

exports.subscribe = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email is required" });
    }

    // Check if email already exists
    const existing = await Newsletter.findOne({ email });
    if (existing) {
      return res
        .status(200)
        .json({ success: true, message: "Already subscribed" });
    }

    // Create new subscription
    await Newsletter.create({ email });
    res.status(201).json({ success: true, message: "Subscribed successfully" });
  } catch (err) {
    console.error("Subscribe error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
    