function generateShopPageHTML(shopData) {
  var shop = shopData.shop || "Shop";
  var category = shopData.category || "";
  var address = shopData.address || "";
  var city = shopData.city || "";
  var state = shopData.state || "";
  var zip = shopData.zip || "";
  var phone = shopData.phone || "";
  var hours = shopData.hours || "";
  var rating = shopData.rating || "";
  var photos = shopData.photos || [];

  var phoneLink = phone.replace(/[^\d+]/g, "");
  var phoneDisplay = phone;
  var fullAddress = address || "";
  var cityState = (city && state) ? city + ", " + state + (zip ? " " + zip : "") : (zip || "");
  var locationLine = cityState;
  
  var services = deriveServicesFromCategory(category);
  var aboutText = generateAboutText(shop, category, city, state);
  var mapEmbed = "";
  var directionsLink = "";
  
  if (fullAddress && cityState) {
    var mapQuery = encodeURIComponent(fullAddress + ", " + cityState);
    mapEmbed = `<iframe class="map-embed" src="https://maps.google.com/maps?q=${mapQuery}&z=16&output=embed" title="Map location" loading="lazy"></iframe>`;
    directionsLink = `https://www.google.com/maps/dir/?api=1&destination=${mapQuery}`;
  }

  var html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#f7f7f4">
<title>${escapeHTML(shop)}${category ? " — " + escapeHTML(category) : ""}${locationLine ? " in " + escapeHTML(locationLine) : ""}</title>
<meta name="description" content="${escapeHTML(shop)}. ${category ? escapeHTML(category) + " in " : ""}${escapeHTML(locationLine)}. ${phone ? "Call " + escapeHTML(phone) + "." : ""}">
<meta property="og:title" content="${escapeHTML(shop)}${category ? " — " + escapeHTML(category) : ""}">
<meta property="og:description" content="${category ? escapeHTML(category) + " in " : ""}${escapeHTML(locationLine)}. ${phone ? "Call " + escapeHTML(phone) + "." : ""}">
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
}
.hero {
  background: #fff;
  padding: 4rem 1.5rem;
  text-align: center;
  border-bottom: 2px solid #e5e5e0;
}
.hero h1 {
  font-size: 3rem;
  font-weight: 800;
  margin-bottom: 1rem;
  color: #111;
  letter-spacing: -0.02em;
}
.hero .tagline {
  font-size: 1.75rem;
  color: #0066cc;
  font-weight: 600;
  margin-bottom: 2.5rem;
}
.hero .cta {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}
.btn {
  display: inline-block;
  padding: 1.25rem 3rem;
  border-radius: 8px;
  font-size: 1.35rem;
  font-weight: 700;
  text-decoration: none;
  transition: all 0.2s;
  border: 2px solid transparent;
}
.btn-primary {
  background: #0066cc;
  color: #fff;
}
.btn-primary:hover {
  background: #0052a3;
}
.btn-secondary {
  background: #fff;
  color: #0066cc;
  border-color: #0066cc;
}
.btn-secondary:hover {
  background: #f0f7ff;
}
.section {
  padding: 4rem 1.5rem;
  background: #fff;
  border-bottom: 1px solid #e5e5e0;
}
.section:nth-child(even) {
  background: #fafaf8;
}
.section-inner {
  max-width: 1200px;
  margin: 0 auto;
}
.section h2 {
  font-size: 2.5rem;
  font-weight: 800;
  margin-bottom: 1.5rem;
  color: #111;
  letter-spacing: -0.02em;
}
.section p {
  font-size: 1.2rem;
  color: #444;
  line-height: 1.8;
  max-width: 800px;
}
.about p {
  margin-bottom: 1rem;
}
.about p:last-of-type {
  margin-bottom: 0;
}
.services-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  margin-top: 2.5rem;
}
.service-card {
  background: #fff;
  padding: 2rem;
  border-radius: 12px;
  border: 2px solid #e5e5e0;
  transition: transform 0.2s, border-color 0.2s;
}
.section:nth-child(even) .service-card {
  background: #fafaf8;
}
.service-card:hover {
  transform: translateY(-4px);
  border-color: #0066cc;
}
.service-card h3 {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 0.75rem;
  color: #0066cc;
}
.service-card p {
  color: #555;
  font-size: 1.1rem;
}
.map-section {
  padding: 4rem 1.5rem;
  background: #fff;
  border-bottom: 1px solid #e5e5e0;
}
.map-inner {
  max-width: 1000px;
  margin: 0 auto;
}
.map-inner h2 {
  font-size: 2.5rem;
  font-weight: 800;
  margin-bottom: 2rem;
  color: #111;
  text-align: center;
  letter-spacing: -0.02em;
}
.map-embed {
  width: 100%;
  height: 360px;
  border: 0;
  border-radius: 12px;
  display: block;
}
.contact-section {
  padding: 4rem 1.5rem;
  background: #fafaf8;
  text-align: center;
}
.contact-inner {
  max-width: 700px;
  margin: 0 auto;
}
.contact-inner h2 {
  font-size: 2.5rem;
  font-weight: 800;
  margin-bottom: 2rem;
  color: #111;
  letter-spacing: -0.02em;
}
.contact-address {
  font-size: 1.3rem;
  color: #444;
  margin-bottom: 1rem;
  line-height: 1.8;
}
.contact-phone {
  font-size: 2rem;
  font-weight: 700;
  color: #0066cc;
  margin: 1.5rem 0;
}
.contact-phone a {
  color: inherit;
  text-decoration: none;
}
.contact-cta {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
  margin-top: 2rem;
}
.footer {
  background: #fff;
  padding: 2rem 1.5rem;
  text-align: center;
  border-top: 1px solid #e5e5e0;
  font-size: 1rem;
  color: #999;
}
.footer a {
  color: #0066cc;
  text-decoration: none;
  font-weight: 600;
}
@media (max-width: 768px) {
  .hero h1 { font-size: 2.25rem; }
  .hero .tagline { font-size: 1.35rem; }
  .btn { font-size: 1.15rem; padding: 1rem 2rem; }
  .section h2 { font-size: 2rem; }
  .section p { font-size: 1.1rem; }
  .service-card h3 { font-size: 1.3rem; }
  .contact-phone { font-size: 1.5rem; }
}
</style>
</head>
<body>

