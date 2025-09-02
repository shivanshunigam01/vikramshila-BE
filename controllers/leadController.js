import Lead from "../models/Lead.js";

// Create a new lead (quote submission)
export const createLead = async (req, res) => {
  try {
    const {
      productId,
      productTitle,
      vehiclePrice,
      downPaymentAmount,
      downPaymentPercentage,
      loanAmount,
      interestRate,
      tenure,
      estimatedEMI,
      status,
    } = req.body;

    const newLead = new Lead({
      productId,
      productTitle,
      vehiclePrice,
      downPaymentAmount,
      downPaymentPercentage,
      loanAmount,
      interestRate,
      tenure,
      estimatedEMI,
      status,
    });

    const savedLead = await newLead.save();

    return res.status(201).json({
      success: true,
      message: "Lead created successfully",
      data: savedLead,
    });
  } catch (error) {
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
