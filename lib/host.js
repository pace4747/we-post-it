function headerHost(req) {
  var raw = "";
  if (req && req.headers) {
    raw = req.headers["x-forwarded-host"] || req.headers.host || "";
  }
  return String(raw).split(",")[0].trim().split(":")[0].toLowerCase();
}

function shopSlugFromHost(req) {
  var host = headerHost(req);
  var m = host.match(/^([a-z0-9-]+)\.yoursite\.site$/);
  if (!m) return "";
  if (m[1] === "www") return "";
  return m[1];
}

function publicOrigin() {
  return "https://www.yoursite.site";
}

function shopOrigin(slug) {
  slug = String(slug || "").replace(/[^a-z0-9-]/g, "").slice(0, 40);
  if (!slug) return publicOrigin();
  return "https://" + slug + ".yoursite.site";
}

function keepUrl(slug) {
  slug = String(slug || "").replace(/[^a-z0-9-]/g, "").slice(0, 40);
  if (!slug) return publicOrigin() + "/start";
  return publicOrigin() + "/keep/" + slug;
}

function editUrl(slug) {
  slug = String(slug || "").replace(/[^a-z0-9-]/g, "").slice(0, 40);
  if (!slug) return publicOrigin() + "/login";
  return publicOrigin() + "/edit/" + slug;
}

function legalUrl() {
  return publicOrigin() + "/legal";
}

module.exports = {
  headerHost: headerHost,
  shopSlugFromHost: shopSlugFromHost,
  publicOrigin: publicOrigin,
  shopOrigin: shopOrigin,
  keepUrl: keepUrl,
  editUrl: editUrl,
  legalUrl: legalUrl
};
