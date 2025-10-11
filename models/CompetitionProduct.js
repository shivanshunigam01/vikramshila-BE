import mongoose from "mongoose";

const competitionProductSchema = new mongoose.Schema(
  {
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
    // ✅ fix 1: should be array
    monitoringFeatures: [String],
    // ✅ fix 2: store as Number, but allow null
    driverComfort: { type: Number, min: 0, max: 10 },
    // ✅ fix 3: store Cloudinary image URLs
    images: [String],
    // ✅ fix 4: allow full brochure object
    brochureFile: {
      filename: String,
      originalName: String,
      path: String,
      size: Number,
      mimetype: String,
    },
    newLaunch: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const CompetitionProduct = mongoose.model(
  "CompetitionProduct",
  competitionProductSchema
);

export default CompetitionProduct;
