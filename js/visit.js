(function () {
  function getOrCreateSessionId() {
    try {
      var sessionId = sessionStorage.getItem("wpi-session-id");
      if (sessionId) {
        return sessionId;
      }

      sessionId = "s_" + Date.now() + "_" + Math.random().toString(36).substring(2, 15);
      sessionStorage.setItem("wpi-session-id", sessionId);

      return sessionId;
    } catch (e) {
      return "s_" + Date.now() + "_" + Math.random().toString(36).substring(2, 15);
    }
  }

  function isLandingPage() {
    try {
      var visited = sessionStorage.getItem("wpi-visited");
      if (visited) {
        return false;
      }
      sessionStorage.setItem("wpi-visited", "1");
      return true;
    } catch (e) {
      return !document.referrer || document.referrer.indexOf(window.location.hostname) === -1;
    }
  }

  function sendVisit(buttonClicked) {
    try {
      var params = new URLSearchParams(window.location.search);
      var lang = localStorage.getItem("wpi-lang") || "en";
      var clientTimezone = "";
      
      try {
        clientTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
      } catch (e) {}
      
      var data = {
        path: window.location.pathname + window.location.search,
        referrer: document.referrer || "",
        utm_source: params.get("utm_source") || "",
        utm_medium: params.get("utm_medium") || "",
        utm_campaign: params.get("utm_campaign") || "",
        utm_content: params.get("utm_content") || "",
        utm_term: params.get("utm_term") || "",
        lang: lang,
        clientTimezone: clientTimezone,
        screenWidth: window.screen ? window.screen.width : 0,
        screenHeight: window.screen ? window.screen.height : 0,
        viewportWidth: window.innerWidth || 0,
        viewportHeight: window.innerHeight || 0,
        sessionId: getOrCreateSessionId(),
        isLanding: isLandingPage(),
        buttonClicked: buttonClicked || ""
      };
      
      fetch("/api/visit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(data),
        keepalive: true
      }).catch(function () {
      });
    } catch (e) {
    }
  }

  function attachButtonTracking() {
    try {
      var buttons = document.querySelectorAll('[data-track-click]');
      buttons.forEach(function (btn) {
        btn.addEventListener("click", function () {
          var buttonName = btn.getAttribute("data-track-click") || btn.textContent.trim().substring(0, 50);
          sendVisit(buttonName);
        });
      });

      var startButtons = document.querySelectorAll('a[href*="checkout"], a[href*="start"], button[type="submit"]');
      startButtons.forEach(function (btn) {
        if (!btn.hasAttribute("data-track-click")) {
          btn.addEventListener("click", function () {
            var buttonName = btn.textContent.trim().substring(0, 50) || "button";
            sendVisit(buttonName);
          });
        }
      });
    } catch (e) {
    }
  }
  
  if (document.readyState === "complete" || document.readyState === "interactive") {
    setTimeout(sendVisit, 100);
    setTimeout(attachButtonTracking, 200);
  } else {
    window.addEventListener("DOMContentLoaded", function () {
      setTimeout(sendVisit, 100);
      setTimeout(attachButtonTracking, 200);
    });
  }
})();
