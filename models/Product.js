const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
   price: { type: Number, required: true, min: 0 },
    category: { type: String },
    images: [{ type: String }],
    brochureFile: { type: String },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
