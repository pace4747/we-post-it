const fs = require("fs");
const path = require("path");
const os = require("os");
const { normalizeSiteDocument, emptyDocument, assertDocumentSize } = require("./site-document");
const { tokensEqual } = require("./edit-auth");

function seedRoot() {
  return path.join(process.cwd(), "sites");
}

function writableRoots() {
  var roots = [];
  if (process.env.SITE_STORE_DIR) roots.push(process.env.SITE_STORE_DIR);
  roots.push(path.join(process.cwd(), "data", "sites"));
  roots.push(path.join(os.tmpdir(), "wepostit-sites"));
  return roots;
}

function pickWritableRoot() {
  var roots = writableRoots();
  for (var i = 0; i < roots.length; i++) {
    try {
      fs.mkdirSync(roots[i], { recursive: true });
      fs.accessSync(roots[i], fs.constants.W_OK);
      return roots[i];
    } catch (e) {}
  }
  return roots[roots.length - 1];
}

function storageKind() {
  if (process.env.BLOB_READ_WRITE_TOKEN) return "blob";
  var root = pickWritableRoot();
  if (root.indexOf(os.tmpdir()) === 0) return "tmp";
  return "disk";
}

function slugDir(root, slug) {
  return path.join(root, slug);
}

function readJsonFile(file) {
  try {
    var raw = fs.readFileSync(file, "utf8");
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function writeJsonFile(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n", "utf8");
}

function blobApi() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;
  try {
    return require("@vercel/blob");
  } catch (e) {
    return null;
  }
}

async function blobPut(pathname, data) {
  var blob = blobApi();
  if (!blob) return null;
  var result = await blob.put(pathname, JSON.stringify(data, null, 2), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
    token: process.env.BLOB_READ_WRITE_TOKEN,
    cacheControlMaxAge: 0
  });
  return result;
}

