const fs = require("fs");
const path = require("path");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
  if (req.method === "OPTIONS") { res.status(204).end(); return; }
  if (req.method !== "POST") { res.status(405).json({ ok: false }); return; }

  var body = {};
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
  } catch (e) {
    body = {};
  }

  var name = String(body.name || body.shop || "").trim();
  var place = String(body.place || body.zip || body.cityState || "").trim();
  var phone = String(body.phone || "").trim();
  if (!name || !place || !phone) {
    res.status(400).json({ ok: false, error: "Need shop name, location, and a phone." });
    return;
  }

  var lead = {
    name: name,
    place: place,
    phone: phone,
    email: String(body.email || "").trim(),
    product: String(body.product || "").trim(),
    template: String(body.template || "").trim(),
    palette: String(body.palette || "").trim(),
    website: String(body.website || body.url || "").trim(),
    comment: String(body.comment || body.comments || "").trim(),
    at: new Date().toISOString()
  };

  var line = JSON.stringify(lead) + "\n";
  try { fs.appendFileSync("/tmp/wepostit-leads.jsonl", line); } catch (e) {}
  try { fs.appendFileSync(path.join("/workspace/wepostit", "leads.jsonl"), line); } catch (e) {}
  try { fs.appendFileSync(path.join(process.cwd(), "leads.jsonl"), line); } catch (e) {}
  console.log("lead", JSON.stringify(lead));
  res.status(200).json({ ok: true });
};
