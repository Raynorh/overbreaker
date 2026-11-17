// Installs this system into one application instance; initialization is deferred.
export function install(app) {
  app.bar = function bar(x, y, w, h, v, c, rev) {
    app.g.fillStyle = "#000a";
    app.g.fillRect(x, y, w, h);
    app.g.fillStyle = c;
    const ww = w * Math.max(0, Math.min(1, v));
    app.g.fillRect(rev ? x + w - ww : x, y, ww, h);
  };
  app.hud = function hud() {
    const bw = Math.min(app.W * 0.4, 300),
      fs = Math.max(11, Math.min(15, app.W / 32)),
      p = app.R.p,
      e = app.R.e,
      pl = 0.5 + 0.5 * Math.sin(app.clock * 9);
    if (app.hudMode === 0) {
      app.bar(8, 8, bw, 16, p.hp / 100, p.bars > 1 ? "#3ddc84" : "#baff55");
      app.meter(8, 28, bw, 11, app.R.en / 100, "en");
      app.meter(8, 42, bw, 10, app.R.prot / 100, "pr");
      if (app.gameMode !== "survival") {
        app.bar(
          app.W - 8 - bw,
          8,
          bw,
          16,
          e.hp / 100,
          e.bars > 1 ? "#ff5c7a" : "#ff2d55",
          1,
        );
        app.bar(app.W - 8 - bw, 28, bw, 9, app.R.pr / 100, "#ff4d6d", 1);
      }
    } else if (app.hudMode === 1) {
      const side = Math.min(110, app.W * 0.19),
        y = app.H * 0.27,
        hh = Math.min(220, app.H * 0.3);
      app.bar(8, y, side, 13, p.hp / 100, "#baff55");
      app.meter(8, y + 18, side, 11, app.R.en / 100, "en");
      app.meter(8, y + 32, side, 10, app.R.prot / 100, "pr");
      if (app.gameMode !== "survival") {
        app.bar(app.W - 8 - side, y, side, 13, e.hp / 100, "#ff5c7a", 1);
        app.bar(
          app.W - 8 - side,
          y + 18,
          side,
          8,
          app.R.pr / 100,
          "#ff4d6d",
          1,
        );
      }
      app.tx("TÚ", 8, y - 7, 9, "#fff", "left");
      app.tx("RIVAL", app.W - 8, y - 7, 9, "#fff", "right");
    } else {
      const y = Math.min(app.H * 0.77, app.HY() - app.BH() - 12),
        w = Math.min(app.W * 0.34, 220);
      app.bar(8, y, w, 12, p.hp / 100, "#baff55");
      app.meter(8, y + 16, w, 10, app.R.en / 100, "en");
      app.meter(8, y + 29, w, 9, app.R.prot / 100, "pr");
      if (app.gameMode !== "survival") {
        app.bar(app.W - 8 - w, y, w, 12, e.hp / 100, "#ff5c7a", 1);
        app.bar(app.W - 8 - w, y + 16, w, 7, app.R.pr / 100, "#ff4d6d", 1);
      }
    }
    app.tx("♥", 12, 21, 11, "#000", "left");
    if (app.hudMode === 0 && app.gameMode !== "survival")
      app.icoFlame(
        app.W - 8 - Math.min(app.W * 0.4, 300) - 9,
        33,
        6,
        "#ff4d6d",
      );
    app.tx(
      app.gameMode === "survival"
        ? "♥".repeat(p.bars) + "  ·  SUPERVIVENCIA"
        : "♥".repeat(p.bars) + "  VS  " + "♥".repeat(e.bars),
      app.W / 2,
      18,
      fs,
      "#fff",
    );
    app.tx(Math.floor(app.R.t) + "s", app.W / 2, 36, fs, "#aaa");
    app.g.fillStyle = "#ffffff22";
    app.g.fillRect(app.W / 2 - 20, 44, 40, 26);
    app.g.strokeStyle = "#fff6";
    app.g.strokeRect(app.W / 2 - 20, 44, 40, 26);
    app.g.fillStyle = "#fff";
    app.g.fillRect(app.W / 2 - 6, 50, 4, 14);
    app.g.fillRect(app.W / 2 + 2, 50, 4, 14);
    if (app.gameMode === "survival") {
      app.tx(
        "SUPERVIVENCIA · " + Math.floor(app.M.score) + " PTS",
        app.W / 2,
        app.LT() - 46,
        Math.min(15, app.W / 24),
        "#baff55",
      );
      app.tx(
        "VELOCIDAD x" + (app.R.rate / 0.55).toFixed(2),
        app.W / 2,
        app.LT() - 30,
        Math.min(11, app.W / 28),
        "#fff",
      );
    }
    if (app.R.intro > 0) {
      const rd = app.R.intro > 0.7;
      app.tx(
        rd ? "READY" : "¡FIGHT!",
        app.W / 2,
        app.lay === "mid" ? app.H * 0.3 : app.AH * 0.42,
        Math.min(app.W / 5, 78) * (1 + 0.08 * Math.sin(app.clock * 14)),
        rd ? "#ffd23f" : "#ff4d6d",
      );
      app.tx(
        ["FÁCIL", "NORMAL", "DIFÍCIL", "EXPERTO", "MAESTRO", "LEYENDA"][
          app.diff
        ],
        app.W / 2,
        (app.lay === "mid" ? app.H * 0.3 : app.AH * 0.42) + 34,
        14,
        app.PIPC[app.diff],
      );
    }
    app.tx(
      Math.floor(app.M.score) +
        "  x" +
        app.R.mul.toFixed(1) +
        "  COMBO " +
        app.R.cb,
      app.W / 2,
      app.LT() - 10,
      fs,
      "#fff",
    );
    app.bar(
      app.W / 2 - 58,
      app.LT() + 2,
      116,
      5,
      app.R.chainBar / 10,
      app.R.chainReady ? "#ffad55" : "#baff55",
    );
    if (app.R.fin) {
      const F = app.R.fin;
      app.bar(
        8,
        app.LT() - 34,
        Math.min(200, app.W - 160),
        10,
        1 - (F.hit + F.miss) / F.tot,
        "#ffd23f",
      );
      app.tx(
        "ULTRA COMBO  " + F.hit + " / " + F.tot,
        8,
        app.LT() - 40,
        fs,
        "#ffd23f",
        "left",
      );
      if (app.R.t < F.t0) {
        const yy = app.lay === "mid" ? app.H * 0.3 : app.AH * 0.42;
        app.tx(
          "¡ULTRA COMBO!",
          app.W / 2,
          yy,
          Math.min(app.W / 9, 42) * (1 + 0.04 * Math.sin(app.clock * 14)),
          "#ffd23f",
        );
        app.tx(
          "Ráfaga de golpes · termina con ¡REMATA!",
          app.W / 2,
          yy + 24,
          Math.min(14, app.W / 26),
          "#fff",
        );
      }
    }

    const ready = app.R.am >= 100 && app.R.adr <= 0,
      b = app.adrB();
    app.g.save();
    app.g.beginPath();
    app.g.arc(b.x + b.w / 2, b.y + b.h / 2, b.w * 0.46, 0, 6.283);
    app.g.fillStyle =
      app.R.adr > 0
        ? "#dfff55"
        : ready
          ? pl > 0.5
            ? "#caff48"
            : "#e9d63a"
          : "#10220d";
    app.g.fill();
    app.g.lineWidth = 3;
    app.g.strokeStyle = ready ? "#fff" : "#68a95a";
    app.g.stroke();
    app.g.fillStyle = ready || app.R.adr > 0 ? "#071300" : "#9dbb94";
    app.g.beginPath();
    app.g.moveTo(b.x + 22, b.y + 5);
    app.g.lineTo(b.x + 12, b.y + 22);
    app.g.lineTo(b.x + 20, b.y + 22);
    app.g.lineTo(b.x + 17, b.y + 38);
    app.g.lineTo(b.x + 31, b.y + 18);
    app.g.lineTo(b.x + 23, b.y + 18);
    app.g.closePath();
    app.g.fill();
    app.g.restore();
    if (app.R.breaker) {
      const B = app.R.breaker,
        cx = app.W / 2,
        cy = app.LT() + 64;
      app.g.save();
      app.g.shadowColor = "#baff55";
      app.g.shadowBlur = 14;
      for (let i = 0; i < B.total; i++) {
        app.g.beginPath();
        app.g.arc(cx + (i - 2) * 30, cy, 10, 0, 6.29);
        app.g.fillStyle = B.ready || i < B.step ? "#caff75" : "#000000aa";
        app.g.fill();
        app.g.strokeStyle = "#caff75";
        app.g.lineWidth = 3;
        app.g.stroke();
      }
      if (!B.ready) {
        app.g.fillStyle = "#caff75";
        app.g.fillRect(
          cx - 75,
          cy + 17,
          150 * Math.max(0, 1 - B.t / B.window),
          6,
        );
        app.g.strokeStyle = "#caff7599";
        app.g.lineWidth = 1;
        app.g.strokeRect(cx - 75.5, cy + 16.5, 151, 7);
      }
      app.g.restore();
    }
  };
  app.icoSword = function icoSword(x, y, s, c) {
    app.g.save();
    app.g.translate(x, y);
    app.g.strokeStyle = c;
    app.g.lineWidth = Math.max(1.6, s * 0.22);
    app.g.lineCap = "round";
    app.g.beginPath();
    app.g.moveTo(-s * 0.75, s * 0.75);
    app.g.lineTo(s * 0.7, -s * 0.7);
    app.g.stroke();
    app.g.beginPath();
    app.g.moveTo(-s * 0.5, 0);
    app.g.lineTo(0, s * 0.5);
    app.g.stroke();
    app.g.restore();
  };
  app.icoShield = function icoShield(x, y, s, c) {
    app.g.save();
    app.g.translate(x, y);
    app.g.beginPath();
    app.g.moveTo(0, -s);
    app.g.lineTo(s * 0.8, -s * 0.6);
    app.g.lineTo(s * 0.7, s * 0.2);
    app.g.quadraticCurveTo(s * 0.4, s * 0.8, 0, s);
    app.g.quadraticCurveTo(-s * 0.4, s * 0.8, -s * 0.7, s * 0.2);
    app.g.lineTo(-s * 0.8, -s * 0.6);
    app.g.closePath();
    app.g.lineWidth = 1.6;
    app.g.strokeStyle = "#000b";
    app.g.stroke();
    app.g.fillStyle = c;
    app.g.fill();
    app.g.restore();
  };
  app.icoStar = function icoStar(x, y, s, c) {
    app.g.save();
    app.g.translate(x, y);
    app.g.strokeStyle = c;
    app.g.lineWidth = Math.max(1.5, s * 0.2);
    app.g.lineCap = "round";
    app.g.beginPath();
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 4;
      app.g.moveTo(Math.cos(a) * s, Math.sin(a) * s);
      app.g.lineTo(-Math.cos(a) * s, -Math.sin(a) * s);
    }
    app.g.stroke();
    app.g.restore();
  };
  app.icoFlame = function icoFlame(x, y, s, c) {
    app.g.save();
    app.g.translate(x, y);
    app.g.beginPath();
    app.g.moveTo(0, -s);
    app.g.quadraticCurveTo(s * 0.9, -s * 0.1, s * 0.6, s * 0.5);
    app.g.quadraticCurveTo(0, s * 1.2, -s * 0.6, s * 0.5);
    app.g.quadraticCurveTo(-s * 0.8, -s * 0.1, 0, -s);
    app.g.closePath();
    app.g.lineWidth = 1.4;
    app.g.strokeStyle = "#000b";
    app.g.stroke();
    app.g.fillStyle = c;
    app.g.fill();
    app.g.restore();
  };
  app.icoBolt = function icoBolt(x, y, s, c) {
    app.g.save();
    app.g.translate(x, y);
    app.g.beginPath();
    app.g.moveTo(s * 0.25, -s);
    app.g.lineTo(-s * 0.6, s * 0.15);
    app.g.lineTo(-s * 0.05, s * 0.15);
    app.g.lineTo(-s * 0.25, s);
    app.g.lineTo(s * 0.65, -s * 0.2);
    app.g.lineTo(s * 0.05, -s * 0.2);
    app.g.closePath();
    app.g.lineWidth = 1.6;
    app.g.strokeStyle = "#000b";
    app.g.stroke();
    app.g.fillStyle = c;
    app.g.fill();
    app.g.restore();
  };
  app.meter = function meter(x, y, w, h, v, kind, rev) {
    const en = kind === "en",
      col = en
        ? app.R.ex > 0
          ? "#777"
          : app.R.guard
            ? "#5ce1ff"
            : "#e9d63a"
        : "#72ef48";
    v = Math.max(0, Math.min(1, v));
    app.g.fillStyle = "#000a";
    app.g.fillRect(x, y, w, h);
    app.g.fillStyle = col;
    const ww = w * v;
    app.g.fillRect(rev ? x + w - ww : x, y, ww, h);
    if (v < 0.25) {
      app.g.fillStyle =
        "rgba(255,60,80," + (0.22 + 0.22 * Math.sin(app.clock * 12)) + ")";
      app.g.fillRect(x, y, w, h);
    }
    if (en && app.R.guard) {
      app.g.save();
      app.g.globalCompositeOperation = "lighter";
      app.g.fillStyle =
        "rgba(92,225,255," + (0.2 + 0.2 * Math.sin(app.clock * 10)) + ")";
      app.g.fillRect(x, y, w, h);
      app.g.restore();
    }
    app.g.strokeStyle = "#ffffff55";
    app.g.lineWidth = 1;
    app.g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    (en ? app.icoBolt : app.icoShield)(
      rev ? x + w - h * 0.8 : x + h * 0.8,
      y + h / 2,
      h * 0.42,
      "#fff",
    );
  };
  app.zoneFx = function zoneFx(x0, x1, rgb, k, kind, hy, A) {
    if (x1 - x0 < 2 || k <= 0.02) return;
    k = Math.min(1.4, k);
    app.g.save();
    app.g.beginPath();
    app.g.rect(x0, A, x1 - x0, hy - A + 18);
    app.g.clip();
    const gr = app.g.createLinearGradient(0, hy + 18, 0, A);
    gr.addColorStop(0, "rgba(" + rgb + "," + 0.34 * k + ")");
    gr.addColorStop(0.55, "rgba(" + rgb + "," + 0.09 * k + ")");
    gr.addColorStop(1, "rgba(" + rgb + ",0)");
    app.g.fillStyle = gr;
    app.g.fillRect(x0, A, x1 - x0, hy - A + 18);
    app.g.globalCompositeOperation = "lighter";
    app.g.lineCap = "round";
    if (kind === "atk") {
      app.g.lineWidth = 2.2;
      const n = Math.max(3, Math.round((x1 - x0) / 22));
      for (let i = 0; i < n; i++) {
        const ph = (app.clock * (0.7 + 0.5 * k) + i * 0.37) % 1,
          xx =
            x0 +
            ((i + 0.5) / n) * (x1 - x0) +
            Math.sin(app.clock * 3 + i * 1.9) * 4,
          yy = hy - ph * (hy - A);
        app.g.strokeStyle = "rgba(" + rgb + "," + 0.55 * k * (1 - ph) + ")";
        app.g.beginPath();
        app.g.moveTo(xx, yy);
        app.g.lineTo(xx, yy - 22 - 14 * k);
        app.g.stroke();
      }
    } else {
      app.g.lineWidth = 2;
      for (let j = 0; j < 4; j++) {
        const ph = (app.clock * 0.45 + j * 0.25) % 1,
          yy = hy - ph * (hy - A);
        const lg = app.g.createLinearGradient(x0, 0, x1, 0);
        lg.addColorStop(0, "rgba(" + rgb + ",0)");
        lg.addColorStop(0.5, "rgba(" + rgb + "," + 0.5 * k * (1 - ph) + ")");
        lg.addColorStop(1, "rgba(" + rgb + ",0)");
        app.g.strokeStyle = lg;
        app.g.beginPath();
        app.g.moveTo(x0, yy);
        app.g.lineTo(x1, yy);
        app.g.stroke();
      }
    }
    app.g.strokeStyle = "rgba(" + rgb + "," + 0.5 * k + ")";
    app.g.lineWidth = 3;
    app.g.strokeRect(x0 + 1.5, A, x1 - x0 - 3, hy - A + 16);
    app.g.restore();
  };
  app.hexP = function hexP(x, y, w, k) {
    app.g.beginPath();
    app.g.moveTo(x + k, y - 10);
    app.g.lineTo(x + w - k, y - 10);
    app.g.lineTo(x + w, y);
    app.g.lineTo(x + w - k, y + 10);
    app.g.lineTo(x + k, y + 10);
    app.g.lineTo(x, y);
    app.g.closePath();
  };
  app.drawNote = function drawNote(n, lx, lw, y, hy, A) {
    const nx = lx + n.l * lw,
      c = app.L[n.l].c,
      w = lw - 10,
      x = nx + 5;
    if (n.special) {
      app.g.shadowColor = "#ffb65c";
      app.g.shadowBlur = 20;
      app.g.fillStyle = "#ff9d42";
      app.g.fillRect(nx + 2, y - 14, lw - 4, 28);
      app.g.strokeStyle = "#fff2c6";
      app.g.lineWidth = 2;
      app.g.strokeRect(nx + 2, y - 14, lw - 4, 28);
      app.tx("KO", nx + lw / 2, y + 5, Math.min(13, lw * 0.22), "#fff");
      app.g.shadowBlur = 0;
      return;
    }
    if (n.brk) {
      const cx = nx + lw / 2,
        r = Math.min(lw * 0.42, 30);
      app.g.save();
      app.g.globalCompositeOperation = "lighter";
      for (let k = 0; k < 3; k++) {
        const ph = (app.clock * 1.5 + k / 3) % 1;
        app.g.strokeStyle = "rgba(220,255,140," + 0.7 * (1 - ph) + ")";
        app.g.lineWidth = 3;
        app.g.beginPath();
        app.g.arc(cx, y, r * (1 + ph * 1.7), 0, 6.29);
        app.g.stroke();
      }
      const rg = app.g.createLinearGradient(0, A, 0, hy);
      rg.addColorStop(0, "rgba(190,255,90,0)");
      rg.addColorStop(
        1,
        "rgba(190,255,90," + (0.5 + 0.18 * Math.sin(app.clock * 10)) + ")",
      );
      app.g.fillStyle = rg;
      app.g.fillRect(nx + 3, A, lw - 6, hy - A);
      app.g.strokeStyle = "rgba(225,255,150,.7)";
      app.g.lineWidth = 2;
      app.g.beginPath();
      app.g.moveTo(nx + 3, A);
      app.g.lineTo(nx + 3, hy);
      app.g.moveTo(nx + lw - 3, A);
      app.g.lineTo(nx + lw - 3, hy);
      app.g.stroke();
      const tg = app.g.createLinearGradient(0, y - 80, 0, y);
      tg.addColorStop(0, "rgba(190,255,90,0)");
      tg.addColorStop(1, "rgba(190,255,90,.65)");
      app.g.fillStyle = tg;
      app.g.fillRect(cx - r * 0.45, y - 80, r * 0.9, 80);
      const og = app.g.createRadialGradient(cx, y, 1, cx, y, r * 1.9);
      og.addColorStop(0, "#fff");
      og.addColorStop(0.28, "#e4ff7a");
      og.addColorStop(0.62, "rgba(120,255,60,.55)");
      og.addColorStop(1, "rgba(120,255,60,0)");
      app.g.fillStyle = og;
      app.g.beginPath();
      app.g.arc(cx, y, r * 1.9, 0, 6.29);
      app.g.fill();
      app.g.restore();
      app.tx(app.L[n.l].n, cx, y + 8, Math.min(24, lw * 0.4), "#052000");
      return;
    }
    const def = n.role === "def" || n.l > 3,
      q = n.quick || 0;
    if (q) {
      const tl = q === 2 ? 46 : 26,
        tg = app.g.createLinearGradient(0, y - 10 - tl, 0, y - 10);
      tg.addColorStop(0, "#fff0");
      tg.addColorStop(1, q === 2 ? "#ffffff70" : "#ffffff3c");
      app.g.fillStyle = tg;
      app.g.fillRect(x + 3, y - 10 - tl, w - 6, tl);
    }
    app.g.shadowColor = c;
    app.g.shadowBlur = 10;
    app.g.fillStyle = c;
    if (def) {
      app.hexP(x, y, w, 7);
      app.g.fill();
    } else app.g.fillRect(x, y - 10, w, 20);
    app.g.shadowBlur = 0;
    app.g.fillStyle = "#fff8";
    app.g.fillRect(x + 4, y - 8, w - 8, 3);
    if (def) {
      app.g.strokeStyle = "#ffffff99";
      app.g.lineWidth = 1.4;
      app.hexP(x + 4, y, w - 8, 5);
      app.g.stroke();
    }
    if (q) {
      app.g.strokeStyle = q === 2 ? "#fff" : "#ffffffb0";
      app.g.lineWidth = q === 2 ? 2.5 : 1.5;
      if (def) {
        app.hexP(x, y, w, 7);
        app.g.stroke();
      } else app.g.strokeRect(x, y - 10, w, 20);
    }
  };
  app.shieldFx = function shieldFx(f, s, Y) {
    if (
      !app.R ||
      app.mode === "menu" ||
      app.mode === "over" ||
      !(app.R.guard || app.stance() === "def")
    )
      return;
    const k = app.R.guard ? 1 : 0.45,
      x = f.x,
      cy = Y - 45 * s,
      t = app.clock;
    app.g.save();
    app.g.globalCompositeOperation = "lighter";
    const rg = app.g.createRadialGradient(x, cy, 10 * s, x, cy, 56 * s);
    rg.addColorStop(0, "rgba(120,150,255,0)");
    rg.addColorStop(0.8, "rgba(120,150,255," + 0.16 * k + ")");
    rg.addColorStop(1, "rgba(180,200,255," + 0.5 * k + ")");
    app.g.fillStyle = rg;
    app.g.beginPath();
    app.g.ellipse(x, cy, 38 * s, 56 * s, 0, 0, 6.29);
    app.g.fill();
    app.g.strokeStyle =
      "rgba(190,210,255," + (0.4 + 0.3 * Math.sin(t * 7)) * k + ")";
    app.g.lineWidth = 2;
    app.g.beginPath();
    app.g.ellipse(x, cy, 38 * s, 56 * s, 0, 0, 6.29);
    app.g.stroke();
    app.g.restore();
  };
  app.lanes = function lanes() {
    const lw = app.LW(),
      lx = app.LX(),
      hy = app.HY(),
      bh = app.BH();
    const mid = app.lay === "mid",
      A = app.LT();
    if (!mid) {
      app.g.fillStyle = "#0d0d18";
      app.g.fillRect(0, app.AH, app.W, app.H - app.AH);
    } else {
      app.g.fillStyle = "#0d0d1822";
      app.g.fillRect(lx, A, lw * 6, app.H - A);
    }
    const st3 = app.laneState(),
      DLs = app.divLane(st3);
    for (let i = 0; i < 6; i++) {
      const isDef = i >= DLs;
      app.g.fillStyle = (i % 2 ? "#14142a" : "#101022") + (mid ? "33" : "");
      app.g.fillRect(lx + i * lw, A, lw, app.H - A);
      app.g.fillStyle = app.L[i].c + "14";
      app.g.fillRect(lx + i * lw, A, lw, app.H - A);
      app.g.fillStyle = (isDef ? "#9b8cff" : "#69ff36") + "0c";
      app.g.fillRect(lx + i * lw, A, lw, app.H - A);
      const sp =
          (st3 === "attack" && i >= 4) || (st3 === "defense" && i < 2)
            ? 2
            : st3 === "balanced"
              ? 1
              : 0,
        cx = lx + i * lw + lw / 2;
      app.g.save();
      app.g.globalAlpha = 0.85;
      (isDef ? app.icoShield : app.icoSword)(
        cx,
        A + 14,
        Math.max(5, Math.min(8, lw * 0.11)),
        isDef ? "#b8a7ff" : "#baff75",
      );
      if (sp) {
        app.g.globalAlpha = 0.55 + 0.35 * Math.sin(app.clock * 8 + i);
        const cy = A + 31;
        app.g.strokeStyle = sp === 2 ? "#ff8d7a" : "#9fe8c0";
        app.g.lineWidth = 2;
        app.g.lineCap = "round";
        app.g.beginPath();
        app.g.moveTo(cx - 6, cy - 3);
        app.g.lineTo(cx, cy + 3);
        app.g.lineTo(cx + 6, cy - 3);
        app.g.stroke();
        if (sp === 2) {
          app.g.beginPath();
          app.g.moveTo(cx - 6, cy + 5);
          app.g.lineTo(cx, cy + 11);
          app.g.lineTo(cx + 6, cy + 5);
          app.g.stroke();
        }
      }
      app.g.restore();
    }
    {
      const dxx = lx + app.DIV * lw,
        zf = app.R.zf || 0,
        gd = app.R.guard ? 0.45 : 0;
      app.zoneFx(
        lx,
        dxx,
        "105,255,54",
        (st3 === "attack" ? 0.9 : st3 === "balanced" ? 0.35 : 0.12) +
          (app.R.zfs === "attack" ? zf : 0),
        "atk",
        hy,
        A,
      );
      app.zoneFx(
        dxx,
        lx + 6 * lw,
        "155,140,255",
        (st3 === "defense" ? 0.9 : st3 === "balanced" ? 0.35 : 0.12) +
          gd +
          (app.R.zfs === "defense" ? zf : 0),
        "def",
        hy,
        A,
      );
    }
    {
      const dx = lx + app.DIV * lw;
      app.g.save();
      app.g.shadowColor = "#ffd23f";
      app.g.shadowBlur = 10;
      app.g.fillStyle = "#ffd23f66";
      app.g.fillRect(dx - 2, A, 4, hy - A);
      app.g.fillStyle = "#ffd23f";
      app.g.globalAlpha = 0.7;
      app.g.fillRect(dx - 1, A, 2, hy - A);
      app.g.restore();
    }

    if (app.R.breaker) {
      const B = app.R.breaker,
        k = Math.min(1, (app.clock - (app.R.bkStart || 0)) * 4);
      app.g.save();
      if (B.ready && B.note && !B.note.done) {
        app.g.fillStyle = "rgba(0,0,0," + 0.62 * k + ")";
        for (let i = 0; i < 6; i++)
          if (i !== B.note.l) app.g.fillRect(lx + i * lw, A, lw, app.H - A);
      } else {
        app.g.fillStyle = "rgba(0,0,0," + 0.55 * k + ")";
        app.g.fillRect(lx, A, Math.max(0, app.DIV * lw), app.H - A);
        app.g.globalCompositeOperation = "lighter";
        app.g.fillStyle =
          "rgba(190,255,90," + (0.1 + 0.09 * Math.sin(app.clock * 14)) + ")";
        app.g.fillRect(lx + app.DIV * lw, A, (6 - app.DIV) * lw, app.H - A);
      }
      app.g.restore();
    }
    for (const n of app.R.notes) {
      if (n.done) continue;
      const y = hy - ((n.t - app.R.t) / n.T) * (hy - A);
      if (y < A - 10 || y > app.H) continue;
      app.drawNote(n, lx, lw, y, hy, A);
    }
    {
      const hg = app.g.createLinearGradient(lx, 0, lx + 6 * lw, 0);
      hg.addColorStop(0, "#fff0");
      hg.addColorStop(0.1, "#ffffff66");
      hg.addColorStop(0.9, "#ffffff66");
      hg.addColorStop(1, "#fff0");
      app.g.fillStyle = hg;
      app.g.fillRect(lx, hy - 1, 6 * lw, 2);
      const vg = app.g.createLinearGradient(0, hy - 18, 0, hy + 18);
      vg.addColorStop(0, "#fff0");
      vg.addColorStop(0.5, "#ffffff1c");
      vg.addColorStop(1, "#fff0");
      app.g.fillStyle = vg;
      app.g.fillRect(lx, hy - 18, 6 * lw, 36);
    }
    if (app.R.heat > 1.5) {
      const k = Math.min(1, (app.R.heat - 1.5) / 5.5);
      app.g.save();
      app.g.globalCompositeOperation = "lighter";
      const hg2 = app.g.createLinearGradient(0, hy - 14 - 10 * k, 0, hy + 14);
      hg2.addColorStop(0, "rgba(255," + ((170 - 110 * k) | 0) + ",40,0)");
      hg2.addColorStop(
        0.6,
        "rgba(255," + ((150 - 100 * k) | 0) + ",40," + (0.2 + 0.4 * k) + ")",
      );
      hg2.addColorStop(1, "rgba(255,80,40,0)");
      app.g.fillStyle = hg2;
      app.g.fillRect(lx, hy - 14 - 10 * k, 6 * lw, 28 + 10 * k);
      app.g.restore();
    }
    for (let i = 0; i < 6; i++) {
      if (app.LF[i] > 0) {
        app.g.save();
        app.g.globalCompositeOperation = "lighter";
        const rg = app.g.createRadialGradient(
          lx + i * lw + lw / 2,
          hy,
          2,
          lx + i * lw + lw / 2,
          hy,
          lw * 0.8,
        );
        rg.addColorStop(0, app.L[i].c + "cc");
        rg.addColorStop(1, app.L[i].c + "00");
        app.g.globalAlpha = app.LF[i];
        app.g.fillStyle = rg;
        app.g.fillRect(lx + i * lw, hy - lw, lw, lw * 2);
        app.g.restore();
      }
      app.g.strokeStyle = app.L[i].c;
      app.g.lineWidth = 2;
      app.g.strokeRect(lx + i * lw + 6, hy - 12, lw - 12, 24);
      if (
        app.R.breaker &&
        app.R.breaker.ready &&
        app.R.breaker.note &&
        app.R.breaker.note.l === i &&
        !app.R.breaker.note.done
      ) {
        app.g.save();
        app.g.fillStyle =
          "rgba(190,255,90," + (0.18 + 0.14 * Math.sin(app.clock * 12)) + ")";
        app.g.fillRect(lx + i * lw + 2, hy - 20, lw - 4, 40);
        app.g.strokeStyle = "#e4ff7a";
        app.g.lineWidth = 4;
        app.g.shadowColor = "#baff55";
        app.g.shadowBlur = 22 + 10 * Math.sin(app.clock * 12);
        app.g.strokeRect(lx + i * lw + 2, hy - 20, lw - 4, 40);
        app.g.restore();
      } else if (app.R.breaker && !app.R.breaker.ready && i >= DLs) {
        app.g.save();
        app.g.strokeStyle =
          "rgba(225,255,150," + (0.55 + 0.35 * Math.sin(app.clock * 14)) + ")";
        app.g.lineWidth = 3;
        app.g.shadowColor = "#baff55";
        app.g.shadowBlur = 14;
        app.g.strokeRect(lx + i * lw + 4, hy - 16, lw - 8, 32);
        app.g.restore();
      }
      app.g.fillStyle = app.DN[i] ? app.L[i].c : app.L[i].c + "44";
      app.g.fillRect(lx + i * lw + 3, hy + 10, lw - 6, bh - 4);
      app.tx(
        app.L[i].n,
        lx + i * lw + lw / 2,
        hy + 10 + bh / 2 + 8,
        Math.min(30, lw * 0.4),
        app.DN[i] ? "#000" : "#fff",
      );
      if (i === 4)
        app.icoShield(
          lx + i * lw + lw / 2,
          hy + 24,
          Math.max(5, lw / 14),
          "#ffffffaa",
        );
      if (i === 5)
        app.icoStar(
          lx + i * lw + lw / 2,
          hy + 24,
          Math.max(5, lw / 14),
          "#ffffffaa",
        );
    }

    if (app.R.breaker) {
      const a = 0.26 + 0.14 * Math.sin(app.clock * 10),
        vg = app.g.createRadialGradient(
          app.W / 2,
          app.H / 2,
          Math.min(app.W, app.H) * 0.32,
          app.W / 2,
          app.H / 2,
          Math.max(app.W, app.H) * 0.75,
        );
      vg.addColorStop(0, "rgba(120,255,60,0)");
      vg.addColorStop(1, "rgba(120,255,60," + a + ")");
      app.g.fillStyle = vg;
      app.g.fillRect(0, 0, app.W, app.H);
      const e0 = app.clock - (app.R.bkStart || 0);
      if (e0 < 0.9) {
        app.g.save();
        app.g.strokeStyle = "rgba(220,255,140," + 0.8 * (1 - e0 / 0.9) + ")";
        app.g.lineWidth = 6 * (1 - e0 / 0.9) + 1;
        app.g.beginPath();
        app.g.arc(
          app.pX(),
          app.gy() - 45 * app.sc(),
          30 + e0 * app.W * 0.6,
          0,
          6.29,
        );
        app.g.stroke();
        app.g.restore();
      }
    }
    if (app.R.jt && app.R.jt.l > 0)
      app.tx(
        app.R.jt.s,
        app.W / 2,
        hy - 40,
        Math.min(34, app.W / 12),
        app.R.jt.c,
      );
  };
  app.overlay = function overlay(a, b, c) {
    app.g.fillStyle = "#000c";
    app.g.fillRect(0, 0, app.W, app.H);
    app.tx(a, app.W / 2, app.H * 0.3, Math.min(44, app.W / 9), "#ffd23f");
    b.forEach((s, i) =>
      app.tx(
        s,
        app.W / 2,
        app.H * 0.4 + i * Math.min(28, app.W / 14),
        Math.min(18, app.W / 22),
        "#fff",
      ),
    );
    if (c) app.tx(c, app.W / 2, app.H * 0.85, 16, "#9ff");
  };
  app.rank = function rank() {
    const t = app.M.perf + app.M.good + app.M.miss || 1,
      a = (app.M.perf + app.M.good * 0.6) / t;
    return app.M.won && a >= 0.9
      ? "S"
      : a >= 0.75
        ? "A"
        : a >= 0.55
          ? "B"
          : "C";
  };
  app.demo = function demo(dt) {
    app.DM.t -= dt;
    if (app.DM.t <= 0) {
      app.DM.t = 0.9 + Math.random() * 0.5;
      const a = app.DM.turn++ % 2 ? app.DM.e : app.DM.p,
        d = a === app.DM.p ? app.DM.e : app.DM.p;
      a.an = app.MOVES[Math.floor(Math.random() * 4)];
      a.at = 0;
      app.DM.d = 0.12;
      app.DM.def = d;
      app.DM.dm = Math.random() < 0.5 ? "hurt" : "block";
      app.S.swing(1);
    }
    if (app.DM.d > 0) {
      app.DM.d -= dt;
      if (app.DM.d <= 0) {
        app.DM.def.an = app.DM.dm;
        app.DM.def.at = 0;
        app.DM.def.fl = app.DM.dm === "hurt" ? 0.1 : 0;
        app.spark(app.DM.def.x, app.gy() - 70 * app.sc(), "#ffd23f", 8, 200);
      }
    }
  };
  app.drawArenaEnvironment = function drawArenaEnvironment(AB, GY) {
    const t = app.clock,
      van = app.W / 2,
      top = AB * 0.06;
    // Corredor de pilares luminosos con profundidad y perspectiva, generado en Canvas
    const layers = 12;
    for (let i = 0; i < layers; i++) {
      const z = (i + 1) / layers,
        yy = top + (AB * 0.62 - top) * z,
        spread = app.W * 0.49 * (1 - z * 0.83),
        hh = AB * (0.12 + 0.1 * z);
      for (const side of [-1, 1]) {
        const x = van + side * spread,
          alpha = 0.12 + 0.72 * z;
        app.g.save();
        app.g.globalAlpha = alpha;
        app.g.shadowColor = "#54ff31";
        app.g.shadowBlur = 9 + z * 15;
        app.g.strokeStyle = "#59ff35";
        app.g.lineWidth = 1 + z * 2.4;
        app.g.beginPath();
        app.g.moveTo(x, yy - hh);
        app.g.lineTo(x, yy + hh * 0.2);
        app.g.stroke();
        app.g.restore();
        // reflected neon pillars on the wet floor
        const floorY = GY + (yy - GY) * 0.42,
          rw = 2 + z * 8;
        const rg = app.g.createLinearGradient(0, floorY, 0, AB);
        rg.addColorStop(0, "#56ff35aa");
        rg.addColorStop(1, "#56ff3500");
        app.g.save();
        app.g.globalAlpha = 0.12 + 0.24 * z;
        app.g.fillStyle = rg;
        app.g.fillRect(x - rw / 2, floorY, rw, Math.max(2, AB - floorY));
        app.g.restore();
      }
    }
    // floor: deep green-black water with animated ripples and reflections
    const water = app.g.createLinearGradient(0, GY, 0, AB);
    water.addColorStop(0, "#061906");
    water.addColorStop(0.25, "#031003");
    water.addColorStop(1, "#010501");
    app.g.fillStyle = water;
    app.g.fillRect(0, GY, app.W, AB - GY);
    app.g.save();
    app.g.globalCompositeOperation = "screen";
    for (let i = 0; i < 30; i++) {
      const y = GY + (i / 30) * (AB - GY) + Math.sin(t * 1.4 + i) * 2;
      const width = app.W * 0.08 + app.W * 0.4 * (i / 30),
        x = van - width / 2;
      app.g.globalAlpha = 0.025 + 0.035 * (0.5 + 0.5 * Math.sin(t * 2 + i));
      app.g.strokeStyle = "#65ff43";
      app.g.lineWidth = 1;
      app.g.beginPath();
      app.g.moveTo(x, y);
      app.g.quadraticCurveTo(van, y + Math.sin(t * 3 + i) * 3, x + width, y);
      app.g.stroke();
    }
    app.g.restore();
    // atmospheric particles
    if (
      app.environment === "rain" ||
      app.environment === "storm" ||
      app.environment === "wind"
    ) {
      app.g.strokeStyle = "#9aff8b";
      app.g.lineWidth = 1;
      app.g.globalAlpha = 0.28;
      for (let i = 0; i < 90; i++) {
        const x =
            (i * 97 + t * (app.environment === "wind" ? 180 : 55)) % app.W,
          y = (i * 53 + t * 420) % AB;
        app.g.beginPath();
        app.g.moveTo(x, y);
        app.g.lineTo(x - 4, y + 10);
        app.g.stroke();
      }
      app.g.globalAlpha = 1;
    }
    if (app.environment === "snow" || app.environment === "leaves") {
      for (let i = 0; i < 55; i++) {
        const x =
            (i * 83 +
              Math.sin(t + i) * 18 +
              t * (app.environment === "leaves" ? 24 : 5)) %
            app.W,
          y = (i * 47 + t * (app.environment === "leaves" ? 36 : 18)) % AB;
        app.g.save();
        app.g.translate(x, y);
        app.g.rotate(t + i);
        app.g.fillStyle = app.environment === "snow" ? "#eaffef" : "#a9df4b";
        app.g.globalAlpha = 0.55;
        app.g.beginPath();
        if (app.environment === "snow") app.g.arc(0, 0, 1.5 + (i % 3), 0, 6.28);
        else {
          app.g.ellipse(0, 0, 3, 7, 0.5, 0, 6.28);
        }
        app.g.fill();
        app.g.restore();
      }
    }
    if (
      app.environment === "storm" &&
      app.mode === "play" &&
      app.R &&
      app.R.adr > 0
    ) {
      const flash = Math.pow(Math.max(0, Math.sin(t * 7.7)), 18);
      if (flash > 0.25) {
        app.g.fillStyle = "rgba(210,255,190," + flash * 0.18 + ")";
        app.g.fillRect(0, 0, app.W, AB);
      }
      if (Math.sin(t * 5.1) > 0.94) {
        app.g.save();
        app.g.strokeStyle = "#eaffd5";
        app.g.shadowColor = "#aaff6b";
        app.g.shadowBlur = 18;
        app.g.lineWidth = 2;
        let x = app.W * (0.2 + 0.6 * Math.abs(Math.sin(t * 2)));
        app.g.beginPath();
        app.g.moveTo(x, 0);
        for (let j = 0; j < 7; j++) {
          x += Math.sin(t * 11 + j * 3) * app.W * 0.035;
          app.g.lineTo(x, (AB * (j + 1)) / 8);
        }
        app.g.stroke();
        app.g.restore();
      }
    }
  };
  app.draw = function draw() {
    app.g.save();
    if (app.shake > 0)
      app.g.translate(
        (Math.random() - 0.5) * app.shake * 30,
        (Math.random() - 0.5) * app.shake * 30,
      );
    app.g.fillStyle = "#07070d";
    app.g.fillRect(-30, -30, app.W + 60, app.H + 60);
    const AB = app.lay === "mid" && app.mode !== "menu" ? app.H : app.AH,
      GY = app.gy();
    app.g.fillStyle = "#010501";
    app.g.fillRect(0, 0, app.W, AB);
    app.drawArenaEnvironment(AB, GY);
    const s = app.sc(),
      Y = app.gy(),
      a = app.mode === "menu" ? app.DM : app.R;
    if (a) {
      a.p.x = app.W / 2 - 48 * s;
      a.e.x = app.W / 2 + 48 * s;
      if (app.mode !== "menu" && app.R && app.mode !== "over") {
        const pk = app.R.fin ? 60 : app.R.ki,
          ek = app.R.fin ? 0 : app.R.ec;
        app.aura(a.e, ek, 0, s, Y, app.kiC(ek) > 0.9 ? "#ffb36b" : "#ff5c7a");
        app.aura(
          a.p,
          pk,
          app.R.adr > 0,
          s,
          Y,
          app.R.adr > 0 ? "#ffae00" : app.kiC(pk) > 0.9 ? "#ffe36b" : "#5ce1ff",
        );
      }
      app.drawF(a.e, 0, Y, s, app.g);
      app.drawF(
        a.p,
        app.R && app.mode !== "menu" && app.R.adr > 0,
        Y,
        s,
        app.g,
      );
      app.shieldFx(a.p, s, Y);
      if (app.mode !== "menu" && app.R) {
        const icon = (f, def) => {
          app.g.save();
          app.g.globalAlpha = 0.62;
          app.g.strokeStyle = f.col;
          app.g.fillStyle = f.col;
          app.g.lineWidth = 2.5;
          const yy = Y + 8 * s;
          if (def) {
            app.g.beginPath();
            app.g.moveTo(f.x, yy - 10 * s);
            app.g.lineTo(f.x + 9 * s, yy - 6 * s);
            app.g.lineTo(f.x + 7 * s, yy + 5 * s);
            app.g.lineTo(f.x, yy + 11 * s);
            app.g.lineTo(f.x - 7 * s, yy + 5 * s);
            app.g.lineTo(f.x - 9 * s, yy - 6 * s);
            app.g.closePath();
            app.g.stroke();
          } else {
            app.g.beginPath();
            app.g.moveTo(f.x - 8 * s, yy + 7 * s);
            app.g.lineTo(f.x + 7 * s, yy - 8 * s);
            app.g.moveTo(f.x + 1 * s, yy - 8 * s);
            app.g.lineTo(f.x + 7 * s, yy - 8 * s);
            app.g.lineTo(f.x + 7 * s, yy - 2 * s);
            app.g.stroke();
          }
          app.g.restore();
        };
        icon(app.R.p, app.stance() === "def" || app.stance() === "con");
        icon(app.R.e, app.R.e.an === "block");
      }
    }
    for (const p of app.PA) {
      app.g.strokeStyle = p.c;
      app.g.globalAlpha = Math.min(1, p.l * 3);
      app.g.lineWidth = 2.5;
      app.g.beginPath();
      app.g.moveTo(p.x, p.y);
      app.g.lineTo(p.x - p.vx * 0.04, p.y - p.vy * 0.04);
      app.g.stroke();
    }
    app.g.globalAlpha = 1;
    if (app.mode !== "menu" && app.R) {
      app.hud();
      app.lanes();
      for (const f of app.fx) app.tx(f.s, f.x, f.y || app.AH * 0.3, f.z, f.c);
    }
    app.g.restore();
    if (app.mode === "pause") {
      app.g.fillStyle = "#000b";
      app.g.fillRect(0, 0, app.W, app.H);
      app.tx(
        "PAUSA",
        app.W / 2,
        app.H * 0.3,
        Math.min(44, app.W / 9),
        "#ffd23f",
      );
      ["▶ CONTINUAR", "↻ REINICIAR COMBATE", "⌂ VOLVER AL MENÚ"].forEach(
        (t, i) => {
          app.g.fillStyle = i === 0 ? "#e52f61" : "#ffffff22";
          app.g.fillRect(app.W / 2 - 130, app.H * 0.4 + i * 68, 260, 52);
          app.tx(t, app.W / 2, app.H * 0.4 + i * 68 + 33, 16, "#fff");
        },
      );
    } else if (app.mode === "over") {
      app.overlay(
        app.gameMode === "survival"
          ? "FIN DE SUPERVIVENCIA"
          : app.M.won
            ? app.M.ultra
              ? "¡ULTRA COMBO!"
              : "VICTORIA"
            : "DERROTA",
        [
          "Rango " + app.rank(),
          "Puntos " + Math.floor(app.M.score) + " · Récord " + app.best,
          "Perfect " +
            app.M.perf +
            " · Good " +
            app.M.good +
            " · Miss " +
            app.M.miss +
            " · Combo máx " +
            app.M.maxC,
        ],
        "",
      );
      {
        const ob = app.overBtns();
        app.g.save();
        app.g.globalAlpha = app.overReady() ? 1 : 0.3;
        app.g.fillStyle = "#e52f61";
        app.g.fillRect(ob.a.x, ob.a.y, ob.a.w, ob.a.h);
        app.g.fillStyle = "#ffffff22";
        app.g.fillRect(ob.b.x, ob.b.y, ob.b.w, ob.b.h);
        app.tx("↻ REVANCHA", ob.a.x + ob.a.w / 2, ob.a.y + 33, 16, "#fff");
        app.tx("⌂ MENÚ", ob.b.x + ob.b.w / 2, ob.b.y + 33, 16, "#fff");
        app.g.restore();
      }
    }
  };
  return function initialize() {
    app.PIPC = [
      "#6dff42",
      "#baff55",
      "#ffd23f",
      "#ff9a3d",
      "#ff5c7a",
      "#c05cff",
    ];
    app.DM = {
      p: app.mkF(1, app.playerColor, "#173d12"),
      e: app.mkF(-1, "#ff5c7a", "#b03050"),
      t: 0.5,
      turn: 0,
      d: 0,
    };
  };
}
