// models/CompetitionProduct.js
import mongoose from "mongoose";

const competitionProductSchema = new mongoose.Schema(
  {
    // ⭐ Extra fields for competition
    brand: { type: String, default: "" },
    model: { type: String, default: "" },

    // ⭐ Same as Product schema
    title: { type: String, required: true },
    description: String,
    seatAvailability: String,
    mileage: String,
    tyreLife: String,
    tyresCost: String,
    freightRate: String,
    price: { type: String, default: "" },

    // Images
    images: [String],

    // Reviews
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

    // Testimonials
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

    // Brochure file
    brochureFile: {
      filename: String,
      originalName: String,
      path: String,
      size: Number,
      mimetype: String,
    },

    status: { type: String, enum: ["active", "inactive"], default: "active" },
    category: String,

    // Vehicle Specs
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

    // NEW FIELDS
    monitoringFeatures: { type: [String], default: [] },
    driverComfort: { type: Number, min: 0, max: 10 },
  },
  { timestamps: true }
);

const CompetitionProduct = mongoose.model(
  "CompetitionProduct",
  competitionProductSchema
);

export default CompetitionProduct;
