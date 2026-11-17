export function install(app) {
  app.pop = function pop(x, y, s, c, z) {
    z = z || 18;
    let yy = y,
      n = 0;
    while (
      n++ < 5 &&
      app.fx.some(
        (f) =>
          f.l > 0.25 &&
          Math.abs((f.y || 0) - yy) < Math.max(f.z || 18, z) * 0.95 &&
          Math.abs(f.x - x) <
            Math.max(70, String(f.s).length * (f.z || 18) * 0.3),
      )
    )
      yy -= z * 1.05;
    app.fx.push({ x, y: yy, s, c, l: 0.8, z });
  };
  app.spark = function spark(x, y, c, n, sp) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.283,
        v = (0.4 + Math.random()) * (sp || 200);
      app.PA.push({
        x,
        y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - 40,
        l: 0.3 + Math.random() * 0.2,
        c,
      });
    }
  };
  app.aura = function aura(f, c, adr, s, Y, col) {
    const k = app.kiC(c),
      ak = adr ? 1 : Math.max(0, (k - 0.12) / 0.88);
    if (k <= 0 && !adr) return;
    const x = f.x,
      cy = Y - 40 * s,
      t = app.clock;
    app.g.save();
    app.g.globalCompositeOperation = "lighter";
    const ns = Math.round(3 + k * 9 + (adr ? 8 : 0));
    app.g.lineWidth = 1.4 * s;
    for (let i = 0; i < ns; i++) {
      const an = i * 2.4 + t * (1.5 + (i % 3)),
        r = (24 + ((i * 37 + t * 70) % 26)) * s * (0.8 + k * 0.5),
        l = (7 + k * 14) * s,
        ca = Math.cos(an),
        sa = Math.sin(an) * 1.5;
      app.g.strokeStyle = i % 2 ? "#fff" : col;
      app.g.globalAlpha = 0.5 + 0.45 * Math.sin(t * 22 + i * 1.7);
      app.g.beginPath();
      app.g.moveTo(x + ca * r, cy + sa * r);
      app.g.lineTo(x + ca * (r + l), cy + sa * (r + l));
      app.g.stroke();
    }
    if (ak > 0) {
      const R0 = (26 + ak * 24) * s,
        gr = app.g.createRadialGradient(x, cy, 3 * s, x, cy, R0 * 1.5);
      gr.addColorStop(0, col + "bb");
      gr.addColorStop(1, col + "00");
      app.g.globalAlpha = 0.55 + 0.25 * Math.sin(t * 12);
      app.g.fillStyle = gr;
      app.g.beginPath();
      app.g.ellipse(x, cy - 4 * s, R0 * 1.1, R0 * 1.7, 0, 0, 6.29);
      app.g.fill();
      const nf = 4 + Math.round(ak * 5);
      app.g.globalAlpha = 0.35 + 0.2 * ak;
      app.g.fillStyle = col;
      for (let i = 0; i < nf; i++) {
        const u = i / (nf - 1) - 0.5,
          x0 = x + u * 46 * s * (0.8 + ak * 0.5),
          h = (36 + ak * 58 + Math.sin(t * 13 + i * 2.1) * 12) * s,
          sw = Math.sin(t * 9 + i * 1.3) * 7 * s;
        app.g.beginPath();
        app.g.moveTo(x0 - 8 * s, Y - 2 * s);
        app.g.quadraticCurveTo(x0 - 4 * s + sw, Y - h * 0.55, x0 + sw, Y - h);
        app.g.quadraticCurveTo(
          x0 + 4 * s + sw,
          Y - h * 0.55,
          x0 + 8 * s,
          Y - 2 * s,
        );
        app.g.fill();
      }
    }
    if (k >= 0.9 || adr) {
      app.g.globalAlpha = 0.9;
      app.g.strokeStyle = "#fff";
      app.g.lineWidth = 1.8 * s;
      for (let b = 0; b < 3; b++) {
        let px = x + (Math.random() - 0.5) * 60 * s,
          py2 = cy - 50 * s + Math.random() * 20 * s;
        app.g.beginPath();
        app.g.moveTo(px, py2);
        for (let j = 0; j < 5; j++) {
          px += (Math.random() - 0.5) * 26 * s;
          py2 += 18 * s;
          app.g.lineTo(px, py2);
        }
        app.g.stroke();
      }
    }
    app.g.restore();
  };
  return () => {};
}
