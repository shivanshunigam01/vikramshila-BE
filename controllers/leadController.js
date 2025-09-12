import Lead from "../models/Lead.js";

// Create a new lead (quote submission)
export const createLead = async (req, res) => {
  try {
    // Body (multipart -> strings): parse numerics safely
    const {
      productId,
      productTitle,
      productCategory,
      vehiclePrice,
      downPaymentAmount,
      downPaymentPercentage,
      loanAmount,
      interestRate,
      tenure,
      estimatedEMI,
      status,
      userId,
      userName,
      userEmail,
      userPhone,
    } = req.body;

    // Optional files (Cloudinary/Multer will put .path on uploaded files)
    let aadharFile = null;
    if (req.files?.aadharFile?.[0]) {
      const f = req.files.aadharFile[0];
      aadharFile = {
        filename: f.filename,
        originalName: f.originalname,
        path: f.path, // Cloudinary URL if using cloudinary storage
        size: f.size,
        mimetype: f.mimetype,
      };
    }

    let panCardFile = null;
    if (req.files?.panCardFile?.[0]) {
      const f = req.files.panCardFile[0];
      panCardFile = {
        filename: f.filename,
        originalName: f.originalname,
        path: f.path,
        size: f.size,
        mimetype: f.mimetype,
      };
    }

    const newLead = new Lead({
      productId,
      productTitle,
      productCategory: productCategory || "",

      vehiclePrice: Number(vehiclePrice),
      downPaymentAmount: Number(downPaymentAmount),
      downPaymentPercentage: Number(downPaymentPercentage),
      loanAmount: Number(loanAmount),
      interestRate: Number(interestRate),
      tenure: Number(tenure),
      estimatedEMI: Number(estimatedEMI),

      status: status || "pending",

      userId,
      userName,
      userEmail,
      userPhone,

      // NEW
      aadharFile,
      panCardFile,
    });

    const savedLead = await newLead.save();

    return res.status(201).json({
      success: true,
      message: "Lead created successfully",
      data: savedLead,
    });
  } catch (error) {
    console.error("Error creating lead:", error);
    return res.status(500).json({
      success: false,
      message: "Error creating lead",
      error: error.message,
    });
  }
};

// Get all leads
export const getLeads = async (req, res) => {
  try {
    const leads = await Lead.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      totalLeads: leads.length,
      data: leads,
    });
  } catch (error) {
    console.error("Error fetching leads:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get a single lead by ID
export const getLeadById = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) {
      return res
        .status(404)
        .json({ success: false, message: "Lead not found" });
    }
    res.status(200).json({ success: true, data: lead });
  } catch (error) {
    console.error("Error fetching lead:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
