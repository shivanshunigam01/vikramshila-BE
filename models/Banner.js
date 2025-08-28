const mongoose = require("mongoose");

const bannerSchema = new mongoose.Schema({
  imageUrl: { type: String, required: true },
  publicId: { type: String, required: true }, // Cloudinary public_id
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Banner", bannerSchema);
