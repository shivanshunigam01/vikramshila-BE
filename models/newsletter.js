const mongoose = require("mongoose");

const newsletterSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

// Use singleton pattern to prevent OverwriteModelError
module.exports =
  mongoose.models.Newsletter || mongoose.model("Newsletter", newsletterSchema);
