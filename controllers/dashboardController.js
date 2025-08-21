const Product = require("../models/Product");
const Scheme = require("../models/Scheme");
const Service = require("../models/Service");
const Enquiry = require("../models/Enquiry");
const Launch = require("../models/Launch");
const Testimonial = require("../models/Testimonial");
const RES = require("../utils/response");

exports.stats = async (req, res) => {
  const [products, schemes, services, enquiries, launches, testimonials] = await Promise.all([
    Product.countDocuments(),
    Scheme.countDocuments(),
    Service.countDocuments(),
    Enquiry.countDocuments(),
    Launch.countDocuments(),
    Testimonial.countDocuments(),
  ]);
  return RES.ok(res, { products, schemes, services, enquiries, launches, testimonials });
};
