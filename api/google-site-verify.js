module.exports = function handler(req, res) {
  var raw = String((req.query && (req.query.id || req.query.file)) || "").trim();
  var name = raw;
  if (name && !/\.html$/i.test(name)) name = "google" + name.replace(/^google/i, "") + ".html";
  name = name.replace(/[^a-zA-Z0-9._-]/g, "");
  if (!/^google[a-zA-Z0-9_-]+\.html$/i.test(name)) {
    res.status(404).end();
    return;
  }
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=300");
  res.status(200).send("google-site-verification: " + name + "\n");
};