<div class="hero">
  <h1>${escapeHTML(shop)}</h1>
  ${category && locationLine ? `<div class="tagline">${escapeHTML(category)} in ${escapeHTML(locationLine)}</div>` : ""}
  <div class="cta">
    ${phone ? `<a href="tel:${escapeHTML(phoneLink)}" class="btn btn-primary">Call ${escapeHTML(phoneDisplay)}</a>` : ""}
    ${directionsLink ? `<a href="${escapeHTML(directionsLink)}" class="btn btn-secondary" target="_blank" rel="noopener">Get Directions</a>` : ""}
  </div>
</div>

${aboutText ? `<div class="section">
  <div class="section-inner about">
    <h2>About</h2>
    ${aboutText}
  </div>
</div>` : ""}

${services.length > 0 ? `<div class="section">
  <div class="section-inner">
    <h2>Our Services</h2>
    <div class="services-grid">
      ${services.map(function(s) {
        return `<div class="service-card">
        <h3>${escapeHTML(s.name)}</h3>
        <p>${escapeHTML(s.description)}</p>
      </div>`;
      }).join("\n      ")}
    </div>
  </div>
</div>` : ""}

${mapEmbed ? `<div class="map-section">
  <div class="map-inner">
    <h2>Visit Us</h2>
    ${mapEmbed}
  </div>
</div>` : ""}

<div class="contact-section">
  <div class="contact-inner">
    <h2>Contact</h2>
    ${fullAddress && cityState ? `<div class="contact-address">
      ${escapeHTML(fullAddress)}<br>
      ${escapeHTML(cityState)}
    </div>` : ""}
    ${phone ? `<div class="contact-phone">
      <a href="tel:${escapeHTML(phoneLink)}">${escapeHTML(phoneDisplay)}</a>
    </div>` : ""}
    <div class="contact-cta">
      ${phone ? `<a href="tel:${escapeHTML(phoneLink)}" class="btn btn-primary">Call Now</a>` : ""}
      ${directionsLink ? `<a href="${escapeHTML(directionsLink)}" class="btn btn-secondary" target="_blank" rel="noopener">Get Directions</a>` : ""}
    </div>
  </div>
</div>

<div class="footer">
  <p>Powered by <a href="https://we-post-it-full.vercel.app">We Post It</a></p>
