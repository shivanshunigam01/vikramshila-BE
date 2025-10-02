// models/Dse.js
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const dseSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, default: "dse" },

    // 🔹 new photo fields
    photoUrl: { type: String, default: "" },
    photoPublicId: { type: String, default: "" },
  },
  { timestamps: true }
);

dseSchema.methods.setPassword = async function (pwd) {
  this.passwordHash = await bcrypt.hash(pwd, 10);
};
dseSchema.methods.validatePassword = function (pwd) {
  return bcrypt.compare(pwd, this.passwordHash);
};

export default mongoose.model("Dse", dseSchema);
