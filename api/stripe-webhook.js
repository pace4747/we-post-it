const Stripe = require("stripe");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { makeSlug } = require("./shop-page-generator");
const { generateEditToken } = require("../lib/edit-auth");
const { shopDataToDocument } = require("../lib/site-document");
const store = require("../lib/site-store");

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

function markShopPaid(metadata, subscriptionId, stripe) {
  try {
    var shop = metadata.shop || "";
    var zip = metadata.zip || "";
    var phone = metadata.phone || "";
    var email = metadata.email || "";
    var lang = metadata.lang || "en";

    var root = destDir();
    var shopsFile = path.join(root, "paid-shops.jsonl");

    var entry = {
      shop: shop,
      zip: zip,
      phone: phone,
      email: email,
      lang: lang,
      subscriptionId: subscriptionId,
      paidAt: new Date().toISOString()
    };

    fs.appendFileSync(shopsFile, JSON.stringify(entry) + "\n");
    console.log("Marked shop paid:", shop, subscriptionId);

    if (subscriptionId && shop && phone) {
      createShopPage(stripe, subscriptionId, shop, zip, phone).catch(function (e) {
        console.error("Failed to create shop page async:", e);
      });
    }
  } catch (e) {
    console.error("Failed to mark shop paid:", e);
  }
}

async function createShopPage(stripe, subscriptionId, shop, zip, phone) {
  try {
    var slug = makeSlug(shop);
    var url = "https://we-post-it-full.vercel.app/s/" + slug;
    
    var subscription = await stripe.subscriptions.retrieve(subscriptionId);
    var existing = (subscription.metadata || {});

    if (existing.slug && existing.editToken) {
      console.log("Shop page already exists for subscription:", subscriptionId);
      return;
    }

    var editToken = existing.editToken || generateEditToken();
    var nextMeta = Object.assign({}, existing, {
      shop: shop || existing.shop || "",
      zip: zip || existing.zip || "",
      phone: phone || existing.phone || "",
      slug: existing.slug || slug,
      url: existing.url || url,
      editToken: editToken,
      createdAt: existing.createdAt || new Date().toISOString()
    });

    await stripe.subscriptions.update(subscriptionId, {
      metadata: nextMeta
    });

    slug = nextMeta.slug;
    try {
      await store.saveAuth(slug, editToken);
      var published = await store.getPublished(slug);
      if (!published || !published.business || !published.business.name) {
        var doc = shopDataToDocument({
          shop: nextMeta.shop,
          zip: nextMeta.zip,
          phone: nextMeta.phone,
          slug: slug,
          category: nextMeta.category || "",
          address: nextMeta.address || "",
          hours: nextMeta.hours || "",
          city: nextMeta.city || "",
          state: nextMeta.state || ""
        });
        await store.saveDraft(slug, doc);
        await store.publish(slug);
      }
    } catch (storeErr) {
      console.error("Failed to seed site document (page URL still works from Stripe metadata):", storeErr);
    }
    
    console.log("Created shop page:", shop, "at", url, "editor /edit/" + slug);
  } catch (e) {
    console.error("Failed to create shop page:", e);
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
      
      markShopPaid(metadata, subscriptionId, stripe);
      
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
