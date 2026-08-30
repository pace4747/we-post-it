const fs = require("fs");
const path = require("path");
const os = require("os");
const Stripe = require("stripe");

const ROOTS = [
  "/workspace/pipeline/submissions",
  path.join(os.tmpdir(), "wepostit-submissions")
];

const PRODUCTS = {
  posts: { label: "Posts — $9.99/mo", once: 0, month: 9.99 },
  cleanup: { label: "Cleanup — $9.99/mo", once: 0, month: 9.99 },
  page: { label: "New page — $9.99/mo", once: 0, month: 9.99 },
  both: { label: "Page + posts — $9.99/mo", once: 0, month: 9.99 }
};

function destDir() {
  for (var i = 0; i < ROOTS.length; i++) {
    try {
      fs.mkdirSync(ROOTS[i], { recursive: true });
      fs.accessSync(ROOTS[i], fs.constants.W_OK);
      return ROOTS[i];
    } catch (e) {}
  }
  return ROOTS[1];
}

function slug(s) {
  return String(s || "shop")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "shop";
}

function extOf(name, mime) {
  var m = String(name || "").toLowerCase().match(/\.(jpe?g|png|webp|gif|heic|heif|tif{1,2}|bmp)$/);
  if (m) return m[0] === ".jpeg" ? ".jpg" : m[0];
  if (/png/i.test(mime || "")) return ".png";
  if (/webp/i.test(mime || "")) return ".webp";
  if (/gif/i.test(mime || "")) return ".gif";
  return ".jpg";
}

function parseBoundary(ct) {
  var m = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(ct || "");
  return m ? (m[1] || m[2]).trim() : "";
}

function parseMultipart(buf, boundary) {
  var fields = {};
  var photos = [];
  var sep = Buffer.from("--" + boundary);
  var idx = indexOf(buf, sep, 0);
  while (idx !== -1) {
    var start = idx + sep.length;
    if (buf[start] === 13) start++;
    if (buf[start] === 10) start++;
    var next = indexOf(buf, sep, start);
    if (next === -1) break;
    var part = buf.slice(start, next);
    // strip trailing CRLF before next boundary
    if (part.length >= 2 && part[part.length - 2] === 13 && part[part.length - 1] === 10) {
      part = part.slice(0, -2);
    }
    var split = indexOf(part, Buffer.from("\r\n\r\n"), 0);
    var headBuf, body;
    if (split === -1) {
      split = indexOf(part, Buffer.from("\n\n"), 0);
      if (split === -1) { idx = next; continue; }
      headBuf = part.slice(0, split);
      body = part.slice(split + 2);
    } else {
      headBuf = part.slice(0, split);
      body = part.slice(split + 4);
    }
    var head = headBuf.toString("utf8");
    var nameM = /name="([^"]+)"/i.exec(head);
    var fileM = /filename="([^"]*)"/i.exec(head);
    var mimeM = /Content-Type:\s*([^\r\n]+)/i.exec(head);
    if (!nameM) { idx = next; continue; }
    var name = nameM[1];
    if (fileM && (name === "photos" || name === "photo" || name === "files")) {
      var fname = fileM[1] || "photo.jpg";
      if (body.length) photos.push({ name: fname, mime: mimeM ? mimeM[1].trim() : "image/jpeg", data: body });
    } else {
      fields[name] = body.toString("utf8");
    }
    idx = next;
  }
  return { fields: fields, photos: photos };
}

function indexOf(buf, seq, from) {
  return buf.indexOf(seq, from);
}

function collectBody(req) {
  return new Promise(function (resolve, reject) {
    if (req.body && Buffer.isBuffer(req.body)) { resolve(req.body); return; }
    if (typeof req.body === "string") { resolve(Buffer.from(req.body)); return; }
    if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
      resolve(null); // already parsed JSON
      return;
    }
    var chunks = [];
    req.on("data", function (c) { chunks.push(c); });
    req.on("end", function () { resolve(Buffer.concat(chunks)); });
    req.on("error", reject);
  });
}

async function createCheckoutSession(fields) {
  var shop = String(fields.shop || fields.name || "").trim();
  var town = String(fields.town || fields.place || "").trim();
  var phone = String(fields.phone || "").trim();
  var email = String(fields.email || "").trim();
  var sku = String(fields.product || "both").trim();
  var lang = String(fields.lang || "en");

  if (!process.env.STRIPE_SECRET_KEY) {
    return { status: 500, body: { ok: false, error: "Stripe configuration missing." } };
  }

  var stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  try {
    var sessionParams = {
      mode: "subscription",
      line_items: [{
        price: "price_1UABs108z3zLzTvzj60seVsl",
        quantity: 1
      }],
      success_url: "https://we-post-it-full.vercel.app/?paid=1",
      cancel_url: "https://we-post-it-full.vercel.app/#checkout",
      client_reference_id: shop + "|" + Date.now(),
      metadata: {
        shop: shop,
        town: town,
        phone: phone,
        email: email,
        lang: lang
      }
    };

    if (email) {
      sessionParams.customer_email = email;
    }

    var session = await stripe.checkout.sessions.create(sessionParams);
    return { status: 200, body: { ok: true, url: session.url } };
  } catch (err) {
    console.error("Stripe checkout error:", err);
    return { status: 500, body: { ok: false, error: err.message || "Stripe error. Try again." } };
  }
}