</div>

</body>
</html>`;

  return html;
}

function deriveServicesFromCategory(category) {
  var cat = String(category || "").toLowerCase();
  var services = [];
  
  if (cat.indexOf("electric") !== -1) {
    services = [
      { name: "Electrical Wiring", description: "Complete wiring installation and repair for homes and businesses." },
      { name: "Panel Upgrades", description: "Upgrade your electrical panel to meet current safety standards and power needs." },
      { name: "Outlets & Switches", description: "Install and repair outlets, switches, and electrical fixtures." },
      { name: "Lighting", description: "Professional lighting installation and repair for any space." },
      { name: "Electrical Repair", description: "Fast troubleshooting and repair of all types of electrical issues." },
      { name: "New Construction Electrical", description: "Full electrical systems for new builds and major renovations." }
    ];
  } else if (cat.indexOf("hvac") !== -1 || cat.indexOf("heating") !== -1 || cat.indexOf("cooling") !== -1 || cat.indexOf("air condition") !== -1) {
    services = [
      { name: "Heating Repair", description: "Fast, reliable repair of furnaces, heat pumps, and heating systems." },
      { name: "Air Conditioning Repair", description: "Expert AC repair and maintenance to keep you cool." },
      { name: "HVAC Installation", description: "Professional installation of new heating and cooling systems." },
      { name: "Maintenance Plans", description: "Regular HVAC maintenance to prevent breakdowns and extend system life." },
      { name: "Duct Work", description: "Duct installation, repair, and cleaning for better airflow." },
      { name: "Emergency Service", description: "24/7 emergency HVAC repair when you need it most." }
    ];
  } else if (cat.indexOf("plumb") !== -1) {
    services = [
      { name: "Drain Cleaning", description: "Clear clogs and keep your drains flowing smoothly." },
      { name: "Leak Repair", description: "Fast repair of leaking pipes, faucets, and fixtures." },
      { name: "Water Heater Service", description: "Water heater installation, repair, and maintenance." },
      { name: "Fixture Installation", description: "Install sinks, toilets, faucets, and other plumbing fixtures." },
      { name: "Pipe Repair", description: "Repair or replace damaged pipes to prevent water damage." },
      { name: "Emergency Plumbing", description: "24/7 emergency plumbing service for urgent issues." }
    ];
  } else if (cat.indexOf("auto") !== -1 && (cat.indexOf("body") !== -1 || cat.indexOf("repair") !== -1 || cat.indexOf("collision") !== -1)) {
    services = [
      { name: "Collision Repair", description: "Expert repair of accident damage to get you back on the road." },
      { name: "Dent Removal", description: "Paintless and traditional dent repair services." },
      { name: "Auto Painting", description: "Professional automotive painting and refinishing." },
      { name: "Frame Straightening", description: "Precision frame repair to restore structural integrity." },
      { name: "Glass Replacement", description: "Windshield and auto glass replacement services." },
      { name: "Insurance Claims", description: "We work with your insurance to streamline the repair process." }
    ];
  }
  
  if (cat.indexOf("utility") !== -1 && services.length > 0) {
    services.push({ name: "Utility Work", description: "Professional utility contractor services for residential and commercial projects." });
  }
  
  return services;
}

function generateAboutText(shop, category, city, state) {
  var cat = String(category || "").toLowerCase();
  var location = (city && state) ? city + ", " + state : "";
  var shopName = escapeHTML(shop);
  var locationText = location ? " in " + escapeHTML(location) : "";
  
  var trade = "local business";
  if (cat.indexOf("electric") !== -1) trade = "electrician";
  else if (cat.indexOf("hvac") !== -1 || cat.indexOf("heating") !== -1 || cat.indexOf("cooling") !== -1) trade = "HVAC contractor";
  else if (cat.indexOf("plumb") !== -1) trade = "plumber";
  else if (cat.indexOf("auto") !== -1 && cat.indexOf("body") !== -1) trade = "auto body shop";
  
  var aboutHtml = `<p>${shopName} is a local ${trade}${locationText}. We provide ${category ? escapeHTML(category).toLowerCase() : "quality"} services for residential and commercial clients.</p>`;
  
  if (location) {
    aboutHtml += `<p>Call us for reliable service${locationText}.</p>`;
  }
  
  return aboutHtml;
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
