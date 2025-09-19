import mongoose from "mongoose";

const locationPointSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true, required: true },
    ts: { type: Date, index: true, required: true },
    lat: Number,
    lon: Number,
    acc: Number,
    speed: Number,
    heading: Number,
    battery: Number,
    provider: String
  },
  { timestamps: true }
);

// 30-day TTL example (auto-delete old points):
// locationPointSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });

export default mongoose.model("LocationPoint", locationPointSchema);
