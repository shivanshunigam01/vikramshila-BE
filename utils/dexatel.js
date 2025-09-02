const axios = require("axios");

const dexatel = axios.create({
  baseURL: "https://api.dexatel.com", // Replace with actual base URL from Dexatel dashboard
  headers: {
    "X-Dexatel-Key": process.env.DEXATEL_API_KEY,
    "Content-Type": "application/json",
  },
});

module.exports = dexatel;