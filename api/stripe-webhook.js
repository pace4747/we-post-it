const Stripe = require("stripe");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { makeSlug } = require("./shop-page-generator");
const { generateEditToken } = require("../lib/edit-auth");
const store = require("../lib/site-store");
const accounts = require("../lib/account-store");
const { emptyDocument } = require("../lib/site-document");
const { shopOrigin } = require("../lib/host");
const usage = require("../lib/usage-store");
const lifecycle = require("../lib/lifecycle-mail");
const indexnow = require("../lib/indexnow");

const ROOTS = [
  "/workspace/pipeline/submissions",
  path.join(os.tmpdir(), "yoursite-submissions")
];

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

function collectRawBody(req) {
  return new Promise(function (resolve, reject) {
    if (req.body && Buffer.isBuffer(req.body)) {
      resolve(req.body);
      return;
    }
    var chunks = [];
    req.on("data", function (c) { chunks.push(c); });
    req.on("end", function () { resolve(Buffer.concat(chunks)); });
    req.on("error", reject);
  });
}

async function markShopPaid(metadata, subscriptionId, stripe) {
  var shop = metadata.shop || "";
  var zip = metadata.zip || "";
  var phone = metadata.phone || "";
  var email = metadata.email || metadata.customer_email || "";
  var lang = metadata.lang || "en";

  try {
    var root = destDir();
    var shopsFile = path.join(root, "paid-shops.jsonl");
    fs.appendFileSync(shopsFile, JSON.stringify({
      shop: shop,
      zip: zip,
      phone: phone,
      email: email,
      lang: lang,
      subscriptionId: subscriptionId,
      paidAt: new Date().toISOString()
    }) + "\n");
  } catch (e) {}

  if (!subscriptionId || !(shop || (metadata && metadata.slug))) {
    throw new Error("Missing subscription or shop");
  }
  await createShopPage(stripe, subscriptionId, shop, zip, phone, email, metadata.slug || "", metadata);
}

async function createShopPage(stripe, subscriptionId, shop, zip, phone, email, slugHint, sessionMeta) {
  sessionMeta = sessionMeta || {};
  var subscription = await stripe.subscriptions.retrieve(subscriptionId);
  var existing = (subscription.metadata || {});
  var slug = makeSlug(existing.slug || slugHint || shop);
  var url = shopOrigin(slug);
  var editToken = existing.editToken || generateEditToken();
  var nextMeta = Object.assign({}, existing, {
    shop: shop || existing.shop || "",
    zip: zip || existing.zip || "",
    phone: phone || existing.phone || "",
    email: email || existing.email || "",
    slug: existing.slug || slug,
    url: existing.url || url,
    editToken: editToken,
    createdAt: existing.createdAt || new Date().toISOString()
  });

  await stripe.subscriptions.update(subscriptionId, {
    metadata: nextMeta
  });

  slug = nextMeta.slug;
  var doc = (await store.getPublished(slug)) || (await store.getDraft(slug));
  if (!doc || !(doc.business && doc.business.name)) {
    doc = emptyDocument(slug);
    doc.business.name = shop || "";
    doc.business.zip = String(zip || "").replace(/\D/g, "").slice(0, 5);
    doc.business.phone = phone || "";
    doc.business.email = email || "";
    await store.saveDraft(slug, doc);
  } else if (email && doc && doc.business && !doc.business.email) {
    doc.business.email = email;
    try { await store.saveDraft(slug, doc); } catch (e) {}
  }
  var extra = { paid: true, ownerEmail: email || existing.email || "" };
  if (email) {
    var paidUser = await accounts.getByEmail(email);
    if (!paidUser || (paidUser.emailVerified !== true && !paidUser.googleSub)) {
      var { ensurePaidOwner } = require("../lib/paid-session");
      paidUser = await ensurePaidOwner(email, slug);
    } else {
      await accounts.addShop(paidUser.id, slug);
    }
    if (paidUser) {
      extra.ownerUserId = paidUser.id;
      extra.ownerEmail = paidUser.email || extra.ownerEmail;
    }
  }
  await store.saveAuth(slug, editToken, extra);
  var customerId = "";
  if (typeof subscription.customer === "string") customerId = subscription.customer;
  else if (subscription.customer && subscription.customer.id) customerId = subscription.customer.id;
  var marked = await store.markPaid(slug, subscriptionId, {
    customerId: customerId,
    phone: phone || existing.phone || (doc.business && doc.business.phone) || ""
  });
  if (!marked) throw new Error("markPaid failed for " + slug);
  indexnow.pingShopLater(slug);
  var last4 = "";
  try {
    var pm = subscription.default_payment_method;
    if (typeof pm === "string" && pm) {
      var method = await stripe.paymentMethods.retrieve(pm);
      last4 = (method.card && method.card.last4) || "";
    } else if (pm && pm.card && pm.card.last4) {
      last4 = pm.card.last4;
    }
  } catch (e) {}
  await usage.emit({ kind: "paid", slug: slug, email: email || extra.ownerEmail || "", surface: "keep", last4: last4 });
  try {
    await lifecycle.sendWelcome(slug, {
      email: email || extra.ownerEmail || "",
      customerId: customerId,
      doc: (await store.getPublished(slug)) || doc
    });
  } catch (e) {
    console.error("welcome mail", e);
  }
}

