import mongoose from "mongoose";

const VisitSchema = new mongoose.Schema({
  ip: { type: String, index: true },
  page: { type: String },
  referrer: { type: String },
  userAgent: { type: String },

  device: {
    type: String, // mobile / desktop / tablet
  },
  browser: String,
  os: String,

  city: String,
  state: String,
  country: { type: String, default: "India" },

  isUnique: { type: Boolean, default: false },

  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

export default mongoose.model("Visit", VisitSchema);
