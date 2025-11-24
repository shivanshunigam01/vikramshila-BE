import mongoose from "mongoose";

const launchSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: String,
    launchDate: Date,
    mediaFiles: [String],

    // ✅ Brochure file (LOCAL DISK)
    brochureFile: {
      filename: String,
      originalName: String,
      path: String,
      size: Number,
      mimetype: String,
    },

    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  { timestamps: true }
);

export default mongoose.model("Launch", launchSchema);
