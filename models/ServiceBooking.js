import mongoose from "mongoose";

const serviceBookingSchema = new mongoose.Schema(
  {
    // Customer Info
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String },

    // Vehicle Info
    registrationNumber: { type: String, required: true },
    chassisNo: { type: String },
    modelVariant: { type: String, required: true },
    odometer: { type: Number },

    // Service Requirements
    serviceType: { type: String, required: true },
    servicePackage: { type: String, required: true },
    description: { type: String },

    // Appointment
    appointmentDate: { type: Date, required: true },
    timeSlot: { type: String, required: true },

    // Pickup & Drop
    pickupRequired: { type: Boolean, default: false },
    pickupLocation: { type: String },

    // Additional
    attachment: { type: String }, // Cloudinary / local file path
    requestEstimate: { type: Boolean, default: false },

    status: {
      type: String,
      enum: ["pending", "confirmed", "completed", "cancelled"],
      default: "pending",
    },
  },
  { timestamps: true }
);

export default mongoose.model("ServiceBooking", serviceBookingSchema);
