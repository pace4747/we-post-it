const indexnow = require("../lib/indexnow");

module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=86400, must-revalidate");
  res.status(200).send(indexnow.indexNowKey());
};
