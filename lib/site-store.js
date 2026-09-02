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
  roots.push(path.join(os.tmpdir(), "yoursite-sites"));
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

function onVercel() {
  return !!(process.env.VERCEL || process.env.VERCEL_ENV);
}

function assertDurableStore() {
  if (onVercel() && !process.env.BLOB_READ_WRITE_TOKEN) {
    var err = new Error("Shop storage is not configured.");
    err.code = "NO_STORE";
    throw err;
  }
}

async function putDurable(pathname, data) {
  assertDurableStore();
  var blob = null;
  try {
    blob = await blobPut(pathname, data);
  } catch (e) {
    if (onVercel()) {
      var fail = new Error("Could not save the shop.");
      fail.code = "NO_STORE";
      fail.cause = e;
      throw fail;
    }
    blob = null;
  }
  if (blob) return blob;
  if (onVercel()) {
    var missing = new Error("Could not save the shop.");
    missing.code = "NO_STORE";
    throw missing;
  }
  return null;
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
      limit: 20,
      token: process.env.BLOB_READ_WRITE_TOKEN
    });
    var blobs = listed.blobs || [];
    var match = blobs.filter(function (b) {
      var p = String(b.pathname || "").replace(/^\//, "");
      return p === pathname || p.indexOf(pathname + ".") === 0;
    }).sort(function (a, b) {
      return new Date(b.uploadedAt || 0).getTime() - new Date(a.uploadedAt || 0).getTime();
    })[0];
    if (!match || !match.url) return null;
    var url = match.url + (match.url.indexOf("?") >= 0 ? "&" : "?") + "cb=" + Date.now();
    var res = await fetch(url, {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache", Pragma: "no-cache" }
    });
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

function photosDir(slug) {
  return path.join(pickWritableRoot(), slug, "photos");
}

function photoExt(contentType, filename) {
  var mime = String(contentType || "").toLowerCase().split(";")[0].trim();
  if (mime === "image/png" || /\.png$/i.test(filename || "")) return ".png";
  if (mime === "image/webp" || /\.webp$/i.test(filename || "")) return ".webp";
  if (mime === "image/gif" || /\.gif$/i.test(filename || "")) return ".gif";
  return ".jpg";
}

function safePhotoName(name) {
  return String(name || "photo").replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 80) || "photo";
}

