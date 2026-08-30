function generateShopPageHTML(shopData) {
  var shop = shopData.shop || "Shop";
  var category = shopData.category || "";
  var address = shopData.address || "";
  var city = shopData.city || "";
  var state = shopData.state || "";
  var zip = shopData.zip || "";
  var phone = shopData.phone || "";
  var photos = shopData.photos || [];
  var reviews = shopData.reviews || [];
  var scheme = shopData.scheme || "navy-red";

  var phoneLink = phone.replace(/[^\d+]/g, "");
  var phoneDisplay = phone;
  var fullAddress = address || "";
  var cityState = (city && state) ? city + ", " + state + (zip ? " " + zip : "") : (zip || "");
  var locationLine = cityState;
  
  var services = deriveServicesFromCategory(category);
  var aboutText = generateAboutText(shop, category, city, state, fullAddress);
  var mapEmbed = "";
  var directionsLink = "";
  var townPhoto = getTownPhoto(city, state);
  var heroBackground = photos.length > 0 ? photos[0] : townPhoto;
  
  if (fullAddress && cityState) {
    var mapQuery = encodeURIComponent(fullAddress + ", " + cityState);
    mapEmbed = `<iframe class="map-embed" src="https://maps.google.com/maps?q=${mapQuery}&z=16&output=embed" title="Map location" loading="lazy"></iframe>`;
    directionsLink = `https://www.google.com/maps/dir/?api=1&destination=${mapQuery}`;
  }

  var goodReviews = reviews.filter(function(r) { return r.rating && r.rating >= 4; });
  var hasPhotos = photos.length > 0;
  var hasGoodReviews = goodReviews.length > 0;

  var schemeClass = scheme === 'blue-gold' ? 'scheme-blue-gold' : 'scheme-navy-red';
  var primaryColor = scheme === 'blue-gold' ? '#123E73' : '#0A2A6B';

  var html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="${primaryColor}">
<title>${escapeHTML(shop)}${category ? " — " + escapeHTML(category) : ""}${locationLine ? " in " + escapeHTML(locationLine) : ""}</title>
<meta name="description" content="${escapeHTML(shop)}. ${category ? escapeHTML(category) + " in " : ""}${escapeHTML(locationLine)}. ${phone ? "Call " + escapeHTML(phone) + "." : ""}">
<meta property="og:title" content="${escapeHTML(shop)}${category ? " — " + escapeHTML(category) : ""}">
<meta property="og:description" content="${category ? escapeHTML(category) + " in " : ""}${escapeHTML(locationLine)}. ${phone ? "Call " + escapeHTML(phone) + "." : ""}">
<meta property="og:type" content="website">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }

:root {
  --primary: #0A2A6B;
  --accent: #C8102E;
  --primary-hover: #08213E;
  --accent-hover: #A00D25;
}
body.scheme-blue-gold {
  --primary: #123E73;
  --accent: #C9A227;
  --primary-hover: #0D2E55;
  --accent-hover: #A68620;
}

body {
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  line-height: 1.6;
  background: #fff;
  color: #222;
  padding: 0;
  margin: 0;
}

.hero {
  background: var(--primary);
  ${heroBackground ? `background-image: linear-gradient(rgba(10, 42, 107, 0.75), rgba(10, 42, 107, 0.75)), url('${escapeHTML(heroBackground)}');` : ''}
  background-size: cover;
  background-position: center;
  padding: 5rem 1.5rem;
  text-align: center;
  position: relative;
}
body.scheme-blue-gold .hero {
  ${heroBackground ? `background-image: linear-gradient(rgba(18, 62, 115, 0.75), rgba(18, 62, 115, 0.75)), url('${escapeHTML(heroBackground)}');` : ''}
}
.hero h1 {
  font-size: 3.5rem;
  font-weight: 900;
  margin-bottom: 1rem;
  color: #fff;
  letter-spacing: -0.03em;
  line-height: 1.1;
}
.hero .tagline {
  font-size: 2rem;
  color: #fff;
  font-weight: 600;
  margin-bottom: 3rem;
  opacity: 0.95;
}
.hero .cta {
  display: flex;
  gap: 1.25rem;
  justify-content: center;
  flex-wrap: wrap;
}

.btn {
  display: inline-block;
  padding: 1.25rem 3.5rem;
  border-radius: 12px;
  font-size: 1.4rem;
  font-weight: 700;
  text-decoration: none;
  transition: all 0.2s ease;
  border: 2px solid transparent;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}
