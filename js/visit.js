(function () {
  // First-party shop usage. Human looks only (this file must run). No ad pixels.
  function rid(n) {
    var s = "";
    try { s = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2); } catch (e) { s = String(Date.now()); }
    return s.slice(0, n || 16);
  }

  function storeGet(which, key) {
    try { return (which === "s" ? sessionStorage : localStorage).getItem(key) || ""; } catch (e) { return ""; }
  }
  function storeSet(which, key, val) {
    try { (which === "s" ? sessionStorage : localStorage).setItem(key, val); } catch (e) {}
  }

  function visitorId() {
    var id = storeGet("l", "wpi-vid");
    if (!id) {
      id = "v" + rid(18);
      storeSet("l", "wpi-vid", id);
    }
    return id;
  }

  function sessionId() {
    var now = Date.now();
    var last = parseInt(storeGet("s", "wpi-sid-at"), 10) || 0;
    var id = storeGet("s", "wpi-sid");
    if (!id || !last || now - last > 30 * 60 * 1000) {
      id = "s" + rid(14);
      storeSet("s", "wpi-sid", id);
    }
    storeSet("s", "wpi-sid-at", String(now));
    return id;
  }

  var started = Date.now();
  var sectionsSeen = [];
  var sentEngage = false;

  function markSection(name) {
    if (!name || sectionsSeen.indexOf(name) !== -1) return;
    sectionsSeen.push(name);
  }

  function surfaceOf() {
    var path = window.location.pathname || "/";
    if (/^\/login/.test(path) || /^\/account/.test(path)) return "login";
    if (/^\/keep/.test(path)) return "keep";
    if (/^\/start/.test(path)) return "start";
    if (/^\/edit/.test(path)) return "editor";
    var host = (window.location.hostname || "").toLowerCase();
    if (/^[a-z0-9-]+\.yoursite\.site$/.test(host) && host.indexOf("www.") !== 0) return "shop";
    if (/^\/s\//.test(path)) return "shop";
    return "marketing";
  }

  function slugGuess() {
    var host = (window.location.hostname || "").toLowerCase();
    var m = host.match(/^([a-z0-9-]+)\.yoursite\.site$/);
    if (m && m[1] !== "www") return m[1];
    var path = window.location.pathname || "";
    var sm = path.match(/^\/s\/([a-z0-9-]+)/);
    if (sm) return sm[1];
    var km = path.match(/^\/keep\/([a-z0-9-]+)/);
    if (km) return km[1];
    var em = path.match(/^\/edit\/([a-z0-9-]+)/);
    if (em) return em[1];
    return "";
  }

  function send(kind, extra) {
    extra = extra || {};
    try {
      var params = new URLSearchParams(window.location.search);
      var tz = "";
      try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch (e) {}
      var data = {
        kind: kind,
        path: window.location.pathname + window.location.search,
        slug: slugGuess(),
        from: params.get("from") || "",
        clickId: params.get("c") || "",
        referrer: document.referrer || "",
        utm_source: params.get("utm_source") || "",
        utm_medium: params.get("utm_medium") || "",
        utm_campaign: params.get("utm_campaign") || "",
        lang: storeGet("l", "wpi-lang") || "en",
        timezone: tz,
        viewportWidth: window.innerWidth || 0,
        viewportHeight: window.innerHeight || 0,
        visitorId: visitorId(),
        sessionId: sessionId(),
        surface: surfaceOf(),
        live: !document.querySelector(".preview-banner"),
        seconds: extra.seconds || 0,
        sections: sectionsSeen.slice(),
        cta: extra.cta || ""
      };
      fetch("/api/visit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(data),
        keepalive: true
      }).catch(function () {});
    } catch (e) {}
  }

  function ctaOf(el) {
    if (!el || !el.getAttribute) return "";
    var href = String(el.getAttribute("href") || "");
    if (/^tel:/i.test(href)) return "call";
    if (/^mailto:/i.test(href)) return "mail";
    if (/google\.com\/maps|maps\.apple|maps\.google|\/maps/i.test(href)) return "directions";
    if (/\/keep/i.test(href) || /Keep this site/i.test(el.textContent || "")) return "keep";
    if (/\/login/i.test(href) || /Sign in|Save a login|Your login/i.test(el.textContent || "")) return "login";
    return "";
  }

  function onClick(e) {
    var t = e.target;
    while (t && t !== document) {
      if (t.tagName === "A") {
        var cta = ctaOf(t);
        if (cta) send("click", { cta: cta });
        return;
      }
      t = t.parentNode;
    }
  }

  function watchSections() {
    if (!window.IntersectionObserver) return;
    var map = [
      ["#photos", "photos"],
      ["#contact", "contact"],
      [".preview-banner", "keep-banner"],
      ["#services", "services"],
      ["#area", "area"]
    ];
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var name = en.target.getAttribute("data-wpi-sec") || "";
        if (name) markSection(name);
      });
    }, { threshold: 0.25 });
    map.forEach(function (row) {
      var el = document.querySelector(row[0]);
      if (!el) return;
      el.setAttribute("data-wpi-sec", row[1]);
      io.observe(el);
    });
  }

  function sendEngage() {
    if (sentEngage) return;
    sentEngage = true;
    var sec = Math.max(1, Math.round((Date.now() - started) / 1000));
    send("engage", { seconds: sec });
  }

  function boot() {
    send("look");
    watchSections();
    document.addEventListener("click", onClick, true);
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "hidden") sendEngage();
    });
    window.addEventListener("pagehide", sendEngage);
  }

  if (document.readyState === "complete" || document.readyState === "interactive") {
    setTimeout(boot, 80);
  } else {
    window.addEventListener("DOMContentLoaded", function () {
      setTimeout(boot, 80);
    });
  }
})();
