// api/index.js
// Proxy to webhook to keep single logic source (unchanged)
const webhookHandler = require("./webhook.js");
module.exports = async (req, res) => webhookHandler(req, res);
module.exports.default = module.exports;