.btn-primary {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent);
}
.btn-primary:hover {
  background: var(--accent-hover);
  border-color: var(--accent-hover);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0,0,0,0.2);
}
.btn-secondary {
  background: rgba(255,255,255,0.1);
  color: #fff;
  border-color: #fff;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}
.btn-secondary:hover {
  background: rgba(255,255,255,0.2);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0,0,0,0.15);
}

.section {
  padding: 5rem 1.5rem;
  background: #fff;
}
.section:nth-child(even) {
  background: #F8F9FB;
}
.section-inner {
  max-width: 1200px;
  margin: 0 auto;
}
.section h2 {
  font-size: 2.75rem;
  font-weight: 900;
  margin-bottom: 0.5rem;
  color: var(--primary);
  letter-spacing: -0.03em;
  position: relative;
  display: inline-block;
}
.section h2::after {
  content: '';
  position: absolute;
  bottom: -8px;
  left: 0;
  width: 60px;
  height: 4px;
  background: var(--accent);
  border-radius: 2px;
}
.section p {
  font-size: 1.25rem;
  color: #4A5568;
  line-height: 1.8;
  max-width: 800px;
  margin-top: 2rem;
}

.about p {
  margin-bottom: 1.25rem;
}
.about p:last-of-type {
  margin-bottom: 0;
}

.photos-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-top: 3rem;
}
.photo-item {
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}
.photo-item img {
  width: 100%;
  height: 250px;
  object-fit: cover;
  display: block;
}

.services-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 2.5rem;
  margin-top: 3rem;
}
.service-card {
  background: #fff;
  padding: 2.5rem;
  padding-left: 2.25rem;
  border-radius: 12px;
  border-left: 5px solid var(--accent);
  box-shadow: 0 4px 16px rgba(0,0,0,0.08);
  transition: all 0.3s ease;
}
.service-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.15);
  border-left-color: var(--primary);
}
.service-card h3 {
  font-size: 1.65rem;
  font-weight: 700;
  margin-bottom: 1rem;
  color: var(--primary);
  letter-spacing: -0.01em;
}
.service-card p {
  color: #555;
  font-size: 1.15rem;
  line-height: 1.7;
  margin: 0;
}

.reviews-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 2rem;
  margin-top: 3rem;
}
.review-card {
  background: #fff;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
}
.review-stars {
  color: var(--accent);
  font-size: 1.2rem;
  margin-bottom: 0.75rem;
}
.review-text {
  font-size: 1.1rem;
  color: #555;
  line-height: 1.7;
  font-style: italic;
  margin-bottom: 0.75rem;
}
.review-author {
  font-size: 1rem;
  color: #666;
  font-weight: 600;
}

.area-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 1.25rem;
  margin: 3rem 0 1.5rem;
}
.town-chip {
  background: var(--primary);
  color: #fff;
  padding: 1rem 2rem;
  border-radius: 50px;
  font-size: 1.15rem;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  transition: all 0.2s ease;
}
.town-chip:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}
.area-note {
  font-size: 1.15rem;
  color: #666;
  margin-top: 1rem;
}

.map-section {
  padding: 5rem 1.5rem;
  background: #F8F9FB;
}
.map-inner {
  max-width: 1100px;
  margin: 0 auto;
}
.map-inner h2 {
  font-size: 2.75rem;
  font-weight: 900;
  margin-bottom: 0.5rem;
  color: var(--primary);
  text-align: center;
  letter-spacing: -0.03em;
  position: relative;
  display: inline-block;
  width: 100%;
}
.map-inner h2::after {
  content: '';
  position: absolute;
  bottom: -8px;
  left: 50%;
  transform: translateX(-50%);
  width: 60px;
  height: 4px;
  background: var(--accent);
  border-radius: 2px;
}
.map-frame {
  background: #fff;
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 8px 24px rgba(0,0,0,0.12);
  margin-top: 3rem;
}
.map-embed {
  width: 100%;
  height: 400px;
  border: 0;
  border-radius: 12px;
  display: block;
}

.contact-section {
  padding: 5rem 1.5rem;
  background: var(--primary);
  text-align: center;
}
.contact-inner {
  max-width: 700px;
  margin: 0 auto;
}
.contact-inner h2 {
  font-size: 2.75rem;
  font-weight: 900;
  margin-bottom: 0.5rem;
  color: #fff;
  letter-spacing: -0.03em;
  position: relative;
  display: inline-block;
}
.contact-inner h2::after {
  content: '';
  position: absolute;
  bottom: -8px;
  left: 50%;
  transform: translateX(-50%);
  width: 60px;
  height: 4px;
  background: var(--accent);
  border-radius: 2px;
}
.contact-address {
  font-size: 1.4rem;
  color: rgba(255,255,255,0.95);
  margin: 2.5rem 0 1rem;
  line-height: 1.8;
}
.contact-phone {
  font-size: 2.25rem;
  font-weight: 700;
  color: #fff;
  margin: 2rem 0;
}
.contact-phone a {
  color: inherit;
  text-decoration: none;
}
.contact-cta {
  display: flex;
  gap: 1.25rem;
  justify-content: center;
  flex-wrap: wrap;
  margin-top: 2.5rem;
}

