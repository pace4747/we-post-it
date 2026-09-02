const store = require("./site-store");
const accounts = require("./account-store");
const session = require("./session");
const { generateEditToken } = require("./edit-auth");
const { headerHost } = require("./host");
const indexnow = require("./indexnow");

function setEditCookie(res, slug, token, req) {
  var host = headerHost(req);
  var parts = [
    "wpi_edit_" + slug + "=" + encodeURIComponent(token),
    "Path=/",
    "Max-Age=31536000",
    "SameSite=Lax"
  ];
  if (host && host !== "localhost" && host.indexOf("127.0.0.1") !== 0) parts.push("Secure");
  if (host && /(^|\.)yoursite\.site$/.test(host)) parts.push("Domain=.yoursite.site");
  session.appendSetCookie(res, parts.join("; "));
}

async function ensurePaidOwner(email, slug) {
  email = accounts.normEmail(email);
  slug = String(slug || "").replace(/[^a-z0-9-]/g, "").slice(0, 40);
  if (!email || !slug) return null;
  var user = await accounts.getByEmail(email);
  if (!user) {
    try {
      user = await accounts.createUser({ email: email, emailVerified: true });
    } catch (e) {
      if (e && e.code === "EMAIL_TAKEN") user = await accounts.getByEmail(email);
      else {
        console.error("ensurePaidOwner create", e.message || e);
        return null;
      }
    }
  }
  if (!user) return null;
  if (user.emailVerified !== true && !user.googleSub) {
    try { user = await accounts.markVerified(user); } catch (e) {}
  }
  try { await accounts.addShop(user.id, slug); } catch (e) {}
  try {
    var auth = (await store.getAuth(slug)) || {};
    await store.saveAuth(slug, auth.editToken || generateEditToken(), {
      paid: true,
      ownerEmail: user.email || email,
      ownerUserId: user.id
    });
  } catch (e) {}
  return user;
}

async function sendWelcomeOnce(slug, extra) {
  try {
    var lifecycle = require("./lifecycle-mail");
    await lifecycle.sendWelcome(slug, extra || {});
  } catch (e) {
    console.error("welcome mail", e && e.message ? e.message : e);
  }
}

async function tokenFromPaidSession(sessionId, slug) {
  var result = await completePaidSession(sessionId, slug);
  return result && result.token || "";
}

async function completePaidSession(sessionId, slug) {
  if (!sessionId || !process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_SECRET_KEY.startsWith("sk_")) {
    return null;
  }
  try {
    var Stripe = require("stripe");
    var stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    var checkout = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["subscription"] });
    if (!checkout || (checkout.status !== "complete" && checkout.payment_status !== "paid")) return null;
    var metaSlug = (checkout.metadata && checkout.metadata.slug) || "";
    if (metaSlug && metaSlug !== slug) return null;
    var email = "";
    if (checkout.customer_details && checkout.customer_details.email) email = checkout.customer_details.email;
    if (!email) email = checkout.customer_email || "";
    if (!email && checkout.metadata) email = checkout.metadata.email || "";
    var sub = checkout.subscription;
    if (typeof sub === "string" && sub) {
      try { sub = await stripe.subscriptions.retrieve(sub); } catch (e) { sub = null; }
    }
    if (!sub || typeof sub !== "object") return null;
    var token = (sub.metadata && sub.metadata.editToken) || (checkout.metadata && checkout.metadata.editToken) || "";
    if (!token) {
      token = generateEditToken();
      var nextMeta = Object.assign({}, sub.metadata || {}, { slug: slug, editToken: token });
      await stripe.subscriptions.update(sub.id, { metadata: nextMeta });
    }
    var customerId = "";
    if (typeof sub.customer === "string") customerId = sub.customer;
    else if (sub.customer && sub.customer.id) customerId = sub.customer.id;
    var marked = await store.markPaid(slug, sub.id, { customerId: customerId });
    if (!marked) return null;
    indexnow.pingShopLater(slug);
    await store.saveAuth(slug, token, { paid: true, ownerEmail: accounts.normEmail(email) });
    await sendWelcomeOnce(slug, { email: email, customerId: customerId });
    return { token: token, email: email, customerId: customerId };
  } catch (e) {
    console.error("paid session editor token", e.message || e);
  }
  return null;
}

async function finishPaidReturn(sessionId, slug, req, res) {
  var paid = await completePaidSession(sessionId, slug);
  if (!paid || !paid.token) return null;
  setEditCookie(res, slug, paid.token, req);
  var user = null;
  var userId = session.sessionFromRequest(req);
  if (userId) {
    try { user = await accounts.getById(userId); } catch (e) {}
  }
  if (user) {
    try { await accounts.addShop(user.id, slug); } catch (e) {}
  } else if (paid.email) {
    user = await ensurePaidOwner(paid.email, slug);
  }
  if (user) session.setSessionCookie(res, user.id, req);
  return paid;
}

module.exports = {
  tokenFromPaidSession: tokenFromPaidSession,
  completePaidSession: completePaidSession,
  finishPaidReturn: finishPaidReturn,
  ensurePaidOwner: ensurePaidOwner,
  setEditCookie: setEditCookie
};