async function blobGetJson(pathname) {
  var blob = blobApi();
  if (!blob) return null;
  try {
    var listed = await blob.list({
      prefix: pathname,
      limit: 10,
      token: process.env.BLOB_READ_WRITE_TOKEN
    });
    var match = (listed.blobs || []).filter(function (b) {
      return b.pathname === pathname || (b.pathname && b.pathname.replace(/^\//, "") === pathname);
    })[0] || (listed.blobs || [])[0];
    if (!match || !match.url) return null;
    var res = await fetch(match.url, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.error("blob get failed", pathname, e.message || e);
    return null;
  }
}

async function blobPutBuffer(pathname, buffer, contentType) {
  var blob = blobApi();
  if (!blob) return null;
  var result = await blob.put(pathname, buffer, {
    access: "public",
    addRandomSuffix: true,
    contentType: contentType || "application/octet-stream",
    token: process.env.BLOB_READ_WRITE_TOKEN,
    cacheControlMaxAge: 60 * 60 * 24 * 365
  });
  return result;
}

function diskRead(slug, name) {
  var writable = path.join(pickWritableRoot(), slug, name);
  var seeded = path.join(seedRoot(), slug, name);
  return readJsonFile(writable) || readJsonFile(seeded);
}

function diskWrite(slug, name, data) {
  var file = path.join(pickWritableRoot(), slug, name);
  writeJsonFile(file, data);
  return file;
}

async function getPublished(slug) {
  slug = String(slug || "").replace(/[^a-z0-9-]/g, "").slice(0, 40);
  if (!slug) return null;
  var fromBlob = await blobGetJson("sites/" + slug + "/published.json");
  if (fromBlob) return normalizeSiteDocument(fromBlob, slug);
  var fromDisk = diskRead(slug, "published.json");
  if (fromDisk) return normalizeSiteDocument(fromDisk, slug);
  return null;
}

async function getDraft(slug) {
  slug = String(slug || "").replace(/[^a-z0-9-]/g, "").slice(0, 40);
  if (!slug) return null;
  var fromBlob = await blobGetJson("sites/" + slug + "/draft.json");
  if (fromBlob) return normalizeSiteDocument(fromBlob, slug);
  var fromDisk = diskRead(slug, "draft.json");
  if (fromDisk) return normalizeSiteDocument(fromDisk, slug);
  var published = await getPublished(slug);
  if (published) {
    published.status = "draft";
    return published;
  }
  return null;
}

async function saveDraft(slug, doc) {
  slug = String(slug || "").replace(/[^a-z0-9-]/g, "").slice(0, 40);
  var next = normalizeSiteDocument(doc, slug);
  next.slug = slug;
  next.status = "draft";
  next.updatedAt = new Date().toISOString();
  assertDocumentSize(next);
  var blob = await blobPut("sites/" + slug + "/draft.json", next);
  if (!blob) diskWrite(slug, "draft.json", next);
  return next;
}

async function publish(slug) {
  slug = String(slug || "").replace(/[^a-z0-9-]/g, "").slice(0, 40);
  var draft = await getDraft(slug);
  if (!draft) {
    var err = new Error("No draft to publish");
    err.code = "NO_DRAFT";
    throw err;
  }
  draft.status = "published";
  draft.updatedAt = new Date().toISOString();
  assertDocumentSize(draft);
  var blob = await blobPut("sites/" + slug + "/published.json", draft);
  if (!blob) diskWrite(slug, "published.json", draft);
  await saveDraft(slug, draft);
  var published = await getPublished(slug);
  return published || draft;
}

async function getAuth(slug) {
  slug = String(slug || "").replace(/[^a-z0-9-]/g, "").slice(0, 40);
  if (!slug) return null;
  var fromBlob = await blobGetJson("sites/" + slug + "/auth.json");
  if (fromBlob && fromBlob.editToken) return fromBlob;
  var fromDisk = diskRead(slug, "auth.json");
  if (fromDisk && fromDisk.editToken) return fromDisk;
  return null;
}

async function saveAuth(slug, editToken) {
  slug = String(slug || "").replace(/[^a-z0-9-]/g, "").slice(0, 40);
  var data = { editToken: String(editToken || ""), updatedAt: new Date().toISOString() };
  var blob = await blobPut("sites/" + slug + "/auth.json", data);
  if (!blob) diskWrite(slug, "auth.json", data);
  return data;
}

async function findStripeAuth(slug) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_SECRET_KEY.startsWith("sk_")) {
    return null;
  }
  try {
    var Stripe = require("stripe");
    var stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    var subscriptions = await stripe.subscriptions.list({ limit: 100, status: "all" });
    for (var i = 0; i < subscriptions.data.length; i++) {
      var meta = subscriptions.data[i].metadata || {};
      if (meta.slug === slug && meta.editToken) {
        return {
          editToken: meta.editToken,
          shop: meta.shop || "",
          phone: meta.phone || "",
          zip: meta.zip || "",
          category: meta.category || "",
          address: meta.address || "",
          hours: meta.hours || "",
          subscriptionId: subscriptions.data[i].id,
          metadata: meta
        };
      }
      if (meta.slug === slug) {
        return {
          editToken: "",
          shop: meta.shop || "",
          phone: meta.phone || "",
          zip: meta.zip || "",
          category: meta.category || "",
          address: meta.address || "",
          hours: meta.hours || "",
          subscriptionId: subscriptions.data[i].id,
          metadata: meta
        };
      }
    }
  } catch (e) {
    console.error("stripe auth lookup failed", e.message || e);
  }
  return null;
}

async function authorize(slug, token) {
  slug = String(slug || "").replace(/[^a-z0-9-]/g, "").slice(0, 40);
  token = String(token || "").trim();
  if (!slug || !token) return { ok: false, reason: "missing" };

  var seedAuth = await getAuth(slug);
  if (seedAuth && tokensEqual(seedAuth.editToken, token)) {
    return { ok: true, source: "seed" };
  }

  var demo = process.env.DEMO_EDIT_TOKEN || "";
  var demoSlug = process.env.DEMO_EDIT_SLUG || "rr-electric";
  if (demo && slug === demoSlug && tokensEqual(demo, token)) {
    return { ok: true, source: "env" };
  }

  var stripeAuth = await findStripeAuth(slug);
  if (stripeAuth && stripeAuth.editToken && tokensEqual(stripeAuth.editToken, token)) {
    return { ok: true, source: "stripe", stripe: stripeAuth };
  }

  return { ok: false, reason: "forbidden" };
}

async function shopDataFromStripe(slug) {
  var stripeAuth = await findStripeAuth(slug);
  if (!stripeAuth || !stripeAuth.shop || !stripeAuth.phone) return null;
  var meta = stripeAuth.metadata || {};
  var photos = [];
  if (meta.photos) {
    try { photos = JSON.parse(meta.photos); } catch (e) { photos = []; }
  }
  return {
    shop: meta.shop,
    zip: meta.zip || "",
    phone: meta.phone,
    slug: meta.slug,
    category: meta.category || "",
    address: meta.address || "",
    hours: meta.hours || "",
    city: meta.city || "",
    state: meta.state || "",
    photos: photos
  };
}

async function ensureDraftFromLegacy(slug, shopData) {
  var existing = await getDraft(slug);
  if (existing && existing.business && existing.business.name) return existing;
  var { shopDataToDocument } = require("./site-document");
  var doc = shopDataToDocument(shopData);
  return saveDraft(slug, doc);
}

async function uploadPhoto(slug, buffer, contentType, filename) {
  slug = String(slug || "").replace(/[^a-z0-9-]/g, "").slice(0, 40);
  if (!buffer || !buffer.length) {
    var err = new Error("Empty file");
    err.code = "EMPTY";
    throw err;
  }
  if (buffer.length > 4 * 1024 * 1024) {
    var tooBig = new Error("Photo is too large");
    tooBig.code = "TOO_LARGE";
    throw tooBig;
  }
  var result = await blobPutBuffer("sites/" + slug + "/photos/" + (filename || "photo"), buffer, contentType);
  if (!result || !result.url) {
    var noBlob = new Error("Photo upload needs BLOB_READ_WRITE_TOKEN");
    noBlob.code = "NO_BLOB";
    throw noBlob;
  }
  return result.url;
}

module.exports = {
  storageKind: storageKind,
  getPublished: getPublished,
  getDraft: getDraft,
  saveDraft: saveDraft,
  publish: publish,
  getAuth: getAuth,
  saveAuth: saveAuth,
  authorize: authorize,
  findStripeAuth: findStripeAuth,
  shopDataFromStripe: shopDataFromStripe,
  ensureDraftFromLegacy: ensureDraftFromLegacy,
  uploadPhoto: uploadPhoto,
  emptyDocument: emptyDocument,
  blobEnabled: function () { return !!blobApi(); }
};