function readLocalPhoto(slug, filename) {
  slug = String(slug || "").replace(/[^a-z0-9-]/g, "").slice(0, 40);
  var fname = safePhotoName(filename);
  if (!slug || !fname || fname.indexOf("..") !== -1) return "";
  var writable = path.join(photosDir(slug), fname);
  var seeded = path.join(seedRoot(), slug, "photos", fname);
  if (fs.existsSync(writable)) return writable;
  if (fs.existsSync(seeded)) return seeded;
  return "";
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

function digits10(value) {
  var d = String(value || "").replace(/\D/g, "");
  if (d.length === 11 && d.charAt(0) === "1") d = d.slice(1);
  return d.length === 10 ? d : "";
}

function referralDiskFile(key) {
  return path.join(path.dirname(pickWritableRoot()), "referrals", key + ".json");
}

async function putReferralRecord(key, data) {
  key = String(key || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80);
  if (!key) return null;
  var blob = await blobPut("referrals/" + key + ".json", data);
  if (!blob) writeJsonFile(referralDiskFile(key), data);
  return data;
}

async function getReferralRecord(key) {
  key = String(key || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80);
  if (!key) return null;
  var fromBlob = await blobGetJson("referrals/" + key + ".json");
  if (fromBlob) return fromBlob;
  return readJsonFile(referralDiskFile(key));
}

async function savePaidPhone(phone, extra) {
  extra = extra || {};
  var d = digits10(phone);
  if (!d) return null;
  var prev = (await getReferralRecord("p-" + d)) || {};
  return putReferralRecord("p-" + d, {
    phone: d,
    slug: extra.slug || prev.slug || "",
    subscriptionId: extra.subscriptionId || prev.subscriptionId || "",
    customerId: extra.customerId || prev.customerId || "",
    updatedAt: new Date().toISOString()
  });
}

async function getPaidPhone(phone) {
  var d = digits10(phone);
  if (!d) return null;
  return getReferralRecord("p-" + d);
}

async function saveCredit(newSubscriptionId, data) {
  var id = String(newSubscriptionId || "").replace(/[^a-zA-Z0-9_]/g, "").slice(0, 80);
  if (!id) return null;
  return putReferralRecord("c-" + id, data);
}

async function getCredit(newSubscriptionId) {
  var id = String(newSubscriptionId || "").replace(/[^a-zA-Z0-9_]/g, "").slice(0, 80);
  if (!id) return null;
  return getReferralRecord("c-" + id);
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

function mergeStoredBilling(next, prev) {
  if (!next) return next;
  if (!prev || !prev.billing) return next;
  var pb = prev.billing;
  var nb = next.billing || {};
  var mail = Object.assign({}, pb.mail || {}, nb.mail || {});
  function fill(base) {
    base.mail = mail;
    if (!base.subscriptionId) base.subscriptionId = pb.subscriptionId || "";
    if (!base.customerId) base.customerId = pb.customerId || "";
    if (!base.hostUntil) base.hostUntil = pb.hostUntil || "";
    return base;
  }
  if (nb.cancelled === true || next.status === "cancelled") {
    next.billing = fill(Object.assign({}, pb, nb));
    next.billing.cancelled = true;
    if (nb.paid === false) next.billing.paid = false;
    return next;
  }
  if (nb.paid === true) {
    next.billing = fill(Object.assign({}, pb, nb, { paid: true }));
    return next;
  }
  if (pb.cancelled === true || prev.status === "cancelled") {
    next.billing = fill(Object.assign({}, pb, { mail: mail }));
    next.billing.cancelled = true;
    if (pb.hostUntil) next.billing.hostUntil = pb.hostUntil;
    return next;
  }
  if (pb.paid === true) {
    next.billing = Object.assign({}, pb, { mail: mail });
    return next;
  }
  next.billing = fill(Object.assign({}, pb, nb));
  return next;
}

async function saveDraft(slug, doc) {
  slug = String(slug || "").replace(/[^a-z0-9-]/g, "").slice(0, 40);
  var prev = null;
  try { prev = (await getDraft(slug)) || (await getPublished(slug)); } catch (e) { prev = null; }
  var next = normalizeSiteDocument(doc, slug);
  next.slug = slug;
  next.status = "draft";
  next.updatedAt = new Date().toISOString();
  mergeStoredBilling(next, prev);
  ensureHostUntil(next);
  assertDocumentSize(next);
  var blob = await putDurable("sites/" + slug + "/draft.json", next);
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
  ensureHostUntil(draft);
  assertDocumentSize(draft);
  var blob = await putDurable("sites/" + slug + "/published.json", draft);
  if (!blob) diskWrite(slug, "published.json", draft);
  await saveDraft(slug, draft);
  var published = await getPublished(slug);
  return published || draft;
}

async function getAuth(slug) {
  slug = String(slug || "").replace(/[^a-z0-9-]/g, "").slice(0, 40);
  if (!slug) return null;
  var fromBlob = await blobGetJson("sites/" + slug + "/auth.json");
  if (fromBlob && (fromBlob.editToken || fromBlob.ownerUserId)) return fromBlob;
  var fromDisk = diskRead(slug, "auth.json");
  if (fromDisk && (fromDisk.editToken || fromDisk.ownerUserId)) return fromDisk;
  return null;
}

async function saveAuth(slug, editToken, extra) {
  slug = String(slug || "").replace(/[^a-z0-9-]/g, "").slice(0, 40);
  extra = extra || {};
  var prev = {};
  try { prev = (await getAuth(slug)) || {}; } catch (e) { prev = {}; }
  function field(key, fallback) {
    if (Object.prototype.hasOwnProperty.call(extra, key)) {
      var v = extra[key];
      return v == null ? "" : v;
    }
    return fallback;
  }
  var data = {
    editToken: String(editToken || prev.editToken || ""),
    paid: extra.paid != null ? extra.paid === true : prev.paid === true,
    ownerUserId: String(field("ownerUserId", prev.ownerUserId || "")),
    ownerEmail: String(field("ownerEmail", prev.ownerEmail || "")),
    updatedAt: new Date().toISOString()
  };
  var blob = await putDurable("sites/" + slug + "/auth.json", data);
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
        var liveTok = subscriptions.data[i].status === "active" || subscriptions.data[i].status === "trialing";
        if (!liveTok) continue;
        return {
          editToken: meta.editToken,
          shop: meta.shop || "",
          phone: meta.phone || "",
          zip: meta.zip || "",
          category: meta.category || "",
          address: meta.address || "",
          hours: meta.hours || "",
          subscriptionId: subscriptions.data[i].id,
          status: subscriptions.data[i].status || "",
          metadata: meta
        };
      }
      if (meta.slug === slug) {
        var live = subscriptions.data[i].status === "active" || subscriptions.data[i].status === "trialing";
        if (!live) continue;
        return {
          editToken: "",
          shop: meta.shop || "",
          phone: meta.phone || "",
          zip: meta.zip || "",
          category: meta.category || "",
          address: meta.address || "",
          hours: meta.hours || "",
          subscriptionId: subscriptions.data[i].id,
          status: subscriptions.data[i].status || "",
          metadata: meta
        };
      }
    }
  } catch (e) {
    console.error("stripe auth lookup failed", e.message || e);
  }
  return null;
}

