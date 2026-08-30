(function () {
  var KEY = "wpi-lang";
  function lang() {
    return localStorage.getItem(KEY) === "es" ? "es" : "en";
  }
  function apply(l) {
    document.documentElement.lang = l;
    document.querySelectorAll("[data-en]").forEach(function (el) {
      var v = el.getAttribute("data-" + l) || el.getAttribute("data-en");
      if (v !== null) el.textContent = v;
    });
    document.querySelectorAll("[data-html-en]").forEach(function (el) {
      el.innerHTML = el.getAttribute("data-html-" + l) || el.getAttribute("data-html-en");
    });
    document.querySelectorAll("[data-ph-en]").forEach(function (el) {
      el.setAttribute("placeholder", el.getAttribute("data-ph-" + l) || el.getAttribute("data-ph-en"));
    });
    document.querySelectorAll("[data-aria-en]").forEach(function (el) {
      el.setAttribute("aria-label", el.getAttribute("data-aria-" + l) || el.getAttribute("data-aria-en"));
    });
    var btn = document.getElementById("langBtn");
    if (btn) {
      btn.textContent = l === "en" ? "ES" : "EN";
      btn.setAttribute("aria-label", l === "en" ? "Español" : "English");
    }
    localStorage.setItem(KEY, l);
  }
  window.wpiLang = lang;
  window.wpiApplyLang = apply;
  apply(lang());
  var btn = document.getElementById("langBtn");
  if (btn) {
    btn.addEventListener("click", function () {
      apply(lang() === "en" ? "es" : "en");
    });
  }
})();
