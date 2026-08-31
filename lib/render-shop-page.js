const { escapeHTML, safeImageUrl } = require("./escape");
const { shopDataToDocument, sectionByType, isSiteDocument, normalizeSiteDocument } = require("./site-document");

function getTownPhoto(city, state) {
  var cityKey = String(city || "").toLowerCase().replace(/[^a-z]/g, "");
  var stateKey = String(state || "").toLowerCase().replace(/[^a-z]/g, "");
  if (cityKey === "cameron" && stateKey === "tx") {
    return "/towns/cameron-tx.jpg";
  }
  return "";
}

function paragraphs(body) {
  var text = String(body || "").replace(/\r\n/g, "\n").trim();
  if (!text) return "";
  return text.split(/\n{2,}/).map(function (chunk) {
    var line = escapeHTML(chunk.replace(/\n/g, " ").trim());
    if (!line) return "";
    return "<p>" + line + "</p>";
  }).filter(Boolean).join("\n    ");
}

function townsList(towns) {
  return String(towns || "")
    .split(/[,|\n]/)
    .map(function (t) { return t.trim(); })
    .filter(Boolean)
    .slice(0, 16);
}

function wrapSection(id, html, options) {
  if (!html) return "";
  if (!options || !options.editorPreview) return html;
  return html.replace(/^(<[a-z0-9-]+)(\s|>)/i, function (_, tag, after) {
    if (after === ">") return tag + ' data-section="' + escapeHTML(id) + '">';
    return tag + ' data-section="' + escapeHTML(id) + '"' + after;
  });
}

function shopCss() {
  return `* { margin: 0; padding: 0; box-sizing: border-box; }

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
  background-size: cover;
  background-position: center;
  padding: 5rem 1.5rem;
  text-align: center;
  position: relative;
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
.photo-empty {
  margin-top: 2rem;
  padding: 2rem;
  border: 2px dashed #cfd4dc;
  border-radius: 12px;
  color: #667;
  text-align: center;
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
.contact-hours {
  font-size: 1.15rem;
  color: rgba(255,255,255,0.9);
  margin: 0.5rem 0 0;
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

[data-section].wpi-focus {
  outline: 4px solid #C9A227;
  outline-offset: -4px;
}
[data-edit-field] {
  cursor: text;
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
}`;
}

function editorScript() {
  return `(function() {
  function findSection(el) {
    while (el && el !== document.body) {
      if (el.getAttribute && el.getAttribute("data-section")) return el;
      el = el.parentNode;
    }
    return null;
  }
  document.addEventListener("click", function (e) {
    var sec = findSection(e.target);
    if (!sec) return;
    var field = e.target && e.target.getAttribute && e.target.getAttribute("data-edit-field");
    window.parent.postMessage({
      type: "wpi-select-section",
      id: sec.getAttribute("data-section"),
      field: field || ""
    }, "*");
  });
  document.querySelectorAll("[data-edit-field]").forEach(function (el) {
    el.setAttribute("contenteditable", "true");
    el.setAttribute("spellcheck", "true");
    el.addEventListener("input", function () {
      window.parent.postMessage({
        type: "wpi-edit-field",
        field: el.getAttribute("data-edit-field"),
        value: el.innerText
      }, "*");
    });
  });
  window.addEventListener("message", function (e) {
    if (!e.data || e.data.type !== "wpi-highlight") return;
    document.querySelectorAll("[data-section]").forEach(function (s) {
      s.classList.toggle("wpi-focus", s.getAttribute("data-section") === e.data.id);
    });
    var t = document.querySelector('[data-section="' + e.data.id + '"]');
    if (t && t.scrollIntoView) t.scrollIntoView({ behavior: "smooth", block: "start" });
  });
})();`;
}

