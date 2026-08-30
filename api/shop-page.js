const Stripe = require("stripe");
const { generateShopPageHTML, makeSlug } = require("./shop-page-generator");

module.exports = async function handler(req, res) {
  var slug = req.query.slug;
  var look = req.query.look;
  
  if (!slug || typeof slug !== "string") {
    res.status(400).send("Missing shop slug");
    return;
  }

  slug = slug.replace(/[^a-z0-9-]/g, "").slice(0, 40);
  
  if (!slug) {
    res.status(400).send("Invalid shop slug");
    return;
  }

  if (look && typeof look === "string") {
    look = look.toLowerCase();
    if (look !== "call" && look !== "photos") {
      look = "call";
    }
  } else {
    look = "call";
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    res.status(500).send("Configuration error");
    return;
  }

  try {
    var stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    
    var subscriptions = await stripe.subscriptions.list({
      limit: 100,
      status: "all"
    });
    
    var shopData = null;
    
    for (var i = 0; i < subscriptions.data.length; i++) {
      var sub = subscriptions.data[i];
      var meta = sub.metadata || {};
      
      if (meta.slug === slug && meta.shop && meta.phone) {
        shopData = {
          shop: meta.shop,
          zip: meta.zip || "",
          phone: meta.phone,
          slug: meta.slug,
          look: look,
          category: meta.category || "",
          address: meta.address || "",
          hours: meta.hours || "",
          photos: []
        };
        
        if (meta.photos) {
          try {
            shopData.photos = JSON.parse(meta.photos);
          } catch (e) {
            shopData.photos = [];
          }
        }
        
        break;
      }
    }
    
    if (!shopData) {
      res.status(404).send("Shop not found");
      return;
    }
    
    var html = generateShopPageHTML(shopData);
    
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.status(200).send(html);
  } catch (e) {
    console.error("Error serving shop page:", e);
    res.status(500).send("Error loading shop page");
  }
};
