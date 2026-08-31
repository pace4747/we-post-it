const crypto = require("crypto");

function generateEditToken() {
  return "wpi_" + crypto.randomBytes(24).toString("base64url");
}

function tokensEqual(a, b) {
  var left = String(a || "");
  var right = String(b || "");
  if (!left || !right) return false;
  var ba = Buffer.from(left);
  var bb = Buffer.from(right);
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

function tokenFromRequest(req) {
  if (!req) return "";
  var header = "";
  if (req.headers) {
    header = req.headers["x-edit-token"] || req.headers["X-Edit-Token"] || "";
  }
  if (header) return String(header).trim();
  if (req.query && req.query.k) return String(req.query.k).trim();
  if (req.body && typeof req.body === "object" && req.body.k) {
    return String(req.body.k).trim();
  }
  return "";
}

module.exports = {
  generateEditToken: generateEditToken,
  tokensEqual: tokensEqual,
  tokenFromRequest: tokenFromRequest
};
