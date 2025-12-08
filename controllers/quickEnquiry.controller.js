import QuickEnquiry from "../models/QuickEnquiry.js";

export const submitQuickEnquiry = async (req, res) => {
  try {
    const b = req.body;

    const doc = await QuickEnquiry.create({
      fullName: b.fullName,
      mobileNumber: b.mobileNumber,

      state: b.state,
      city: b.city || b.district, // ← FIX HERE

      pincode: b.pincode,
      briefDescription: b.briefDescription,
      consentCall: b.consentCall,
      whatsappConsent: b.whatsappConsent,
    });

    return res.status(201).json({
      success: true,
      message: "Enquiry submitted successfully",
      data: doc,
    });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: err.message || "Server error" });
  }
};

/* ----------- List all enquiries (optional admin route) ----------- */
export const listQuickEnquiries = async (_req, res) => {
  try {
    const items = await QuickEnquiry.find().sort({ createdAt: -1 });
    return res.json({ success: true, data: items });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ----------- Single enquiry details ----------- */
export const getQuickEnquiry = async (req, res) => {
  try {
    const item = await QuickEnquiry.findById(req.params.id);
    if (!item)
      return res.status(404).json({ success: false, message: "Not found" });

    return res.json({ success: true, data: item });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
