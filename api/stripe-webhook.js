const Stripe = require("stripe");
const fs = require("fs");
const path = require("path");
const os = require("os");

const ROOTS = [
  "/workspace/pipeline/submissions",
  path.join(os.tmpdir(), "wepostit-submissions")
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

function markShopPaid(metadata, subscriptionId) {
  try {
    var shop = metadata.shop || "";
    var town = metadata.town || "";
    var phone = metadata.phone || "";
    var email = metadata.email || "";
    var lang = metadata.lang || "en";

    var root = destDir();
    var shopsFile = path.join(root, "paid-shops.jsonl");

    var entry = {
      shop: shop,
      town: town,
      phone: phone,
      email: email,
      lang: lang,
      subscriptionId: subscriptionId,
      paidAt: new Date().toISOString()
    };

    fs.appendFileSync(shopsFile, JSON.stringify(entry) + "\n");
    console.log("Marked shop paid:", shop, subscriptionId);
  } catch (e) {
    console.error("Failed to mark shop paid:", e);
  }
}

function markShopCancelled(subscriptionId) {
  try {
    var root = destDir();
    var cancelFile = path.join(root, "cancelled-subscriptions.jsonl");

    var entry = {
      subscriptionId: subscriptionId,
      cancelledAt: new Date().toISOString()
    };

    fs.appendFileSync(cancelFile, JSON.stringify(entry) + "\n");
    console.log("Marked subscription cancelled:", subscriptionId);
  } catch (e) {
    console.error("Failed to mark subscription cancelled:", e);
  }
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
      var subscriptionId = session.subscription || "";
      
      markShopPaid(metadata, subscriptionId);
      
      res.status(200).json({ received: true });
      return;
    }

    if (event.type === "customer.subscription.deleted") {
      var subscription = event.data.object;
      markShopCancelled(subscription.id);
      
      res.status(200).json({ received: true });
      return;
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error("Webhook error:", err.message);
    res.status(400).json({ error: "Webhook signature verification failed" });
  }
};
