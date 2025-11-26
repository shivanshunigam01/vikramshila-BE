// models/Planner.js
import mongoose from "mongoose";

const plannerSchema = new mongoose.Schema(
  {
    dseId: { type: mongoose.Schema.Types.ObjectId, ref: "Dse", default: null },
    dseCode: { type: String, default: "" },
    dseName: { type: String, default: "" },

    visitDate: { type: Date, required: true },
    visitTime: { type: String, default: "" },
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

    status: {
      type: String,
      enum: ["planned", "completed", "cancelled"],
      default: "planned",
    },

    completedAt: { type: Date },
    completionNotes: { type: String, default: "" },

    followUpNotes: [
      {
        note: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model("Planner", plannerSchema);
