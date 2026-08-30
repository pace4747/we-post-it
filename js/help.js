(function () {
  var path = (location.pathname || "").replace(/\/+$/, "") || "/";
  if (path === "/legal" || path === "/legal.html") return;
  if (document.getElementById("wpiHelp")) return;

  var MAX = 5;
  var turns = 0;

  var LEGAL = /lawyer|attorney|legal|lawsuit|sue|liable|liability|warranty|contract|terms|agreement|court|damage|indemnif|dtpa|rights|refund law|not liable|abogado|demanda|legal|acuerdo|responsab|juicio|garant[ií]a|contrato|policy|privacy|protec/i;

  var HOW = [
    { re: /find|search|visible|maps|bing|apple|seo|internet|google maps/, en: "We put you where people look. Google, Facebook, Apple Maps, Bing, and your website. Same name, town, phone. Photos on Google. We do not promise a rank.", es: "Lo ponemos donde la gente busca. Google, Facebook, Apple Maps, Bing y su página web. Mismo nombre, pueblo, teléfono. Fotos en Google. No prometemos un puesto." },
    { re: /change|edit|hours|horario|cambio|update|actualizar|limit|how many|times a day|spam/, en: "Need a change. Text us. Your site is one page. We do up to 3 updates on it per day. That is only so nobody spams the page. Number 4 waits until tomorrow. Two looks when we can. Reply 1 or 2.", es: "¿Un cambio? Mándenos un mensaje. Su sitio es una página. Hasta 3 cambios al día. Solo para que nadie la llene de spam. El 4 espera a mañana. Dos estilos. Conteste 1 o 2." },
    { re: /hours|horario|business info|about (the |my |your )?(shop|business)|what do (you|we) do|which towns|pueblos/, en: "Shop name, town, phone to start. After that we text you. Hours. Towns. Two looks. Reply 1 or 2. Photos too.", es: "Nombre, pueblo, teléfono para empezar. Luego le mandamos un mensaje. Horario. Pueblos. Dos estilos. Conteste 1 o 2. Fotos también." },
    { re: /text|whatsapp|mensaje|sms/, en: "After you start, you text us. That is how you talk to us. Photos. Changes. Questions about how to use this. Send lots of photos.", es: "Cuando empiece, nos manda mensajes. Así hablamos. Fotos. Cambios. Preguntas de cómo usar esto. Mande muchas fotos." },
    { re: /look|color|dark|light|estilo|claro|oscuro/, en: "We show you two looks. You pick 1 or 2. Light or dark. Easy.", es: "Le mostramos dos estilos. Conteste 1 o 2. Claro u oscuro. Fácil." },
    { re: /photo|picture|pic|foto/, en: "You text the photos to us. We post them for you. Send lots. Old ones are fine. A pile is good. We space them. At most 1 Facebook post a day, at most 2 a week. No photo, no post.", es: "Nos manda las fotos. Las publicamos. Mande muchas. Las viejas sirven. Un montón es bueno. Las espaciamos. Como mucho 1 publicación en Facebook al día, 2 a la semana. Sin foto, no hay publicación." },
    { re: /google/, en: "We get Google started. Bring your phone. We sit with you. We type. You come in just to finish. You keep your password.", es: "Empezamos Google. Traiga su teléfono. Nos sentamos. Nosotros escribimos. Usted solo viene a terminar. Usted se queda con su clave." },
    { re: /face ?book|facebook|fb/, en: "Same as Google. We start the Facebook page from your shop info. You come in just to finish. You keep your login.", es: "Igual que Google. Empezamos Facebook con los datos del negocio. Usted solo viene a terminar. Usted se queda con su clave." },
    { re: /email|correo|receipt|invoice|recibo/, en: "Email is optional. If you have one, that is where the receipt goes. Card says WE POST IT.", es: "El correo es opcional. Si tiene, ahí llega el recibo. En la tarjeta dice WE POST IT." },
    { re: /cancel|stop|pare|cancelar/, en: "Stop whenever. Pay once and the website stays up for a year, even if you cancel.", es: "Pare cuando quiera. Pague una vez y la página web sigue un año, aunque cancele." },
    { re: /price|cost|\$|9\.99|precio|cuesta/, en: "$9.99 a month. Stop whenever.", es: "$9.99 al mes. Pare cuando quiera." },
    { re: /spanish|espa[nñ]ol|ingles|english/, en: "Tap ES at the top for Spanish. EN to go back.", es: "Toque ES arriba para español. EN para volver." },
    { re: /start|begin|pay|empezar|pagar/, en: "Shop name, town, phone. Check the User Agreement at the end. Start. Then you text the photos to us.", es: "Nombre, pueblo, teléfono. Marque el Acuerdo de usuario al final. Empiece. Luego nos manda las fotos." },
    { re: /website|page|site|p[aá]gina|web/, en: "We get your website started. It is one page. Need a change. Text us. Up to 3 updates a day so nobody spams it.", es: "Empezamos su página web. Es una página. ¿Un cambio? Mándenos un mensaje. Hasta 3 al día para que nadie la llene de spam." },
    { re: /password|clave|login/, en: "We never take a password. You keep your logins. You come in just to finish.", es: "Nunca pedimos una clave. Usted se queda con sus claves. Usted solo viene a terminar." },
    { re: /help|how|c[oó]mo|ayuda|question|pregunta/, en: "I only answer how to use this site. Shop name, town, phone, then start. Photos by text after.", es: "Solo respondo cómo usar este sitio. Nombre, pueblo, teléfono, luego empiece. Fotos por mensaje después." }
  ];

  if (!document.getElementById("wpiHelpCss")) {
    var css = document.createElement("style");
    css.id = "wpiHelpCss";
    css.textContent = "#wpiHelp{position:fixed;right:.75rem;bottom:.75rem;left:.75rem;z-index:80;max-width:26rem;margin-left:auto;font-family:inherit}body{padding-bottom:8.5rem}.wpi-help-box{background:#fff;color:#111;border:1.5px solid #111;border-radius:14px;padding:.85rem;box-shadow:0 10px 28px rgba(0,0,0,.16)}.wpi-help-head{margin:0 0 .55rem;font-weight:700;font-size:1.12rem}.wpi-help-log{max-height:10rem;overflow:auto;margin:0 0 .5rem}.wpi-help-log:empty{display:none}.wpi-help-log p{margin:0 0 .45rem;font-size:1rem}.wpi-help-log .me{font-weight:650}.wpi-help-form{display:grid;grid-template-columns:1fr auto;gap:.4rem}.wpi-help-field{position:relative}.wpi-help-form input{width:100%;min-height:48px;border:1.5px solid #111;border-radius:10px;padding:.45rem .7rem;font:inherit;font-size:1.05rem;background:#f7f7f4}.wpi-help-hint{position:absolute;left:.7rem;right:.7rem;top:50%;transform:translateY(-50%);pointer-events:none;color:#222;font-weight:700;font-size:1.05rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.wpi-help-field.has-text .wpi-help-hint{display:none}.wpi-help-form button{min-height:48px;padding:0 .9rem;background:#111;color:#fff;border:0;border-radius:10px;font:inherit;font-weight:700;cursor:pointer}.wpi-help-form button:disabled{opacity:.45}";
    document.head.appendChild(css);
  }

  function lang() {
    return localStorage.getItem("wpi-lang") === "es" ? "es" : "en";
  }
  function t(en, es) { return lang() === "es" ? es : en; }

  function reply(q) {
    var s = String(q || "").trim();
    if (!s) return t("Have a question?", "¿Tiene una pregunta?");
    if (LEGAL.test(s)) {
      return t("I only answer how to use this site. The User Agreement is the small check at the end, before Start.", "Solo respondo cómo usar este sitio. El Acuerdo de usuario es la casilla pequeña al final, antes de Empezar.");
    }
    for (var i = 0; i < HOW.length; i++) {
      if (HOW[i].re.test(s)) return HOW[i][lang()];
    }
    return t("I only answer how to use this site. Shop name, town, phone. Check the box at the end. Start.", "Solo respondo cómo usar este sitio. Nombre, pueblo, teléfono. Marque la casilla al final. Empiece.");
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
    p.className = who === "me" ? "me" : "bot";
    p.textContent = text;
    log.appendChild(p);
    log.scrollTop = log.scrollHeight;
  }

  function syncHint() {
    var inp = document.getElementById("wpiHelpIn");
    var field = document.getElementById("wpiHelpField");
    var on = !!(inp && inp.value);
    field.classList.toggle("has-text", on);
    document.getElementById("wpiHelpHead").style.display = on || document.getElementById("wpiHelpLog").childNodes.length ? "none" : "";
  }

  function stopBox() {
    document.getElementById("wpiHelpIn").disabled = true;
    document.getElementById("wpiHelpGo").disabled = true;
    add("bot", t("This box is limited. After you start, text us.", "Esta caja es limitada. Cuando empiece, mándenos un mensaje."));
  }

  labels();
  var inp = document.getElementById("wpiHelpIn");
  inp.addEventListener("input", syncHint);
  document.getElementById("wpiHelpForm").addEventListener("submit", function (e) {
    e.preventDefault();
    if (turns >= MAX) { stopBox(); return; }
    var q = inp.value.trim();
    if (!q) return;
    add("me", q);
    inp.value = "";
    syncHint();
    add("bot", reply(q));
    turns += 1;
    document.getElementById("wpiHelpHead").style.display = "none";
    if (turns >= MAX) stopBox();
  });
  window.addEventListener("wpi-lang", labels);
  var langBtn = document.getElementById("langBtn");
  if (langBtn) {
    langBtn.addEventListener("click", function () { setTimeout(function () { labels(); syncHint(); }, 0); });
  }
})();