var LAST_CHANCE_MS = 14 * 24 * 60 * 60 * 1000;
var CLOCK_CACHE_MS = 5 * 60 * 1000;
var clockCache = { at: 0, rows: [] };

function billingCancelled(doc) {
  return !!(doc && (doc.status === "cancelled" || (doc.billing && doc.billing.cancelled)));
}

function billingPaid(doc) {
  return !!(doc && doc.billing && doc.billing.paid);
}

function addMonthsIso(from, months) {
  var d = from ? new Date(from) : new Date();
  if (isNaN(d.getTime())) d = new Date();
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString();
}

function hostUntilMs(doc) {
  if (!doc || !doc.billing) return 0;
  var until = Date.parse(doc.billing.hostUntil || "");
  return isNaN(until) ? 0 : until;
}

function onHostClock(doc) {
  if (!doc) return false;
  if (doc.status === "cancelled") return true;
  if (billingCancelled(doc)) return true;
  return false;
}

function ensureHostUntil(doc) {
  if (!doc) return doc;
  if (!doc.billing || typeof doc.billing !== "object") doc.billing = {};
  if (!onHostClock(doc)) return doc;
  if (doc.billing.hostUntil && !isNaN(Date.parse(doc.billing.hostUntil))) return doc;
  var from = doc.billing.cancelledAt || doc.createdAt || "";
  doc.billing.hostUntil = addMonthsIso(from, 4);
  return doc;
}

function isWithinHostGrace(doc) {
  if (!onHostClock(doc)) return false;
  var until = hostUntilMs(doc);
  if (!until) return false;
  return Date.now() < until;
}

function isHostedPaid(doc) {
  if (!billingPaid(doc)) return false;
  if (!billingCancelled(doc) && doc.status !== "cancelled") return true;
  return isWithinHostGrace(doc);
}

function isTakenDown(doc) {
  if (!doc) return true;
  if (!onHostClock(doc)) return false;
  var until = hostUntilMs(doc);
  if (!until) return billingCancelled(doc) || doc.status === "cancelled";
  return Date.now() >= until;
}

function lastChanceOpen(hostUntil) {
  var until = Date.parse(hostUntil || "");
  if (isNaN(until)) return false;
  var remain = until - Date.now();
  return remain > 0 && remain <= LAST_CHANCE_MS;
}