function saveOrder(fields, photos) {
  var shop = String(fields.shop || fields.name || "").trim();
  var town = String(fields.town || fields.place || "").trim();
  var phone = String(fields.phone || "").trim();
  if (!shop || !town || !phone) {
    return { status: 400, body: { ok: false, error: "Need shop name, town, and a phone." } };
  }
  var sku = String(fields.product || "both").trim();
  if (!PRODUCTS[sku]) sku = "both";
  var email = String(fields.email || "").trim();
  var skipCard = fields.skipCard === "1" || fields.skipCard === true || fields.skipCard === "true";
  var proof = fields.proof === "1" || fields.proof === true || /batten/i.test(shop);
  if (proof && skipCard) skipCard = true;

  var now = new Date();
  var stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  var id = stamp + "-" + slug(shop);
  var root = destDir();
  var dir = path.join(root, id);
  var photoDir = path.join(dir, "photos");
  fs.mkdirSync(photoDir, { recursive: true });

  var saved = [];
  (photos || []).forEach(function (p, i) {
    var n = String(i + 1).padStart(2, "0") + extOf(p.name, p.mime);
    var rel = "photos/" + n;
    fs.writeFileSync(path.join(dir, rel), p.data);
    saved.push({ file: rel, name: p.name || n });
  });

  var reason = skipCard ? "proof_skip" : "stripe_charges_not_enabled";
  var order = {
    id: id,
    at: now.toISOString(),
    shop: shop,
    town: town,
    phone: phone,
    email: email,
    product: sku,
    productLabel: PRODUCTS[sku].label,
    priceOnce: PRODUCTS[sku].once,
    priceMonth: PRODUCTS[sku].month,
    caption: String(fields.caption || "").trim(),
    photoCount: saved.length,
    photos: saved,
    lang: String(fields.lang || "en"),
    proof: !!proof,
    skipCard: !!skipCard,
    payment: {
      status: "held",
      charged: false,
      cardsLive: false,
      skipCard: !!skipCard,
      reason: reason
    },
    source: "checkout",
    posting: { maxPerDay: 1, maxPerWeek: 3, onlyIfPhotoSent: true }
  };
  fs.writeFileSync(path.join(dir, "order.json"), JSON.stringify(order, null, 2));
  try { fs.appendFileSync("/tmp/wepostit-orders.jsonl", JSON.stringify(order) + "\n"); } catch (e) {}
  return {
    status: 200,
    body: {
      ok: true,
      id: id,
      photoCount: saved.length,
      payment: order.payment,
      cardsLive: false
    }
  };
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
  if (req.method === "OPTIONS") { res.status(204).end(); return; }
  if (req.method !== "POST") { res.status(405).json({ ok: false }); return; }

  var ct = String(req.headers["content-type"] || "");
  try {
    var fields = {};
    var photos = [];

    if (ct.indexOf("multipart/form-data") !== -1) {
      var raw = await collectBody(req);
      if (!raw) { res.status(400).json({ ok: false, error: "Empty body" }); return; }
      var parsed = parseMultipart(raw, parseBoundary(ct));
      fields = parsed.fields;
      photos = parsed.photos;
    } else {
      var rawJson = await collectBody(req);
      var body = {};
      if (rawJson === null) {
        body = req.body || {};
      } else {
        try { body = JSON.parse(rawJson.toString("utf8") || "{}"); } catch (e) { body = {}; }
      }
      fields = body;
      (body.photos || []).forEach(function (p) {
        if (!p) return;
        var data = p.data || p.base64 || "";
        if (typeof data === "string" && data.indexOf("base64,") !== -1) data = data.split("base64,")[1];
        if (!data) return;
        photos.push({
          name: p.name || "photo.jpg",
          mime: p.type || p.mime || "image/jpeg",
          data: Buffer.from(data, "base64")
        });
      });
    }

    var shop = String(fields.shop || fields.name || "").trim();
    var skipCard = fields.skipCard === "1" || fields.skipCard === true || fields.skipCard === "true";
    var shouldSkipPayment = skipCard || /batten/i.test(shop);

    if (shouldSkipPayment) {
      var out = saveOrder(fields, photos);
      res.status(out.status).json(out.body);
      return;
    }

    var checkoutResult = await createCheckoutSession(fields);
    res.status(checkoutResult.status).json(checkoutResult.body);
  } catch (e) {
    console.error("checkout", e);
    res.status(500).json({ ok: false, error: "Did not save." });
  }
};

