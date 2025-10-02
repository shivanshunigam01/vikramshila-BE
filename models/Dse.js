// models/Dse.js
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const dseSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, default: "dse" },
    photoUrl: { type: String, default: "" }, // ✅
    photoPublicId: { type: String, default: "" }, // ✅
  },
  { timestamps: true }
);

dseSchema.methods.setPassword = async function (pwd) {
  this.passwordHash = await bcrypt.hash(pwd, 10);
};
dseSchema.methods.validatePassword = function (pwd) {
  return bcrypt.compare(pwd, this.passwordHash);
};

module.exports = mongoose.model("Dse", dseSchema);
