import { rewrite } from "@vercel/functions";

var SKIP = /^\/(api|stock|towns|css|js|favicon|google[a-z0-9_-]+\.html)(\/|$)/i;
var WWW_PATH = /^\/(login|account|legal|terms|terms-of-service|privacy|cookies|notice|contact|faq|about|how|prices|start|looks|compare|feedback|edit|vs|online-presence)(\/.*)?$/i;
var DEFAULT_INDEXNOW = "c4e91a2f8b3647d0a1e95c82f0b3d6e7";
var INDEXNOW_KEY = String(process.env.INDEXNOW_KEY || DEFAULT_INDEXNOW).replace(/[^A-Za-z0-9-]/g, "");
if (INDEXNOW_KEY.length < 8 || INDEXNOW_KEY.length > 128) INDEXNOW_KEY = DEFAULT_INDEXNOW;

function copySearch(from, to) {
  from.searchParams.forEach(function (value, key) {
    to.searchParams.set(key, value);
  });
}

export default function middleware(request) {
  var host = String(request.headers.get("host") || "").split(":")[0].toLowerCase();
  var url = new URL(request.url);

  if (INDEXNOW_KEY && url.pathname === "/" + INDEXNOW_KEY + ".txt") {
    return rewrite(new URL("/api/indexnow-key", request.url));
  }

  var shopHost = /^([a-z0-9-]+)\.yoursite\.site$/.exec(host);
  var shopSlug = shopHost && shopHost[1] !== "www" ? shopHost[1] : "";
  if (shopSlug) {
    if (url.pathname === "/robots.txt") {
      var rb = new URL("/api/shop-robots", request.url);
      rb.searchParams.set("slug", shopSlug);
      return rewrite(rb);
    }
    if (url.pathname === "/sitemap.xml") {
      var sm = new URL("/api/shop-sitemap", request.url);
      sm.searchParams.set("slug", shopSlug);
      return rewrite(sm);
    }
    if (url.pathname === "/llms.txt") {
      var ll = new URL("/api/shop-llms", request.url);
      ll.searchParams.set("slug", shopSlug);
      return rewrite(ll);
    }
  }

  if (SKIP.test(url.pathname)) return;

  var pathShop = url.pathname.match(/^\/s\/([a-z0-9-]+)(?:\/.*)?$/i);
  if (pathShop && (host === "www.yoursite.site" || host === "yoursite.site")) {
    return Response.redirect("https://" + pathShop[1].toLowerCase() + ".yoursite.site/", 301);
  }

  var m = /^([a-z0-9-]+)\.yoursite\.site$/.exec(host);
  if (m && m[1] !== "www") {
    var slug = m[1];
    if (url.pathname === "/keep" || url.pathname.indexOf("/keep/") === 0) {
      return Response.redirect("https://www.yoursite.site/keep/" + slug, 302);
    }
    if (WWW_PATH.test(url.pathname)) {
      var dest = new URL("https://www.yoursite.site" + url.pathname);
      copySearch(url, dest);
      if (/^\/(login|account)\/?$/i.test(url.pathname)) {
        dest.searchParams.set("shop", slug);
        dest.searchParams.set("next", "/edit/" + slug);
      }
      if (/^\/edit(\/|$)/i.test(url.pathname)) {
        dest.pathname = "/edit/" + slug;
      }
      return Response.redirect(dest, 302);
    }
    var shopPage = new URL("/api/shop-page", request.url);
    copySearch(url, shopPage);
    shopPage.searchParams.set("slug", slug);
    return rewrite(shopPage);
  }

  var s = url.pathname.match(/^\/s\/([a-z0-9-]+)(?:\/.*)?$/i);
  if (s) {
    var shop = new URL("/api/shop-page", request.url);
    copySearch(url, shop);
    shop.searchParams.set("slug", s[1].toLowerCase());
    return rewrite(shop);
  }
}
