import Product from "../models/Product.js";
import Scheme from "../models/Scheme.js";
import Service from "../models/Service.js";
import Enquiry from "../models/Enquiry.js";
import Launch from "../models/Launch.js";
import Testimonial from "../models/Testimonial.js";
import { ok, created, bad, error } from "../utils/response.js";

export const stats = async (req, res) => {
  try {
    const [products, schemes, services, enquiries, launches, testimonials] =
      await Promise.all([
        Product.countDocuments(),
        Scheme.countDocuments(),
        Service.countDocuments(),
        Enquiry.countDocuments(),
        Launch.countDocuments(),
        Testimonial.countDocuments(),
      ]);

    return ok(res, { products, schemes, services, enquiries, launches, testimonials });
  } catch (err) {
    return error(res, err);
  }
};
