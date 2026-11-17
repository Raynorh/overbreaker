import { IMPORT_LIMITS, validateAudio } from "../audio/imports.js";
// Installs this system into one application instance; initialization is deferred.
export function install(app) {
  app.markSw = function markSw() {
    document.querySelectorAll(".swatch").forEach((b) => {
      const on = b.dataset.color === app.playerColor;
      b.style.boxShadow = on
        ? "0 0 0 3px #fff,0 0 14px " + b.dataset.color
        : "0 0 12px #000";
    });
  };
  app.stickPreview = function stickPreview() {
    const c = app.$("stickPrev");
    if (!c) return;
    const x = c.getContext("2d");
    app.PV.p = app.mkF(1, app.playerColor, "#173d12");
    app.PV.e = app.mkF(-1, "#ff5c7a", "#b03050");
    app.PV.t = 0.3;
    app.PV.turn = 0;
    app.PV.d = 0;
    let last = performance.now();
    const loop = (t) => {
      if (!app.$("editPanel").classList.contains("show")) return;
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      app.PV.p.col = app.playerColor;
      app.PV.t -= dt;
      if (app.PV.t <= 0) {
        app.PV.t = 0.9 + Math.random() * 0.4;
        const a = app.PV.turn++ % 2 ? app.PV.e : app.PV.p,
          d = a === app.PV.p ? app.PV.e : app.PV.p;
        a.an = app.MOVES[Math.floor(Math.random() * 4)];
        a.at = 0;
        app.PV.d = 0.12;
        app.PV.def = d;
        app.PV.dm = Math.random() < 0.5 ? "hurt" : "block";
      }
      if (app.PV.d > 0) {
        app.PV.d -= dt;
        if (app.PV.d <= 0) {
          app.PV.def.an = app.PV.dm;
          app.PV.def.at = 0;
          app.PV.def.fl = app.PV.dm === "hurt" ? 0.1 : 0;
        }
      }
      for (const f of [app.PV.p, app.PV.e]) {
        f.at += dt;
        if (f.fl > 0) f.fl -= dt;
        const A = app.AN[f.an];
        if (A && !A[2] && f.at >= A[0]) f.an = "idle";
        app.spring(f, dt);
      }
      {
        x.clearRect(0, 0, 320, 170);
        const s = 1.15,
          Y = 150;
        x.fillStyle = "#143016";
        x.fillRect(0, Y, 320, 20);
        app.PV.p.x = 160 - 48 * s;
        app.PV.e.x = 160 + 48 * s;
        app.drawF(app.PV.e, 0, Y, s, x);
        app.drawF(app.PV.p, 0, Y, s, x);
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  };
  app.arenaPreview = function arenaPreview() {
    const c = app.$("arenaPrev");
    if (!c) return;
    const x = c.getContext("2d"),
      t0 = performance.now();
    const loop = () => {
      if (
        !c.isConnected ||
        app.cfgKind !== "arena" ||
        !app.$("configHub").classList.contains("show")
      )
        return;
      const t = (performance.now() - t0) / 1000,
        w = c.width,
        h = c.height,
        e = app.environment;
      const gr = x.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, e === "rain" || e === "storm" ? "#0a1420" : "#10261a");
      gr.addColorStop(1, "#0b180d");
      x.fillStyle = gr;
      x.fillRect(0, 0, w, h);
      x.fillStyle = "#143016";
      x.fillRect(0, h * 0.78, w, h * 0.22);
      if (e === "rain" || e === "storm" || e === "wind") {
        x.strokeStyle = e === "wind" ? "#bfe8ff66" : "#9fd6ffaa";
        x.lineWidth = 1.2;
        for (let i = 0; i < 70; i++) {
          const px = (i * 97 + t * (e === "wind" ? 180 : 55)) % w,
            py = (i * 53 + t * (e === "wind" ? 200 : 420)) % (h * 0.8);
          x.beginPath();
          x.moveTo(px, py);
          x.lineTo(px - (e === "wind" ? 14 : 4), py + (e === "wind" ? 3 : 10));
          x.stroke();
        }
      }
      if (e === "storm" && Math.sin(t * 2.3) > 0.96) {
        x.fillStyle = "#ffffff33";
        x.fillRect(0, 0, w, h);
      }
      if (e === "snow" || e === "leaves") {
        for (let i = 0; i < 45; i++) {
          const px =
              (i * 83 + Math.sin(t + i) * 18 + t * (e === "leaves" ? 24 : 5)) %
              w,
            py = (i * 47 + t * (e === "leaves" ? 36 : 18)) % (h * 0.8);
          x.save();
          x.translate(px, py);
          x.rotate(t + i);
          x.fillStyle = e === "snow" ? "#eaffef" : "#a9df4b";
          x.globalAlpha = 0.85;
          x.beginPath();
          if (e === "snow") x.arc(0, 0, 1.5 + (i % 3), 0, 6.28);
          else x.ellipse(0, 0, 3, 7, 0.5, 0, 6.28);
          x.fill();
          x.restore();
        }
      }
      for (const [fx0, col, dir] of [
        [w * 0.38, "#69ff36", 1],
        [w * 0.62, "#ff5c7a", -1],
      ]) {
        x.strokeStyle = col;
        x.lineWidth = 3;
        x.lineCap = "round";
        const by = h * 0.78,
          sw = Math.sin(t * 4 + dir) * 4;
        x.beginPath();
        x.arc(fx0, by - 46, 6, 0, 6.28);
        x.stroke();
        x.beginPath();
        x.moveTo(fx0, by - 40);
        x.lineTo(fx0, by - 18);
        x.lineTo(fx0 - 6, by);
        x.moveTo(fx0, by - 18);
        x.lineTo(fx0 + 6, by);
        x.moveTo(fx0, by - 34);
        x.lineTo(fx0 + dir * (12 + sw), by - 30);
        x.stroke();
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  };
  app.openConfig = function openConfig(kind) {
    app.cfgKind = kind;
    if (kind !== "keys") app.capLane = -1;
    const box = app.$("cfgContent"),
      title = app.$("cfgTitle");
    app.$("configHub").classList.add("show");
    if (kind === "menu") {
      title.textContent = "CONFIGURACIÓN";
      box.innerHTML = `<div class="cfggrid"><button class="cfgbtn" data-go="editBtn">🎨 STICKMAN</button><button class="cfgbtn" data-go="settingsBtn">⚔ DIFICULTAD</button><button class="cfgbtn" data-go="arena">🌧 ARENA</button><button class="cfgbtn" data-go="audio">🔊 SONIDO</button><button class="cfgbtn" data-go="hud">▥ HUD</button><button class="cfgbtn" data-go="keys">⌨ TECLAS (PC)</button><button class="cfgbtn" data-go="howBtn">! CÓMO JUGAR</button></div>`;
      box.querySelectorAll("[data-go]").forEach(
        (b) =>
          (b.onclick = () => {
            const go = b.dataset.go;
            if (go === "editBtn" || go === "settingsBtn" || go === "howBtn") {
              app.$("configHub").classList.remove("show");
              setTimeout(() => app.$(go).click(), 60);
            } else app.openConfig(go);
          }),
      );
    }
    if (kind === "keys") {
      title.textContent = "TECLAS";
      box.innerHTML = `<div class="cfggrid">${app.KEYS.map((k, i) => `<button class="cfgbtn${app.capLane === i ? " sel" : ""}" data-k="${i}"><span style="color:${app.L[i].c}">●</span> CARRIL ${i + 1}<br><b style="font-size:22px">${app.capLane === i ? "…" : app.keyLabel(k)}</b></button>`).join("")}</div><p id="keyMsg" style="font-size:12px;color:#cbd8c4">Toca un carril y pulsa la tecla nueva. Esc cancela. Espacio queda para la adrenalina. Si repites una tecla, se intercambian.</p><div class="panelrow"><button class="cfgbtn" id="keysReset">RESTABLECER</button></div>`;
      box.querySelectorAll("[data-k]").forEach(
        (b) =>
          (b.onclick = () => {
            app.capLane = +b.dataset.k;
            app.openConfig("keys");
          }),
      );
      app.$("keysReset").onclick = () => {
        app.KEYS = app.DEFK.slice();
        app.capLane = -1;
        try {
          localStorage.ob_keys = JSON.stringify(app.KEYS);
        } catch (e) {}
        app.applyKeys();
        app.openConfig("keys");
      };
    }
    if (kind === "arena") {
      title.textContent = "ARENA";
      const sl = (v) => (app.environment === v ? " sel" : "");
      box.innerHTML = `<canvas id="arenaPrev" width="320" height="120" style="width:100%;height:auto;border-radius:12px;display:block;margin-bottom:10px;border:1px solid #ffffff22"></canvas><div class="cfggrid"><button class="cfgbtn${sl("leaves")}" id="envLeaves">🍃 HOJAS</button><button class="cfgbtn${sl("rain")}" id="envRain">🌧 LLUVIA</button><button class="cfgbtn${sl("storm")}" id="envStorm">⛈ TORMENTA</button><button class="cfgbtn${sl("snow")}" id="envSnow">❄ NIEVE</button><button class="cfgbtn${sl("wind")}" id="envWind">💨 VIENTO</button><button class="cfgbtn${sl("off")}" id="envOff">∅ NADA</button></div>`;
      [
        ["envLeaves", "leaves"],
        ["envRain", "rain"],
        ["envStorm", "storm"],
        ["envSnow", "snow"],
        ["envWind", "wind"],
        ["envOff", "off"],
      ].forEach(
        ([id, v]) =>
          (app.$(id).onclick = () => {
            app.environment = v;
            try {
              localStorage.ob_env = v;
            } catch (e) {}
            app.openConfig("arena");
          }),
      );
      app.arenaPreview();
    }
    if (kind === "audio") {
      title.textContent = "SONIDO Y MÚSICA";
      box.innerHTML = `<div class="cfggrid"><button class="cfgbtn" id="musicToggle">MÚSICA: ${app.musOn ? "ON" : "OFF"}</button><button class="cfgbtn" id="sfxToggle">EFECTOS: ${app.sfxOn ? "ON" : "OFF"}</button><button class="cfgbtn" id="musicFile">CARGAR MI MÚSICA</button><button class="cfgbtn" id="soundFile">CARGAR SONIDOS</button><button class="cfgbtn" id="testVoice">PROBAR VOCES</button><button class="cfgbtn" id="testFx">PROBAR EFECTOS</button></div><div class="vol"><label>🔊 GENERAL <b id="vmV">${Math.round(app.VOL.m * 100)}</b>%</label><input type="range" id="vm" min="0" max="100" value="${Math.round(app.VOL.m * 100)}"><label>🎵 MÚSICA <b id="vmusV">${Math.round(app.VOL.mus * 100)}</b>%</label><input type="range" id="vmus" min="0" max="100" value="${Math.round(app.VOL.mus * 100)}"><label>💥 EFECTOS Y VOCES <b id="vsfxV">${Math.round(app.VOL.sfx * 100)}</b>%</label><input type="range" id="vsfx" min="0" max="100" value="${Math.round(app.VOL.sfx * 100)}"></div><p id="audioHelp" style="font-size:12px;color:#cbd8c4">Si el sitio incluye <b>sonidos.zip</b>, se carga solo al abrir el juego. También puedes cargar tus propios archivos; se guardan en este navegador. No se incluye música protegida por copyright.</p>`;
      [
        ["vm", "m", "vmV"],
        ["vmus", "mus", "vmusV"],
        ["vsfx", "sfx", "vsfxV"],
      ].forEach(([id, k, lb]) => {
        const el = app.$(id);
        el.oninput = () => {
          app.VOL[k] = el.value / 100;
          app.$(lb).textContent = el.value;
          app.applyVol();
          try {
            localStorage.ob_vol = JSON.stringify(app.VOL);
          } catch (e) {}
        };
        el.onchange = () => {
          app.au();
          try {
            app.S.click();
          } catch (e) {}
        };
      });
      app.$("musicToggle").onclick = () => {
        app.au();
        app.musOn = !app.musOn;
        app.musicSync();
        app.openConfig("audio");
      };
      app.$("sfxToggle").onclick = () => {
        app.au();
        app.sfxOn = !app.sfxOn;
        app.openConfig("audio");
      };
      app.$("musicFile").onclick = () => app.$("fi").click();
      app.$("soundFile").onclick = () => app.$("kf").click();
      app.$("testVoice").onclick = () => {
        app.au();
        const keys = app.CK.concat([
          "breaker",
          "ready",
          "fight",
          "supr",
          "vict",
          "over",
          "perfect",
          "sfperfect",
          "voice",
          "welcome",
        ]).filter((x) => app.VB[x]);
        if (keys.length)
          app.voice(keys[Math.floor(Math.random() * keys.length)]);
      };
      app.$("testFx").onclick = () => app.xtest();
    }
    if (kind === "hud") {
      title.textContent = "CONFIGURACIÓN DEL HUD";
      box.innerHTML = `<div class="cfggrid"><button class="cfgbtn ${app.hudMode === 0 ? "sel" : ""}" id="hudClassic">HUD 1 · CLÁSICO</button><button class="cfgbtn ${app.hudMode === 1 ? "sel" : ""}" id="hudSides">HUD 2 · LATERAL</button><button class="cfgbtn ${app.hudMode === 2 ? "sel" : ""}" id="hudFeet">HUD 3 · BAJO LOS PIES</button></div><div class="preview"><b>VISTA PREVIA</b><div style="display:flex;justify-content:space-between;gap:8px;margin-top:10px"><div style="width:38%;height:12px;background:#baff55"></div><div style="width:38%;height:12px;background:#ff5c7a"></div></div><p style="font-size:11px;color:#cbd8c4">La vista previa representa la distribución seleccionada; durante el combate se actualizan vida y energía en tiempo real.</p></div>`;
      [
        ["hudClassic", 0],
        ["hudSides", 1],
        ["hudFeet", 2],
      ].forEach(
        ([id, v]) =>
          (app.$(id).onclick = () => {
            app.hudMode = v;
            try {
              localStorage.ob_hud = v;
            } catch (e) {}
            app.openConfig("hud");
          }),
      );
    }
  };
  return function initialize() {
    app.$("pl").onclick = () => {
      app.au();
      app.$("how").style.display = "none";
      app.S.click();
      app.newMatch();
    };
    app.$("settingsBtn").onclick = () => {
      app.$("settingsPanel").classList.add("show");
    };
    app.$("closeSettings").onclick = () => {
      app.$("settingsPanel").classList.remove("show");
    };
    app.PV = { p: null, e: null, t: 0.3, turn: 0, d: 0, def: null, dm: "hurt" };
    app.$("editBtn").onclick = () => {
      app.$("editPanel").classList.add("show");
      app.markSw();
      app.stickPreview();
    };
    app.$("closeEdit").onclick = () => {
      app.$("editPanel").classList.remove("show");
    };
    app.palette = [
      "#69ff36",
      "#e9d63a",
      "#101510",
      "#f3f3e8",
      "#36d9a0",
      "#b6ff38",
      "#ffffff",
      "#8c8c8c",
    ];
    app.$("stickPreview").style.setProperty("--stick", app.playerColor);
    app.$("swatches").innerHTML = app.palette
      .map(
        (c) =>
          '<button class="swatch" data-color="' +
          c +
          '" style="background:' +
          c +
          '" aria-label="Color ' +
          c +
          '"></button>',
      )
      .join("");
    app.$("swatches").addEventListener("click", (e) => {
      const b = e.target.closest("[data-color]");
      if (!b) return;
      app.playerColor = b.dataset.color;
      app.$("stickPreview").style.setProperty("--stick", app.playerColor);
      app.$("colorPreviewName").textContent =
        "Vista previa: " + app.playerColor;
      try {
        localStorage.ob_color = app.playerColor;
      } catch (_) {}
      if (app.R && app.R.p) {
        app.R.p.col = app.playerColor;
        app.R.p.dk = "#173d12";
      }
      app.DM.p.col = app.playerColor;
      app.markSw();
    });
    app.$("hb").onclick = () => {
      app.S.click();
      app.$("how").style.display = "none";
      app.$("configHub").classList.remove("show");
    };
    app.cfgKind = "";
    app.$("fightModeBtn").onclick = () => {
      app.gameMode = "fight";
      app.$("fightModeBtn").classList.add("sel");
      app.$("survivalModeBtn").classList.remove("sel");
    };
    app.$("survivalModeBtn").onclick = () => {
      app.gameMode = "survival";
      app.$("survivalModeBtn").classList.add("sel");
      app.$("fightModeBtn").classList.remove("sel");
    };
    app.$("arenaBtn").onclick = () => app.openConfig("arena");
    app.$("audioBtn").onclick = () => app.openConfig("audio");
    app.$("hudBtn").onclick = () => app.openConfig("hud");
    app.$("cfgBack").onclick = () => {
      if (app.cfgKind && app.cfgKind !== "menu") app.openConfig("menu");
      else app.$("configHub").classList.remove("show");
    };
    app.$("gearBtn").onclick = () => {
      app.au();
      app.S.click();
      app.openConfig("menu");
    };
    app.$("helpBtn").onclick = () => {
      app.au();
      app.$("howBtn").click();
    };
    app.$("configHub").addEventListener(
      "pointerup",
      (e) => {
        const b = e.target.closest("button");
        if (!b) return;
        e.preventDefault();
        e.stopPropagation();
        b.click();
      },
      { capture: true },
    );
    app.$("howBtn").onclick = () => {
      app.$("how").style.display = "flex";
      app.$("configHub").classList.remove("show");
      app.$("settingsPanel").classList.remove("show");
      app.$("editPanel").classList.remove("show");
    };
    app.syncUI = () => {
      document
        .querySelectorAll("[data-d]")
        .forEach((b) => b.classList.toggle("sel", +b.dataset.d === app.diff));
    };
    document.querySelectorAll("[data-d]").forEach(
      (b) =>
        (b.onclick = () => {
          app.au();
          app.diff = +b.dataset.d;
          try {
            localStorage.ob_diff = app.diff;
          } catch (e) {}
          app.S.click();
          app.syncUI();
        }),
    );
    app.$("fi").onchange = async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      try {
        if (f.size > IMPORT_LIMITS.file)
          throw new Error("Música demasiado grande");
        app.au();
        if (!app.AC) throw new Error("Audio no disponible");
        const bytes = await f.arrayBuffer();
        validateAudio(bytes);
        const decoded = await app.AC.decodeAudioData(bytes.slice(0));
        if (decoded.duration > IMPORT_LIMITS.duration)
          throw new Error("La música supera 10 minutos");
        app.replaceAudioSource(app.$("am"), f);
        app.$("am").volume = 0.7;
        app.$("am").dataset.bv = 0.7;
        app.custom = 1;
        app.musOn = true;
        app.musicSync();
      } catch (error) {
        console.warn(error);
        alert(error.message);
      }
    };
    app.$("kf").onchange = (e) =>
      app.loadVoices([...e.target.files]).catch((error) => {
        console.warn(error);
        alert(error.message);
      });
    app.syncUI();
  };
}
