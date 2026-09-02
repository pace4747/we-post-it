const usage = require("../lib/usage-store");
const { shopSlugFromHost, headerHost } = require("../lib/host");
const { makeSlug } = require("../lib/escape");
const session = require("../lib/session");
const accounts = require("../lib/account-store");

function collectJson(req) {
  return new Promise(function (resolve) {
    if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
      resolve(req.body);
      return;
    }
    if (typeof req.body === "string") {
      try { resolve(JSON.parse(req.body || "{}")); } catch (e) { resolve({}); }
      return;
    }
    var chunks = [];
    req.on("data", function (c) { chunks.push(c); });
    req.on("end", function () {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}")); }
      catch (e) { resolve({}); }
    });
    req.on("error", function () { resolve({}); });
  });
}

function queryFlag(raw, key) {
  try {
    var q = String(raw || "");
    var i = q.indexOf("?");
    if (i === -1) return "";
    var params = new URLSearchParams(q.slice(i + 1));
    return String(params.get(key) || "").trim();
  } catch (e) {
    return "";
  }
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ ok: false });
    return;
  }

  try {
    var body = await collectJson(req);
    var pathRaw = String(body.path || "");
    var from = String(body.from || queryFlag(pathRaw, "from") || "").toLowerCase();
    if (from !== "text" && from !== "hub") from = "";
    var clickId = String(body.clickId || body.c || queryFlag(pathRaw, "c") || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40);
    var host = headerHost(req);
    var slug = makeSlug(body.slug) || shopSlugFromHost(req);
    var kind = String(body.kind || "look").toLowerCase();
    if (kind !== "look" && kind !== "click" && kind !== "engage") kind = "look";
    var cta = String(body.cta || "").toLowerCase();
    if (["call", "directions", "keep", "login", "mail"].indexOf(cta) === -1) cta = "";
    if (kind === "click" && !cta) {
      res.status(200).json({ ok: true, logged: false, reason: "no_cta" });
      return;
    }

    var userId = "";
    var email = "";
    var signedIn = false;
    try {
      userId = session.sessionFromRequest(req) || "";
      if (userId) {
        var user = await accounts.getById(userId);
        if (user && user.disabled !== true) {
          signedIn = true;
          email = user.email || "";
        } else {
          userId = "";
        }
      }
    } catch (e) {}

    var surface = String(body.surface || "").toLowerCase();
    if (["shop", "login", "keep", "start", "editor", "marketing"].indexOf(surface) === -1) {
      if (slug) surface = "shop";
      else if (/^\/login/.test(pathRaw)) surface = "login";
      else if (/^\/keep/.test(pathRaw)) surface = "keep";
      else if (/^\/start/.test(pathRaw)) surface = "start";
      else if (/^\/edit/.test(pathRaw)) surface = "editor";
      else surface = "marketing";
    }

    var result = await usage.emitFromReq(req, {
      kind: kind,
      slug: slug,
      path: pathRaw.slice(0, 300),
      host: host,
      from: from,
      clickId: clickId,
      referrer: String(body.referrer || "").slice(0, 400),
      utm_source: String(body.utm_source || "").slice(0, 80),
      utm_medium: String(body.utm_medium || "").slice(0, 80),
      utm_campaign: String(body.utm_campaign || "").slice(0, 80),
      lang: String(body.lang || "").slice(0, 12),
      timezone: String(body.timezone || "").slice(0, 60),
      viewportWidth: parseInt(body.viewportWidth, 10) || 0,
      viewportHeight: parseInt(body.viewportHeight, 10) || 0,
      visitorId: String(body.visitorId || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40),
      sessionId: String(body.sessionId || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40),
      seconds: parseInt(body.seconds, 10) || 0,
      sections: Array.isArray(body.sections) ? body.sections : [],
      cta: cta,
      surface: surface,
      live: body.live === true || body.live === "1",
      userId: userId,
      email: email,
      signedIn: signedIn
    });
    res.status(200).json({ ok: true, logged: !!(result && result.logged) });
  } catch (e) {
    console.error("visit log error:", e);
    res.status(200).json({ ok: true, logged: false });
  }
};
