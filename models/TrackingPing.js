// models/TrackingPing.js
import mongoose from "mongoose";

const TrackingPingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
      required: true,
    },
    deviceId: { type: String },
    speed: { type: Number }, // optional (m/s or km/h)
    accuracy: { type: Number }, // optional (meters)
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], index: "2dsphere", required: true }, // [lng, lat]
    },
  },
  { timestamps: true }
);

export default mongoose.model("TrackingPing", TrackingPingSchema);
