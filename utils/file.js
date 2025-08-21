const path = require("path");
module.exports = {
  rel: (...p) => path.join("uploads", ...p),
};