function customerIdOf(obj) {
  if (!obj) return "";
  if (typeof obj.customer === "string") return obj.customer;
  if (obj.customer && obj.customer.id) return obj.customer.id;
  return "";
}

async function markShopCancelled(subscription) {
  var subscriptionId = typeof subscription === "string" ? subscription : (subscription && subscription.id) || "";
  try {
    var root = destDir();
    var cancelFile = path.join(root, "cancelled-subscriptions.jsonl");
    fs.appendFileSync(cancelFile, JSON.stringify({
      subscriptionId: subscriptionId,
      cancelledAt: new Date().toISOString()
    }) + "\n");
  } catch (e) {}
  await finishCancel(subscription);
}

async function finishCancel(subscription) {
  var sub = subscription;
  if (!sub || typeof sub === "string") {
    var stripeCancel = new Stripe(process.env.STRIPE_SECRET_KEY);
    sub = await stripeCancel.subscriptions.retrieve(typeof subscription === "string" ? subscription : subscriptionIdOf(subscription));
  }
  var slug = sub && sub.metadata && sub.metadata.slug;
  if (!slug) throw new Error("cancel missing slug");
  var customerId = customerIdOf(sub);
  if (customerId) {
    try {
      var existing = (await store.getPublished(slug)) || (await store.getDraft(slug));
      if (existing && existing.billing && !existing.billing.customerId) {
        existing.billing.customerId = customerId;
        await store.saveDraft(slug, existing);
      }
    } catch (e) {}
  }
  await usage.emit({ kind: "cancelled", slug: slug, email: (sub.metadata && sub.metadata.email) || "", surface: "keep" });
  var doc = await store.markCancelled(slug);
  if (!doc) throw new Error("markCancelled failed for " + slug);
  try {
    await lifecycle.sendCancelDone(slug, {
      email: (sub.metadata && sub.metadata.email) || "",
      customerId: customerId,
      doc: doc
    });
  } catch (e) {
    console.error("cancel mail", e);
  }
}

function subscriptionIdOf(sub) {
  if (!sub) return "";
  if (typeof sub === "string") return sub;
  return sub.id || "";
}

async function handleInvoicePaymentFailed(stripe, invoice) {
  var subId = invoice.subscription;
  if (subId && typeof subId === "object") subId = subId.id;
  if (!subId) return;
  var sub = await stripe.subscriptions.retrieve(subId);
  var slug = (sub.metadata && sub.metadata.slug) || "";
  if (!slug) return;
  await lifecycle.sendPastDue(slug, {
    email: (sub.metadata && sub.metadata.email) || invoice.customer_email || "",
    invoiceId: invoice.id || "",
    customerId: customerIdOf(sub) || customerIdOf(invoice),
    hostedInvoiceUrl: invoice.hosted_invoice_url || ""
  });
}

