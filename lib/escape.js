function escapeHTML(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function makeSlug(shopName) {
  return String(shopName || "shop")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "shop";
}

function safeUrl(url) {
  var s = String(url || "").trim();
  if (!s) return "";
  if (s.indexOf("/") === 0 && s.indexOf("//") !== 0) {
    if (s.indexOf("\\") !== -1 || s.indexOf("..") !== -1) return "";
    return s.slice(0, 2000);
  }
  if (/^https?:\/\//i.test(s)) {
    try {
      var u = new URL(s);
      if (u.protocol !== "http:" && u.protocol !== "https:") return "";
      return u.toString().slice(0, 2000);
    } catch (e) {
      return "";
    }
  }
  return "";
}

function safeImageUrl(url) {
  return safeUrl(url);
}

module.exports = {
  escapeHTML: escapeHTML,
  makeSlug: makeSlug,
  safeUrl: safeUrl,
  safeImageUrl: safeImageUrl
};
