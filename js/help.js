(function () {
  var path = (location.pathname || "").replace(/\/+$/, "") || "/";
  if (path === "/legal" || path === "/legal.html") return;
  if (document.getElementById("wpiHelp")) return;

  if (!document.getElementById("wpiHelpCss")) {
    var css = document.createElement("style");
    css.id = "wpiHelpCss";
    css.textContent = "#wpiHelp{position:fixed;right:.75rem;bottom:.75rem;left:.75rem;z-index:80;max-width:26rem;margin-left:auto;font-family:inherit}body{padding-bottom:8.5rem}.wpi-help-box{background:#fff;color:#111;border:1.5px solid #111;border-radius:14px;padding:.85rem;box-shadow:0 10px 28px rgba(0,0,0,.16)}.wpi-help-head{margin:0 0 .55rem;font-weight:700;font-size:1.12rem}.wpi-help-log{max-height:10rem;overflow:auto;margin:0 0 .5rem}.wpi-help-log:empty{display:none}.wpi-help-log p{margin:0 0 .45rem;font-size:1rem}.wpi-help-log .me{font-weight:650}.wpi-help-log .wait{color:#666;font-style:italic}.wpi-help-form{display:grid;grid-template-columns:1fr auto;gap:.4rem}.wpi-help-field{position:relative}.wpi-help-form input{width:100%;min-height:48px;border:1.5px solid #111;border-radius:10px;padding:.45rem .7rem;font:inherit;font-size:1.05rem;background:#f7f7f4}.wpi-help-hint{position:absolute;left:.7rem;right:.7rem;top:50%;transform:translateY(-50%);pointer-events:none;color:#222;font-weight:700;font-size:1.05rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.wpi-help-field.has-text .wpi-help-hint{display:none}.wpi-help-form button{min-height:48px;padding:0 .9rem;background:#111;color:#fff;border:0;border-radius:10px;font:inherit;font-weight:700;cursor:pointer}.wpi-help-form button:disabled{opacity:.45}";
    document.head.appendChild(css);
  }

  function lang() {
    return localStorage.getItem("wpi-lang") === "es" ? "es" : "en";
  }
  function t(en, es) { return lang() === "es" ? es : en; }

  function getSession() {
    var sid = sessionStorage.getItem("wpi-help-session");
    if (!sid) {
      sid = "wpi-" + Date.now() + "-" + Math.random().toString(36).slice(2, 9);
      sessionStorage.setItem("wpi-help-session", sid);
    }
    return sid;
  }

  var wrap = document.createElement("div");
  wrap.id = "wpiHelp";
  wrap.innerHTML =
    '<div class="wpi-help-box" id="wpiHelpBox">' +
      '<p class="wpi-help-head" id="wpiHelpHead"></p>' +
      '<div class="wpi-help-log" id="wpiHelpLog"></div>' +
      '<form class="wpi-help-form" id="wpiHelpForm">' +
        '<div class="wpi-help-field" id="wpiHelpField">' +
          '<input type="text" id="wpiHelpIn" autocomplete="off">' +
          '<span class="wpi-help-hint" id="wpiHelpHint"></span>' +
        '</div>' +
        '<button type="submit" id="wpiHelpGo"></button>' +
      '</form>' +
    '</div>';
  document.body.appendChild(wrap);

  function labels() {
    document.getElementById("wpiHelpHead").textContent = t("Have a question?", "¿Tiene una pregunta?");
    var hint = t("Have a question?", "¿Tiene una pregunta?");
    document.getElementById("wpiHelpHint").textContent = hint;
    document.getElementById("wpiHelpIn").setAttribute("aria-label", hint);
    document.getElementById("wpiHelpGo").textContent = t("Send", "Enviar");
  }

  function add(who, text) {
    var log = document.getElementById("wpiHelpLog");
    var p = document.createElement("p");
    p.className = who === "me" ? "me" : (who === "wait" ? "wait" : "bot");
    p.textContent = text;
    log.appendChild(p);
    log.scrollTop = log.scrollHeight;
    return p;
  }

  function syncHint() {
    var inp = document.getElementById("wpiHelpIn");
    var field = document.getElementById("wpiHelpField");
    var on = !!(inp && inp.value);
    field.classList.toggle("has-text", on);
    document.getElementById("wpiHelpHead").style.display = on || document.getElementById("wpiHelpLog").childNodes.length ? "none" : "";
  }

  var polling = false;
  var pollStop = 0;

  function poll() {
    if (!polling) return;
    if (Date.now() > pollStop) {
      polling = false;
      return;
    }
    var session = getSession();
    fetch("/api/help?session=" + encodeURIComponent(session))
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!polling) return;
        if (data.ok && data.messages && data.messages.length) {
          var log = document.getElementById("wpiHelpLog");
          var waits = log.querySelectorAll(".wait");
          for (var i = 0; i < waits.length; i++) { waits[i].remove(); }
          for (var j = 0; j < data.messages.length; j++) {
            var msg = data.messages[j];
            if (msg.who === "bot") {
              add("bot", msg.text);
              polling = false;
              document.getElementById("wpiHelpIn").disabled = false;
              document.getElementById("wpiHelpGo").disabled = false;
              return;
            }
          }
        }
        if (polling) setTimeout(poll, 2000);
      })
      .catch(function () {
        if (polling) setTimeout(poll, 2000);
      });
  }

  labels();
  var inp = document.getElementById("wpiHelpIn");
  inp.addEventListener("input", syncHint);
  document.getElementById("wpiHelpForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var q = inp.value.trim();
    if (!q) return;
    add("me", q);
    inp.value = "";
    syncHint();
    document.getElementById("wpiHelpHead").style.display = "none";

    var session = getSession();
    var payload = { session: session, text: q, lang: lang() };
    document.getElementById("wpiHelpIn").disabled = true;
    document.getElementById("wpiHelpGo").disabled = true;

    fetch("/api/help", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.ok) {
          add("wait", t("Checking with the team…", "Consultando con el equipo…"));
          polling = true;
          pollStop = Date.now() + 120000;
          setTimeout(poll, 2000);
        } else {
          add("bot", t("We got it. After you start, text us.", "Lo recibimos. Cuando empiece, mándenos un mensaje."));
          document.getElementById("wpiHelpIn").disabled = false;
          document.getElementById("wpiHelpGo").disabled = false;
        }
      })
      .catch(function () {
        add("bot", t("We got it. After you start, text us.", "Lo recibimos. Cuando empiece, mándenos un mensaje."));
        document.getElementById("wpiHelpIn").disabled = false;
        document.getElementById("wpiHelpGo").disabled = false;
      });
  });
  window.addEventListener("wpi-lang", labels);
  var langBtn = document.getElementById("langBtn");
  if (langBtn) {
    langBtn.addEventListener("click", function () { setTimeout(function () { labels(); syncHint(); }, 0); });
  }
})();