async function isUnpaidPreview(slug) {
  slug = String(slug || "").replace(/[^a-z0-9-]/g, "").slice(0, 40);
  if (!slug) return false;
  var doc = (await getPublished(slug)) || (await getDraft(slug));
  if (!doc || !doc.business || !doc.business.name) return false;
  if (billingCancelled(doc)) return false;
  if (isTakenDown(doc)) return false;
  return !billingPaid(doc);
}

function sessionOwnsShop(user, auth, slug) {
  if (!user || user.disabled === true || !slug) return false;
  var shops = Array.isArray(user.shops) ? user.shops : [];
  if (shops.indexOf(slug) !== -1) return true;
  if (auth && auth.ownerUserId && auth.ownerUserId === user.id) return true;
  if (auth && auth.ownerEmail) {
    var accounts = require("./account-store");
    if (accounts.normEmail(auth.ownerEmail) === accounts.normEmail(user.email)) return true;
  }
  return false;
}

async function authorize(slug, token, req) {
  slug = String(slug || "").replace(/[^a-z0-9-]/g, "").slice(0, 40);
  token = String(token || "").trim();
  if (!slug) return { ok: false, reason: "missing" };

  if (req) {
    try {
      var session = require("./session");
      var accounts = require("./account-store");
      var userId = session.sessionFromRequest(req);
      if (userId) {
        var user = await accounts.getById(userId);
        var owner = await getAuth(slug);
        if (sessionOwnsShop(user, owner, slug)) {
          return { ok: true, source: "account", user: user };
        }
      }
    } catch (e) {}
  }

  if (!token) return { ok: false, reason: "missing" };

  var seedAuth = await getAuth(slug);
  if (seedAuth && seedAuth.editToken && tokensEqual(seedAuth.editToken, token)) {
    return { ok: true, source: "seed" };
  }

  var stripeAuth = await findStripeAuth(slug);
  if (stripeAuth && stripeAuth.editToken && tokensEqual(stripeAuth.editToken, token)) {
    if (stripeAuth.status === "active" || stripeAuth.status === "trialing") {
      return { ok: true, source: "stripe", stripe: stripeAuth };
    }
    return { ok: false, reason: "unpaid" };
  }

  return { ok: false, reason: "forbidden" };
}

async function claimShop(slug, user, token) {
  slug = String(slug || "").replace(/[^a-z0-9-]/g, "").slice(0, 40);
  token = String(token || "").trim();
  if (!slug || !user || !user.id || !token) return false;
  var auth = await getAuth(slug);
  if (!auth || !auth.editToken || !tokensEqual(auth.editToken, token)) return false;
  if (auth.ownerUserId && auth.ownerUserId !== user.id) return false;
  await saveAuth(slug, auth.editToken, {
    paid: auth.paid === true,
    ownerUserId: user.id,
    ownerEmail: user.email || ""
  });
  var accounts = require("./account-store");
  await accounts.addShop(user.id, slug);
  return true;
}

async function unclaimShop(slug) {
  slug = String(slug || "").replace(/[^a-z0-9-]/g, "").slice(0, 40);
  if (!slug) return false;
  var auth = await getAuth(slug);
  if (!auth) return false;
  var ownerId = auth.ownerUserId || "";
  await saveAuth(slug, auth.editToken || "", {
    paid: auth.paid === true,
    ownerUserId: "",
    ownerEmail: ""
  });
  if (ownerId) {
    var accounts = require("./account-store");
    try { await accounts.removeShop(ownerId, slug); } catch (e) {}
  }
  return true;
}

async function attachShop(slug, user) {
  slug = String(slug || "").replace(/[^a-z0-9-]/g, "").slice(0, 40);
  if (!slug || !user || !user.id) return false;
  var auth = (await getAuth(slug)) || {};
  if (auth.ownerUserId && auth.ownerUserId !== user.id) return false;
  await saveAuth(slug, auth.editToken || "", {
    paid: auth.paid === true,
    ownerUserId: user.id,
    ownerEmail: user.email || ""
  });
  var accounts = require("./account-store");
  await accounts.addShop(user.id, slug);
  return true;
}

