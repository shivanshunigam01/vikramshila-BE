import express from "express";
import Enquiry from "../models/Enquiry.js";

const router = express.Router();

/* ---------- Create Enquiry ---------- */
router.post("/", async (req, res) => {
  try {
    const enquiry = await Enquiry.create(req.body);
    res.status(201).json({ success: true, data: enquiry });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ---------- Get All Enquiries ---------- */
router.get("/", async (_req, res) => {
  try {
    const enquiries = await Enquiry.find().sort({ createdAt: -1 });
    res.json({ success: true, data: enquiries });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ---------- Get Single Enquiry ---------- */
router.get("/:id", async (req, res) => {
  try {
    const enquiry = await Enquiry.findById(req.params.id);
    if (!enquiry)
      return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, data: enquiry });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ---------- Update Enquiry ---------- */
router.put("/:id", async (req, res) => {
  try {
    const enquiry = await Enquiry.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    res.json({ success: true, data: enquiry });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ---------- Assign to DSE ---------- */
router.post("/:id/assign", async (req, res) => {
  try {
    const { dseId, dseName } = req.body;
    const enquiry = await Enquiry.findByIdAndUpdate(
      req.params.id,
      { dseId, dseName, status: "C1" },
      { new: true }
    );
    res.json({ success: true, data: enquiry });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ---------- Create Quotation ---------- */
router.post("/:id/quotation", async (req, res) => {
  try {
    const { amount, date } = req.body;
    const enquiry = await Enquiry.findByIdAndUpdate(
      req.params.id,
      { quotation: { amount, date }, status: "C2" },
      { new: true }
    );
    res.json({ success: true, data: enquiry });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ---------- Create Internal Costing ---------- */
router.post("/:id/costing", async (req, res) => {
  try {
    const { basePrice, discount, tax } = req.body;
    const total = basePrice - discount + tax;
    const enquiry = await Enquiry.findByIdAndUpdate(
      req.params.id,
      { costing: { basePrice, discount, tax, total }, status: "C3" },
      { new: true }
    );
    res.json({ success: true, data: enquiry });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
