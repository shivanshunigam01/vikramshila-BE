const axios = require("axios");

const infobip = axios.create({
  baseURL: process.env.INFOBIP_BASE_URL, // e.g. https://xxxx.api.infobip.com
  headers: {
    Authorization: `App ${process.env.INFOBIP_API_KEY}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

module.exports = infobip;