.footer {
  background: var(--primary-hover);
  padding: 2.5rem 1.5rem;
  text-align: center;
  font-size: 1.05rem;
  color: rgba(255,255,255,0.75);
}
.footer a {
  color: #fff;
  text-decoration: none;
  font-weight: 600;
  transition: opacity 0.2s;
}
.footer a:hover {
  opacity: 0.8;
}

@media (max-width: 768px) {
  .hero { padding: 4rem 1.5rem; }
  .hero h1 { font-size: 2.5rem; }
  .hero .tagline { font-size: 1.5rem; }
  .btn { font-size: 1.2rem; padding: 1.1rem 2.5rem; }
  .section { padding: 4rem 1.5rem; }
  .section h2 { font-size: 2.25rem; }
  .section p { font-size: 1.15rem; }
  .services-grid { gap: 2rem; }
  .service-card h3 { font-size: 1.4rem; }
  .service-card p { font-size: 1.05rem; }
  .contact-phone { font-size: 1.85rem; }
  .map-section { padding: 4rem 1.5rem; }
  .map-embed { height: 320px; }
}
</style>
<script>
(function() {
  var params = new URLSearchParams(window.location.search);
  var scheme = params.get('color') || params.get('scheme');
  if (scheme === 'blue-gold') {
    document.body.classList.add('scheme-blue-gold');
  }
})();
</script>
</head>
<body class="${schemeClass}">

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

${hasPhotos ? `<div class="section">
  <div class="section-inner">
    <h2>Photos</h2>
    <div class="photos-grid">
      ${photos.slice(0, 6).map(function(photo) {
        return `<div class="photo-item">
        <img src="${escapeHTML(photo)}" alt="${escapeHTML(shop)} photo" loading="lazy">
      </div>`;
      }).join("\n      ")}
    </div>
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

${hasGoodReviews ? `<div class="section">
  <div class="section-inner">
    <h2>Reviews</h2>
    <div class="reviews-grid">
      ${goodReviews.slice(0, 3).map(function(review) {
        var stars = '★'.repeat(review.rating || 5);
        return `<div class="review-card">
        <div class="review-stars">${stars}</div>
        <div class="review-text">"${escapeHTML(review.text || review.comment || '')}"</div>
        <div class="review-author">— ${escapeHTML(review.author || review.name || 'Customer')}</div>
      </div>`;
      }).join("\n      ")}
    </div>
  </div>
</div>` : ""}

${mapEmbed ? `<div class="map-section">
  <div class="map-inner">
    <h2>Visit Us</h2>
    <div class="map-frame">
      ${mapEmbed}
    </div>
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
  <p>Powered by <a href="https://we-post-it-full.vercel.app">We Post It</a>${townPhoto && !hasPhotos ? ' · Photo: Wikimedia Commons' : ''}</p>
</div>

</body>
</html>`;

  return html;
}

function getTownPhoto(city, state) {
  var cityKey = String(city || "").toLowerCase().replace(/[^a-z]/g, "");
  var stateKey = String(state || "").toLowerCase().replace(/[^a-z]/g, "");
  
  if (cityKey === "cameron" && stateKey === "tx") {
    return "/towns/cameron-tx.jpg";
  }
  
  return "";
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

function generateAboutText(shop, category, city, state, address) {
  var cat = String(category || "").toLowerCase();
  var location = (city && state) ? city + ", " + state : "";
  var shopName = escapeHTML(shop);
  var locationText = location ? " in " + escapeHTML(location) : "";
  var addressText = address ? " Based at " + escapeHTML(address) + "." : "";
  
  var trade = "local business";
  if (cat.indexOf("electric") !== -1) trade = "electrician";
  else if (cat.indexOf("hvac") !== -1 || cat.indexOf("heating") !== -1 || cat.indexOf("cooling") !== -1) trade = "HVAC contractor";
  else if (cat.indexOf("plumb") !== -1) trade = "plumber";
  else if (cat.indexOf("auto") !== -1 && cat.indexOf("body") !== -1) trade = "auto body shop";
  
  var aboutHtml = `<p>${shopName} is a local ${trade}${locationText}. We provide ${category ? escapeHTML(category).toLowerCase() : "quality"} services for residential and commercial clients.${addressText}</p>`;
  
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
