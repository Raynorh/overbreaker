// Installs this system into one application instance; initialization is deferred.
export function install(app) {
  app.mkF = function mkF(face, col, dk) {
    const q = {},
      v = {};
    for (const k of app.PK) {
      q[k] = app.BASE[k];
      v[k] = 0;
    }
    return {
      face,
      col,
      dk,
      hp: 100,
      bars: 2,
      an: "idle",
      at: 0,
      x: 0,
      ph: face * 1.3,
      q,
      v,
      tr: [],
      fl: 0,
      sb: {},
    };
  };
  app.tgt = function tgt(f) {
    const b = Object.assign({}, app.BASE, f.sb),
      A = app.AN[f.an];
    b.hy += Math.sin(app.clock * 7 + f.ph) * 2.5;
    b.hx += Math.sin(app.clock * 3.5 + f.ph) * 3;
    b.a1 += Math.sin(app.clock * 7 + f.ph + 1) * 0.06;
    b.rot = 0;
    if (!A) return b;
    const fr = A[1],
      p = Math.min(1, f.at / A[0]);
    let i = 0;
    while (i < fr.length - 2 && p > fr[i + 1][0]) i++;
    const t0 = fr[i][0],
      t1 = fr[i + 1][0],
      k0 = fr[i][1],
      k1 = fr[i + 1][1],
      w = t1 > t0 ? Math.max(0, Math.min(1, (p - t0) / (t1 - t0))) : 1,
      s = w * w * (3 - 2 * w),
      o = {};
    for (const k of app.PK) {
      const x = k0[k] !== undefined ? k0[k] : b[k],
        y = k1[k] !== undefined ? k1[k] : b[k];
      o[k] = x + (y - x) * s;
    }
    o.rot = f.an === "flip" ? -p * 6.283 : 0;
    return o;
  };
  app.spring = function spring(f, dt) {
    const T = app.tgt(f),
      n = Math.max(1, Math.ceil(dt / 0.008)),
      h = dt / n;
    for (let j = 0; j < n; j++)
      for (const k of app.PK) {
        const K = k === "hx" || k === "hy" ? 450 : 650,
          C = 1.5 * Math.sqrt(K);
        f.v[k] += ((T[k] - f.q[k]) * K - f.v[k] * C) * h;
        f.q[k] += f.v[k] * h;
      }
    f.rot = T.rot;
    // Trail positions belong to animation updates, in unscaled local coordinates.
    if (dt > 0) {
      if (["punch", "kick", "gancho", "heavy"].includes(f.an)) {
        const q = f.q,
          leg = f.an === "kick" || f.an === "heavy";
        const length = leg ? 26 + Math.min(14, Math.max(0, q.hy)) * 0.5 : 21;
        const a = leg ? q.c1 : q.a1,
          b = leg ? q.d1 : q.b1;
        f.tr.push([
          length * (Math.sin(a) + Math.sin(b)),
          (leg ? 0 : -25) + length * (Math.cos(a) + Math.cos(b)),
        ]);
        if (f.tr.length > 7) f.tr.shift();
      } else f.tr.length = 0;
    }
  };
  app.drawF = function drawF(f, aura, gy, s, g) {
    const q = f.q,
      atk = ["punch", "kick", "gancho", "heavy"].includes(f.an),
      leg = f.an === "kick" || f.an === "heavy";
    g.fillStyle = "#0006";
    g.beginPath();
    g.ellipse(f.x, gy, 30 * s, 5 * s, 0, 0, 6.29);
    g.fill();
    g.save();
    g.translate(f.x + f.face * q.hx * s, gy - 52 * s + q.hy * s);
    g.scale(f.face, 1);
    g.rotate(f.rot || 0);
    g.lineCap = "round";
    g.lineJoin = "round";
    g.lineWidth = 5 * s;
    if (aura) {
      g.shadowColor = "#ffd23f";
      g.shadowBlur = 25;
    }
    const fl = f.fl > 0,
      c = fl ? "#fff" : aura ? "#ffd23f" : f.col,
      dk = fl ? "#ddd" : aura ? "#d9a800" : f.dk,
      ll = (26 + Math.min(14, Math.max(0, q.hy)) * 0.5) * s;
    let E = null;
    const limb = (sx, sy, a, b, len, col) => {
      const kx = sx + len * Math.sin(a),
        ky = sy + len * Math.cos(a),
        ex = kx + len * Math.sin(b),
        ey = ky + len * Math.cos(b);
      g.strokeStyle = col;
      g.beginPath();
      g.moveTo(sx, sy);
      g.lineTo(kx, ky);
      g.lineTo(ex, ey);
      g.stroke();
      return [ex, ey];
    };
    limb(0, 0, q.c2, q.d2, ll, dk);
    const fe = limb(0, 0, q.c1, q.d1, ll, c);
    if (leg) E = fe;
    g.save();
    g.rotate(q.ln);
    limb(0, -25 * s, q.a2, q.b2, 21 * s, dk);
    g.strokeStyle = c;
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(0, -28 * s);
    g.stroke();
    g.fillStyle = c;
    g.beginPath();
    g.arc(0, -39 * s, 9 * s, 0, 6.29);
    g.fill();
    g.fillStyle = "#000";
    g.beginPath();
    g.arc(4 * s, -40 * s, 1.8 * s, 0, 6.29);
    g.fill();
    const ae = limb(0, -25 * s, q.a1, q.b1, 21 * s, c);
    if (!leg) E = ae;
    if (atk && E) {
      g.shadowBlur = 0;
      for (let i = 1; i < f.tr.length; i++) {
        const a = f.tr[i - 1],
          b = f.tr[i];
        g.strokeStyle = "rgba(255,255,255," + (i / f.tr.length) * 0.7 + ")";
        g.lineWidth = (7 * s * i) / f.tr.length;
        g.beginPath();
        g.moveTo(a[0] * s, a[1] * s);
        g.lineTo(b[0] * s, b[1] * s);
        g.stroke();
      }
    }
    g.restore();
    g.restore();
  };
  return function initialize() {
    app.PK = ["hx", "hy", "ln", "a1", "b1", "a2", "b2", "c1", "d1", "c2", "d2"];
    app.BASE = {
      hx: 0,
      hy: 0,
      ln: 0.1,
      a1: 1,
      b1: 1.9,
      a2: 0.5,
      b2: 1.5,
      c1: 0.45,
      d1: -0.1,
      c2: -0.4,
      d2: -0.05,
    };
    app.GU = { a1: 1.5, b1: 2.9, a2: 1.3, b2: 2.8, ln: -0.1, hy: 9, hx: -4 };
    app.DN0 = {
      ln: -1.45,
      hy: 42,
      hx: -22,
      a1: 0.6,
      b1: 0.3,
      a2: 0.5,
      b2: 0.3,
      c1: 1.2,
      d1: 0.5,
      c2: 1,
      d2: 0.3,
    };
    app.P1 = {
      a1: 2.6,
      b1: 2.9,
      a2: 0.9,
      b2: 1.5,
      ln: 0.05,
      hy: 6,
      c1: 0.7,
      d1: -0.1,
      c2: -0.6,
      d2: -0.1,
    };
    app.P2 = {
      a1: 1.7,
      b1: 1.7,
      a2: -1.7,
      b2: -1.7,
      ln: -0.1,
      hy: 5,
      c1: 0.75,
      d1: -0.05,
      c2: -0.75,
      d2: -0.05,
    };
    app.AN = {
      pose1: [
        1,
        [
          [0, {}],
          [0.5, app.P1],
          [1, app.P1],
        ],
        1,
      ],
      pose2: [
        1,
        [
          [0, {}],
          [0.5, app.P2],
          [1, app.P2],
        ],
        1,
      ],
      down: [
        1,
        [
          [0, {}],
          [0.25, app.DN0],
          [1, app.DN0],
        ],
        1,
      ],
      getup: [
        0.7,
        [
          [0, app.DN0],
          [0.6, { ln: 0.3, hy: 12 }],
          [1, {}],
        ],
      ],
      punch: [
        0.28,
        [
          [0, {}],
          [0.2, { a1: 0.4, b1: 0.9, ln: -0.1, hx: -5 }],
          [0.4, { a1: 1.57, b1: 1.57, ln: 0.4, hx: 16, a2: 1, b2: 2.4 }],
          [1, {}],
        ],
      ],
      kick: [
        0.4,
        [
          [0, {}],
          [0.25, { c1: 0.9, d1: -0.8, ln: -0.2, hx: -2, a1: 1.4, b1: 2.2 }],
          [0.45, { c1: 1.5, d1: 1.5, ln: -0.35, hx: 12 }],
          [1, {}],
        ],
      ],
      gancho: [
        0.42,
        [
          [0, {}],
          [0.22, { a1: -0.1, b1: 0.5, ln: -0.3, hy: 12, hx: -4 }],
          [0.5, { a1: 2.5, b1: 2.9, ln: 0.3, hy: -9, hx: 12, c1: 0.6 }],
          [1, {}],
        ],
      ],
      heavy: [
        0.55,
        [
          [0, {}],
          [
            0.28,
            {
              ln: -0.55,
              a1: 0.3,
              b1: 0.6,
              a2: 0.3,
              b2: 0.6,
              c1: 0.9,
              d1: -0.3,
              hx: -8,
            },
          ],
          [
            0.55,
            {
              c1: 1.7,
              d1: 1.7,
              ln: -0.6,
              a1: 2.3,
              b1: 2.3,
              a2: -0.9,
              b2: -0.9,
              hx: 20,
            },
          ],
          [1, {}],
        ],
      ],
      block: [
        0.4,
        [
          [0, {}],
          [0.15, app.GU],
          [0.7, app.GU],
          [1, {}],
        ],
      ],
      parry: [
        0.32,
        [
          [0, {}],
          [0.2, { a1: 2, b1: 2.7, ln: 0.2, hx: 6 }],
          [0.6, { a1: 2, b1: 2.7, ln: 0.2, hx: 6 }],
          [1, {}],
        ],
      ],
      hurt: [
        0.42,
        [
          [0, {}],
          [
            0.15,
            { ln: -0.6, hx: -16, a1: 0.2, b1: 0.4, a2: 0.1, b2: 0.3, hy: 3 },
          ],
          [1, {}],
        ],
      ],
      stun: [
        0.7,
        [
          [0, {}],
          [
            0.2,
            { ln: 0.55, hy: 10, a1: 0.2, b1: 0.2, a2: 0.3, b2: 0.2, hx: -4 },
          ],
          [
            0.8,
            { ln: 0.55, hy: 10, a1: 0.2, b1: 0.2, a2: 0.3, b2: 0.2, hx: -4 },
          ],
          [1, {}],
        ],
      ],
      flip: [
        0.9,
        [
          [0, {}],
          [0.2, { hy: 14, ln: 0.2 }],
          [
            0.5,
            {
              hy: -60,
              a1: 2,
              b1: 2.4,
              a2: 2,
              b2: 2.4,
              c1: 0.8,
              d1: 1.5,
              c2: 0.6,
              d2: 1.4,
            },
          ],
          [1, {}],
        ],
      ],
      windP: [
        0.4,
        [
          [0, {}],
          [1, { a1: 0.4, b1: 0.9, ln: -0.2, hx: -6, hy: 3 }],
        ],
        1,
      ],
      windK: [
        0.4,
        [
          [0, {}],
          [1, { c1: 0.9, d1: -0.8, ln: -0.3, hx: -3, a1: 1.4, b1: 2.2 }],
        ],
        1,
      ],
      open: [
        0.4,
        [
          [0, {}],
          [1, { ln: -0.35, a1: 0.3, b1: 0.5, a2: 0.2, b2: 0.4, hy: 5, hx: -6 }],
        ],
        1,
      ],
    };
    app.SB = {
      atk: { ln: 0.24, hx: 4 },
      def: app.GU,
      con: { a1: 1.7, b1: 2.3, ln: 0.05, c1: 0.6 },
    };
    app.tx = (s, x, y, sz, c, al) => {
      app.g.font = "bold " + sz + "px system-ui,sans-serif";
      app.g.fillStyle = c;
      app.g.textAlign = al || "center";
      app.g.fillText(s, x, y);
    };
  };
}
