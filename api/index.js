// api/index.js
// OPTIONAL: Mirror webhook logic OR keep as is.
// Here we simply proxy to webhook logic for consistency (reduces duplication).

const webhookHandler = require("./webhook.js");

module.exports = async (req, res) => {
  return webhookHandler(req, res);
};

module.exports.default = module.exports;
