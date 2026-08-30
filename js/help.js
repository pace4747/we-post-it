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

  var helpSection = document.getElementById("helpSection");
  var helpToggle = document.getElementById("helpToggle");
  var helpLog = document.getElementById("helpLog");
  var helpForm = document.getElementById("helpForm");
  var helpIn = document.getElementById("helpIn");
  var helpGo = document.getElementById("helpGo");

  if (!helpToggle || !helpSection) return;

  function updateLabels() {
    var toggleText = t("Ask us", "Pregúntenos");
    if (helpToggle.textContent.indexOf("✕") === -1) {
      helpToggle.textContent = toggleText;
    }
    helpIn.setAttribute("placeholder", t("Type your question...", "Escribe tu pregunta..."));
    helpGo.textContent = t("Send", "Enviar");
  }

  function add(who, text) {
    var p = document.createElement("p");
    p.className = who === "me" ? "me" : "bot";
    p.textContent = text;
    helpLog.appendChild(p);
    helpLog.scrollTop = helpLog.scrollHeight;
    return p;
  }

  helpToggle.addEventListener("click", function () {
    var isHidden = helpSection.hidden;
    helpSection.hidden = !isHidden;
    if (!isHidden) {
      helpToggle.textContent = t("Ask us", "Pregúntenos");
      helpIn.blur();
    } else {
      helpToggle.textContent = "✕";
      helpIn.focus();
    }
  });

  helpForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var q = helpIn.value.trim();
    if (!q) return;

    add("me", q);
    helpIn.value = "";

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
      }, 0);
    });
  }

  updateLabels();
})();