async function claimShopByEmail(slug, user) {
  slug = String(slug || "").replace(/[^a-z0-9-]/g, "").slice(0, 40);
  if (!slug || !user || !user.id || !user.email) return false;
  var accounts = require("./account-store");
  var auth = await getAuth(slug);
  if (!auth) return false;
  if (auth.ownerUserId && auth.ownerUserId !== user.id) return false;
  var owner = accounts.normEmail(auth.ownerEmail || "");
  var email = accounts.normEmail(user.email);
  if (!owner || owner !== email) return false;
  await saveAuth(slug, auth.editToken || "", {
    paid: auth.paid === true,
    ownerUserId: user.id,
    ownerEmail: user.email || ""
  });
  await accounts.addShop(user.id, slug);
  return true;
}

function nextMail(prev, resetLifecycle) {
  var mail = Object.assign({}, (prev && prev.mail) || {});
  if (resetLifecycle) {
    mail.welcomeAt = "";
    mail.pastDueInvoiceId = "";
    mail.cancelScheduledAt = "";
    mail.cancelDoneAt = "";
    mail.lastChanceAt = "";
    mail.takenDownAt = "";
  }
  return mail;
}

async function persistBillingDoc(slug, doc) {
  var status = doc.status;
  var saved = await saveDraft(slug, doc);
  if (status === "published" || status === "cancelled") {
    saved.status = status;
    var blob = await blobPut("sites/" + slug + "/published.json", saved);
    if (!blob) diskWrite(slug, "published.json", saved);
    return saved;
  }
  return saved;
}

async function patchBillingMail(slug, mailPatch) {
  slug = String(slug || "").replace(/[^a-z0-9-]/g, "").slice(0, 40);
  if (!slug || !mailPatch) return null;
  var published = await getPublished(slug);
  var doc = published || (await getDraft(slug));
  if (!doc) return null;
  if (!doc.billing || typeof doc.billing !== "object") doc.billing = {};
  doc.billing.mail = Object.assign({}, doc.billing.mail || {}, mailPatch);
  if (published || doc.status === "published") doc.status = doc.status || "published";
  return persistBillingDoc(slug, doc);
}

async function markPaid(slug, subscriptionId, extra) {
  extra = extra || {};
  slug = String(slug || "").replace(/[^a-z0-9-]/g, "").slice(0, 40);
  var doc = (await getPublished(slug)) || (await getDraft(slug));
  if (!doc) return null;
  var prev = doc.billing || {};
  var wasCancelled = !!(prev.cancelled || doc.status === "cancelled");
  var customerId = extra.customerId || prev.customerId || "";
  doc.billing = {
    paid: true,
    cancelled: false,
    cancelledAt: "",
    hostUntil: "",
    subscriptionId: String(subscriptionId || prev.subscriptionId || ""),
    customerId: customerId,
    mail: nextMail(prev, wasCancelled)
  };
  doc.status = "published";
  await saveDraft(slug, doc);
  var published = await publish(slug);
  var phone = extra.phone || (doc.business && doc.business.phone) || "";
  try {
    await savePaidPhone(phone, {
      slug: slug,
      subscriptionId: String(subscriptionId || ""),
      customerId: customerId
    });
  } catch (e) {
    console.error("paid phone index", e.message || e);
  }
  return published;
}

async function markCancelled(slug) {
  slug = String(slug || "").replace(/[^a-z0-9-]/g, "").slice(0, 40);
  var doc = (await getPublished(slug)) || (await getDraft(slug));
  if (!doc) return null;
  var now = new Date().toISOString();
  var prev = doc.billing || {};
  doc.billing = {
    paid: true,
    cancelled: true,
    cancelledAt: prev.cancelledAt || now,
    hostUntil: prev.hostUntil && !isNaN(Date.parse(prev.hostUntil)) ? prev.hostUntil : addMonthsIso(now, 4),
    subscriptionId: prev.subscriptionId || "",
    customerId: prev.customerId || "",
    mail: nextMail(prev, false)
  };
  doc.status = "published";
  await saveDraft(slug, doc);
  var blob = await blobPut("sites/" + slug + "/published.json", doc);
  if (!blob) diskWrite(slug, "published.json", doc);
  return doc;
}

