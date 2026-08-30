function generateShopPageHTML(shopData) {
  var shop = shopData.shop || "Shop";
  var zip = shopData.zip || "";
  var phone = shopData.phone || "";
  var slug = shopData.slug || "shop";
  var look = shopData.look || "call";
  var category = shopData.category || "";
  var address = shopData.address || "";
  var hours = shopData.hours || "";
  var photos = shopData.photos || [];

  var phoneLink = phone.replace(/[^\d+]/g, "");
  var phoneDisplay = phone;

  if (look === "photos") {
    return generatePhotosLook(shop, zip, phone, phoneLink, phoneDisplay, category, address, hours, photos);
  }
  
  return generateCallLook(shop, zip, phone, phoneLink, phoneDisplay, category, address, hours, photos);
}

function generateCallLook(shop, zip, phone, phoneLink, phoneDisplay, category, address, hours, photos) {
  var categoryHTML = category ? `<div class="category">${escapeHTML(category)}</div>` : "";
  var addressHTML = address ? `<div class="address">${escapeHTML(address)}</div>` : "";
  var hoursHTML = hours ? `<div class="hours">${escapeHTML(hours)}</div>` : "";
  
  var photoHTML = "";
  if (photos.length > 0) {
    photoHTML = `<div class="photos">
      <img src="${escapeHTML(photos[0])}" alt="${escapeHTML(shop)}" class="hero-photo">
    </div>`;
  }

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
.category {
  font-size: 1.1rem;
  color: #666;
  margin-bottom: 0.5rem;
  text-transform: capitalize;
}
.address {
  font-size: 1rem;
  color: #666;
  margin-bottom: 0.25rem;
}
.location {
  font-size: 1.1rem;
  color: #666;
  margin-bottom: 0.5rem;
}
.hours {
  font-size: 1rem;
  color: #666;
  margin-bottom: 1.5rem;
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
  padding: 1.25rem 4rem;
  border-radius: 12px;
  font-size: 1.5rem;
  font-weight: 700;
  transition: background 0.2s;
  margin-bottom: 2rem;
}
.call-btn:hover {
  background: #0052a3;
}
.photos {
  margin-top: 2rem;
}
.hero-photo {
  width: 100%;
  max-width: 400px;
  height: auto;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}
.footer {
  margin-top: 2rem;
  font-size: 0.85rem;
  color: #999;
}
.footer a {
  color: #0066cc;
  text-decoration: none;
}
@media (max-width: 640px) {
  h1 { font-size: 2rem; }
  .phone { font-size: 1.25rem; }
  .call-btn { font-size: 1.25rem; padding: 1rem 3rem; }
}
</style>
</head>
<body>
<div class="container">
  <h1>${escapeHTML(shop)}</h1>
  ${categoryHTML}
  ${addressHTML}
  <div class="location">${escapeHTML(zip)}</div>
  ${hoursHTML}
  <div class="phone">${escapeHTML(phoneDisplay)}</div>
  <a href="tel:${escapeHTML(phoneLink)}" class="call-btn">Call</a>
  ${photoHTML}
  <div class="footer">
    <p>Powered by <a href="/">We Post It</a></p>
  </div>
</div>
</body>
</html>`;

  return html;
}

function generatePhotosLook(shop, zip, phone, phoneLink, phoneDisplay, category, address, hours, photos) {
  var categoryHTML = category ? `<div class="category">${escapeHTML(category)}</div>` : "";
  var addressHTML = address ? `<div class="address">${escapeHTML(address)}</div>` : "";
  var hoursHTML = hours ? `<div class="hours">${escapeHTML(hours)}</div>` : "";
  
  var photosHTML = "";
  if (photos.length > 0) {
    var photoItems = photos.slice(0, 6).map(function(url) {
      return `<div class="photo-item"><img src="${escapeHTML(url)}" alt="${escapeHTML(shop)}"></div>`;
    }).join("");
    photosHTML = `<div class="photo-grid">${photoItems}</div>`;
  }

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
}
.container {
  max-width: 600px;
  width: 100%;
  margin: 0 auto;
  padding: 1.5rem 1rem;
}
.header {
  text-align: center;
  margin-bottom: 1.5rem;
}
h1 {
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 0.25rem;
  color: #111;
}
.category {
  font-size: 1rem;
  color: #666;
  margin-bottom: 0.25rem;
  text-transform: capitalize;
}
.address {
  font-size: 0.95rem;
  color: #666;
  margin-bottom: 0.125rem;
}
.location {
  font-size: 0.95rem;
  color: #666;
  margin-bottom: 0.25rem;
}
.hours {
  font-size: 0.9rem;
  color: #666;
  margin-bottom: 1rem;
}
.photo-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}
.photo-item {
  aspect-ratio: 1;
  overflow: hidden;
  border-radius: 8px;
  background: #e5e5e5;
}
.photo-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.call-section {
  position: sticky;
  bottom: 0;
  background: #f7f7f4;
  padding: 1rem 0;
  text-align: center;
  border-top: 1px solid #ddd;
}
.phone {
  font-size: 1.25rem;
  margin-bottom: 0.75rem;
  font-weight: 600;
}
.call-btn {
  display: inline-block;
  background: #0066cc;
  color: #fff;
  text-decoration: none;
  padding: 1rem 3rem;
  border-radius: 12px;
  font-size: 1.25rem;
  font-weight: 700;
  transition: background 0.2s;
}
.call-btn:hover {
  background: #0052a3;
}
.footer {
  margin-top: 1.5rem;
  font-size: 0.85rem;
  color: #999;
  text-align: center;
  padding-bottom: 1rem;
}
.footer a {
  color: #0066cc;
  text-decoration: none;
}
@media (max-width: 640px) {
  h1 { font-size: 1.75rem; }
  .phone { font-size: 1.1rem; }
  .call-btn { font-size: 1.1rem; padding: 0.9rem 2.5rem; }
}
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>${escapeHTML(shop)}</h1>
    ${categoryHTML}
    ${addressHTML}
    <div class="location">${escapeHTML(zip)}</div>
    ${hoursHTML}
  </div>
  ${photosHTML}
  <div class="call-section">
    <div class="phone">${escapeHTML(phoneDisplay)}</div>
    <a href="tel:${escapeHTML(phoneLink)}" class="call-btn">Call</a>
  </div>
  <div class="footer">
    <p>Powered by <a href="/">We Post It</a></p>
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