async function handleSubscriptionUpdated(sub, previous) {
  previous = previous || {};
  var slug = sub && sub.metadata && sub.metadata.slug;
  if (!slug) return;
  if (sub.cancel_at_period_end) {
    await lifecycle.sendCancelScheduled(slug, {
      email: (sub.metadata && sub.metadata.email) || "",
      periodEnd: sub.current_period_end,
      customerId: customerIdOf(sub)
    });
    return;
  }
  if (previous.cancel_at_period_end) {
    await lifecycle.clearCancelScheduled(slug);
  }
}

async function handleChargeRefunded(stripe, charge) {
  var invoiceId = charge && charge.invoice;
  if (invoiceId && typeof invoiceId === "object") invoiceId = invoiceId.id;
  var sub = null;
  if (invoiceId) {
    try {
      var invoice = await stripe.invoices.retrieve(invoiceId);
      var subId = invoice.subscription;
      if (subId && typeof subId === "object") subId = subId.id;
      if (subId) sub = await stripe.subscriptions.retrieve(subId);
    } catch (e) {}
  }
  var slug = (sub && sub.metadata && sub.metadata.slug) || "";
  await usage.emit({
    kind: "refunded",
    slug: slug,
    email: (sub && sub.metadata && sub.metadata.email) || "",
    surface: "keep"
  });
  if (!sub || !slug) return;
  var status = String(sub.status || "");
  if (status === "canceled" || status === "cancelled" || status === "incomplete_expired") return;
  await lifecycle.sendPastDue(slug, {
    email: (sub.metadata && sub.metadata.email) || "",
    invoiceId: invoiceId || charge.id || "refund",
    customerId: customerIdOf(sub) || customerIdOf(charge),
    hostedInvoiceUrl: ""
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error("STRIPE_WEBHOOK_SECRET not configured");
    res.status(500).json({ error: "Webhook not configured" });
    return;
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    console.error("STRIPE_SECRET_KEY not configured");
    res.status(500).json({ error: "Stripe not configured" });
    return;
  }

  var stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  var sig = req.headers["stripe-signature"];

  try {
    var rawBody = await collectRawBody(req);
    var event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    if (event.type === "checkout.session.completed") {
      var session = event.data.object;
      var metadata = session.metadata || {};
      if (!metadata.email) {
        metadata.email = (session.customer_details && session.customer_details.email) || session.customer_email || "";
      }
      var subscriptionId = session.subscription || "";
      if (subscriptionId && typeof subscriptionId === "object") subscriptionId = subscriptionId.id;
      await markShopPaid(metadata, subscriptionId, stripe);
      res.status(200).json({ received: true });
      return;
    }

    if (event.type === "customer.subscription.deleted") {
      await markShopCancelled(event.data.object);
      res.status(200).json({ received: true });
      return;
    }

    if (event.type === "customer.subscription.updated") {
      await handleSubscriptionUpdated(event.data.object, event.data.previous_attributes || {});
      res.status(200).json({ received: true });
      return;
    }

    if (event.type === "invoice.payment_failed") {
      await handleInvoicePaymentFailed(stripe, event.data.object);
      res.status(200).json({ received: true });
      return;
    }

    if (event.type === "charge.refunded") {
      await handleChargeRefunded(stripe, event.data.object);
      res.status(200).json({ received: true });
      return;
    }

    res.status(200).json({ received: true });
  } catch (err) {
    if (err && err.type === "StripeSignatureVerificationError") {
      console.error("Webhook error:", err.message);
      res.status(400).json({ error: "Webhook signature verification failed" });
      return;
    }
    console.error("Webhook handler", err && err.message || err);
    res.status(500).json({ error: "Webhook handling failed" });
  }
};
