const { shopOrigin, publicOrigin } = require("./host");

var DEFAULT_KEY = "c4e91a2f8b3647d0a1e95c82f0b3d6e7";
var ENDPOINT = "https://api.indexnow.org/indexnow";

function indexNowKey() {
  var raw = String(process.env.INDEXNOW_KEY || DEFAULT_KEY).trim();
  raw = raw.replace(/[^A-Za-z0-9-]/g, "");
  if (raw.length < 8 || raw.length > 128) return DEFAULT_KEY;
  return raw;
}

function keyFileName() {
  return indexNowKey() + ".txt";
}

function keyPath() {
  return "/" + keyFileName();
}

function keyLocation(host) {
  var h = String(host || "www.yoursite.site").replace(/^https?:\/\//, "").split("/")[0];
  return "https://" + h + keyPath();
}

function marketingUrls() {
  var origin = publicOrigin();
  return [
    origin + "/",
    origin + "/how",
    origin + "/prices",
    origin + "/online-presence",
    origin + "/faq",
    origin + "/start",
    origin + "/looks",
    origin + "/compare",
    origin + "/vs/wix",
    origin + "/vs/squarespace",
    origin + "/vs/durable",
    origin + "/vs/hootsuite",
    origin + "/vs/thryv",
    origin + "/about",
    origin + "/contact",
    origin + "/legal"
  ];
}

function ping(urls, options) {
  options = options || {};
  var key = indexNowKey();
  if (!key) return Promise.resolve({ skipped: true, reason: "no-key" });
  var list = (Array.isArray(urls) ? urls : [urls]).map(function (u) {
    return String(u || "").trim();
  }).filter(function (u) {
    return /^https:\/\//i.test(u);
  });
  if (!list.length) return Promise.resolve({ skipped: true, reason: "no-urls" });
  var host = options.host || "";
  if (!host) {
    try { host = new URL(list[0]).hostname; } catch (e) { host = "www.yoursite.site"; }
  }
  var body = JSON.stringify({
    host: host,
    key: key,
    keyLocation: keyLocation(host),
    urlList: list
  });
  return fetch(ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: body
  }).then(function (res) {
    return { ok: res.status === 200 || res.status === 202, status: res.status };
  }).catch(function (e) {
    return { ok: false, error: (e && e.message) || "indexnow failed" };
  });
}

function pingLater(urls, options) {
  try {
    var p = ping(urls, options).catch(function () {});
    try {
      var waitUntil = require("@vercel/functions").waitUntil;
      if (typeof waitUntil === "function") waitUntil(p);
    } catch (e) {}
  } catch (e) {}
}

function pingShop(slug) {
  slug = String(slug || "").replace(/[^a-z0-9-]/g, "");
  if (!slug) return Promise.resolve({ skipped: true });
  var origin = shopOrigin(slug);
  return ping(origin + "/", { host: slug + ".yoursite.site" });
}

function pingShopLater(slug) {
  slug = String(slug || "").replace(/[^a-z0-9-]/g, "");
  if (!slug) return;
  pingLater(shopOrigin(slug) + "/", { host: slug + ".yoursite.site" });
}

function pingMarketingLater() {
  pingLater(marketingUrls(), { host: "www.yoursite.site" });
}

module.exports = {
  DEFAULT_KEY: DEFAULT_KEY,
  indexNowKey: indexNowKey,
  keyFileName: keyFileName,
  keyPath: keyPath,
  keyLocation: keyLocation,
  marketingUrls: marketingUrls,
  ping: ping,
  pingLater: pingLater,
  pingShop: pingShop,
  pingShopLater: pingShopLater,
  pingMarketingLater: pingMarketingLater
};
