export function install(app) {
  app.initAI = function initAI() {
    const base = [3.7, 3.05, 2.65, 2.15, 1.85, 1.55][app.diff];
    app.R.ai = {
      next: 2.1 + base * 0.35,
      guardNext: 1.4,
      guardLane: -1,
      guardUntil: 0,
      lastLane: 5,
      attackNo: 0,
      dominant: 0,
      counts: [0, 0, 0, 0],
      stagger: 0,
      style:
        app.diff >= 4 ? "adaptive" : app.diff >= 3 ? "pressure" : "balanced",
    };
  };
  app.aiThink = function aiThink() {
    const A = app.R.ai;
    if (!A || app.R.fin || app.R.intro > 0) return;
    if (app.R.breaker) {
      A.next = Math.max(A.next, app.R.t + 0.5);
      return;
    }
    // Read repeated player attack choices and occasionally pre-empt the most-used lane.
    if (app.R.t >= A.guardNext) {
      const total = A.counts.reduce((x, y) => x + y, 0),
        max = Math.max(...A.counts);
      A.dominant =
        total >= 4 && max / total > 0.34 ? A.counts.indexOf(max) : -1;
      const guardChance = [0, 0.08, 0.18, 0.32, 0.48, 0.6][app.diff];
      A.guardLane =
        A.dominant >= 0 && Math.random() < guardChance ? A.dominant : -1;
      A.guardUntil = app.R.t + [0.25, 0.32, 0.38, 0.48, 0.58, 0.66][app.diff];
      A.guardNext =
        app.R.t +
        [3.8, 3.1, 2.7, 2.2, 1.8, 1.5][app.diff] * (0.8 + Math.random() * 0.45);
      if (A.guardLane >= 0) {
        app.R.e.an = "block";
        app.R.e.at = 0;
      }
    }
    // Enemy attacks are scheduled independently of the player's attack-note generator.
    if (app.R.t >= A.next) {
      if (app.R.notes.filter((n) => !n.done).length >= 6) {
        A.next = app.R.t + 0.6;
        return;
      }
      const lead = [1.25, 1.05, 0.95, 0.82, 0.72, 0.64][app.diff];
      const reaction = [1.25, 1.05, 0.96, 0.86, 0.78, 0.7][app.diff];
      const burst =
        app.diff === 5
          ? Math.random() < 0.7
            ? 3
            : 2
          : app.diff === 4
            ? Math.random() < 0.58
              ? 3
              : 2
            : app.diff === 3
              ? Math.random() < 0.42
                ? 2
                : 1
              : app.diff === 2 && Math.random() < 0.2
                ? 2
                : 1;
      let at = app.R.t + lead;
      for (let i = 0; i < burst; i++) {
        const st = app.laneState(),
          ep =
            st === "attack"
              ? [4, 5]
              : st === "balanced"
                ? [3, 4, 5]
                : [2, 3, 4, 5];
        let lane = ep[Math.floor(Math.random() * ep.length)];
        if (lane === A.lastLane && Math.random() < 0.72)
          lane = ep[(ep.indexOf(lane) + 1) % ep.length];
        A.lastLane = lane;
        let kk = 0,
          nn = null;
        while (kk++ < 14) {
          if (app.R.notes.some((n) => !n.done && Math.abs(n.t - at) < 0.2)) {
            at += 0.2;
            continue;
          }
          nn = app.mkNote(lane, at, reaction, st, 1);
          if (nn) break;
          at += 0.2;
        }
        if (!nn) continue;
        nn.ai = 1;
        nn.seq = i;
        app.R.notes.push(nn);
        at +=
          [0.6, 0.52, 0.45, 0.37, 0.31, 0.27][app.diff] *
          (0.9 + Math.random() * 0.18);
      }
      A.attackNo++;
      A.next =
        at +
        [3.8, 3.05, 2.55, 1.95, 1.55, 1.25][app.diff] *
          (0.82 + Math.random() * 0.35) *
          Math.max(0.55, 1 - app.R.t / 360);
    }
  };
  app.aiDefendPlayerAttack = function aiDefendPlayerAttack(l) {
    const A = app.R.ai;
    if (!A || A.guardLane !== l || app.R.t > A.guardUntil) return false;
    const parryChance = [0, 0.02, 0.04, 0.09, 0.14, 0.18][app.diff];
    const isParry = Math.random() < parryChance;
    app.R.e.an = isParry ? "parry" : "block";
    app.R.e.at = 0;
    app.R.e.fl = 0.04;
    app.R.ai.guardLane = -1;
    app.R.ai.guardUntil = 0;
    app.pop(
      app.eX(),
      app.py() - 48,
      isParry ? "✦" : "▰",
      isParry ? "#f7df57" : "#ff8b9d",
      20,
    );
    return isParry ? "parry" : "block";
  };
  return () => {};
}
