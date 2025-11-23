// models/Planner.js
import mongoose from "mongoose";

const plannerSchema = new mongoose.Schema(
  {
    // Which DSE
    dseId: { type: mongoose.Schema.Types.ObjectId, ref: "Dse", default: null },
    dseCode: { type: String, default: "" },
    dseName: { type: String, default: "" },

    // Visit details
    visitDate: { type: Date, required: true },
    visitTime: { type: String, default: "" }, // "10:30"
    customerName: { type: String, default: "" },
    customerPhone: { type: String, default: "" },
    location: { type: String, default: "" },
    purpose: { type: String, default: "" },
    notes: { type: String, default: "" },

    placeType: {
      type: String,
      enum: ["prospect", "existing", "lead", "other"],
      default: "prospect",
    },

    // Status tracking
    status: {
      type: String,
      enum: ["planned", "completed", "cancelled"],
      default: "planned",
    },
    completedAt: { type: Date },
    completionNotes: { type: String, default: "" },
  },
  { timestamps: true }
);

const Planner = mongoose.model("Planner", plannerSchema);
export default Planner;
