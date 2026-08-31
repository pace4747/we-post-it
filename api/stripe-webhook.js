const Stripe = require("stripe");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { makeSlug } = require("./shop-page-generator");

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
    var referralPhone = metadata.referralPhone || "";
    var referralCode = metadata.referralCode || "";

    var root = destDir();
    var shopsFile = path.join(root, "paid-shops.jsonl");

    var entry = {
      shop: shop,
      zip: zip,
      phone: phone,
      email: email,
      lang: lang,
      subscriptionId: subscriptionId,
      referralCode: phone.replace(/\D/g, "").slice(-10),
      paidAt: new Date().toISOString()
    };

    fs.appendFileSync(shopsFile, JSON.stringify(entry) + "\n");
    console.log("Marked shop paid:", shop, subscriptionId);
    
    if (referralPhone || referralCode) {
      processReferralCredit(shop, phone, subscriptionId, referralPhone, referralCode, root);
    }

    if (subscriptionId && shop && phone) {
      createShopPage(stripe, subscriptionId, shop, zip, phone).catch(function (e) {
        console.error("Failed to create shop page async:", e);
      });
    }
  } catch (e) {
    console.error("Failed to mark shop paid:", e);
  }
}

function processReferralCredit(newShop, newPhone, newSubscriptionId, referralPhone, referralCode, root) {
  try {
    var newPhoneDigits = String(newPhone || "").replace(/\D/g, "");
    var referralPhoneDigits = String(referralPhone || "").replace(/\D/g, "");
    
    if (newPhoneDigits === referralPhoneDigits) {
      console.log("Referral skipped: same phone", newPhoneDigits);
      return;
    }
    
    var shopsFile = path.join(root, "paid-shops.jsonl");
    if (!fs.existsSync(shopsFile)) {
      console.log("No paid-shops.jsonl file found");
      return;
    }
    
    var lines = fs.readFileSync(shopsFile, "utf8").split("\n").filter(function (l) { return l.trim(); });
    var referrerShop = null;
    
    for (var i = 0; i < lines.length; i++) {
      try {
        var entry = JSON.parse(lines[i]);
        var entryPhone = String(entry.phone || "").replace(/\D/g, "");
        var entryCode = String(entry.referralCode || "");
        
        if ((referralPhoneDigits && entryPhone === referralPhoneDigits) ||
            (referralCode && entryCode && entryCode.toUpperCase() === referralCode.toUpperCase())) {
          
          if (entry.shop && /batten/i.test(entry.shop)) {
            console.log("Referrer is Batten, cannot earn");
            return;
          }
          
          var cancelledFile = path.join(root, "cancelled-subscriptions.jsonl");
          if (fs.existsSync(cancelledFile)) {
            var cancelled = fs.readFileSync(cancelledFile, "utf8").split("\n");
            for (var c = 0; c < cancelled.length; c++) {
              try {
                var cEntry = JSON.parse(cancelled[c]);
                if (cEntry.subscriptionId === entry.subscriptionId) {
                  console.log("Referrer subscription cancelled, cannot earn");
                  return;
                }
              } catch (e) {}
            }
          }
          
          referrerShop = entry;
          break;
        }
      } catch (e) {}
    }
    
    if (!referrerShop) {
      console.log("No matching paying referrer found for phone:", referralPhoneDigits, "or code:", referralCode);
      return;
    }
    
    var creditsFile = path.join(root, "referral-credits.jsonl");
    var credit = {
      at: new Date().toISOString(),
      newShop: newShop,
      newPhone: newPhone,
      newSubscriptionId: newSubscriptionId,
      referrerShop: referrerShop.shop,
      referrerPhone: referrerShop.phone,
      referrerSubscriptionId: referrerShop.subscriptionId,
      months: 1,
      status: "earned"
    };
    
    fs.appendFileSync(creditsFile, JSON.stringify(credit) + "\n");
    console.log("Referral credit earned:", referrerShop.shop, "referred", newShop);
  } catch (e) {
    console.error("Failed to process referral credit:", e);
  }
}

async function createShopPage(stripe, subscriptionId, shop, zip, phone) {
  try {
    var slug = makeSlug(shop);
    var url = "https://we-post-it-full.vercel.app/s/" + slug;
    
    var subscription = await stripe.subscriptions.retrieve(subscriptionId);
    
    if (subscription.metadata && subscription.metadata.slug) {
      console.log("Shop page already exists for subscription:", subscriptionId);
      return;
    }
    
    await stripe.subscriptions.update(subscriptionId, {
      metadata: {
        shop: shop,
        zip: zip,
        phone: phone,
        slug: slug,
        url: url,
        createdAt: new Date().toISOString()
      }
    });
    
    console.log("Created shop page:", shop, "at", url);
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
    
    pullReferralCredit(subscriptionId, root);
  } catch (e) {
    console.error("Failed to mark subscription cancelled:", e);
  }
}

function pullReferralCredit(subscriptionId, root) {
  try {
    var creditsFile = path.join(root, "referral-credits.jsonl");
    if (!fs.existsSync(creditsFile)) {
      return;
    }
    
    var lines = fs.readFileSync(creditsFile, "utf8").split("\n").filter(function (l) { return l.trim(); });
    
    for (var i = 0; i < lines.length; i++) {
      try {
        var credit = JSON.parse(lines[i]);
        if (credit.newSubscriptionId === subscriptionId && credit.status === "earned") {
          var pulled = {
            at: new Date().toISOString(),
            newShop: credit.newShop,
            newPhone: credit.newPhone,
            newSubscriptionId: credit.newSubscriptionId,
            referrerShop: credit.referrerShop,
            referrerPhone: credit.referrerPhone,
            referrerSubscriptionId: credit.referrerSubscriptionId,
            months: credit.months,
            status: "pulled",
            originalEarnedAt: credit.at
          };
          fs.appendFileSync(creditsFile, JSON.stringify(pulled) + "\n");
          console.log("Referral credit pulled for subscription:", subscriptionId);
        }
      } catch (e) {}
    }
  } catch (e) {
    console.error("Failed to pull referral credit:", e);
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
    
    if (event.type === "charge.refunded") {
      var charge = event.data.object;
      
      if (charge.invoice) {
        try {
          var invoice = await stripe.invoices.retrieve(charge.invoice);
          if (invoice.subscription) {
            var root = destDir();
            pullReferralCredit(invoice.subscription, root);
          }
        } catch (e) {
          console.error("Failed to process refund for referral:", e);
        }
      }
      
      res.status(200).json({ received: true });
      return;
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error("Webhook error:", err.message);
    res.status(400).json({ error: "Webhook signature verification failed" });
  }
};
