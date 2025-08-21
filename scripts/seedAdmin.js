const mongoose = require("mongoose");
const dotenv = require("dotenv");
const User = require("../models/User");

dotenv.config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/vikramshila");
    const exists = await User.findOne({ email: process.env.ADMIN_EMAIL });
    if (exists) {
      console.log("Admin already exists:", exists.email);
    } else {
      const user = await User.create({
        name: process.env.ADMIN_NAME || "Admin",
        email: process.env.ADMIN_EMAIL,
        password: process.env.ADMIN_PASSWORD,
        role: process.env.ADMIN_ROLE || "admin",
      });
      console.log("Admin created:", user.email);
    }
    await mongoose.disconnect();
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