async function persistPublished(slug, doc) {
  slug = String(slug || "").replace(/[^a-z0-9-]/g, "").slice(0, 40);
  if (!slug || !doc) return doc;
  var blob = await blobPut("sites/" + slug + "/published.json", doc);
  if (!blob) diskWrite(slug, "published.json", doc);
  return doc;
}

async function expireHostIfDue(slug) {
  slug = String(slug || "").replace(/[^a-z0-9-]/g, "").slice(0, 40);
  var published = await getPublished(slug);
  var doc = published || (await getDraft(slug));
  if (!doc) return doc;
  if (!onHostClock(doc)) return doc;
  var before = (doc.billing && doc.billing.hostUntil) || "";
  ensureHostUntil(doc);
  var after = (doc.billing && doc.billing.hostUntil) || "";
  if (after && after !== before) {
    await saveDraft(slug, doc);
    if (published || doc.status === "published") {
      var live = Object.assign({}, doc, { status: "published" });
      await persistPublished(slug, live);
      doc = live;
    }
  }
  if (!isTakenDown(doc)) return doc;
  return unpublish(slug);
}

function addSlug(set, raw) {
  var slug = String(raw || "").replace(/[^a-z0-9-]/g, "").slice(0, 40);
  if (slug) set[slug] = true;
}

function diskSlugDirs(root, set) {
  if (!root || !fs.existsSync(root)) return;
  try {
    fs.readdirSync(root).forEach(function (name) {
      try {
        if (fs.statSync(path.join(root, name)).isDirectory()) addSlug(set, name);
      } catch (e) {}
    });
  } catch (e) {}
}

