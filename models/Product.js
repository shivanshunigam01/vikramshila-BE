import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: String,
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
        file: String, // Cloudinary URL
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
        file: String, // Cloudinary URL
      },
    ],

    // ✅ Brochure file (LOCAL STORAGE) - Updated Schema
    brochureFile: {
      filename: String, // Generated filename
      originalName: String, // Original uploaded filename
      path: String, // Full file path on server
      size: Number, // File size in bytes
      mimetype: String, // MIME type (e.g., 'application/pdf')
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
  },
  { timestamps: true }
);

// 👇 Model
const Product = mongoose.model("Product", productSchema);
export default Product;
