(function () {
  var DEMO_HINT = "wpi_demo_rr_electric_7hKq2mN9pL4x";

  function lang() {
    return (window.wpiLang && window.wpiLang()) || (localStorage.getItem("wpi-lang") === "es" ? "es" : "en");
  }
  function t(en, es) {
    return lang() === "es" ? es : en;
  }

  function slugFromPath() {
    var parts = (location.pathname || "").split("/").filter(Boolean);
    if (parts[0] === "edit" && parts[1]) return parts[1].toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 40);
    return "";
  }

  var slug = slugFromPath();
  var token = new URLSearchParams(location.search).get("k") || "";
  var doc = null;
  var dirty = false;
  var previewMode = "draft";
  var previewTimer = null;
  var statusTimer = null;

  var $shop = document.getElementById("edShop");
  var $status = document.getElementById("edStatus");
  var $save = document.getElementById("edSave");
  var $publish = document.getElementById("edPublish");
  var $live = document.getElementById("edLive");
  var $gate = document.getElementById("edGate");
  var $shell = document.getElementById("edShell");
  var $form = document.getElementById("edForm");
  var $frame = document.getElementById("edFrame");
  var $tabEdit = document.getElementById("tabEdit");
  var $tabPreview = document.getElementById("tabPreview");

  function setStatus(en, es) {
    $status.textContent = t(en, es);
    clearTimeout(statusTimer);
    statusTimer = setTimeout(function () { $status.textContent = ""; }, 4000);
  }

  function qs(sel, root) {
    return (root || document).querySelector(sel);
  }
  function qsa(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  function section(type) {
    var list = doc.pages.home.sections;
    for (var i = 0; i < list.length; i++) if (list[i].type === type) return list[i];
    return null;
  }

  function apiUrl(path) {
    return path + (path.indexOf("?") === -1 ? "?" : "&") + "slug=" + encodeURIComponent(slug) + "&k=" + encodeURIComponent(token);
  }

  function jsonHeaders() {
    return {
      "content-type": "application/json",
      "x-edit-token": token
    };
  }

  function showGate(en, es) {
    $gate.hidden = false;
    $gate.textContent = t(en, es);
    $shell.hidden = true;
  }

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === "text") node.textContent = attrs[k];
        else if (k === "html") node.innerHTML = attrs[k];
        else if (k === "class") node.className = attrs[k];
        else if (k.indexOf("on") === 0 && typeof attrs[k] === "function") node.addEventListener(k.slice(2), attrs[k]);
        else if (attrs[k] === true) node.setAttribute(k, "");
        else if (attrs[k] !== false && attrs[k] != null) node.setAttribute(k, attrs[k]);
      });
    }
    (children || []).forEach(function (c) {
      if (c) node.appendChild(c);
    });
    return node;
  }

  function field(labelEn, labelEs, input) {
    var wrap = el("label", { class: "ed-field" });
    wrap.appendChild(el("span", { text: t(labelEn, labelEs) }));
    wrap.appendChild(input);
    return wrap;
  }

  function input(type, value, onChange, extra) {
    var node = document.createElement(type === "textarea" ? "textarea" : "input");
    if (type !== "textarea") node.type = type || "text";
    node.value = value || "";
    if (extra && extra.placeholder) node.placeholder = extra.placeholder;
    node.addEventListener("input", function () {
      onChange(node.value);
      markDirty();
    });
    return node;
  }

  function markDirty() {
    dirty = true;
    setStatus("Unsaved", "Sin guardar");
    schedulePreview();
  }

  function schedulePreview() {
    if (previewMode !== "draft") return;
    clearTimeout(previewTimer);
    previewTimer = setTimeout(refreshPreview, 280);
  }

  async function refreshPreview() {
    if (!doc) return;
    if (previewMode === "live") {
      $frame.removeAttribute("srcdoc");
      $frame.src = apiUrl("/api/site-preview") + "&mode=live";
      return;
    }
    try {
      var res = await fetch(apiUrl("/api/site-preview") + "&mode=draft", {
        method: "POST",
        headers: jsonHeaders(),
        body: JSON.stringify({ document: doc, mode: "draft" })
      });
      var html = await res.text();
      $frame.removeAttribute("src");
      $frame.srcdoc = html;
    } catch (e) {
      setStatus("Preview failed", "Falló la vista previa");
    }
  }

  function highlight(id) {
    try {
      if ($frame.contentWindow) {
        $frame.contentWindow.postMessage({ type: "wpi-highlight", id: id }, "*");
      }
    } catch (e) {}
  }

  function scrollToGroup(type) {
    var group = qs('[data-group="' + type + '"]');
    if (group) group.scrollIntoView({ behavior: "smooth", block: "start" });
    highlight(type);
  }

  function setPane(pane) {
    $shell.setAttribute("data-pane", pane);
    $tabEdit.setAttribute("aria-selected", pane === "edit" ? "true" : "false");
    $tabPreview.setAttribute("aria-selected", pane === "preview" ? "true" : "false");
  }

  function applyInline(fieldName, value) {
    if (!doc) return;
    if (fieldName === "hero.headline") {
      section("hero").settings.headline = value;
      doc.business.name = value;
    } else if (fieldName === "hero.tagline") {
      section("hero").settings.tagline = value;
    } else if (fieldName === "about.body") {
      section("about").settings.body = value;
    }
    dirty = true;
    var target = qs("[data-bind=\"" + fieldName + "\"]");
    if (target && target.value !== value) target.value = value;
    if (fieldName === "hero.headline") {
      var name = qs("[data-bind=\"business.name\"]");
      if (name && name.value !== value) name.value = value;
      $shop.textContent = value || slug;
    }
  }

  function renderForm() {
    $form.innerHTML = "";
    var biz = doc.business;

    var theme = el("section", { class: "ed-group", "data-group": "theme" }, [
      el("h3", { text: t("Colors", "Colores") }),
      el("div", { class: "ed-palettes" }, [
        paletteBtn("navy-red", t("Navy + red", "Azul marino + rojo"), "navy"),
        paletteBtn("blue-gold", t("Blue + gold", "Azul + oro"), "gold")
      ])
    ]);
    $form.appendChild(theme);

    $form.appendChild(el("section", { class: "ed-group", "data-group": "business" }, [
      el("h3", { text: t("Shop info", "Datos del negocio") }),
      bindText("business.name", t("Shop name", "Nombre"), biz.name),
      bindText("business.category", t("Category", "Rubro"), biz.category),
      bindText("business.phone", t("Phone", "Teléfono"), biz.phone),
      bindText("business.email", t("Email", "Correo"), biz.email),
      bindText("business.address", t("Address", "Dirección"), biz.address),
      bindText("business.city", t("City", "Ciudad"), biz.city),
      bindText("business.state", t("State", "Estado"), biz.state),
      bindText("business.zip", t("ZIP", "ZIP"), biz.zip),
      bindText("business.hours", t("Hours", "Horario"), biz.hours)
    ]));

    $form.appendChild(sectionGroup("hero", t("Hero", "Portada"), [
      bindText("hero.headline", t("Headline", "Título"), section("hero").settings.headline),
      bindText("hero.tagline", t("Tagline", "Frase"), section("hero").settings.tagline),
      bindText("hero.ctaLabel", t("Call button", "Botón de llamada"), section("hero").settings.ctaLabel)
    ]));

    $form.appendChild(sectionGroup("about", t("About", "Acerca de"), [
      bindArea("about.body", t("About text", "Texto"), section("about").settings.body)
    ]));

    $form.appendChild(photosGroup());
    $form.appendChild(blocksGroup("services", t("Services", "Servicios"), "name", "description", t("Add service", "Agregar servicio")));
    $form.appendChild(reviewsGroup());
    $form.appendChild(sectionGroup("area", t("Towns you serve", "Pueblos que atiende"), [
      bindText("area.towns", t("Towns (comma separated)", "Pueblos (separados por coma)"), section("area").settings.towns),
      bindText("area.note", t("Note", "Nota"), section("area").settings.note)
    ]));
    $form.appendChild(sectionGroup("map", t("Map", "Mapa"), [
      el("p", { class: "ed-hint", text: t("Uses the address above.", "Usa la dirección de arriba.") })
    ]));
    $form.appendChild(sectionGroup("contact", t("Contact", "Contacto"), [
      el("p", { class: "ed-hint", text: t("Shows name, address, hours, and phone.", "Muestra nombre, dirección, horario y teléfono.") })
    ]));
  }

  function paletteBtn(id, label, swatch) {
    var btn = el("button", {
      type: "button",
      class: "ed-palette",
      "aria-pressed": doc.theme.palette === id ? "true" : "false",
      onclick: function () {
        doc.theme.palette = id;
        qsa(".ed-palette").forEach(function (b) {
          b.setAttribute("aria-pressed", b === btn ? "true" : "false");
        });
        markDirty();
      }
    }, [
      el("div", { class: "ed-swatch " + swatch }),
      el("div", { text: label })
    ]);
    return btn;
  }

  function sectionGroup(type, title, children) {
    var sec = section(type);
    var toggle = el("label", { class: "ed-toggle" }, [
      el("input", {
        type: "checkbox"
      }),
      el("span", { text: t("Show", "Mostrar") })
    ]);
    var box = toggle.querySelector("input");
    box.checked = sec.enabled !== false;
    box.addEventListener("change", function () {
      sec.enabled = box.checked;
      markDirty();
    });
    var head = el("h3");
    head.appendChild(el("span", { class: "grow", text: title }));
    head.appendChild(toggle);
    var wrap = el("section", { class: "ed-group", "data-group": type }, [head].concat(children));
    wrap.addEventListener("focusin", function () { highlight(type); });
    return wrap;
  }

  function bindPath(path, value) {
    var parts = path.split(".");
    if (parts[0] === "business") doc.business[parts[1]] = value;
    else if (parts[0] === "hero" || parts[0] === "about" || parts[0] === "area") {
      section(parts[0]).settings[parts[1]] = value;
    }
    if (path === "business.name") {
      $shop.textContent = value || slug;
      if (!section("hero").settings.headline) section("hero").settings.headline = value;
    }
  }

  function bindText(path, label, value) {
    var node = input("text", value, function (v) { bindPath(path, v); });
    node.setAttribute("data-bind", path);
    return field(label, label, node);
  }

  function bindArea(path, label, value) {
    var node = input("textarea", value, function (v) { bindPath(path, v); });
    node.setAttribute("data-bind", path);
    return field(label, label, node);
  }

  function photosGroup() {
    var sec = section("photos");
    var list = el("ul", { class: "ed-photos" });
    function draw() {
      list.innerHTML = "";
      (sec.settings.images || []).forEach(function (url, idx) {
        var row = el("li");
        var img = el("img", { alt: "" });
        img.src = url;
        var urlBox = input("text", url, function (v) {
          sec.settings.images[idx] = v;
          img.src = v;
          markDirty();
        });
        var rm = el("button", {
          type: "button",
          class: "ed-mini",
          text: t("Remove", "Quitar"),
          onclick: function () {
            sec.settings.images.splice(idx, 1);
            draw();
            markDirty();
          }
        });
        row.appendChild(img);
        row.appendChild(urlBox);
        row.appendChild(rm);
        list.appendChild(row);
      });
    }
    draw();
    var add = input("url", "", function () {});
    add.placeholder = "https://";
    var addBtn = el("button", {
      type: "button",
      class: "ed-mini",
      text: t("Add photo URL", "Agregar URL de foto"),
      onclick: function () {
        addPhoto(add.value).then(function () { add.value = ""; draw(); });
      }
    });
    return sectionGroup("photos", t("Photos", "Fotos"), [
      el("p", { class: "ed-hint", text: t("Paste a photo URL. File upload works when Vercel Blob is configured. You can still text us photos.", "Pegue la URL de una foto. Subir archivo funciona si Vercel Blob está configurado. También puede mandarnos fotos.") }),
      list,
      field(t("Photo URL", "URL de foto"), t("Photo URL", "URL de foto"), add),
      addBtn
    ]);
  }

  function blocksGroup(type, title, nameKey, descKey, addLabel) {
    var sec = section(type);
    var holder = el("div");
    function draw() {
      holder.innerHTML = "";
      (sec.blocks || []).forEach(function (block, idx) {
        holder.appendChild(blockCard(sec, idx, draw, nameKey, descKey, false));
      });
    }
    draw();
    var add = el("button", {
      type: "button",
      class: "ed-mini",
      text: addLabel,
      onclick: function () {
        sec.blocks = sec.blocks || [];
        var item = { id: type.slice(0, 3) + "-" + Date.now().toString(36) };
        item[nameKey] = "";
        item[descKey] = "";
        sec.blocks.push(item);
        draw();
        markDirty();
      }
    });
    return sectionGroup(type, title, [holder, add]);
  }

  function reviewsGroup() {
    var sec = section("reviews");
    var holder = el("div");
    function draw() {
      holder.innerHTML = "";
      (sec.blocks || []).forEach(function (block, idx) {
        holder.appendChild(blockCard(sec, idx, draw, "author", "text", true));
      });
    }
    draw();
    var add = el("button", {
      type: "button",
      class: "ed-mini",
      text: t("Add review", "Agregar reseña"),
      onclick: function () {
        sec.blocks = sec.blocks || [];
        sec.blocks.push({ id: "rev-" + Date.now().toString(36), rating: 5, text: "", author: "" });
        draw();
        markDirty();
      }
    });
    return sectionGroup("reviews", t("Reviews", "Reseñas"), [holder, add]);
  }

  function blockCard(sec, idx, draw, nameKey, descKey, isReview) {
    var block = sec.blocks[idx];
    var box = el("div", { class: "ed-block" });
    if (isReview) {
      var rating = input("number", String(block.rating || 5), function (v) {
        var n = parseInt(v, 10);
        if (isNaN(n)) n = 5;
        if (n < 1) n = 1;
        if (n > 5) n = 5;
        block.rating = n;
      });
      rating.min = "1";
      rating.max = "5";
      box.appendChild(field(t("Stars", "Estrellas"), t("Stars", "Estrellas"), rating));
    }
    box.appendChild(field(
      isReview ? t("Name", "Nombre") : t("Name", "Nombre"),
      t("Name", "Nombre"),
      input("text", block[nameKey] || "", function (v) { block[nameKey] = v; })
    ));
    box.appendChild(field(
      isReview ? t("Review", "Reseña") : t("Description", "Descripción"),
      isReview ? t("Review", "Reseña") : t("Description", "Descripción"),
      input("textarea", block[descKey] || "", function (v) { block[descKey] = v; })
    ));
    var actions = el("div", { class: "ed-block-actions" });
    actions.appendChild(el("button", {
      type: "button", class: "ed-mini", text: t("Up", "Subir"),
      onclick: function () {
        if (idx === 0) return;
        var tmp = sec.blocks[idx - 1];
        sec.blocks[idx - 1] = sec.blocks[idx];
        sec.blocks[idx] = tmp;
        draw();
        markDirty();
      }
    }));
    actions.appendChild(el("button", {
      type: "button", class: "ed-mini", text: t("Down", "Bajar"),
      onclick: function () {
        if (idx >= sec.blocks.length - 1) return;
        var tmp = sec.blocks[idx + 1];
        sec.blocks[idx + 1] = sec.blocks[idx];
        sec.blocks[idx] = tmp;
        draw();
        markDirty();
      }
    }));
    actions.appendChild(el("button", {
      type: "button", class: "ed-mini", text: t("Remove", "Quitar"),
      onclick: function () {
        sec.blocks.splice(idx, 1);
        draw();
        markDirty();
      }
    }));
    box.appendChild(actions);
    return box;
  }

  async function addPhoto(url) {
    url = String(url || "").trim();
    if (!url) return;
    try {
      var res = await fetch(apiUrl("/api/site-upload"), {
        method: "POST",
        headers: jsonHeaders(),
        body: JSON.stringify({ url: url, document: doc })
      });
      var data = await res.json();
      if (!data.ok) {
        setStatus(data.error || "Could not add photo", data.error || "No se pudo agregar");
        return;
      }
      doc = data.document;
      dirty = false;
      renderForm();
      refreshPreview();
      setStatus("Photo added", "Foto agregada");
    } catch (e) {
      setStatus("Could not add photo", "No se pudo agregar");
    }
  }

  async function saveDraft() {
    $save.disabled = true;
    try {
      var res = await fetch(apiUrl("/api/site-document"), {
        method: "PUT",
        headers: jsonHeaders(),
        body: JSON.stringify({ document: doc })
      });
      var data = await res.json();
      if (!data.ok) throw new Error(data.error || "save failed");
      doc = data.document;
      dirty = false;
      setStatus("Draft saved", "Borrador guardado");
      refreshPreview();
    } catch (e) {
      setStatus("Could not save", "No se pudo guardar");
    }
    $save.disabled = false;
  }

  async function publish() {
    $publish.disabled = true;
    try {
      if (dirty) await saveDraft();
      var res = await fetch(apiUrl("/api/site-publish"), {
        method: "POST",
        headers: jsonHeaders(),
        body: JSON.stringify({ slug: slug })
      });
      var data = await res.json();
      if (!data.ok) throw new Error(data.error || "publish failed");
      doc = data.document;
      dirty = false;
      setStatus("Published", "Publicado");
      refreshPreview();
    } catch (e) {
      setStatus("Could not publish", "No se pudo publicar");
    }
    $publish.disabled = false;
  }

  async function boot() {
    if (!slug) {
      showGate("Missing shop in the URL.", "Falta el negocio en la URL.");
      return;
    }
    if (!token) {
      showGate(
        "This editor needs a secret link. For the demo shop use /edit/rr-electric?k=" + DEMO_HINT,
        "Este editor necesita un enlace secreto. Para la demo use /edit/rr-electric?k=" + DEMO_HINT
      );
      return;
    }
    $live.href = "/s/" + slug;
    try {
      var res = await fetch(apiUrl("/api/site-document"));
      var data = await res.json();
      if (!data.ok) {
        showGate(data.error || "Need a valid editor link.", data.error || "Necesita un enlace válido.");
        return;
      }
      doc = data.document;
      $shop.textContent = (doc.business && doc.business.name) || slug;
      $shell.hidden = false;
      $gate.hidden = true;
      renderForm();
      refreshPreview();
      if (data.storage === "tmp") {
        setStatus("Dev save (not durable on Vercel)", "Guardado local (no dura en Vercel)");
      }
    } catch (e) {
      showGate("Could not load the editor.", "No se pudo abrir el editor.");
    }
  }

  $save.addEventListener("click", saveDraft);
  $publish.addEventListener("click", publish);
  $tabEdit.addEventListener("click", function () { setPane("edit"); });
  $tabPreview.addEventListener("click", function () { setPane("preview"); });
  qsa("input[name=edMode]").forEach(function (r) {
    r.addEventListener("change", function () {
      if (!r.checked) return;
      previewMode = r.value;
      refreshPreview();
    });
  });

  window.addEventListener("message", function (e) {
    if (!e.data) return;
    if (e.data.type === "wpi-select-section" && e.data.id) {
      setPane("edit");
      scrollToGroup(e.data.id);
    }
    if (e.data.type === "wpi-edit-field") {
      applyInline(e.data.field, e.data.value);
    }
  });

  window.addEventListener("beforeunload", function (e) {
    if (!dirty) return;
    e.preventDefault();
    e.returnValue = "";
  });

  var langBtn = document.getElementById("langBtn");
  if (langBtn) {
    langBtn.addEventListener("click", function () {
      setTimeout(function () { if (doc) renderForm(); }, 0);
    });
  }

  boot();
})();
