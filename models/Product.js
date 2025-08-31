import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: String,
    price: { type: String, default: "" },

    // ✅ Images
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

    // ✅ Brochure file
    brochureFile: String,
    status: { type: String, enum: ["active", "inactive"], default: "active" },

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
    profitMargin: String,
    usp: [String],
  },
  { timestamps: true }
);

// 👇 Model
const Product = mongoose.model("Product", productSchema);
export default Product;
