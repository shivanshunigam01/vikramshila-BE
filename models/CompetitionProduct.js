import mongoose from "mongoose";

const competitionProductSchema = new mongoose.Schema(
  {
    // SAME AS Product MODEL
    title: { type: String, required: true },

    brand: String,
    model: String,
    description: String,
    category: String,
    seatAvailability: String,
    mileage: String,
    tyreLife: String,
    tyresCost: String,
    freightRate: String,
    price: String,
    gvw: String,
    engine: String,
    fuelType: String,
    fuelTankCapacity: String,
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
    monitoringFeatures: [String],
    driverComfort: { type: Number, min: 0, max: 10 },

    // IMAGES
    images: [String],

    // BROCHURE
    brochureFile: {
      filename: String,
      originalName: String,
      path: String,
      size: Number,
      mimetype: String,
    },

    // NEW —
    reviews: [
      {
        type: {
          type: String,
          enum: ["photo", "video", "text"],
          default: "text",
        },
        content: String,
        customerName: String,
        customerLocation: String,
        rating: Number,
        file: String,
      },
    ],

    testimonials: [
      {
        type: {
          type: String,
          enum: ["photo", "video", "text"],
          default: "text",
        },
        content: String,
        customerName: String,
        customerLocation: String,
        customerDesignation: String,
        file: String,
      },
    ],

    newLaunch: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const CompetitionProduct = mongoose.model(
  "CompetitionProduct",
  competitionProductSchema
);

export default CompetitionProduct;
