import { DIFFICULTY, ATTACK_DAMAGE } from "../game/config.js";
// Installs this system into one application instance; initialization is deferred.
export function install(app) {
  app.rs = function rs() {
    app.DPR = Math.min(devicePixelRatio || 1, 2);
    app.W = innerWidth;
    app.H = innerHeight;
    app.AH = app.H * (app.mode === "menu" ? 0.6 : 0.5);
    app.cv.width = app.W * app.DPR;
    app.cv.height = app.H * app.DPR;
    app.g.setTransform(app.DPR, 0, 0, app.DPR, 0, 0);
  };
  app.setMode = function setMode(m) {
    app.mode = m;
    app.AH = app.H * (m === "menu" ? 0.6 : 0.5);
    app.$("menu").classList.toggle("hid", m !== "menu");
    if (m !== "menu") app.$("how").style.display = "none";
    if (m === "menu") app.$("bs").textContent = app.best;
    app.musicSync();
  };
  return function initialize() {
    "use strict";
    app.DIV = 3;
    app.OVERAT = 0;
    addEventListener(
      "pointerdown",
      () => {
        if (!app.gt) app.gt = performance.now();
        app.musicSync();
      },
      true,
    );
    app.cv = document.getElementById("c");
    app.$ = (id) => document.getElementById(id);
    app.g = app.cv.getContext("2d");
    app.gt = 0;
    app.gameMode = "fight";
    app.diff = 1;
    app.lay = "mid";
    app.custom = 0;
    app.hudMode = app.readHud();
    app.arenaPos = "center";
    app.floorMode = "grass";
    app.W = undefined;
    app.H = undefined;
    app.AH = undefined;
    app.DPR = undefined;
    app.mode = "menu";
    app.M = undefined;
    app.R = undefined;
    app.fx = [];
    app.PA = [];
    app.slow = 0;
    app.shake = 0;
    app.best = 0;
    app.playerColor = "#69ff36";
    app.environment = "leaves";
    app.DN = [0, 0, 0, 0, 0, 0];
    app.LF = [0, 0, 0, 0, 0, 0];
    app.PT = [0, 0, 0, 0, 0, 0];
    app.clock = 0;
    app.sfxOn = true;
    app.musOn = true;
    app.MUS = 0;
    app.md = 1;
    app.vend = 0;
    app.BUS = null;
    app.lockUntil = 0;
    try {
      app.best = Number.isFinite(+localStorage.ob_best)
        ? Math.max(0, +localStorage.ob_best)
        : 0;
      app.diff = +localStorage.ob_diff;
      if (!(Number.isInteger(app.diff) && app.diff >= 0 && app.diff <= 5))
        app.diff = 1;
      if (localStorage.ob_v17 !== "1") {
        app.lay = "mid";
        localStorage.ob_lay = "mid";
        localStorage.ob_v17 = "1";
      } else app.lay = localStorage.ob_lay === "top" ? "top" : "mid";
      app.playerColor = localStorage.ob_color || "#69ff36";
      app.environment = [
        "leaves",
        "rain",
        "storm",
        "snow",
        "wind",
        "off",
      ].includes(localStorage.ob_env)
        ? localStorage.ob_env
        : "storm";
    } catch (e) {}
    addEventListener("resize", app.rs);
    app.rs();
    app.L = [
      { n: "A", c: "#8cff55", f: 262 },
      { n: "S", c: "#e9d63a", f: 330 },
      { n: "D", c: "#2ec4b6", f: 392 },
      { n: "F", c: "#4895ef", f: 523 },
      { n: "J", c: "#9b8cff", f: 196 },
      { n: "K", c: "#ff7bd5", f: 247 },
    ];
    app.MOVES = ["jab", "cross", "hook", "uppercut"];
    app.BASE_D = ATTACK_DAMAGE;
    app.NAMES = ["¡JAB!", "¡CROSS!", "¡HOOK!", "¡UPPERCUT!"];
    app.SH = ["JAB", "CROSS", "HOOK", "UPPERCUT"];
    app.LW = () => Math.min(app.W / 6, 120);
    app.LX = () => (app.W - app.LW() * 6) / 2;
    app.BH = () => Math.max(66, app.H * 0.13);
    app.HY = () => app.H - app.BH() - 16;
    app.TT = (r) =>
      Math.max(0.58, 2.1 - (1.0 * (r - 0.55)) / 0.75) *
      DIFFICULTY.travel[app.diff];
    app.LT = () => (app.lay === "mid" ? Math.max(130, app.H * 0.17) : app.AH);
  };
}
