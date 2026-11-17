import { CLOCK } from "../game/config.js";
// Installs this system into one application instance; initialization is deferred.
export function install(app) {
  app.loop = function loop(t) {
    let dt = app.last ? (t - app.last) / 1000 : 0;
    app.last = t;
    if (dt > CLOCK.maxGap) {
      if (app.mode === "play") app.setMode("pause");
      dt = 0;
    }
    app.clock += dt;
    for (let i = 0; i < 6; i++) app.LF[i] = Math.max(0, app.LF[i] - dt * 4);
    if (app.shake > 0) app.shake -= dt;
    const pd = app.mode === "pause" ? 0 : dt,
      fd =
        app.mode === "pause"
          ? 0
          : app.slow > 0
            ? dt * CLOCK.visualSlowdown
            : dt;
    if (app.mode === "play") {
      let remaining = dt;
      while (remaining > 0 && app.mode === "play") {
        const step = Math.min(remaining, CLOCK.step);
        app.update(step);
        remaining -= step;
      }
      app.musicSync();
    }
    app.auraTick(dt);
    if (app.R && app.mode !== "menu")
      app.DIV += (app.divLane(app.R.ps) - app.DIV) * Math.min(1, dt * 7);
    if (app.mode === "menu") {
      app.demo(dt);
      const st =
        app.AC && app.AC.state === "running"
          ? "ACTIVO"
          : app.gt && performance.now() - app.gt > 1200
            ? "BLOQUEADO · ÁBRELO EN CHROME"
            : "TOCA UN BOTÓN";
      if (app.$("as").textContent !== st) app.$("as").textContent = st;
    }
    const fs =
      app.mode === "menu"
        ? [app.DM.p, app.DM.e]
        : app.R
          ? [app.R.p, app.R.e]
          : [];
    if (app.R && app.mode !== "menu") {
      app.R.p.sb = app.SB[app.stance()] || {};
    }
    for (const f of fs) {
      f.at += fd;
      if (f.fl > 0) f.fl -= dt;
      const A = app.AN[f.an];
      if (A && !A[2] && f.at >= A[0]) f.an = "idle";
      app.spring(f, fd);
    }
    for (const f of app.fx) {
      f.l -= pd;
      f.y = (f.y || app.AH * 0.3) - pd * 40;
    }
    app.fx = app.fx.filter((f) => f.l > 0);
    for (const p of app.PA) {
      p.l -= pd;
      p.x += p.vx * pd;
      p.y += p.vy * pd;
      p.vy += 500 * pd;
    }
    app.PA = app.PA.filter((p) => p.l > 0);
    if (app.R && app.R.jt) app.R.jt.l -= dt;
    app.draw();
    requestAnimationFrame(app.loop);
  };
  return function initialize() {
    app.last = 0;
    app.setMode("menu");
    requestAnimationFrame(app.loop);
    // Decode only after a user gesture so suspended audio contexts do not block startup.
    let booted = false;
    const boot = () => {
      if (!booted) {
        booted = true;
        app
          .bootstrapAudio()
          .catch((error) => console.warn("Carga de audio incompleta", error));
      }
    };
    addEventListener("pointerdown", boot, { once: true });
    addEventListener("keydown", boot, { once: true });
  };
}
