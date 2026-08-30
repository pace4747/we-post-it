module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
  
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  
  if (req.method !== "GET") {
    res.status(405).json({ ok: false });
    return;
  }

  var zip = String(req.headers["x-vercel-ip-postal-code"] || "").trim();
  var city = String(req.headers["x-vercel-ip-city"] || "").trim();
  var region = String(req.headers["x-vercel-ip-country-region"] || "").trim();
  var country = String(req.headers["x-vercel-ip-country"] || "").trim();

  // Only return US 5-digit ZIP codes for checkout prefill
  if (country !== "US" || !/^\d{5}$/.test(zip)) {
    zip = "";
  }

  res.status(200).json({
    zip: zip,
    city: city,
    region: region,
    country: country
  });
};
