(function () {
  var path = (location.pathname || "").replace(/\/+$/, "") || "/";
  if (path === "/legal" || path === "/legal.html") return;

  function lang() {
    return localStorage.getItem("wpi-lang") === "es" ? "es" : "en";
  }

  function t(en, es) {
    return lang() === "es" ? es : en;
  }

  function getSession() {
    var sid = sessionStorage.getItem("wpi-help-session");
    if (!sid) {
      sid = "wpi-" + Date.now() + "-" + Math.random().toString(36).slice(2, 9);
      sessionStorage.setItem("wpi-help-session", sid);
    }
    return sid;
  }

  var helpBox = document.getElementById("helpBox");
  var helpToggle = document.getElementById("helpToggle");
  var helpLog = document.getElementById("helpLog");
  var helpForm = document.getElementById("helpForm");
  var helpIn = document.getElementById("helpIn");
  var helpGo = document.getElementById("helpGo");
  var helpField = document.getElementById("helpField");
  var helpHint = document.getElementById("helpHint");

  if (!helpBox || !helpToggle) return;

  function updateLabels() {
    if (helpToggle) {
      var span = helpToggle.querySelector("span");
      if (span) span.textContent = t("Got a question?", "¿Pregunta?");
    }
    helpHint.textContent = t("Type it here.", "Escríbala aquí.");
    helpIn.setAttribute("aria-label", t("Question", "Pregunta"));
    helpGo.textContent = t("Send", "Enviar");
  }

  function syncHint() {
    var on = !!(helpIn && helpIn.value);
    helpField.classList.toggle("has-text", on);
  }

  function add(who, text) {
    var p = document.createElement("p");
    p.className = who === "me" ? "me" : "bot";
    p.textContent = text;
    helpLog.appendChild(p);
    helpLog.scrollTop = helpLog.scrollHeight;
    return p;
  }

  // Toggle help box visibility
  helpToggle.addEventListener("click", function () {
    var isHidden = helpBox.hidden;
    helpBox.hidden = !isHidden;
    if (!isHidden) {
      // Closing
    } else {
      // Opening
      helpIn.focus();
    }
  });

  // Close help box when clicking outside
  document.addEventListener("click", function (e) {
    if (!helpBox.hidden && !helpBox.contains(e.target) && !helpToggle.contains(e.target)) {
      helpBox.hidden = true;
    }
  });

  helpIn.addEventListener("input", syncHint);

  helpForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var q = helpIn.value.trim();
    if (!q) return;

    add("me", q);
    helpIn.value = "";
    syncHint();

    var session = getSession();
    var payload = { session: session, text: q, lang: lang() };
    helpIn.disabled = true;
    helpGo.disabled = true;

    fetch("/api/help", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    })
      .then(function (r) {
        return r.json();
      })
      .then(function (data) {
        if (data.ok && data.reply) {
          add("bot", data.reply);
          if (data.closed) {
            helpIn.disabled = true;
            helpGo.disabled = true;
          } else {
            helpIn.disabled = false;
            helpGo.disabled = false;
            helpIn.focus();
          }
        } else {
          add("bot", t("We got it. After you start, text us.", "Lo recibimos. Cuando empiece, mándenos un mensaje."));
          helpIn.disabled = false;
          helpGo.disabled = false;
        }
      })
      .catch(function () {
        add("bot", t("We got it. After you start, text us.", "Lo recibimos. Cuando empiece, mándenos un mensaje."));
        helpIn.disabled = false;
        helpGo.disabled = false;
      });
  });

  window.addEventListener("wpi-lang", updateLabels);
  var langBtn = document.getElementById("langBtn");
  if (langBtn) {
    langBtn.addEventListener("click", function () {
      setTimeout(function () {
        updateLabels();
        syncHint();
      }, 0);
    });
  }

  updateLabels();
  syncHint();
})();
