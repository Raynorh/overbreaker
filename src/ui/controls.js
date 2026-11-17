// Installs this system into one application instance; initialization is deferred.
export function install(app) {
  app.applyKeys = function applyKeys() {
    app.KM = {};
    app.KEYS.forEach((k, i) => {
      app.KM[k] = i;
      app.L[i].n = app.keyLabel(k);
    });
  };
  app.keyAssign = function keyAssign(k) {
    const lane = app.capLane;
    if (k === "escape") {
      app.capLane = -1;
      app.openConfig("keys");
      return;
    }
    if (
      [
        "shift",
        "control",
        "alt",
        "meta",
        "capslock",
        "enter",
        " ",
        "dead",
        "contextmenu",
        "tab",
      ].includes(k)
    ) {
      const m = app.$("keyMsg");
      if (m) m.textContent = "Esa tecla está reservada. Prueba otra.";
      return;
    }
    const j = app.KEYS.indexOf(k);
    if (j >= 0 && j !== lane) app.KEYS[j] = app.KEYS[lane];
    app.KEYS[lane] = k;
    app.capLane = -1;
    try {
      localStorage.ob_keys = JSON.stringify(app.KEYS);
    } catch (e) {}
    app.applyKeys();
    app.openConfig("keys");
  };
  app.down = function down(l) {
    app.DN[l] = 1;
    app.LF[l] = 1;
    app.PT[l] = performance.now();
    app.press(l);
  };
  return function initialize() {
    app.DEFK = ["a", "s", "d", "f", "j", "k"];
    app.KEYS = app.DEFK.slice();
    app.KM = {};
    app.capLane = -1;
    try {
      const k = JSON.parse(localStorage.ob_keys || "null");
      if (
        Array.isArray(k) &&
        k.length === 6 &&
        k.every((x) => typeof x === "string" && x) &&
        new Set(k).size === 6
      )
        app.KEYS = k;
    } catch (e) {}
    app.keyLabel = (k) =>
      ({ arrowleft: "←", arrowright: "→", arrowup: "↑", arrowdown: "↓" })[k] ||
      (k.length === 1 ? k.toUpperCase() : k.slice(0, 3).toUpperCase());
    app.applyKeys();
    addEventListener("keydown", (e) => {
      app.au();
      const k = e.key.toLowerCase();
      if (app.capLane >= 0) {
        e.preventDefault();
        if (e.repeat) return;
        app.keyAssign(k);
        return;
      }
      if (e.repeat) return;
      if (app.KM.hasOwnProperty(k)) {
        e.preventDefault();
        if (app.mode === "play") app.down(app.KM[k]);
      } else if (k === " ") {
        e.preventDefault();
        app.adren();
      } else if (k === "r" && app.mode !== "menu") {
        if (app.mode === "over" && !app.overReady()) return;
        app.newMatch();
      } else if (k === "enter") {
        if (app.mode === "menu") app.newMatch();
        else app.adv();
      } else if (k === "escape" || k === "p") {
        if (app.mode === "play") app.setMode("pause");
        else if (app.mode === "pause") app.setMode("play");
      } else if (k === "m") {
        if (app.mode === "over" && !app.overReady()) return;
        app.toMenu();
      }
    });
    addEventListener("keyup", (e) => {
      const k = e.key.toLowerCase();
      if (app.KM.hasOwnProperty(k)) app.DN[app.KM[k]] = 0;
    });
    app.PM = {};
    app.adrB = () => ({
      x: Math.max(8, app.W - 58),
      y: Math.max(app.LT() + 28, app.HY() - 54),
      w: 44,
      h: 44,
    });
    app.cv.addEventListener("pointerdown", (e) => {
      app.au();
      e.preventDefault();
      if (app.mode === "menu") return;
      const x = e.clientX,
        y = e.clientY;
      if (app.mode === "pause") {
        const i = Math.floor((y - app.H * 0.4) / 68);
        if (
          i >= 0 &&
          i < 3 &&
          Math.abs(x - app.W / 2) < 130 &&
          (y - app.H * 0.4) % 68 < 52
        ) {
          if (i === 0) app.setMode("play");
          else if (i === 1) app.newMatch();
          else app.toMenu();
        }
        return;
      }
      if (app.mode === "over") {
        if (!app.overReady()) return;
        const ob = app.overBtns(),
          hit = (q) => x >= q.x && x <= q.x + q.w && y >= q.y && y <= q.y + q.h;
        if (hit(ob.a)) app.newMatch();
        else if (hit(ob.b)) app.toMenu();
        return;
      }
      if (app.mode !== "play") {
        app.adv();
        return;
      }
      if (
        app.R.breaker &&
        app.R.breaker.ready &&
        app.$("breakerBtn").classList.contains("show")
      ) {
        const q = app.$("breakerBtn").getBoundingClientRect();
        if (x >= q.left && x <= q.right && y >= q.top && y <= q.bottom) {
          app.executeBreaker();
          return;
        }
      }
      if (y >= app.HY() + 10) {
        const l = Math.floor((x - app.LX()) / app.LW());
        if (l >= 0 && l < 6) {
          try {
            app.cv.setPointerCapture(e.pointerId);
          } catch (_) {}
          app.PM[e.pointerId] = l;
          app.down(l);
        }
      } else {
        const b = app.adrB();
        if (x > b.x && y > b.y && y < b.y + b.h) app.adren();
        else if (y > 40 && y < 78 && Math.abs(x - app.W / 2) < 28)
          app.setMode("pause");
      }
    });
    app.up = (e) => {
      const l = app.PM[e.pointerId];
      if (l !== undefined) {
        app.DN[l] = 0;
        delete app.PM[e.pointerId];
      }
    };
    app.cv.addEventListener("pointerup", app.up);
    app.cv.addEventListener("pointercancel", app.up);
  };
}
