// models/Product.js
import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: String,
    seatAvailability: String,
    mileage: String,
    tyreLife: String,
    tyresCost: String,
    freightRate: String,
    price: { type: String, default: "" },

    // ✅ Images (Cloudinary URLs)
    images: [String],

    // ✅ Reviews
    reviews: [
      {
        type: { type: String, enum: ["photo", "video"], default: "photo" },
        content: String,
        customerName: String,
        customerLocation: String,
        rating: Number,
        file: String,
      },
    ],

    // ✅ Testimonials
    testimonials: [
      {
        type: { type: String, enum: ["photo", "video"], default: "photo" },
        content: String,
        customerName: String,
        customerLocation: String,
        customerDesignation: String,
        file: String,
      },
    ],

    // ✅ Brochure (LOCAL)
    brochureFile: {
      filename: String,
      originalName: String,
      path: String,
      size: Number,
      mimetype: String,
    },

    status: { type: String, enum: ["active", "inactive"], default: "active" },
    category: String,

    // ✅ Vehicle Specs
    gvw: String,
    engine: String,
    fuelTankCapacity: String,
    fuelType: String,
    gearBox: String,
    clutchDia: String,
    torque: String,
    tyre: String,
    cabinType: String,
    warranty: String,
    applicationSuitability: String,
    payload: String,
    deckWidth: [String],
    deckLength: [String],
    bodyDimensions: String,
    tco: String,
    newLaunch: { type: Number, enum: [0, 1], default: 0 },
    profitMargin: String,
    usp: [String],

    // ✅ NEW FIELDS
    monitoringFeatures: { type: [String], default: [] }, // e.g. ["FleetEdge","Driver Monitoring"]
    driverComfort: { type: Number, min: 0, max: 10 }, // 0–10 score (optional)
  },
  { timestamps: true }
);

const Product = mongoose.model("Product", productSchema);
export default Product;