function renderSiteDocument(doc, options) {
  options = options || {};
  var site = isSiteDocument(doc) ? normalizeSiteDocument(doc) : shopDataToDocument(doc);
  var biz = site.business;
  var palette = site.theme.palette === "blue-gold" ? "blue-gold" : "navy-red";
  var schemeClass = palette === "blue-gold" ? "scheme-blue-gold" : "scheme-navy-red";
  var primaryColor = palette === "blue-gold" ? "#123E73" : "#0A2A6B";
  var preview = !!options.editorPreview;

  var shop = biz.name || "Shop";
  var category = biz.category || "";
  var address = biz.address || "";
  var city = biz.city || "";
  var state = biz.state || "";
  var zip = biz.zip || "";
  var phone = biz.phone || "";
  var hours = biz.hours || "";
  var phoneLink = phone.replace(/[^\d+]/g, "");
  var cityState = (city && state) ? city + ", " + state + (zip ? " " + zip : "") : (zip || "");
  var locationLine = cityState;

  var hero = sectionByType(site, "hero") || { enabled: true, settings: {} };
  var about = sectionByType(site, "about") || { enabled: false, settings: {} };
  var photosSec = sectionByType(site, "photos") || { enabled: false, settings: { images: [] } };
  var servicesSec = sectionByType(site, "services") || { enabled: false, blocks: [] };
  var reviewsSec = sectionByType(site, "reviews") || { enabled: false, blocks: [] };
  var areaSec = sectionByType(site, "area") || { enabled: false, settings: {} };
  var mapSec = sectionByType(site, "map") || { enabled: false, settings: {} };
  var contactSec = sectionByType(site, "contact") || { enabled: true, settings: {} };

  var photos = (photosSec.settings && photosSec.settings.images) || [];
  var townPhoto = getTownPhoto(city, state);
  var heroBackground = photos.length > 0 ? photos[0] : townPhoto;
  var heroBgSafe = heroBackground ? safeImageUrl(heroBackground) : "";

  var headline = (hero.settings && hero.settings.headline) || shop;
  var tagline = (hero.settings && hero.settings.tagline) || "";
  if (!tagline && category && locationLine) tagline = category + " in " + locationLine;
  var ctaLabel = (hero.settings && hero.settings.ctaLabel) || (phone ? "Call " + phone : "Call Now");

  var mapEmbed = "";
  var directionsLink = "";
  if (address && cityState) {
    var mapQuery = encodeURIComponent(address + ", " + cityState);
    mapEmbed = `<iframe class="map-embed" src="https://maps.google.com/maps?q=${mapQuery}&z=16&output=embed" title="Map location" loading="lazy"></iframe>`;
    directionsLink = "https://www.google.com/maps/dir/?api=1&destination=" + mapQuery;
  }

  var heroStyle = "";
  if (heroBgSafe) {
    var overlay = palette === "blue-gold"
      ? "linear-gradient(rgba(18, 62, 115, 0.75), rgba(18, 62, 115, 0.75))"
      : "linear-gradient(rgba(10, 42, 107, 0.75), rgba(10, 42, 107, 0.75))";
    heroStyle = ` style="background-image: ${overlay}, url('${escapeHTML(heroBgSafe)}');"`;
  }

  var field = function (name) {
    return preview ? ' data-edit-field="' + name + '"' : "";
  };

  var heroHtml = "";
  if (hero.enabled !== false) {
    heroHtml = wrapSection("hero", `<div class="hero"${heroStyle}>
  <h1${field("hero.headline")}>${escapeHTML(headline)}</h1>
  ${tagline ? `<div class="tagline"${field("hero.tagline")}>${escapeHTML(tagline)}</div>` : (preview ? `<div class="tagline"${field("hero.tagline")}></div>` : "")}
  <div class="cta">
    ${phone ? `<a href="tel:${escapeHTML(phoneLink)}" class="btn btn-primary">${escapeHTML(ctaLabel)}</a>` : ""}
    ${directionsLink ? `<a href="${escapeHTML(directionsLink)}" class="btn btn-secondary" target="_blank" rel="noopener">Get Directions</a>` : ""}
  </div>
</div>`, options);
  }

  var aboutBody = paragraphs(about.settings && about.settings.body);
  var aboutHtml = "";
  if (about.enabled !== false && (aboutBody || preview)) {
    aboutHtml = wrapSection("about", `<div class="section">
  <div class="section-inner about">
    <h2>About</h2>
    <div${field("about.body")}>${aboutBody || (preview ? "<p></p>" : "")}</div>
  </div>
</div>`, options);
  }

  var photosHtml = "";
  if (photosSec.enabled !== false) {
    var photoItems = photos.slice(0, 8).map(function (photo) {
      var src = safeImageUrl(photo);
      if (!src) return "";
      return `<div class="photo-item">
        <img src="${escapeHTML(src)}" alt="${escapeHTML(shop)} photo" loading="lazy">
      </div>`;
    }).filter(Boolean).join("\n      ");
    if (photoItems || preview) {
      photosHtml = wrapSection("photos", `<div class="section">
  <div class="section-inner">
    <h2>Photos</h2>
    ${photoItems ? `<div class="photos-grid">
      ${photoItems}
    </div>` : `<div class="photo-empty">Add photo URLs in the editor.</div>`}
  </div>
</div>`, options);
    }
  }

  var services = (servicesSec.blocks || []).filter(function (s) { return s && (s.name || s.description); });
  var servicesHtml = "";
  if (servicesSec.enabled !== false && (services.length || preview)) {
    servicesHtml = wrapSection("services", `<div class="section">
  <div class="section-inner">
    <h2>Our Services</h2>
    <div class="services-grid">
      ${services.map(function (s) {
        return `<div class="service-card">
        <h3>${escapeHTML(s.name)}</h3>
        <p>${escapeHTML(s.description)}</p>
      </div>`;
      }).join("\n      ") || (preview ? `<div class="service-card"><h3>Service</h3><p>Add a service in the editor.</p></div>` : "")}
    </div>
  </div>
</div>`, options);
  }

  var goodReviews = (reviewsSec.blocks || []).filter(function (r) { return r && r.rating && r.rating >= 4 && (r.text || r.author); });
  var reviewsHtml = "";
  if (reviewsSec.enabled !== false && (goodReviews.length || preview)) {
    reviewsHtml = wrapSection("reviews", `<div class="section">
  <div class="section-inner">
    <h2>Reviews</h2>
    <div class="reviews-grid">
      ${(goodReviews.length ? goodReviews : (preview ? [{ rating: 5, text: "Add a review in the editor.", author: "Customer" }] : [])).slice(0, 6).map(function (review) {
        var stars = "★".repeat(review.rating || 5);
        return `<div class="review-card">
        <div class="review-stars">${stars}</div>
        <div class="review-text">"${escapeHTML(review.text || "")}"</div>
        <div class="review-author">— ${escapeHTML(review.author || "Customer")}</div>
      </div>`;
      }).join("\n      ")}
    </div>
  </div>
</div>`, options);
  }

  var towns = townsList(areaSec.settings && areaSec.settings.towns);
  var areaHtml = "";
  if (areaSec.enabled !== false && (towns.length || preview)) {
    var note = (areaSec.settings && areaSec.settings.note) || "Nearby towns. Call if you are farther.";
    areaHtml = wrapSection("area", `<div class="section">
  <div class="section-inner">
    <h2>Where We Work</h2>
    <div class="area-grid">
      ${towns.map(function (t) {
        return `<div class="town-chip">${escapeHTML(t)}</div>`;
      }).join("\n      ")}
    </div>
    <p class="area-note">${escapeHTML(note)}</p>
  </div>
</div>`, options);
  }

  var mapHtml = "";
  if (mapSec.enabled !== false && (mapEmbed || preview)) {
    mapHtml = wrapSection("map", `<div class="map-section">
  <div class="map-inner">
    <h2>Visit Us</h2>
    <div class="map-frame">
      ${mapEmbed || (preview ? `<div class="photo-empty">Add an address to show the map.</div>` : "")}
    </div>
  </div>
</div>`, options);
  }

  var contactHtml = "";
  if (contactSec.enabled !== false) {
    contactHtml = wrapSection("contact", `<div class="contact-section">
  <div class="contact-inner">
    <h2>Contact</h2>
    ${address && cityState ? `<div class="contact-address">
      ${escapeHTML(address)}<br>
      ${escapeHTML(cityState)}
    </div>` : ""}
    ${hours ? `<div class="contact-hours">${escapeHTML(hours)}</div>` : ""}
    ${phone ? `<div class="contact-phone">
      <a href="tel:${escapeHTML(phoneLink)}">${escapeHTML(phone)}</a>
    </div>` : ""}
    <div class="contact-cta">
      ${phone ? `<a href="tel:${escapeHTML(phoneLink)}" class="btn btn-primary">${escapeHTML(ctaLabel || "Call Now")}</a>` : ""}
      ${directionsLink ? `<a href="${escapeHTML(directionsLink)}" class="btn btn-secondary" target="_blank" rel="noopener">Get Directions</a>` : ""}
    </div>
  </div>
</div>`, options);
  }

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
${preview ? '<meta name="robots" content="noindex,nofollow">' : ""}
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<style>
${shopCss()}
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

${heroHtml}

${aboutHtml}

${photosHtml}

${servicesHtml}

${reviewsHtml}

${areaHtml}

${mapHtml}

${contactHtml}

<div class="footer">
  <p>Powered by <a href="https://we-post-it-full.vercel.app">We Post It</a>${townPhoto && photos.length === 0 ? " · Photo: Wikimedia Commons" : ""}</p>
</div>

${preview ? "<script>" + editorScript() + "</script>" : ""}
</body>
</html>`;

  return html;
}

function generateShopPageHTML(shopData, options) {
  return renderSiteDocument(shopData, options || {});
}

module.exports = {
  renderSiteDocument: renderSiteDocument,
  generateShopPageHTML: generateShopPageHTML,
  getTownPhoto: getTownPhoto
};
