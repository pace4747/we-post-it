(function () {
  var palettes = {
    paper:  { mode: "light", ink: "#111111", accent: "#b42318", mid: "#4a4a46", paper: "#f7f7f4" },
    day:    { mode: "light", ink: "#1a1614", accent: "#9b2c14", mid: "#5c4538", paper: "#f4efe4" },
    night:  { mode: "dark",  ink: "#0c0b0a", accent: "#d24a1f", mid: "#d4a017", paper: "#efe6d2" },
    granite:{ mode: "dark",  ink: "#1a1d22", accent: "#2d6a9f", mid: "#c5c8cc", paper: "#f3efe6" },
    yard:   { mode: "dark",  ink: "#14110f", accent: "#c42b18", mid: "#c4a36a", paper: "#f3e6cf" }
  };
  var q = new URLSearchParams(location.search).get("palette") || "paper";
  if (!palettes[q]) q = "paper";
  var p = palettes[q];
  var r = document.documentElement;
  r.style.setProperty("--ink", p.ink);
  r.style.setProperty("--accent", p.accent);
  r.style.setProperty("--mid", p.mid);
  r.style.setProperty("--paper", p.paper);
  r.setAttribute("data-palette", q);
  r.setAttribute("data-mode", p.mode);
  window.wpiPalette = q;
  window.wpiMode = p.mode;
})();