async function listBlobSlugs(set) {
  var blob = blobApi();
  if (!blob) return;
  var cursor = "";
  var pages = 0;
  while (pages < 40) {
    var listed = await blob.list({
      prefix: "sites/",
      limit: 1000,
      cursor: cursor || undefined,
      token: process.env.BLOB_READ_WRITE_TOKEN
    });
    (listed.blobs || []).forEach(function (b) {
      var p = String((b && b.pathname) || "").replace(/^\//, "");
      if (/\/photos\//i.test(p)) return;
      var m = p.match(/^sites\/([a-z0-9-]+)\//);
      if (m) addSlug(set, m[1]);
    });
    pages += 1;
    if (!listed.hasMore || !listed.cursor) break;
    cursor = listed.cursor;
  }
}

async function listKnownSlugs() {
  var set = Object.create(null);
  diskSlugDirs(seedRoot(), set);
  writableRoots().forEach(function (root) { diskSlugDirs(root, set); });
  await listBlobSlugs(set);
  try {
    var usage = require("./usage-store");
    var idx = await usage.loadIndex();
    Object.keys((idx && idx.shops) || {}).forEach(function (slug) { addSlug(set, slug); });
  } catch (e) {}
  try {
    var sidecar = require("./outreach-store");
    var state = sidecar.loadState();
    Object.keys(state || {}).forEach(function (phone) {
      addSlug(set, state[phone] && state[phone].slug);
    });
  } catch (e) {}
  return Object.keys(set);
}

function clockRowFromDoc(slug, doc) {
  doc = doc || {};
  var billing = doc.billing || {};
  return {
    slug: slug,
    name: (doc.business && doc.business.name) || slug,
    phone: (doc.business && doc.business.phone) || "",
    paid: billingPaid(doc),
    cancelled: billingCancelled(doc),
    hostUntil: billing.hostUntil || "",
    status: doc.status || "",
    takenDown: isTakenDown(doc),
    lastChance: onHostClock(doc) && lastChanceOpen(billing.hostUntil)
  };
}

async function expireDueAll() {
  var slugs = await listKnownSlugs();
  var rows = [];
  var expired = [];
  for (var i = 0; i < slugs.length; i++) {
    var slug = slugs[i];
    var before = (await getPublished(slug)) || (await getDraft(slug));
    var after = await expireHostIfDue(slug);
    var doc = after || before;
    if (!doc) continue;
    if (before && !isTakenDown(before) && after && isTakenDown(after)) expired.push(slug);
    if (onHostClock(doc)) {
      rows.push(clockRowFromDoc(slug, doc));
    }
  }
  clockCache = { at: Date.now(), rows: rows };
  return { checked: slugs.length, expired: expired, rows: rows };
}

async function hostClockRows(force) {
  if (!force && clockCache.rows && (Date.now() - clockCache.at) < CLOCK_CACHE_MS) {
    return clockCache.rows;
  }
  var result = await expireDueAll();
  return result.rows;
}

async function unpublish(slug) {
  slug = String(slug || "").replace(/[^a-z0-9-]/g, "").slice(0, 40);
  var doc = (await getPublished(slug)) || (await getDraft(slug));
  if (!doc) return null;
  var prev = doc.billing || {};
  doc.billing = {
    paid: false,
    cancelled: true,
    cancelledAt: prev.cancelledAt || new Date().toISOString(),
    hostUntil: prev.hostUntil || "",
    subscriptionId: prev.subscriptionId || "",
    customerId: prev.customerId || "",
    mail: nextMail(prev, false)
  };
  doc.status = "cancelled";
  await saveDraft(slug, doc);
  var blob = await blobPut("sites/" + slug + "/published.json", doc);
  if (!blob) diskWrite(slug, "published.json", doc);
  return doc;
}

async function shopDataFromStripe(slug) {
  if (!slug) return null;
  var stripeAuth = await findStripeAuth(slug);
  if (!stripeAuth || !stripeAuth.shop || !stripeAuth.phone) return null;
  var status = String(stripeAuth.status || "");
  if (status !== "active" && status !== "trialing") return null;
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
  if (result && result.url) return result.url;
  if (process.env.VERCEL_ENV === "production") {
    var noBlob = new Error("Photo upload needs BLOB_READ_WRITE_TOKEN");
    noBlob.code = "NO_BLOB";
    throw noBlob;
  }
  var ext = photoExt(contentType, filename);
  var fname = Date.now().toString(36) + Math.random().toString(36).slice(2, 6) + ext;
  var dir = photosDir(slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, fname), buffer);
  return "/api/site-photo?slug=" + encodeURIComponent(slug) + "&f=" + encodeURIComponent(fname);
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
  sessionOwnsShop: sessionOwnsShop,
  claimShop: claimShop,
  claimShopByEmail: claimShopByEmail,
  unclaimShop: unclaimShop,
  attachShop: attachShop,
  isUnpaidPreview: isUnpaidPreview,
  findStripeAuth: findStripeAuth,
  shopDataFromStripe: shopDataFromStripe,
  ensureDraftFromLegacy: ensureDraftFromLegacy,
  uploadPhoto: uploadPhoto,
  readLocalPhoto: readLocalPhoto,
  emptyDocument: emptyDocument,
  markPaid: markPaid,
  markCancelled: markCancelled,
  patchBillingMail: patchBillingMail,
  expireHostIfDue: expireHostIfDue,
  expireDueAll: expireDueAll,
  hostClockRows: hostClockRows,
  listKnownSlugs: listKnownSlugs,
  ensureHostUntil: ensureHostUntil,
  lastChanceOpen: lastChanceOpen,
  addMonthsIso: addMonthsIso,
  isHostedPaid: isHostedPaid,
  onHostClock: onHostClock,
  isTakenDown: isTakenDown,
  isWithinHostGrace: isWithinHostGrace,
  unpublish: unpublish,
  savePaidPhone: savePaidPhone,
  blobEnabled: function () { return !!blobApi(); }
};
