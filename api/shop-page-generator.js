function generateShopPageHTML(shopData) {
  var shop = shopData.shop || "Shop";
  var zip = shopData.zip || "";
  var phone = shopData.phone || "";
  var slug = shopData.slug || "shop";

  var phoneLink = phone.replace(/[^\d+]/g, "");
  var phoneDisplay = phone;

  var html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#f7f7f4">
<title>${escapeHTML(shop)}</title>
<meta name="description" content="${escapeHTML(shop)} in ${escapeHTML(zip)}. Call ${escapeHTML(phone)}.">
<meta property="og:title" content="${escapeHTML(shop)}">
<meta property="og:description" content="${escapeHTML(shop)} in ${escapeHTML(zip)}.">
<meta property="og:type" content="website">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
  line-height: 1.6;
  background: #f7f7f4;
  color: #222;
  padding: 0;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.container {
  max-width: 600px;
  width: 100%;
  padding: 2rem 1.5rem;
  text-align: center;
}
h1 {
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  color: #111;
}
.location {
  font-size: 1.25rem;
  color: #666;
  margin-bottom: 2rem;
}
.phone {
  font-size: 1.5rem;
  margin-bottom: 2rem;
  font-weight: 600;
}
.call-btn {
  display: inline-block;
  background: #0066cc;
  color: #fff;
  text-decoration: none;
  padding: 1rem 3rem;
  border-radius: 8px;
  font-size: 1.25rem;
  font-weight: 600;
  transition: background 0.2s;
}
.call-btn:hover {
  background: #0052a3;
}
.footer {
  margin-top: 3rem;
  font-size: 0.9rem;
  color: #999;
}
.footer a {
  color: #0066cc;
  text-decoration: none;
}
@media (max-width: 640px) {
  h1 { font-size: 2rem; }
  .phone { font-size: 1.25rem; }
  .call-btn { font-size: 1.1rem; padding: 0.9rem 2.5rem; }
}
</style>
</head>
<body>
<div class="container">
  <h1>${escapeHTML(shop)}</h1>
  <div class="location">${escapeHTML(zip)}</div>
  <div class="phone">${escapeHTML(phoneDisplay)}</div>
  <a href="tel:${escapeHTML(phoneLink)}" class="call-btn">Call Now</a>
  <div class="footer">
    <p>Powered by <a href="https://we-post-it-full.vercel.app">We Post It</a></p>
  </div>
</div>
</body>
</html>`;

  return html;
}

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

module.exports = {
  generateShopPageHTML: generateShopPageHTML,
  makeSlug: makeSlug
};
