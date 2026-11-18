import { DIFFICULTY } from "./config.js";
// Installs this system into one application instance; initialization is deferred.
export function install(app) {

  // Registra una partida en el historial de Supabase.
  // La importación dinámica evita bloquear el inicio del juego.
  app.historySaved = false;

  app.recordMatchHistory = function recordMatchHistory(result) {
    if (app.historySaved || !app.M || !app.R) return;

    if (
      typeof location === "undefined" ||
      !["http:", "https:"].includes(location.protocol)
    ) {
      return;
    }
    app.historySaved = true;

    const match = {
      gameMode: app.gameMode,
      result,
      score: app.M.score,
      durationSeconds: app.R.t,
      stats: {
        perfectHits: app.M.perf,
        goodHits: app.M.good,
        misses: app.M.miss,
        maxCombo: app.M.maxC,
        damage: app.M.dmg,
        ultra: app.M.ultra,
        difficulty: app.diff,
      },
    };

    import("../services/history.js")
      .then(({ saveMatch }) => saveMatch(match))
      .catch((error) => {
        console.error(
          "OVERBREAKER: no se pudo guardar la partida:",
          error,
        );
      });
  };

  app.newMatch = function newMatch() {
    app.historySaved = false;
    app.timers.clear();
    app.fx = [];
    app.PA = [];
    app.slow = 0;
    app.$("breakerBtn").classList.remove("show");
    app.$("ultraBtn").classList.remove("show");
    app.$("settingsPanel").classList.remove("show");
    app.$("editPanel").classList.remove("show");
    app.M = { score: 0, perf: 0, good: 0, miss: 0, maxC: 0, dmg: 0, ultra: 0 };
    try {
      app.$("am").currentTime = 0;
    } catch (e) {}
    app.startRound();
  };
  app.startRound = function startRound() {
    app.DIV = 3;
    app.$("breakerBtn").classList.remove("show");
    app.$("ultraBtn").classList.remove("show");
    app.R = {
      t: 0,
      time: 60,
      prot: 100,
      lastProtHit: -9,
      p: app.mkF(1, app.playerColor, "#173d12"),
      e: app.mkF(-1, "#ff5c7a", "#b03050"),
      en: 100,
      ex: 0,
      ch: 0,
      pr: 0,
      cb: 0,
      mul: 1,
      adr: 0,
      am: 0,
      notes: [],
      gq: [],
      nextStep: app.TT(0.55) + 0.8,
      step: 0,
      last: -1,
      lastA: "",
      lastT: -9,
      rate: 0.55,
      jt: null,
      win: false,
      rdy: 0,
      cbs: 0,
      ac: 0,
      kd: null,
      intro: 2.7,
      ec: 0,
      ki: 0,
      dc: 0,
      fin: null,
      msp: 1,
      breaker: null,
      defStreak: 0,
      ai: null,
      chainBar: 0,
      chainReady: false,
      chainNote: null,
      enemyCombo: 0,
      badPresses: 0,
      survMistakes: 0,
      survReliefUntil: 0,
      survNextRelief: 500,
      survClock: 0,
      post: 0,
      ps: "balanced",
      psT: 0,
      stress: 0,
      lq: [-9, -9, -9, -9, -9, -9],
      heat: 0,
      zf: 0,
      zfs: "",
      guard: false,
      lp: 0,
      lastEnemyAtk: -9,
      tAtk: 0,
      tDef: 0,
    };
    app.initAI();
    app.R.p.an = "pose1";
    app.R.e.an = "pose2";
    app.setMode("play");
    try {
      app.$("am").playbackRate = 1;
    } catch (e) {}
    app.events.emit("voice", "ready");
  };

  app.laneState = function laneState() {
    return app.R ? app.R.ps : "balanced";
  };
  app.postInput = function postInput(v) {
    if (app.R) app.R.post = app.R.post * 0.72 + v * 0.28;
  };
  app.postTick = function postTick(dt) {
    app.R.post *= Math.max(0, 1 - dt * 0.12);
    const p = app.R.post,
      cur = app.R.ps;
    let nx = cur;
    if (cur === "attack") {
      if (p < 0.15) nx = p < -0.4 ? "defense" : "balanced";
    } else if (cur === "defense") {
      if (p > -0.15) nx = p > 0.4 ? "attack" : "balanced";
    } else {
      if (p > 0.4) nx = "attack";
      else if (p < -0.4) nx = "defense";
    }
    if (nx !== cur && app.R.t - app.R.psT > 1.2) {
      app.R.ps = nx;
      app.R.psT = app.R.t;
      if (nx !== "balanced") {
        app.R.zf = 1;
        app.R.zfs = nx;
      }
    }
  };
  app.noteBounds = function noteBounds(t) {
    let lo = 0,
      hi = 9;
    for (const n of app.R.notes) {
      if (n.done || n.brk) continue;
      if (n.t <= t) {
        const b = t - n.t + n.T;
        if (b < hi) hi = b;
      } else {
        const b = n.T - (n.t - t);
        if (b > lo) lo = b;
      }
    }
    return [lo, hi];
  };
  app.mkNote = function mkNote(l, t, T, st, ai) {
    const [Lb, Ub] = app.noteBounds(t);
    if (Ub < 0.45 || Lb > T + 0.02) return null;
    const DL = app.divLane(st);
    let q = 0;
    if (st === "attack" && l >= 4) q = Math.random() < 0.3 ? 2 : 0;
    else if (st === "defense" && l < 2) q = Math.random() < 0.3 ? 2 : 0;
    else if (st === "balanced") q = Math.random() < 0.14 ? 1 : 0;
    if (q && app.R.t - app.R.lq[l] < 1.6) q = 0;
    if (q) app.R.lq[l] = app.R.t;
    const f = q === 2 ? 0.72 : q === 1 ? 0.86 : 1;
    const role = l >= DL ? "def" : "atk";
    if (role === "atk") app.R.tAtk = Math.max(app.R.tAtk, t);
    else app.R.tDef = Math.max(app.R.tDef, t);
    const want = q ? Math.max(0.4, T * f) : T,
      Tf = Math.max(Lb, Math.min(Ub, want));
    return { l, t, T: Tf, role, quick: Tf < T * 0.9 ? q || 1 : 0 };
  };
  app.gen = function gen(ht) {
    app.R.step++;
    app.R.gq.push({ t: ht, s: app.R.step });
    const r = app.R.rate,
      T = app.TT(r),
      st = app.laneState();
    if (Math.random() > 0.58 + (0.28 * Math.max(0, r - 0.55)) / 0.85) return;
    // Control anti bola de nieve: tope de notas pendientes y separación mínima entre golpes.
    const pend = () => app.R.notes.filter((n) => !n.done).length;
    if (pend() >= 6) return;
    if (app.R.notes.some((n) => !n.done && Math.abs(n.t - ht) < 0.22)) return;
    const WT =
      st === "attack"
        ? [1, 1, 1, 1, 0.4, 0.4]
        : st === "defense"
          ? [1, 1, 0.7, 0.7, 0.7, 0.7]
          : [1, 1, 1, 0.75, 0.75, 0.75];
    const pick = (ex) => {
      const w = WT.map((v, i) => (i === ex ? v * 0.35 : v));
      let x = Math.random() * w.reduce((a, b) => a + b, 0);
      for (let i = 0; i < 6; i++) {
        x -= w[i];
        if (x <= 0) return i;
      }
      return 0;
    };
    let l = pick(app.R.last);
    // Garantía de escape de postura: si un lado lleva demasiado sin notas, la siguiente cae ahí.
    if (st === "defense" && ht - app.R.tAtk > 1.8)
      l = Math.random() < 0.5 ? 0 : 1;
    else if (st === "attack" && ht - app.R.tDef > 3.2)
      l = Math.random() < 0.5 ? 4 : 5;
    app.R.last = l;
    {
      const nn = app.mkNote(l, ht, T, st, 0);
      if (!nn) return;
      app.R.notes.push(nn);
    }
    if (r > 0.92 && Math.random() < 0.1 && pend() < 4) {
      const a = pick(l),
        at = ht + 0.26;
      if (
        a !== l &&
        !app.R.notes.some((n) => !n.done && Math.abs(n.t - at) < 0.2)
      ) {
        const n2 = app.mkNote(a, at, T, st, 0);
        if (n2) app.R.notes.push(n2);
      }
    }
  };
  app.kiC = function kiC(c) {
    return c < 3 ? 0 : Math.min(1, (c - 2) / 38);
  };
  app.brk = function brk(f, col) {
    app.events.emit("spark", f.x, app.gy() - 60 * app.sc(), col, 16, 300);
    app.shake = Math.max(app.shake, 0.15);
  };
  app.ecb = function ecb() {
    if (app.R.ec >= 3) app.brk(app.R.e, "#ff5c7a");
    app.R.ec = 0;
  };

  app.musSpd = function musSpd() {
    const audio = app.$("am");
    if (audio.playbackRate !== 1) audio.playbackRate = 1;
  };
  app.startFin = function startFin() {
    app.R.notes = [];
    app.R.gq = [];
    app.R.ec = 0;
    app.R.breaker = null;
    app.R.chainBar = 0;
    app.R.chainReady = false;
    app.R.chainNote = null;
    app.$("breakerBtn").classList.remove("show");
    app.R.pr = 0;
    app.R.rate = 1.4;
    // La adrenalina/aura que estaba activa se conserva durante el Ultra.
    let t = app.R.t + 1.05,
      prev = -1;
    const F = {
      hit: 0,
      miss: 0,
      tot: 0,
      t0: t,
      d: 0,
      st: 0,
      ready: 0,
      ok: 0,
      ms: 0,
      mn: app.R.t,
      deadline: 0,
    };
    for (let i = 0; i < 32; i++) {
      t += Math.max(0.135, 0.29 - i * 0.0047);
      let l;
      do {
        l = Math.floor(Math.random() * 4);
      } while (l === prev);
      prev = l;
      const T = Math.max(0.52, 0.88 - i * 0.007);
      app.R.notes.push({ l, t, T });
      // Solo tres dobles separadas durante toda la ráfaga.
      if (i === 8 || i === 20 || i === 27) {
        const l2 = (l + 1 + Math.floor(Math.random() * 2)) % 4;
        app.R.notes.push({ l: l2, t: t + 0.045, T });
      }
    }
    F.tot = app.R.notes.length;
    app.R.fin = F;
    app.R.e.an = "open";
    app.R.e.at = 0;
    app.R.jt = null;
    app.events.emit("sound:ready");
    app.events.emit(
      "pop",
      app.eX(),
      app.py() - 20,
      "¡ULTRA COMBO!",
      "#dfff55",
      26,
    );
  };
  app.finPress = function finPress(l) {
    const F = app.R.fin;
    if (F.ready) {
      if (l === (F.remateLane ?? -1) && app.R.t <= F.deadline)
        app.completeUltra();
      else app.failUltra();
      return;
    }
    if (l > 3) return;
    let b = null,
      bd = 9;
    for (const n of app.R.notes)
      if (n.l === l && !n.done) {
        const d = Math.abs(app.R.t - n.t);
        if (d < bd) {
          bd = d;
          b = n;
        }
      }
    if (!b || bd > 0.16) return;
    b.done = 1;
    F.hit++;
    app.R.cb++;
    const P = bd <= 0.065;
    app.M.score += P ? 60 : 30;
    app.M.maxC = Math.max(app.M.maxC, app.R.cb);
    app.events.emit("sound:swing", l);
    app.R.p.an = app.MOVES[l];
    app.R.p.at = 0;
    app.R.e.an = "hurt";
    app.R.e.at = 0;
    app.R.e.fl = 0.08;
    app.shake = Math.max(app.shake, 0.12 + (F.hit / F.tot) * 0.25);
    app.events.emit(
      "spark",
      app.eX(),
      app.gy() - 70 * app.sc(),
      F.hit > F.tot * 0.6 ? "#fff" : "#dfff55",
      6 + (F.hit >> 1),
      260,
    );
    app.events.emit("sound:hit", l, P, 99, b.T < 0.6);
    if (P) app.events.emit("sound:perf");
  };
  app.failUltra = function failUltra() {
    const F = app.R && app.R.fin;
    if (!F || F.st) return;
    app.$("ultraBtn").classList.remove("show");
    F.ok = false;
    F.st = 1;
    F.d = 0;
    app.R.e.an = "down";
    app.R.e.at = 0;
    app.events.emit("pop", app.eX(), app.py(), "¡REMATE PERDIDO!", "#aaa", 22);
  };
  app.completeUltra = function completeUltra() {
    const F = app.R && app.R.fin;
    if (!F || !F.ready) return;
    app.$("ultraBtn").classList.remove("show");
    F.ok = F.miss <= Math.floor(F.tot * 0.15);
    F.st = 1;
    F.d = 0;
    if (F.ok) {
      app.events.emit("voice", "ultra");
      app.M.ultra = 1;
      app.M.score += 3000 + F.hit * 40;
      app.slow = 0.95;
      app.shake = 1.05;
      app.fx.push({
        x: app.W / 2,
        y: app.lay === "mid" ? app.H * 0.3 : app.AH * 0.42,
        s: "¡ULTRA COMBO!",
        c: "#dfff55",
        l: 2,
        z: Math.min(app.W / 6, 64),
      });
      app.events.emit(
        "spark",
        app.eX(),
        app.gy() - 70 * app.sc(),
        "#fff",
        40,
        420,
      );
      app.R.e.an = "down";
      app.R.e.at = 0;
      app.events.emit("sound:counter");
    } else {
      app.events.emit("pop", app.eX(), app.py(), "¡CASI!", "#aaa", 24);
      app.R.e.an = "down";
      app.R.e.at = 0;
    }
  };
  app.finUpdate = function finUpdate(dt) {
    const F = app.R.fin;
    if (app.R.adr > 0) {
      app.R.adr = Math.max(0, app.R.adr - dt);
      if (app.R.adr === 0 && app.R.ac) {
        app.R.ac = 0;
        app.events.emit("voice", "killer");
        app.events.emit(
          "pop",
          app.pX(),
          app.py() - 55,
          "¡ADRENALINA TERMINADA!",
          "#dfff55",
          20,
        );
      }
    }
    if (!F.ready) {
      if (!app.custom && app.R.t >= F.mn) {
        app.music(F.ms++);
        F.mn += 0.25;
      }
      for (const n of app.R.notes)
        if (!n.done && app.R.t - n.t > 0.16) {
          n.done = 1;
          F.miss++;
          app.events.emit("sound:miss");
          app.R.jt = { s: "MISS", c: "#ff6478", l: 0.5 };
          app.failUltra();
          return;
        }
      app.R.notes = app.R.notes.filter((n) => app.R.t - n.t < 0.48);
      if (app.R.notes.every((n) => n.done)) {
        F.ready = 1;
        F.deadline = app.R.t + 1.15;
        F.remateLane = Math.floor(Math.random() * 4);
        F.remateT = app.R.t;
        const el = app.$("ultraBtn");
        el.textContent = "KO";
        el.classList.add("show");
        app.events.emit(
          "pop",
          app.W / 2,
          app.HY() - 135,
          "¡REMATE!",
          "#ffc36b",
          22,
        );
      } else if (app.R.t > F.t0 + 15) {
        app.failUltra();
      }
    } else if (F.ready && !F.st) {
      const el = app.$("ultraBtn"),
        lane = F.remateLane ?? 1,
        progress = Math.max(
          0,
          Math.min(
            1,
            (app.R.t - F.remateT) / Math.max(0.01, F.deadline - F.remateT),
          ),
        );
      el.style.left = app.LX() + lane * app.LW() + app.LW() / 2 - 27 + "px";
      el.style.top = app.LT() + progress * (app.HY() - app.LT()) - 27 + "px";
      if (app.R.t > F.deadline) app.failUltra();
    }
    if (F.st) {
      F.d += dt;
      if (F.d > (F.ok ? 2 : 0.65)) {
        app.R.fin = null;
        app.endMatch(true);
      }
    }
  };
  app.startBreaker = function startBreaker() {
    if (!app.R || app.R.breaker || app.R.fin || app.R.intro > 0) return;
    app.R.breaker = { step: 0, t: 0, ready: false, window: 1.0, total: 5 };
    app.R.bkStart = app.clock;
    app.shake = Math.max(app.shake, 0.45);
    try {
      app.events.emit("sound:ready");
    } catch (e) {}
    app.events.emit("pop", app.W / 2, app.H * 0.4, "¡BREAKER!", "#caff75", 40);
    const b = app.$("breakerBtn");
    b.classList.remove("show");
  };
  app.breakerInput = function breakerInput(l) {
    const B = app.R.breaker;
    if (!B || B.ready) return false;
    B.step++;
    B.t = 0;
    B.window = B.step < 2 ? 1.0 : 0.29;
    app.events.emit("sound:parry", true);
    app.events.emit(
      "spark",
      app.pX(),
      app.gy() - 65 * app.sc(),
      "#baff55",
      7,
      180,
    );
    if (B.step >= B.total) {
      B.ready = true;
      const DL = app.divLane(app.laneState()),
        lane = DL + Math.floor(Math.random() * (6 - DL));
      const bn = { l: lane, t: app.R.t + 1.15, T: 1.15, brk: 1, role: "def" };
      app.R.notes.push(bn);
      B.note = bn;
      app.R.bkStart = app.clock;
      app.shake = Math.max(app.shake, 0.3);
      app.events.emit("sound:ready");
      app.events.emit("pop", app.W / 2, app.H * 0.4, "¡AHORA!", "#ffffff", 40);
    }
    return true;
  };
  app.executeBreaker = function executeBreaker() {
    const B = app.R && app.R.breaker;
    if (!B || !B.ready) return;
    app.R.breaker = null;
    app.$("breakerBtn").classList.remove("show");
    app.R.ec = 0;
    app.R.cb = 0;
    app.R.mul = 1;
    app.R.pr = 0;
    app.R.en = Math.min(100, app.R.en + 35);
    app.R.p.hp = Math.min(100, app.R.p.hp + 8);
    app.R.e.an = "stun";
    app.R.e.at = 0;
    app.R.e.fl = 0.15;
    app.R.jt = { s: "¡COMBO BREAKER!", c: "#baff55", l: 1.2 };
    app.events.emit(
      "pop",
      app.eX(),
      app.py() - 60,
      "¡COMBO BREAKER!",
      "#baff55",
      28,
    );
    app.events.emit(
      "spark",
      app.eX(),
      app.gy() - 65 * app.sc(),
      "#cfff77",
      30,
      360,
    );
    app.shake = 0.7;
    app.slow = 0.7;
    app.M.score += 650;
    app.events.emit("voice", "breaker");
    app.events.emit("sound:counter");
  };

  app.cancelChain = function cancelChain(reason) {
    app.R.chainBar = 0;
    app.R.chainReady = false;
    app.R.chainNote = null;
    app.R.cb = 0;
    app.R.mul = 1;
    if (reason)
      app.events.emit(
        "pop",
        app.pX(),
        app.py() - 48,
        "CADENA INTERRUMPIDA",
        "#ff6478",
        15,
      );
  };
  app.chainFinish = function chainFinish(note) {
    if (!app.R.chainReady || !note) return;
    app.R.chainReady = false;
    app.R.chainNote = null;
    app.R.chainBar = 0;
    app.R.cb = 0;
    app.R.mul = 1;
    app.M.score += 900;
    app.M.maxC = Math.max(app.M.maxC, 10);
    app.R.e.hp = Math.max(0, app.R.e.hp - 13 * app.power(app.R.p));
    app.R.e.an = "hurt";
    app.R.e.at = 0;
    app.R.e.fl = 0.2;
    app.shake = Math.max(app.shake, 0.48);
    app.slow = 0.22;
    app.events.emit(
      "spark",
      app.eX(),
      app.gy() - 70 * app.sc(),
      "#ffd58a",
      26,
      340,
    );
    app.events.emit(
      "pop",
      app.eX(),
      app.py() - 55,
      "¡CADENA ROTA!",
      "#ffd58a",
      27,
    );
    app.events.emit("sound:hit", note.l, true, 99, true);
  };
  app.scheduleChainFinish = function scheduleChainFinish() {
    if (app.R.chainReady || app.R.cb < 10) return;
    app.R.chainReady = true;
    const lane = Math.floor(Math.random() * 4),
      t = app.R.t + Math.max(0.82, 1.15 - app.R.cb * 0.012),
      T = 0.92;
    const n = { l: lane, t, T, special: 1 };
    app.R.notes.push(n);
    app.R.chainNote = n;
    app.events.emit(
      "pop",
      app.W / 2,
      app.LT() + 12,
      "REMATE DISPONIBLE",
      "#ffc36b",
      18,
    );
  };
  app.hurtP = function hurtP(d) {
    if (app.R.notes.some((n) => n.ai && !n.done && n.t <= app.R.t + 0.12))
      app.R.enemyCombo++;
    app.R.ec++;
    if (app.R.ec >= 2) app.startBreaker();
    app.R.prot = Math.max(0, app.R.prot - d * 1.35);
    app.R.lastProtHit = app.R.t;
    app.R.dc = 0;
    app.ambStop();
    d *= (1 + (app.R.pr / 100) * 0.6) * app.power(app.R.e);
    if (app.stance() === "def") d *= 0.7;
    if (app.R.guard) d *= 0.8;
    app.M.dmg += d;
    app.R.p.hp = Math.max(0, app.R.p.hp - d);
    app.R.p.an = "hurt";
    app.R.p.at = 0;
    app.R.p.fl = 0.12;
    app.shake = Math.max(
      app.shake,
      0.28 + Math.min(0.22, app.R.enemyCombo * 0.035),
    );
    app.R.p.fl = 0.18;
    app.events.emit(
      "pop",
      app.pX(),
      app.py(),
      "-" + Math.round(d),
      "#ff5c7a",
      22,
    );
    app.events.emit(
      "spark",
      app.pX(),
      app.gy() - 70 * app.sc(),
      "#ff5c7a",
      12,
      260,
    );
    app.events.emit("sound:hurt", d);
  };
  app.hitE = function hitE(d, i, P) {
    app.ecb();
    const aiResult = app.aiDefendPlayerAttack(i);
    if (aiResult === "block") d *= DIFFICULTY.blockedDamage[app.diff];
    else if (aiResult === "parry") d *= 0.18;
    d *= app.power(app.R.p);
    if (app.R.ex > 0) d *= 0.6;
    d *= 1 + Math.min(0.3, app.R.t / 300);
    if (app.R.adr > 0) d *= 2;
    if (app.gameMode === "survival") {
      app.M.score += Math.round((P ? 42 : 24) + Math.min(30, app.R.cb));
      app.R.e.hp = 100;
    } else {
      app.R.e.hp = Math.max(0, app.R.e.hp - d);
    }
    app.R.e.an = "hurt";
    app.R.e.at = 0;
    app.R.e.fl = 0.18;
    app.shake = Math.max(app.shake, 0.18 + d * 0.035);
    app.events.emit(
      "pop",
      app.eX(),
      app.py(),
      Math.round(d),
      app.R.adr > 0 ? "#ff9a1f" : "#ffd23f",
      16 + Math.min(20, d * 2.5),
    );
    app.events.emit(
      "spark",
      app.eX(),
      app.gy() - 70 * app.sc(),
      app.R.adr > 0 ? "#ff9a1f" : "#ffd23f",
      8 + Math.round(d * 2),
      240 + d * 30,
    );
    app.events.emit("sound:hit", i === undefined ? 0 : i, P, app.R.cb);
  };
  app.ok = function ok(q, pts, ch) {
    const P = q === "PERFECT";
    P ? app.M.perf++ : app.M.good++;
    app.R.ki++;
    app.M.score += Math.round(pts * (P ? 1 : 0.5) * app.R.mul);
    app.R.pr = Math.max(0, app.R.pr - (P ? 8 : 4));
    if (app.R.adr <= 0) app.R.am = Math.min(100, app.R.am + (P ? 7 : 3));
    app.R.jt = { s: q, c: P ? "#ffd23f" : "#7dffb0", l: 0.6 };
    if (P) app.events.emit("sound:perf");
  };
  app.atk = function atk(l, q) {
    app.ecb();
    app.R.defStreak = 0;
    if (app.R.ai) app.R.ai.counts[l]++;
    const P = q === "PERFECT",
      st = app.stance();
    let d =
      app.BASE_D[l] *
      (P ? 1.25 : q === "EARLY" ? 0.48 : 0.8) *
      (1 + Math.min(app.R.cb, 30) / 60);
    if (st === "atk") d *= 1.15;
    app.events.emit("sound:swing", l);
    app.R.p.an = app.MOVES[l];
    app.R.p.at = 0;
    app.hitE(d, l, P);
    app.ok(q, 100, P ? 3 : q === "EARLY" ? 0.25 : 1.5);
    app.R.cb++;
    app.R.chainBar = Math.min(10, app.R.cb);
    app.cbv();
    app.M.maxC = Math.max(app.M.maxC, app.R.cb);
    app.scheduleChainFinish();
    app.R.mul = Math.min(4, 1 + Math.floor(app.R.cb / 10) * 0.5);
    app.events.emit(
      "pop",
      app.pX() + 30 * app.sc(),
      app.py() + 10,
      app.NAMES[l],
      app.L[l].c,
      15,
    );
    if (app.R.ex <= 0) {
      const low = app.R.en < 30;
      app.R.en -= low ? 2.2 : 4.5;
      if (P) app.R.en += 2.5;
      if (app.laneState() === "defense") app.R.en += 3;
      app.R.en = Math.min(100, app.R.en);
      if (app.R.en <= 0) {
        app.R.en = 0;
        app.R.ex = 1.5;
        app.events.emit("pop", app.pX(), app.py() - 30, "AGOTADO", "#aaa");
      }
    }
    app.R.lastA = "atk";
    app.R.lastT = app.R.t;
  };
  app.blk = function blk(q, b) {
    app.ecb();
    app.R.enemyCombo = 0;
    app.R.chainBar = 0;
    app.R.chainReady = false;
    app.R.chainNote = null;
    app.R.cb = 0;
    app.R.mul = 1;
    app.R.defStreak++;
    const P = q === "PERFECT";
    app.R.prot = Math.max(0, app.R.prot - (P ? 1.5 : 3));
    app.ok(q, 60, 1);
    app.R.p.hp = Math.min(100, app.R.p.hp + (P ? 2 : 0.8));
    app.R.en = Math.min(100, app.R.en + 6);
    app.R.p.an = "block";
    app.R.p.at = 0;
    app.R.lastA = "def";
    app.R.lastT = app.R.t;
    app.events.emit("sound:block", P);
    app.events.emit(
      "spark",
      app.pX() + 30 * app.sc(),
      app.gy() - 70 * app.sc(),
      "#9b8cff",
      8,
      180,
    );
  };
  app.par = function par(q, b) {
    app.ecb();
    app.R.enemyCombo = 0;
    app.R.chainBar = 0;
    app.R.chainReady = false;
    app.R.chainNote = null;
    app.R.cb = 0;
    app.R.mul = 1;
    app.R.defStreak++;
    const P = q === "PERFECT";
    app.R.prot = Math.min(100, app.R.prot + (P ? 10 : 5));
    const c = app.R.lastA === "con" && app.stance() === "con";
    app.ok(q, 90, P ? (c ? 18 : 12) : 5);
    app.R.p.hp = Math.min(100, app.R.p.hp + (P ? 3.5 : 2));
    app.R.p.an = "parry";
    app.R.p.at = 0;
    if (P) {
      app.R.e.an = "stun";
      app.R.e.at = 0;
      b.pr = 1;
    }
    app.R.lastA = "con";
    app.R.lastT = app.R.t;
    app.events.emit("sound:parry", P);
    app.events.emit(
      "spark",
      app.pX() + 30 * app.sc(),
      app.gy() - 80 * app.sc(),
      "#ff7bd5",
      10,
      200,
    );
  };
  app.miss = function miss(n) {
    if (n.brk) {
      if (app.R.breaker && app.R.breaker.note === n) app.R.breaker = null;
      app.events.emit(
        "pop",
        app.pX(),
        app.py() - 45,
        "BREAKER PERDIDO",
        "#ff6478",
        16,
      );
      return;
    }
    app.M.miss++;
    app.R.stress = Math.min(4, app.R.stress + 1);
    if (app.gameMode === "survival")
      app.R.survMistakes = (app.R.survMistakes || 0) + 1;
    app.R.badPresses = 0;
    const k0 = app.R.ki;
    if (n.special) {
      app.cancelChain("fallo");
      return;
    }
    app.R.chainBar = 0;
    app.R.chainReady = false;
    app.R.chainNote = null;
    app.R.cb = 0;
    app.R.ki = Math.max(0, app.R.ki - 3);
    if (k0 >= 3) {
      if (app.R.ki < 3) app.brk(app.R.p, "#5ce1ff");
      else
        app.events.emit(
          "spark",
          app.pX(),
          app.gy() - 60 * app.sc(),
          "#5ce1ff",
          8,
          200,
        );
      app.events.emit("pop", app.pX(), app.py() - 55, "KI −3", "#5ce1ff", 16);
    }
    app.R.ac = 0;
    app.R.mul = 1;
    app.R.pr = Math.min(100, app.R.pr + 12);
    app.R.jt = { s: "MISS", c: "#ff4d6d", l: 0.6 };
    if (n.l > 3 || n.role === "def") app.hurtP(8);
    else {
      app.events.emit("sound:miss");
      app.hurtP(3);
      app.R.e.an = "punch";
      app.R.e.at = 0;
    }
  };
  app.adren = function adren() {
    if (
      app.mode === "play" &&
      !app.R.fin &&
      app.R.am >= 100 &&
      app.R.adr <= 0
    ) {
      app.R.adr = 6;
      app.R.ac = 1;
      app.R.am = 0;
      app.R.pr = 0;
      app.R.rdy = 0;
      app.events.emit(
        "pop",
        app.pX(),
        app.py() - 30,
        "¡ADRENALINA x2!",
        "#ffae00",
        26,
      );
      app.events.emit("sound:adr");
      app.events.emit("voice", "voice");
    }
  };
  app.wrongPress = function wrongPress(l) {
    if (!app.R || app.mode !== "play" || app.R.fin) return;
    app.R.badPresses = (app.R.badPresses || 0) + 1;
    app.R.survMistakes = (app.R.survMistakes || 0) + 1;
    app.R.pr = Math.min(100, app.R.pr + 5);
    app.R.cb = 0;
    app.R.mul = 1;
    app.R.chainBar = 0;
    app.R.chainReady = false;
    app.R.chainNote = null;
    app.R.ac = 0;
    app.R.stress = Math.min(4, app.R.stress + 1);
    app.events.emit(
      "pop",
      app.pX(),
      app.py() - 28,
      "¡ERROR " + app.R.badPresses + "/3!",
      "#ff6478",
      14,
    );
    app.osc(105, 62, 0.08, 0.13, "sawtooth");
    if (
      app.R.ai &&
      !app.R.notes.some((n) => n.ai && !n.done) &&
      app.R.t - (app.R.ai.lastPun || -9) > 2.2
    ) {
      app.R.ai.next = Math.min(app.R.ai.next, app.R.t + 0.5);
      app.R.ai.lastPun = app.R.t;
    }
    if (app.R.badPresses >= 3) {
      app.R.badPresses = 0;
      app.events.emit(
        "pop",
        app.pX(),
        app.py() - 58,
        "¡CASTIGO DEL RIVAL!",
        "#ff3e59",
        22,
      );
      app.R.e.an = "punch";
      app.R.e.at = 0;
      app.hurtP(app.gameMode === "survival" ? 7 : 5);
      if (app.R.ai && !app.R.notes.some((n) => n.ai && !n.done))
        app.R.ai.next = Math.min(app.R.ai.next, app.R.t + 0.6);
    }
  };
  app.press = function press(l) {
    if (app.mode !== "play") return;
    if (app.R.fin) {
      app.finPress(l);
      return;
    }
    const nw = performance.now();
    app.R.lp = app.R.t;
    if (
      l >= app.divLane(app.laneState()) &&
      app.R.breaker &&
      !app.R.breaker.ready
    ) {
      app.breakerInput(l);
      return;
    }
    if (
      app.R.breaker &&
      app.R.breaker.ready &&
      app.R.breaker.note &&
      !app.R.breaker.note.done &&
      l === app.R.breaker.note.l &&
      Math.abs(app.R.t - app.R.breaker.note.t) <= 0.17
    ) {
      app.R.breaker.note.done = 1;
      app.executeBreaker();
      return;
    }
    const pending = app.R.notes
      .filter((n) => !n.done && !n.brk)
      .sort((a, b) => a.t - b.t || (a.seq ?? 0) - (b.seq ?? 0));
    const b = pending[0];
    if (!b || b.l !== l) {
      app.wrongPress(l);
      return;
    }
    const delta = app.R.t - b.t,
      bd = Math.abs(delta);
    if (!app.canJudge(delta)) {
      app.wrongPress(l);
      return;
    }
    b.done = 1;
    app.R.badPresses = 0;
    app.R.stress = Math.max(0, app.R.stress - 0.3);
    if (delta < -0.22) app.R.heat = Math.min(8, app.R.heat + 1);
    else if (delta > -0.12) app.R.heat = Math.max(0, app.R.heat - 1.2);
    const q = app.classifyHit(delta);
    if (b.special) {
      if (bd <= 0.16) app.chainFinish(b);
      else app.cancelChain("fallo");
      return;
    }
    if (q === "EARLY") {
      app.R.en = Math.max(0, app.R.en - 3);
      app.R.prot = Math.min(100, app.R.prot + 2);
    }
    const asDef = l > 3 || b.role === "def";
    app.postInput(asDef ? -1 : 1);
    if (!asDef) app.atk(l, q);
    else if (l === 4 || l === 2) app.blk(q, b);
    else app.par(q, b);
  };
  app.endMatch = function endMatch(win) {
    app.$("breakerBtn").classList.remove("show");
    app.$("ultraBtn").classList.remove("show");
    app.R.breaker = null;
    app.R.win = win;
    app.M.won = win;
    if (win) app.M.score += Math.round(app.R.p.hp * 5 + app.R.p.bars * 300);
    (win ? app.R.e : app.R.p).an = "down";
    (win ? app.R.e : app.R.p).at = 0;
    app.events.emit("sound:ko");
    app.shake = Math.max(app.shake, 0.85);
    app.slow = 0.55;
    app.events.emit(
      "pop",
      win ? app.eX() : app.pX(),
      app.py() - 55,
      win ? "¡GOLPE FINAL!" : "¡KO!",
      "#ffd58a",
      32,
    );
    app.recordMatchHistory(
      app.gameMode === "survival" ? "loss" : win ? "win" : "loss",
    );
    app.events.emit(
      "spark",
      win ? app.eX() : app.pX(),
      app.gy() - 70 * app.sc(),
      "#fff0c2",
      42,
      460,
    );
    app.timers.schedule(() => app.events.emit("sound:end", win), 500);
    app.OVERAT = performance.now();
    app.setMode("over");
    app.timers.schedule(
      () =>
        app.events.emit(
          "voice",
          win
            ? app.M.dmg < 1
              ? app.VB.sfperfect
                ? "sfperfect"
                : "perfect"
              : app.rank() === "S"
                ? "supr"
                : "vict"
            : "over",
        ),
      700,
    );
    if (app.M.score > app.best) {
      app.best = Math.floor(app.M.score);
      try {
        localStorage.ob_best = app.best;
      } catch (e) {}
    }
  };
  app.update = function update(dt) {
    if (app.slow > 0) app.slow = Math.max(0, app.slow - dt);

    if (app.R.intro > 0) {
      app.R.intro -= dt;
      if (app.R.intro <= 0) {
        app.R.p.an = "idle";
        app.R.e.an = "idle";
        app.R.p.at = 0;
        app.R.e.at = 0;
      }
      return;
    }
    app.musSpd(dt);
    if (app.R.kd) {
      const f = app.R.kd.f;
      app.R.kd.t -= dt;
      if (app.R.kd.t < 0.75 && f.an === "down") {
        f.an = "getup";
        f.at = 0;
      }
      if (app.R.kd.t <= 0) {
        f.bars--;
        f.hp = 100;
        app.R.kd = null;
        app.R.nextStep = app.R.t + app.TT(app.R.rate) + 0.3;
        app.R.gq = [];
        app.events.emit("pop", f.x, app.py(), "¡SE LEVANTA!", "#fff", 24);
        app.events.emit("voice", "fight");
      }
      return;
    }
    if (app.R.fin) {
      app.R.t += dt;
      app.finUpdate(dt);
      return;
    }
    app.R.t += dt;
    app.postTick(dt);
    app.R.stress = Math.max(0, app.R.stress - dt * 0.1);
    app.R.heat = Math.max(0, app.R.heat - dt * 0.5);
    app.R.zf = Math.max(0, app.R.zf - dt * 1.6);
    {
      const idle = app.R.t - app.R.lp > 1,
        threat =
          app.R.t - app.R.lastEnemyAtk < 1.4 ||
          app.R.notes.some((n) => n.ai && !n.done && n.t - app.R.t < 0.6);
      app.R.guard = idle && threat;
      if (app.R.guard) {
        app.R.post += (-0.9 - app.R.post) * Math.min(1, dt * 2.5);
        app.R.en = Math.min(100, app.R.en + dt * 8);
      }
    }
    if (app.gameMode === "survival") {
      app.R.survClock += dt;
      app.M.score += dt * 2;
      const score = app.M.score;
      if (score >= app.R.survNextRelief) {
        app.R.survReliefUntil = app.R.t + 2.2;
        app.R.survNextRelief += 500;
        app.events.emit(
          "pop",
          app.W / 2,
          app.LT() + 34,
          "RESPIRO · " + Math.floor(score) + " PTS",
          "#baff55",
          16,
        );
      }
      const scoreRamp = Math.min(0.72, Math.floor(score / 250) * 0.055);
      const mistakeRamp = Math.min(0.45, Math.pow(1.14, app.R.stress) - 1);
      const relief = app.R.t < app.R.survReliefUntil ? 0.14 : 0;
      app.R.rate = Math.min(
        1.85,
        0.55 +
          app.DB[app.diff] +
          scoreRamp +
          mistakeRamp -
          relief +
          app.heatB(),
      );
    }
    app.aiThink();
    if (app.R.breaker && !app.R.breaker.ready) {
      app.R.breaker.t += dt;
      if (app.R.breaker.t > app.R.breaker.window) {
        app.R.breaker = null;
        app.$("breakerBtn").classList.remove("show");
        app.events.emit(
          "pop",
          app.pX(),
          app.py() - 45,
          "BREAKER PERDIDO",
          "#ff6478",
          16,
        );
      }
    }
    if (
      app.R.breaker &&
      app.R.breaker.ready &&
      app.R.breaker.note &&
      !app.R.breaker.note.done &&
      !app.R.notes.includes(app.R.breaker.note)
    )
      app.R.breaker = null;
    const tg = Math.min(0.46, app.R.cb * 0.016);
    app.R.cbs =
      app.R.cbs > tg
        ? Math.max(tg, app.R.cbs - 1.25 * dt)
        : Math.min(tg, app.R.cbs + 0.34 * dt);
    if (app.gameMode !== "survival")
      app.R.rate = Math.min(
        1.8,
        0.55 +
          app.DB[app.diff] +
          Math.min(0.75, (app.R.t / 240) * 0.75) +
          app.R.pr * 0.001 +
          app.R.cbs +
          app.heatB(),
      );
    while (app.R.t >= app.R.nextStep - app.TT(app.R.rate)) {
      app.gen(app.R.nextStep);
      app.R.nextStep += 0.4 / app.R.rate;
    }
    while (app.R.gq.length && app.R.gq[0].t <= app.R.t) {
      const q = app.R.gq.shift();
      if (!app.custom) app.music(q.s);
    }
    for (const n of app.R.notes) {
      if (n.l > 3 || n.role === "def") {
        const pu = n.l === 4 || n.l === 2;
        if (!n.w && app.R.t >= n.t - 0.5) {
          n.w = 1;
          app.R.e.an = pu ? "windP" : "windK";
          app.R.e.at = 0;
        }
        if (!n.s && app.R.t >= n.t - 0.04) {
          n.s = 1;
          app.R.lastEnemyAtk = app.R.t;
          if (n.pr) {
            app.R.e.an = "stun";
          } else app.R.e.an = pu ? "punch" : "kick";
          app.R.e.at = 0;
        }
      }
      if (!n.done && app.R.t - n.t > 0.14) {
        n.done = 1;
        app.miss(n);
      }
    }
    app.R.notes = app.R.notes.filter((n) => app.R.t - n.t < 0.5);
    const rd = app.R.am >= 100 && app.R.adr <= 0;
    if (rd && !app.R.rdy) {
      app.R.rdy = 1;
      app.events.emit("sound:ready");
    }
    if (!rd) app.R.rdy = 0;
    const pa = app.R.adr;
    app.R.adr = Math.max(0, app.R.adr - dt);
    if (pa > 0 && app.R.adr <= 0 && app.R.ac) {
      app.R.ac = 0;
      app.events.emit("voice", "killer");
      app.events.emit(
        "pop",
        app.pX(),
        app.py() - 55,
        "¡ADRENALINA PERFECTA!",
        "#ffd23f",
        26,
      );
      app.M.score += 1000;
      app.R.p.hp = Math.min(100, app.R.p.hp + 15);
    }
    if (app.R.t - app.R.lastProtHit > 1.25)
      app.R.prot = Math.min(
        100,
        app.R.prot + dt * (app.stance() === "def" ? 5 : 1.8),
      );
    if (app.R.ex > 0) {
      app.R.ex -= dt;
      if (app.R.ex <= 0) app.R.en = 35;
    } else
      app.R.en = Math.min(
        100,
        app.R.en + dt * (app.stance() === "def" ? 18 : 6),
      );
    app.R.pr = Math.max(0, app.R.pr - dt);
    for (const f of [app.R.p, app.R.e])
      if (f.hp <= 0 && !app.R.kd) {
        if (f === app.R.p && app.gameMode === "survival") {
          app.endMatch(false);
          break;
        } else if (f.bars > 1) {
          app.R.kd = { f, t: 2.4 };
          f.an = "down";
          f.at = 0;
          app.R.notes = [];
          app.R.ec = 0;
          if (f === app.R.p) {
            app.R.cb = 0;
            app.R.ki = 0;
          }
          app.slow = 0.8;
          app.shake = 0.5;
          app.events.emit("sound:ko");
          app.events.emit("pop", f.x, app.py(), "¡DERRIBADO!", "#ffd23f", 28);
        } else if (f === app.R.e) app.startFin();
        else app.endMatch(false);
      }
  };
  app.toMenu = function toMenu() {
    if (app.mode === "play" || app.mode === "pause") {
      app.recordMatchHistory("abandoned");
    }
    app.timers.clear();
    app.setMode("menu");
  };
  app.adv = function adv() {
    if (app.mode === "over" && app.overReady()) app.newMatch();
  };
  return function initialize() {
    app.divLane = (st) => (st === "attack" ? 4 : st === "defense" ? 2 : 3);
    app.DB = DIFFICULTY.rate;
    app.heatB = () => Math.min(0.25, Math.max(0, app.R.heat - 2) * 0.05);
    app.$("ultraBtn").addEventListener("click", (e) => {
      e.preventDefault();
    });
    app.power = (f) => (f.bars === 1 ? 1 + (1 - f.hp / 100) * 0.6 : 1);
    app.stance = () =>
      app.R.guard ? "def" : app.R.t - app.R.lastT < 2.5 ? app.R.lastA : "";
    app.pX = () => app.R.p.x;
    app.eX = () => app.R.e.x;
    app.gy = () =>
      app.mode === "menu"
        ? app.$("sp").getBoundingClientRect().bottom - 6
        : app.lay === "mid"
          ? app.H * 0.6
          : app.AH * 0.86;
    app.sc = () =>
      app.mode === "menu"
        ? Math.max(
            0.4,
            Math.min(
              1.3,
              (app.$("sp").getBoundingClientRect().height - 12) / 105,
            ),
          )
        : Math.max(0.7, Math.min(1.6, app.AH / 260));
    app.py = () => Math.max(85, app.gy() - 105 * app.sc());
    app.$("breakerBtn").addEventListener("click", (e) => {
      e.preventDefault();
      app.executeBreaker();
    });
    app.overReady = () => performance.now() - app.OVERAT > 500;
    app.overBtns = () => {
      const w = Math.min(app.W * 0.42, 190),
        h = 54,
        y = Math.min(app.H - h - 20, Math.max(app.H * 0.4 + 86, app.H * 0.56));
      return {
        a: { x: app.W / 2 - w - 8, y, w, h },
        b: { x: app.W / 2 + 8, y, w, h },
      };
    };
  };
}
