import mongoose from "mongoose";

const clientVisitSchema = new mongoose.Schema(
  {
    dse: { type: mongoose.Schema.Types.ObjectId, ref: "Dse", default: null },
    dseName: { type: String, default: "" },
    dsePhone: { type: String, default: "" },

    clientName: { type: String, required: true },
    clientMobile: { type: String, default: "" },
    currentAddress: { type: String, required: true },
    permanentAddress: { type: String, required: true },

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
