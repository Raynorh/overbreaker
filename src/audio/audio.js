import { unzip, validateAudio, IMPORT_LIMITS } from "./imports.js";
// Installs this system into one application instance; initialization is deferred.
export function install(app) {
  app.applyVol = function applyVol() {
    try {
      if (app.MG) app.MG.gain.value = 0.95 * app.VOL.m;
      if (app.MS) app.MS.gain.value = app.VOL.sfx;
      if (app.MM) app.MM.gain.value = app.VOL.mus;
      const am = document.getElementById("am"),
        amm = document.getElementById("amm");
      amm.volume = Math.min(1, 0.6 * app.VOL.mus * app.VOL.m);
      if (!(app.mode === "play" && app.custom))
        am.volume = Math.min(
          1,
          (+am.dataset.bv || 0.55) * app.VOL.mus * app.VOL.m,
        );
    } catch (e) {}
  };
  app.au = function au() {
    try {
      if (!app.AC) {
        app.AC = new (window.AudioContext || window.webkitAudioContext)();
        const c = app.AC.createDynamicsCompressor();
        c.threshold.value = -12;
        c.ratio.value = 8;
        app.MG = app.AC.createGain();
        app.MG.gain.value = 0.95;
        app.MG.connect(c);
        app.MS = app.AC.createGain();
        app.MM = app.AC.createGain();
        app.MS.connect(app.MG);
        app.MM.connect(app.MG);
        app.applyVol();
        c.connect(app.AC.destination);
        app.NB = app.AC.createBuffer(1, app.AC.sampleRate, app.AC.sampleRate);
        const d = app.NB.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      }
      if (app.AC.state !== "running") app.AC.resume();
      if (!app.au.u) {
        app.au.u = 1;
        try {
          navigator.audioSession.type = "playback";
        } catch (_) {}
        try {
          const sa = new Audio(
            "data:audio/wav;base64,UklGRuwAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YcgAAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgA==",
          );
          sa.loop = true;
          sa.play().catch(() => {});
        } catch (_) {}
        const sb = app.AC.createBufferSource();
        sb.buffer = app.AC.createBuffer(1, 1, 22050);
        sb.connect(app.AC.destination);
        sb.start(0);
      }
    } catch (e) {}
  };
  app.V = function V(src, t0, d, v, head) {
    const n = app.AC.createGain();
    n.gain.setValueAtTime(0.0001, t0);
    n.gain.linearRampToValueAtTime(v, t0 + 0.003);
    n.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
    (head || src).connect(n);
    n.connect(app.MUS ? app.MM : app.MS);
    src.start(t0);
    src.stop(t0 + d + 0.05);
  };
  app.osc = function osc(f0, f1, d, v, ty, dl) {
    if (!app.on()) return;
    try {
      const t = app.AC.currentTime + (dl || 0),
        o = app.AC.createOscillator();
      o.type = ty || "sine";
      o.frequency.setValueAtTime(f0, t);
      o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + d);
      app.V(o, t, d, v * (app.MUS ? app.md : 1));
    } catch (e) {}
  };
  app.nz = function nz(f0, f1, d, v, ty, q, dl) {
    if (!app.on()) return;
    try {
      const t = app.AC.currentTime + (dl || 0),
        s = app.AC.createBufferSource(),
        b = app.AC.createBiquadFilter();
      s.buffer = app.NB;
      s.loop = true;
      b.type = ty || "lowpass";
      b.Q.value = q || 1;
      b.frequency.setValueAtTime(f0, t);
      b.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + d);
      s.connect(b);
      app.V(s, t, d, v * (app.MUS ? app.md : 1), b);
    } catch (e) {}
  };
  app.voice = function voice(k, v) {
    if (!app.AC || !app.sfxOn || !app.VB[k]) return;
    try {
      if (app.AC.state !== "running") app.AC.resume();
      const t = app.AC.currentTime,
        p = app.VP[k] || 2;
      if (app.vcur && t < app.vend && app.vpri > p && t - app.vst < 1.2) return;
      if (app.vcur && t < app.vend) {
        try {
          app.vcur.n.gain.cancelScheduledValues(t);
          app.vcur.n.gain.setValueAtTime(app.vcur.n.gain.value, t);
          app.vcur.n.gain.linearRampToValueAtTime(0, t + 0.06);
          app.vcur.s.stop(t + 0.08);
        } catch (_) {}
      }
      const s = app.AC.createBufferSource(),
        n = app.AC.createGain();
      s.buffer = app.VB[k];
      n.gain.value = v || 1;
      s.connect(n);
      n.connect(app.MS);
      s.start();
      app.vcur = { s, n };
      app.vpri = p;
      app.vst = t;
      app.vend = t + app.VB[k].duration;
    } catch (e) {}
  };
  app.cbv = function cbv() {
    const i = app.CT.indexOf(app.R.cb);
    if (i >= 0) {
      app.voice(app.CK[i]);
      app.pop(
        app.pX(),
        app.py() - 55,
        app.CK[i].toUpperCase() + " COMBO!",
        "#ffd23f",
        24,
      );
    }
  };
  app.pick = function pick(b) {
    const a = app.xl(b);
    if (!a.length) return null;
    if (a.length === 1) return a[0];
    let x;
    do {
      x = a[(Math.random() * a.length) | 0];
    } while (x === app.LASTP[b]);
    return (app.LASTP[b] = x);
  };
  app.nrm = function nrm(b, tr) {
    let s = 0,
      n = 0,
      p = 0;
    for (let c = 0; c < b.numberOfChannels; c++) {
      const d = b.getChannelData(c);
      for (let i = 0; i < d.length; i++) {
        const v = d[i],
          a = v < 0 ? -v : v;
        if (a > p) p = a;
        if (i % 3 === 0) {
          s += v * v;
          n++;
        }
      }
    }
    const r = Math.sqrt(s / Math.max(1, n)) || 0.1;
    return Math.max(0.2, Math.min(tr / r, 0.97 / Math.max(p, 0.01), 6));
  };
  app.addX = async function addX(nm, buf) {
    const k = app.XK.find((a) => a[1].test(nm));
    if (!k) return 0;
    validateAudio(buf);
    const b = await app.AC.decodeAudioData(buf),
      bk = k[0];
    if (b.duration > IMPORT_LIMITS.duration)
      throw new Error("Audio demasiado largo");
    (app.XB[bk] = app.XB[bk] || {})[nm] = {
      b,
      g: app.nrm(b, app.TR[bk] || 0.3),
      n: nm,
      k: bk,
    };
    return 1;
  };
  app.xfade = function xfade(c, d) {
    try {
      const t = app.AC.currentTime;
      c.g.gain.cancelScheduledValues(t);
      c.g.gain.setValueAtTime(c.g.gain.value, t);
      c.g.gain.linearRampToValueAtTime(0, t + d);
      c.s.stop(t + d + 0.02);
    } catch (e) {}
  };
  app.xplay = function xplay(ch, b, o) {
    if (!app.AC || !app.sfxOn) return false;
    const it = o.it || app.pick(b);
    if (!it) return false;
    const t = app.AC.currentTime;
    if (t < app.lockUntil && !o.force) return true;
    const c = app.CHN[ch];
    if (c && t < c.end) {
      if (c.p > o.p && t - c.t0 < c.prot) return true;
      app.xfade(c, 0.035);
    }
    const s = app.AC.createBufferSource(),
      g = app.AC.createGain();
    s.buffer = it.b;
    g.gain.value = it.g * (o.v || 1) * (app.LV[b] || 1);
    s.connect(g);
    g.connect(app.MS);
    s.start(t);
    app.CHN[ch] = {
      s,
      g,
      t0: t,
      end: t + it.b.duration,
      p: o.p,
      prot: o.prot || 0.1,
    };
    return true;
  };
  app.ambStop = function ambStop() {
    const c = app.CHN.amb;
    if (c && app.AC && app.AC.currentTime < c.end) app.xfade(c, 0.2);
  };
  app.sHit = function sHit(l, P, ct, big) {
    if (!app.AC || !app.sfxOn) return false;
    if (l < 0) return true;
    let ti = big ? 3 : [P ? 1 : 0, 0, P ? 2 : 1, P ? 3 : 2][l];
    if (app.R && app.R.adr > 0) ti = Math.min(3, ti + 1);
    let b = l === 1 && !big ? "kick" : app.TIER[ti];
    if (l !== 1 && ct >= 10 && !big && Math.random() < 0.5)
      b = P || ti >= 2 ? "clong" : "clongS";
    if (!app.xhas(b)) {
      b = ["norm", "med", "soft", "heavy", "kick"].find(app.xhas);
      if (!b) return false;
    }
    return app.xplay("imp", b, { p: b === "heavy" ? 3 : 2, prot: 0.09 });
  };
  app.sHurt = function sHurt(d) {
    if (!app.AC || !app.sfxOn) return false;
    let b = d >= 6 ? "heavy" : "med";
    if (!app.xhas(b)) {
      b = ["heavy", "med", "norm"].find(app.xhas);
      if (!b) return false;
    }
    let it = null;
    if (b === "heavy" && app.R && (d >= 10 || app.power(app.R.e) > 1.3))
      it = app.xl("heavy").find((x) => /tambien/.test(x.n)) || null;
    return app.xplay("imp", b, { p: 4, prot: 0.18, it });
  };
  app.sDef = function sDef(kind, P) {
    if (!app.AC || !app.sfxOn || !app.R) return false;
    const t = app.AC.currentTime;
    app.R.dc = (app.R.dc || 0) + 1;
    let b = kind;
    if (app.R.dc >= 2 && P && t - (app.R.lsq || -9) > 3 && app.xhas("seq")) {
      b = "seq";
      app.R.lsq = t;
    }
    if (app.R.dc >= 5 && t - (app.R.lsl || -9) > 8 && app.xhas("seqS")) {
      b = "seqS";
      app.R.lsl = t;
    }
    if (app.R.dc >= 6 && t - (app.R.lrl || -9) > 18 && app.xhas("rally")) {
      app.xplay("amb", "rally", { p: 1, prot: 0 });
      app.R.lrl = t;
    }
    if (!app.xhas(b)) return false;
    const big = b === "seq" || b === "seqS";
    return app.xplay("def", b, { p: big ? 3 : 2, prot: big ? 0.3 : 0.08 });
  };
  app.sWhiff = function sWhiff() {
    if (!app.xhas("whiff")) return false;
    const t = app.AC ? app.AC.currentTime : 0;
    if (t - app.lw < 0.18) return true;
    app.lw = t;
    return app.xplay("def", "whiff", { p: 0, prot: 0.05 });
  };
  app.bedStart = function bedStart(k, f) {
    const it = app.xl(k)[0];
    if (!it) return null;
    if (!app.BUS) {
      app.BUS = app.AC.createGain();
      app.BUS.connect(app.MS);
    }
    const t = app.AC.currentTime,
      s = app.AC.createBufferSource(),
      g = app.AC.createGain();
    s.buffer = it.b;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(it.g * (app.LV[k] || 1), t + f);
    s.connect(g);
    g.connect(app.BUS);
    s.start(t);
    return { k, s, g, t0: t, d: it.b.duration };
  };
  app.bedStop = function bedStop(o, f) {
    try {
      const t = app.AC.currentTime;
      o.g.gain.cancelScheduledValues(t);
      o.g.gain.setValueAtTime(o.g.gain.value, t);
      o.g.gain.linearRampToValueAtTime(0.0001, t + f);
      o.s.stop(t + f + 0.05);
    } catch (e) {}
  };
  app.bed = function bed(k) {
    if (!app.AC) return;
    const c = app.BED;
    if (c && c.k === k) {
      if (app.BLOOP[k] && app.AC.currentTime - c.t0 > c.d - 1.3) {
        const n = app.bedStart(k, 1.3);
        if (n) {
          app.bedStop(c, 1.3);
          app.BED = n;
        }
      }
      return;
    }
    if (c) {
      app.bedStop(c, 0.8);
      app.BED = null;
    }
    if (k && app.xhas(k)) app.BED = app.bedStart(k, k === "adrDur" ? 1 : 0.8);
  };
  app.auraTick = function auraTick(dt) {
    if (!app.AC) return;
    const t = app.AC.currentTime,
      pl = app.mode === "play" && app.R && app.R.intro <= 0 && app.sfxOn;
    let want = null,
      mt = 1;
    if (pl) {
      const e = app.R.fin ? 60 : app.R.ki;
      if (app.R.adr > 0) {
        want = "adrDur";
        mt = 0.55;
      } else if (e >= 37) want = "auraB";
      else if (e >= 3) want = "auraA";
      if (e >= 7 && app.AK.prev < 7 && app.R.adr <= 0 && t - app.AK.ign > 5) {
        app.xplay("aur", "auraIgn", { p: 2, prot: 0.3 });
        app.AK.ign = t;
      }
      app.AK.prev = e;
    } else {
      app.AK.prev = 0;
      if (app.mode !== "play") app.ambStop();
    }
    app.bed(want);
    if (app.BUS) app.BUS.gain.setTargetAtTime(t < app.vend ? 0.45 : 1, t, 0.12);
    app.md += ((t < app.vend ? 0.65 : 1) * mt - app.md) * Math.min(1, dt * 6);
    const a = app.$("am");
    if (app.custom && a.src && app.mode === "play")
      a.volume = Math.max(
        0,
        Math.min(1, (+a.dataset.bv || 0.55) * app.md * app.VOL.mus * app.VOL.m),
      );
  };
  app.xtest = function xtest() {
    app.au();
    const all = [];
    for (const b in app.XB) for (const n in app.XB[b]) all.push(app.XB[b][n]);
    if (!all.length) return;
    all.sort((a, b) => (a.k < b.k ? -1 : a.k > b.k ? 1 : a.n < b.n ? -1 : 1));
    const it = all[app.xti++ % all.length];
    if (app.xtc) app.xfade(app.xtc, 0.05);
    const t = app.AC.currentTime,
      d = Math.min(it.b.duration, 4),
      s = app.AC.createBufferSource(),
      g = app.AC.createGain();
    s.buffer = it.b;
    g.gain.setValueAtTime(it.g * (app.LV[it.k] || 1), t);
    g.gain.setValueAtTime(it.g * (app.LV[it.k] || 1), t + d - 0.2);
    g.gain.linearRampToValueAtTime(0, t + d);
    s.connect(g);
    g.connect(app.MG);
    s.start(t);
    s.stop(t + d + 0.05);
    app.xtc = { s, g };
  };
  app.setMus = function setMus(k, buf) {
    validateAudio(buf);
    const el = app.$(k === "mmenu" ? "amm" : "am");
    app.replaceAudioSource(el, new Blob([buf]));
    el.volume = k === "mmenu" ? 0.6 : 0.55;
    el.dataset.bv = el.volume;
    app.MB[k] = 1;
    if (k === "mbattle") app.custom = 1;
    app.applyVol();
  };
  app.musicSync = function musicSync() {
    const a = app.$("am"),
      m = app.$("amm");
    if (!app.musOn) {
      a.pause();
      m.pause();
      return;
    }
    if (app.mode === "menu") {
      a.pause();
      if (app.MB.mmenu && m.paused) m.play().catch(() => {});
    } else {
      m.pause();
      if (
        app.mode === "play" &&
        app.R &&
        app.R.intro <= 0 &&
        !app.R.kd &&
        app.custom &&
        a.src &&
        a.paused
      )
        a.play().catch(() => {});
      if (app.mode !== "play" || app.R?.intro > 0 || app.R?.kd) {
        a.pause();
        try {
          a.playbackRate = 1;
        } catch (_) {}
      }
    }
  };
  app.loadVoices = async function loadVoices(files, persist = true) {
    if (files.length > IMPORT_LIMITS.files)
      throw new Error("Demasiados archivos");
    let total = 0;
    app.au();
    if (!app.AC) return;
    const items = [];
    for (const f of files) {
      if (f.size > IMPORT_LIMITS.archive)
        throw new Error("Archivo demasiado grande");
      total += f.size;
      if (total > IMPORT_LIMITS.total)
        throw new Error("Importación demasiado grande");
      const b = await f.arrayBuffer();
      if (/\.zip$/i.test(f.name)) {
        try {
          items.push(...(await unzip(b)));
        } catch (e) {
          throw new Error("No se pudo importar el ZIP: " + e.message);
        }
      } else {
        validateAudio(b);
        items.push({ name: f.name, buf: b });
      }
    }
    if (
      items.length > IMPORT_LIMITS.files ||
      items.reduce((sum, it) => sum + it.buf.byteLength, 0) >
        IMPORT_LIMITS.total
    )
      throw new Error("Importación demasiado grande");
    let n = 0;
    for (const it of items) {
      validateAudio(it.buf);
      const nm = it.name.toLowerCase().replace(/[^a-z0-9]+/g, " "),
        k = app.VK.find((a) => a[1].test(nm));
      if (app.XK.some((a) => a[1].test(nm))) {
        try {
          const saved = it.buf.slice(0);
          n += await app.addX(nm, it.buf);
          if (persist) await app.idbPut("x:" + nm, saved);
        } catch (e) {
          console.warn("No se pudo importar el efecto", it.name, e);
        }
        continue;
      }
      if (!k) continue;
      try {
        const saved = it.buf.slice(0);
        if (k[0] === "mmenu" || k[0] === "mbattle") app.setMus(k[0], it.buf);
        else {
          const decoded = await app.AC.decodeAudioData(it.buf);
          if (decoded.duration > IMPORT_LIMITS.duration)
            throw new Error("Audio demasiado largo");
          app.VB[k[0]] = decoded;
          n++;
        }
        if (persist) await app.idbPut(k[0], saved);
      } catch (e) {
        console.warn("No se pudo importar", it.name, e);
      }
    }
    app.syncUI();
    app.musicSync();
    if (n) app.voice("welcome");
  };
  app.music = function music(s) {
    app.MUS = 1;
    const iv = 0.4 / app.R.rate,
      c = app.CH[((s / 4) | 0) % 4];
    app.osc(140, 45, 0.16, 0.55, "sine");
    if (s % 2 === 1) app.nz(2500, 1500, 0.1, 0.22, "bandpass");
    app.nz(7000, 7000, 0.04, 0.12, "highpass", 1, iv / 2);
    app.osc(c[0], c[0] * 0.98, iv * 0.45, 0.38, "triangle");
    app.osc(c[0], c[0] * 0.98, iv * 0.45, 0.38, "triangle", iv / 2);
    for (let i = 0; i < 4; i++) {
      const f = c[[0, 1, 2, 1][i]] * 4;
      app.osc(f, f, iv * 0.2, 0.05, "square", (i * iv) / 4);
    }
    if (s % 4 === 0)
      [c[0] * 2, c[2] * 2].forEach((f) =>
        app.osc(f, f, iv * 3.8, 0.045, "sawtooth"),
      );
    app.MUS = 0;
  };
  return function initialize() {
    app.AC = undefined;
    app.MG = undefined;
    app.NB = undefined;
    app.MS = undefined;
    app.MM = undefined;
    app.VOL = app.readVolumes();
    app.on = () => app.AC && (app.MUS ? app.musOn : app.sfxOn);
    app.S = {
      swing(i) {
        if (app.hasHit()) return;
        app.nz(500, 2800, 0.09 + 0.03 * i, 0.2, "bandpass", 1.5);
      },
      hit(i, P, ct, big) {
        if (i < 0 || app.sHit(i, P, ct, big)) return;
        const p = [0.55, 0.8, 0.75, 1][i],
          d = 0.035;
        app.osc(170, 45, 0.12 + 0.1 * p, 0.95 * p, "sine", d);
        app.osc(1000, 120, 0.05, 0.3, "square", d);
        app.nz(3500, 250, 0.09 + 0.07 * p, 0.8 * p, "lowpass", 0.7, d);
        if (i === 3) {
          app.osc(85, 26, 0.4, 1, "sine", d + 0.02);
          app.nz(1400, 60, 0.3, 0.6, "lowpass", 0.7, d + 0.02);
        }
        if (i === 1) app.osc(110, 35, 0.18, 0.7, "sine", d);
      },
      // Choque de golpes: varias explosiones de impactos fuertes seguidas.
      clash() {
        [0, 0.045, 0.1].forEach((d, i) => {
          app.osc(150 - i * 22, 38, 0.2, 1, "sine", d);
          app.osc(900, 100, 0.06, 0.35, "square", d);
          app.nz(3800, 200, 0.14, 0.95, "lowpass", 0.7, d);
        });
        app.osc(70, 22, 0.5, 1.2, "sine", 0.1);
        app.nz(1800, 70, 0.4, 0.9, "lowpass", 0.7, 0.1);
      },
      block(P) {
        if (app.sDef("blk", P)) return;
        app.osc(130, 55, 0.1, 0.6);
        app.nz(5000, 1500, 0.08, 0.45, "highpass");
        app.osc(900, 880, 0.14, 0.12, "square");
        app.osc(1370, 1350, 0.1, 0.08, "square");
      },
      parry(P) {
        if (app.sDef("parry", P)) return;
        app.osc(2093, 2093, 0.4, 0.14, "sine");
        app.osc(3136, 3100, 0.35, 0.09, "sine");
        app.nz(6000, 2000, 0.06, 0.45, "highpass");
        app.osc(200, 70, 0.08, 0.5);
      },
      hurt(d) {
        if (app.sHurt(d)) return;
        app.osc(120, 30, 0.24, 1.1, "sine");
        app.nz(2500, 150, 0.2, 0.9, "lowpass");
        app.osc(260, 60, 0.2, 0.22, "sawtooth");
      },
      miss() {
        if (app.hasHit()) return;
        app.osc(90, 55, 0.09, 0.18, "triangle");
      },
      perf() {
        app.osc(1568, 2093, 0.1, 0.09, "sine");
        app.osc(2349, 3136, 0.12, 0.06, "sine", 0.03);
      },
      counter() {
        if (app.xplay("imp", "counter", { p: 5, prot: 0.4 })) {
          app.lockUntil = app.AC.currentTime + 0.45;
          return;
        }
        app.nz(300, 4000, 0.28, 0.28, "bandpass", 2);
        app.osc(70, 22, 0.55, 1.2, "sine", 0.28);
        app.nz(2000, 80, 0.5, 1, "lowpass", 0.7, 0.28);
        [392, 523, 659, 784].forEach((f, i) =>
          app.osc(f, f, 0.18, 0.08, "square", 0.28 + i * 0.05),
        );
      },
      adr() {
        if (app.xplay("aur", "adrAct", { p: 4, prot: 0.6, force: 1 })) return;
        app.osc(120, 900, 0.55, 0.16, "sawtooth");
        app.nz(400, 6000, 0.55, 0.22, "bandpass", 3);
        app.osc(60, 25, 0.45, 0.9, "sine", 0.5);
      },
      ready() {
        app.osc(880, 880, 0.22, 0.12, "triangle");
        app.osc(1320, 1320, 0.32, 0.12, "triangle", 0.12);
        app.osc(1760, 1760, 0.4, 0.1, "triangle", 0.24);
      },
      end(w) {
        (w ? [392, 494, 587, 784] : [392, 330, 262, 196]).forEach((f, i) =>
          app.osc(f, f, 0.25, 0.1, w ? "square" : "sawtooth", i * 0.12),
        );
      },
      ko() {
        const hv =
          app.xl("heavy").find((x) => /tambien/.test(x.n)) || app.pick("heavy");
        if (hv && app.xplay("imp", "heavy", { it: hv, p: 5, prot: 0.4 }))
          return;
        app.osc(100, 25, 0.8, 1.2);
        app.nz(1500, 50, 0.7, 1);
      },
      click() {
        app.osc(500, 700, 0.06, 0.1, "square");
      },
    };
    app.CH = [
      [110, 131, 165, 220],
      [87.3, 110, 131, 174.6],
      [98, 123.5, 147, 196],
      [82.4, 103.8, 123.5, 164.8],
    ];
    app.MB = {};
    app.VK = [
      ["mmenu", /rose of may/],
      ["mbattle", /\bbattle\b/],
      ["sfperfect", /street fighter/],
      ["perfect", /\bperfect\b/],
      ["triple", /triple combo/],
      ["super", /super combo/],
      ["hyper", /hyper combo/],
      ["brutal", /brutal combo/],
      ["master", /master combo/],
      ["awesome", /awesome combo/],
      ["blaster", /blaster combo/],
      ["monster", /monster combo/],
      ["king", /king combo/],
      ["killer", /killer combo/],
      ["ultra", /ultra combo/],
      ["breaker", /combo breaker/],
      ["fight", /fight on/],
      ["over", /game over/],
      ["ready", /\bready\b/],
      ["welcome", /\bwelcome\b/],
      ["vict", /awesome victory/],
      ["supr", /supreme victory/],
      ["voice", /\bvoice\b/],
    ];
    app.CT = [3, 6, 10, 14, 18, 22, 27, 33, 40, 48, 57];
    app.CK = [
      "triple",
      "super",
      "hyper",
      "brutal",
      "master",
      "awesome",
      "blaster",
      "monster",
      "king",
      "killer",
      "ultra",
    ];
    app.VB = {};
    app.vcur = null;
    app.VP = {
      over: 5,
      vict: 5,
      supr: 5,
      perfect: 5,
      sfperfect: 5,
      ultra: 4,
      breaker: 4,
      voice: 3,
      fight: 2,
      ready: 2,
      welcome: 1,
    };
    app.vpri = 0;
    app.vst = 0;
    app.XK = [
      ["seqS", /esquiva esquiva pega lento/],
      ["seq", /esquiva esquiva pega/],
      ["rally", /golpes sin efecto|defensa de ambos/],
      ["counter", /contraat/],
      ["whiff", /golpe fuerte esquivado/],
      ["parry", /(esqu?i?var|equivar) patada/],
      ["blk", /\b(esqu?i?var|equivar)\b/],
      ["clongS", /suave durante combo/],
      ["clong", /durante combo larg/],
      ["auraIgn", /activa el aura/],
      ["adrAct", /activar adrenalina/],
      ["adrDur", /durante la adrenalina/],
      ["auraA", /iniciando cadena/],
      ["auraB", /ultima aura|aura activa por mantener/],
      ["heavy", /golpe fuerte|tambien fuerte|seguno golpe/],
      ["med", /semi ?fuerte|fuertesito/],
      ["soft", /golpe suave/],
      ["kick", /patada suave/],
      ["norm", /golpe/],
    ];
    app.XB = {};
    app.CHN = {};
    app.LV = {
      soft: 0.75,
      norm: 0.9,
      med: 1,
      heavy: 1.05,
      kick: 0.9,
      clong: 0.85,
      clongS: 0.8,
      blk: 0.85,
      parry: 1.1,
      seq: 0.9,
      seqS: 0.9,
      whiff: 0.5,
      counter: 1.1,
      rally: 0.55,
      auraIgn: 0.9,
      adrAct: 1,
      auraA: 0.85,
      auraB: 0.9,
      adrDur: 1,
    };
    app.TR = { auraA: 0.09, auraB: 0.09, adrDur: 0.1, adrAct: 0.22 };
    app.LASTP = {};
    app.HB = ["soft", "norm", "med", "heavy", "kick"];
    app.TIER = ["soft", "norm", "med", "heavy"];
    app.xl = (b) => Object.values(app.XB[b] || {});
    app.xhas = (b) => app.xl(b).length > 0;
    app.hasHit = () => app.HB.some(app.xhas);
    app.xn = () =>
      Object.values(app.XB).reduce((a, o) => a + Object.keys(o).length, 0);
    app.lw = 0;
    app.BED = null;
    app.BLOOP = { auraA: 1, auraB: 1 };
    app.AK = { prev: 0, ign: -9 };
    app.xtc = null;
    app.xti = 0;
  };
}
