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
    app.PV.p = app.mkF(1, app.playerColor, app.darken(app.playerColor));
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
      app.PV.p.dk = app.darken(app.playerColor);
      app.PV.t -= dt;
      if (app.PV.t <= 0) {
        app.PV.t = 0.9 + Math.random() * 0.4;
        const a = app.PV.turn++ % 2 ? app.PV.e : app.PV.p,
          d = a === app.PV.p ? app.PV.e : app.PV.p;
        const lane = Math.floor(Math.random() * 4);
        a.an = app.MOVES[lane];
        a.at = 0;
        // El rival reacciona (o se cubre) cuando el golpe conecta.
        app.PV.d = app.impactDelay(a) || 0.01;
        app.PV.def = d;
        app.PV.lane = lane;
        app.PV.dm = Math.random() < 0.5 ? "hurt" : "block";
      }
      if (app.PV.d > 0) {
        app.PV.d -= dt;
        if (app.PV.d <= 0) {
          app.PV.def.an =
            app.PV.dm === "hurt" ? app.reactionAnimation(app.PV.def, app.PV.lane) : "block";
          app.PV.def.at = 0;
          app.PV.def.fl = app.PV.dm === "hurt" ? app.flashTime(app.PV.def) : 0;
        }
      }
      for (const f of [app.PV.p, app.PV.e]) app.stepFighter(f, dt, dt);
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
    // Los mismos luchadores del juego (estilo y color reales), no dibujos aparte.
    const AV = {
      p: app.mkF(1, app.playerColor, app.darken(app.playerColor)),
      e: app.mkF(-1, "#ff5c7a", "#b03050"),
      last: t0,
      next: 1.2,
      turn: 0,
    };
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
      {
        const now = performance.now(),
          dt = Math.min(0.05, (now - AV.last) / 1000);
        AV.last = now;
        AV.p.col = app.playerColor;
        AV.p.dk = app.darken(app.playerColor);
        AV.next -= dt;
        if (AV.next <= 0) {
          AV.next = 1.6;
          const attacker = AV.turn++ % 2 ? AV.e : AV.p;
          attacker.an = app.MOVES[Math.floor(Math.random() * 4)];
          attacker.at = 0;
        }
        for (const f of [AV.p, AV.e]) app.stepFighter(f, dt, dt);
        const s = Math.max(0.45, h / 175),
          gy = h * 0.78;
        AV.p.x = w / 2 - 48 * s;
        AV.e.x = w / 2 + 48 * s;
        app.drawF(AV.e, 0, gy, s, x);
        app.drawF(AV.p, 0, gy, s, x);
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
      box.innerHTML = `<div class="cfggrid"><button class="cfgbtn" data-go="editBtn">🎨 STICKMAN</button><button class="cfgbtn" data-go="profile">👤 PERFIL</button><button class="cfgbtn" data-go="history">HISTORIAL</button><button class="cfgbtn" data-go="settingsBtn">⚔ DIFICULTAD</button><button class="cfgbtn" data-go="arena">🌧 ARENA</button><button class="cfgbtn" data-go="audio">🔊 SONIDO</button><button class="cfgbtn" data-go="hud">▥ HUD</button><button class="cfgbtn" data-go="keys">⌨ TECLAS (PC)</button><button class="cfgbtn" data-go="howBtn">! CÓMO JUGAR</button></div>`;
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
 
    if (kind === "profile") {
      title.textContent = "MI PERFIL";

      box.innerHTML = `
        <div style="padding:12px;color:#d8ffd0;display:grid;gap:14px">

          <section style="padding:14px;border:1px solid #42634a;border-radius:10px;background:#101b14">
            <p id="profileStatus" style="margin:0 0 12px;color:#9fd6a5;font-size:12px">
              Consultando cuenta...
            </p>

            <label for="profileAlias" style="font-weight:bold;font-size:12px">
              ALIAS PÚBLICO
            </label>

            <input
              id="profileAlias"
              type="text"
              minlength="3"
              maxlength="20"
              placeholder="Ejemplo: ShadowX"
              autocomplete="nickname"
              style="width:100%;box-sizing:border-box;padding:11px;margin:8px 0;border-radius:7px"
            >

            <p style="font-size:11px;color:#a9bcae;margin:3px 0 10px">
              Entre 3 y 20 caracteres. Letras, números y guion bajo.
            </p>

            <button class="cfgbtn" id="profileSave" style="width:100%">
              GUARDAR ALIAS
            </button>

            <p id="profileMessage" role="status" style="font-size:12px"></p>
          </section>

          <section>
            <h3 style="margin:0 0 10px;font-size:14px;color:#9ff58d">
              RESUMEN DE RENDIMIENTO
            </h3>

            <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px">

              <div style="padding:12px;background:#17251b;border:1px solid #304536;border-radius:8px">
                <small style="color:#a9bcae">PARTIDAS</small>
                <div data-stat="total" style="font-size:24px;font-weight:bold">—</div>
              </div>

              <div style="padding:12px;background:#17251b;border:1px solid #304536;border-radius:8px">
                <small style="color:#a9bcae">VICTORIAS</small>
                <div data-stat="wins" style="font-size:24px;font-weight:bold;color:#72e69a">—</div>
              </div>

              <div style="padding:12px;background:#17251b;border:1px solid #304536;border-radius:8px">
                <small style="color:#a9bcae">DERROTAS</small>
                <div data-stat="losses" style="font-size:24px;font-weight:bold;color:#ff7777">—</div>
              </div>

              <div style="padding:12px;background:#17251b;border:1px solid #304536;border-radius:8px">
                <small style="color:#a9bcae">ABANDONOS</small>
                <div data-stat="abandoned" style="font-size:24px;font-weight:bold;color:#eab96b">—</div>
              </div>

              <div style="padding:12px;background:#17251b;border:1px solid #304536;border-radius:8px">
                <small style="color:#a9bcae">EMPATES</small>
                <div data-stat="draws" style="font-size:24px;font-weight:bold">—</div>
              </div>

              <div style="padding:12px;background:#17251b;border:1px solid #304536;border-radius:8px">
                <small style="color:#a9bcae">VICTORIAS</small>
                <div data-stat="winRate" style="font-size:24px;font-weight:bold;color:#9ff58d">—%</div>
                <small style="color:#a9bcae">Porcentaje</small>
              </div>

            </div>
          </section>

          <section style="padding:12px;border:1px solid #42634a;border-radius:9px;background:#101b14">
            <small style="color:#a9bcae">MEJOR PUNTUACIÓN GENERAL</small>
            <div data-stat="bestScore" style="font-size:27px;font-weight:bold;color:#ffffff;margin-top:4px">—</div>
            <small style="color:#a9bcae">Puntos</small>
          </section>

          <section>
            <h3 style="margin:0 0 10px;font-size:14px;color:#9ff58d">
              ACTIVIDAD POR MODO
            </h3>
            <div data-profile-modes style="display:grid;gap:8px">
              <p style="color:#a9bcae;font-size:12px">Consultando estadísticas...</p>
            </div>
          </section>

        </div>
      `;

      const status = app.$("profileStatus");
      const aliasInput = app.$("profileAlias");
      const message = app.$("profileMessage");
      const save = app.$("profileSave");
      const modeList = box.querySelector("[data-profile-modes]");

      save.disabled = true;

      if (app.auth?.status !== "ready" || !app.auth.user) {
        status.textContent =
          app.auth?.status === "pending"
            ? "La cuenta todavía está iniciando. Vuelve a abrir PERFIL en unos segundos."
            : "No se pudo conectar con la cuenta. Comprueba tu conexión.";
        modeList.textContent = "Estadísticas no disponibles.";
        return;
      }

      status.textContent = app.auth.isGuest
        ? "CUENTA DE INVITADO"
        : "CUENTA VINCULADA";

      const numberFormat = (value) =>
        Number(value || 0).toLocaleString("es-CL");

      import("../services/profile.js")
        .then(async ({ getMyProfile, setMyDisplayName }) => {
          const profile = await getMyProfile();

          aliasInput.value = profile.display_name ?? "";
          save.disabled = false;

          save.onclick = async () => {
            save.disabled = true;
            message.textContent = "Guardando alias...";

            try {
              const updated = await setMyDisplayName(aliasInput.value);
              aliasInput.value = updated.display_name;
              message.textContent = "Alias guardado correctamente.";
            } catch (error) {
              message.textContent =
                error.code === "23505"
                  ? "Ese alias ya está ocupado. Prueba otro."
                  : error.message || "No se pudo guardar el alias.";
            } finally {
              save.disabled = false;
            }
          };
        })
        .catch((error) => {
          status.textContent = "No se pudo cargar el perfil.";
          message.textContent = error.message;
        });

      import("../services/history.js")
        .then(({ getMyProfileStatistics }) =>
          getMyProfileStatistics()
        )
        .then((stats) => {
          const values = {
            total: stats.total,
            wins: stats.wins,
            losses: stats.losses,
            abandoned: stats.abandoned,
            draws: stats.draws,
            winRate: `${stats.winRate}%`,
            bestScore: numberFormat(stats.bestScore),
          };

          Object.entries(values).forEach(([key, value]) => {
            const element = box.querySelector(`[data-stat="${key}"]`);
            if (element) element.textContent = value;
          });

          const labels = {
            fight: "COMBATE",
            survival: "SUPERVIVENCIA",
            pvp: "PVP",
          };

          modeList.innerHTML = "";

          stats.modes.forEach((mode) => {
            const card = document.createElement("article");
            card.style.cssText =
              "padding:12px;border:1px solid #304536;border-radius:8px;background:#101b14;display:grid;gap:6px";

            const heading = document.createElement("strong");
            heading.textContent = labels[mode.mode] || mode.mode.toUpperCase();
            heading.style.color = "#9ff58d";

            const details = document.createElement("div");
            details.style.cssText =
              "display:flex;flex-wrap:wrap;gap:12px;font-size:12px;color:#cbd8c4";

            [
              `Partidas: ${numberFormat(mode.played)}`,
              `Victorias: ${numberFormat(mode.wins)}`,
              `Derrotas: ${numberFormat(mode.losses)}`,
              `Abandonos: ${numberFormat(mode.abandoned)}`,
            ].forEach((text) => {
              const item = document.createElement("span");
              item.textContent = text;
              details.append(item);
            });

            const best = document.createElement("small");
            best.style.color = "#a9bcae";
            best.textContent =
              `Mejor puntuación: ${numberFormat(mode.bestScore)}`;

            card.append(heading, details, best);
            modeList.append(card);
          });
        })
        .catch((error) => {
          modeList.textContent =
            "No se pudieron cargar las estadísticas. Inténtalo nuevamente.";
          console.error(
            "OVERBREAKER: error al cargar estadísticas:",
            error,
          );
        });
    }
    if (kind === "history") {
      title.textContent = "HISTORIAL DE PARTIDAS";

      box.innerHTML = `
        <div style="padding:12px;color:#d8ffd0">
          <p data-history-status>Consultando partidas...</p>
          <div data-history-filters style="display:flex;gap:6px;flex-wrap:wrap;margin:10px 0"></div>
          <div data-history-list style="display:grid;gap:5px"></div>
        </div>
      `;

      const status = box.querySelector("[data-history-status]");
      const filters = box.querySelector("[data-history-filters]");
      const list = box.querySelector("[data-history-list]");

      if (app.auth?.status !== "ready" || !app.auth.user) {
        status.textContent =
          "La cuenta todavía no está disponible. Comprueba la conexión y vuelve a abrir el historial.";
        return;
      }

      import("../services/history.js")
        .then(({ getMyMatchHistory }) => getMyMatchHistory(100))
        .then((matches) => {
          if (!matches.length) {
            status.textContent = "Todavía no hay partidas registradas.";
            return;
          }

          const modeLabels = {
            all: "TODAS",
            fight: "COMBATE",
            survival: "SUPERVIVENCIA",
            pvp: "PVP",
          };

          const resultLabels = {
            win: "VICTORIA",
            loss: "DERROTA",
            draw: "EMPATE",
            abandoned: "ABANDONADA",
          };

          const resultColors = {
            win: "#72e69a",
            loss: "#ff7777",
            draw: "#f2d477",
            abandoned: "#eab96b",
          };

          let selectedMode = "all";

          function renderHistory() {
            const visibleMatches = selectedMode === "all"
              ? matches
              : matches.filter((match) => match.game_mode === selectedMode);

            status.textContent =
              `${visibleMatches.length} de ${matches.length} partidas`;

            list.innerHTML = "";

            if (!visibleMatches.length) {
              list.textContent = "No hay partidas registradas en este modo.";
              return;
            }

            visibleMatches.forEach((match) => {
              const card = document.createElement("article");
              card.style.cssText =
                "padding:8px 10px;border:1px solid #304536;border-radius:7px;background:#101b14;display:grid;gap:4px";

              const header = document.createElement("div");
              header.style.cssText =
                "display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;font-size:12px";

              const mode = document.createElement("strong");
              mode.textContent = modeLabels[match.game_mode] || "PARTIDA";

              const result = document.createElement("strong");
              result.textContent =
                resultLabels[match.result] || match.result.toUpperCase();
              result.style.color = resultColors[match.result] || "#ffffff";

              header.append(mode, result);

              const score = document.createElement("div");
              score.style.cssText =
                "font-size:17px;font-weight:bold;color:#ffffff";
              score.textContent =
                `${Number(match.score || 0).toLocaleString("es-CL")} PUNTOS`;

              const duration = Math.max(
                0,
                Math.floor(Number(match.duration_seconds) || 0),
              );
              const minutes = Math.floor(duration / 60);
              const seconds = String(duration % 60).padStart(2, "0");

              const date = new Date(match.created_at);
              const dateText = Number.isNaN(date.getTime())
                ? "Fecha no disponible"
                : date.toLocaleString("es-CL");

              const details = document.createElement("small");
              details.style.cssText = "color:#a9bcae;font-size:11px";
              details.textContent =
                `${dateText} · Duración: ${minutes}:${seconds}`;

              card.append(header, score, details);
              list.append(card);
            });
          }

          Object.entries(modeLabels).forEach(([mode, label]) => {
            const button = document.createElement("button");
            button.type = "button";
            button.textContent = label;
            button.style.cssText =
              "padding:7px 10px;border:1px solid #42634a;border-radius:6px;background:#17251b;color:#d8ffd0;font-size:11px;font-weight:bold;cursor:pointer";

            button.addEventListener("click", () => {
              selectedMode = mode;

              filters.querySelectorAll("button").forEach((item) => {
                item.style.background =
                  item === button ? "#315d3c" : "#17251b";
                item.style.borderColor =
                  item === button ? "#72e69a" : "#42634a";
              });

              renderHistory();
            });

            filters.append(button);
          });

          filters.querySelector("button").click();
        })
        .catch((error) => {
          status.textContent =
            "No se pudo cargar el historial. Inténtalo nuevamente.";
          console.error("OVERBREAKER: error al cargar el historial:", error);
        });

      return;
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
    // Cambia el color del luchador desde las muestras o desde el selector libre.
    app.setPlayerColor = function setPlayerColor(color) {
      if (!/^#[0-9a-f]{6}$/i.test(color)) return false;
      app.playerColor = color;
      app.$("stickPreview").style.setProperty("--stick", color);
      app.$("colorPreviewName").textContent = "Vista previa: " + color;
      const pick = app.$("colorPick");
      if (pick) pick.value = color;
      try {
        localStorage.ob_color = color;
      } catch (_) {}
      if (app.R && app.R.p) {
        app.R.p.col = color;
        app.R.p.dk = app.darken(color);
      }
      if (app.DM && app.DM.p) {
        app.DM.p.col = color;
        app.DM.p.dk = app.darken(color);
      }
      app.markSw();
      return true;
    };
    app.$("swatches").addEventListener("click", (e) => {
      const b = e.target.closest("[data-color]");
      if (b) app.setPlayerColor(b.dataset.color);
    });
    app.$("colorPick").value = app.playerColor;
    app.$("colorPick").addEventListener("input", (e) => app.setPlayerColor(e.target.value));
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
