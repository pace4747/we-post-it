(function () {
  // First-party visitor analytics - light, no spying, no third-party pixels
  // Records: path, referrer, geo (from Vercel headers), lang, timezone, viewport, UA
  
  function sendVisit() {
    try {
      var params = new URLSearchParams(window.location.search);
      var lang = localStorage.getItem("wpi-lang") || "en";
      var timezone = "";
      
      try {
        timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
      } catch (e) {}
      
      var data = {
        path: window.location.pathname + window.location.search,
        referrer: document.referrer || "",
        utm_source: params.get("utm_source") || "",
        utm_medium: params.get("utm_medium") || "",
        utm_campaign: params.get("utm_campaign") || "",
        lang: lang,
        timezone: timezone,
        viewportWidth: window.innerWidth || 0
      };
      
      // Send via fetch (no blocking, fire-and-forget)
      fetch("/api/visit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(data),
        keepalive: true
      }).catch(function () {
        // Silent fail - analytics should never break the site
      });
    } catch (e) {
      // Silent fail
    }
  }
  
  // Send once on page load
  if (document.readyState === "complete" || document.readyState === "interactive") {
    setTimeout(sendVisit, 100);
  } else {
    window.addEventListener("DOMContentLoaded", function () {
      setTimeout(sendVisit, 100);
    });
  }
})();
