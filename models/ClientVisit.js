// models/ClientVisit.js
import mongoose from "mongoose";

const clientVisitSchema = new mongoose.Schema(
  {
    dse: { type: mongoose.Schema.Types.ObjectId, ref: "Dse", default: null },
    dseName: { type: String, default: "" },     // stored for convenience
    dsePhone: { type: String, default: "" },    // stored for convenience
    clientName: { type: String, required: true },
    location: {
      lat: { type: Number, required: true },
      lon: { type: Number, required: true },
      acc: { type: Number, default: null },
    },
    photoUrl: { type: String, required: true },
    photoPublicId: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("ClientVisit", clientVisitSchema);
