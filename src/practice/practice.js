// Modo práctica: escenario para ver cómo se mueven los luchadores al pulsar cada
// tecla, sin música ni puntuación. Reutiliza el mismo esqueleto, estilos y
// reacciones que el juego (src/rendering/fighters.js); aquí no hay reglas de
// combate ni puntos, solo animación.

import { install as installFighters } from "../rendering/fighters.js";

// Teclas del jugador y del rival. `lane` es el carril de ataque (0..3).
export const PLAYER_KEYS = {
  a: { kind: "attack", lane: 0 },
  s: { kind: "attack", lane: 1 },
  d: { kind: "attack", lane: 2 },
  f: { kind: "attack", lane: 3 },
  j: { kind: "block" },
  k: { kind: "parry" },
  l: { kind: "dodge" },
  m: { kind: "move" },
};
export const RIVAL_KEYS = {
  7: { kind: "attack", lane: 0 },
  8: { kind: "attack", lane: 1 },
  9: { kind: "attack", lane: 2 },
  0: { kind: "attack", lane: 3 },
  4: { kind: "block" },
  5: { kind: "parry" },
};

export const STYLE_LABELS = {
  boxeador: "Boxeo (GIF)",
  boxing: "Boxeo (código)",
  taekwondo: "Taekwondo",
};

export function createPractice() {
  const app = { clock: 0, MOVES: ["jab", "cross", "hook", "uppercut"] };
  app.NAMES = ["¡JAB!", "¡CROSS!", "¡HOOK!", "¡UPPERCUT!"];
  installFighters(app)();

  const player = app.mkF(1, "#69ff36", "#173d12");
  const rival = app.mkF(-1, "#ff5c7a", "#b03050");
  player.style = app.DEFAULT_STYLE;
  rival.style = app.DEFAULT_STYLE;

  const state = {
    app,
    player,
    rival,
    speed: 1,
    last: "",
    queue: [],
    sparks: [],
  };
  const fighter = (side) => (side === "p" ? player : rival);

  state.styles = () => Object.keys(app.STYLES);
  state.setStyle = (side, name) => {
    if (!app.STYLES[name]) return false;
    const f = fighter(side);
    f.style = name;
    f.an = "idle";
    f.at = 0;
    f.tr.length = 0;
    return true;
  };
  state.setColor = (hex, dark) => {
    player.col = hex;
    player.dk = dark;
  };
  // Nombres de las teclas para el estilo actual del luchador.
  state.labels = (side) => {
    const style = app.STYLES[fighter(side).style];
    return {
      attack: style.names.map((name) => name.replace(/[¡!]/g, "")),
      block: style.labels.block,
      parry: style.labels.parry,
      dodge: style.dodge ? style.labels.dodge : null,
      move: style.move ? style.labels.move : null,
    };
  };

  // Ejecuta una acción como si el combate ya la hubiera validado.
  state.perform = (side, action) => {
    const actor = fighter(side),
      target = fighter(side === "p" ? "e" : "p");
    const style = app.STYLES[actor.style];
    if (action.kind === "attack") {
      actor.an = app.MOVES[action.lane];
      actor.at = 0;
      state.last = style.names[action.lane].replace(/[¡!]/g, "");
      // Un rival que se defiende conserva su pose; si no, reacciona al impacto.
      if (target.an === "block" || target.an === "parry") return true;
      const delay = app.impactDelay(actor);
      app.scheduleReaction(target, app.reactionAnimation(target, action.lane), delay);
      state.sparks.push({ at: delay, age: 0, side: side === "p" ? "e" : "p", color: style.color });
      return true;
    }
    if (action.kind === "dodge" || action.kind === "move") {
      if (!style[action.kind]) return false;
      actor.an = style[action.kind];
      actor.at = 0;
      state.last = style.labels[action.kind];
      return true;
    }
    actor.an = action.kind;
    actor.at = 0;
    state.last = style.labels[action.kind];
    return true;
  };

  // Secuencia de demostración: golpes encadenados cada `gap` segundos.
  state.demo = (lanes = [0, 1, 2, 3], gap = 0.6) => {
    state.queue = lanes.map((lane, i) => ({ at: i * gap, lane }));
    state.queueTime = 0;
  };

  state.step = (dt) => {
    app.clock += dt;
    const fd = dt * state.speed;
    if (state.queue.length) {
      state.queueTime += fd;
      while (state.queue.length && state.queue[0].at <= state.queueTime) {
        state.perform("p", { kind: "attack", lane: state.queue.shift().lane });
      }
    }
    app.stepFighter(player, fd, dt);
    app.stepFighter(rival, fd, dt);
    for (const spark of state.sparks) spark.at -= fd;
    for (const spark of state.sparks) if (spark.at <= 0) spark.age += fd;
    state.sparks = state.sparks.filter((spark) => spark.age < 0.22);
  };

  state.draw = (g, W, H) => {
    const s = Math.max(1.2, Math.min(H / 230, W / 520)),
      gy = H * 0.72;
    const floor = g.createLinearGradient(0, 0, 0, H);
    floor.addColorStop(0, "#10131f");
    floor.addColorStop(1, "#1b2033");
    g.fillStyle = floor;
    g.fillRect(0, 0, W, H);
    g.fillStyle = "#222a42";
    g.fillRect(0, gy, W, H - gy);
    g.fillStyle = "#313a5c";
    g.fillRect(0, gy, W, 2);
    player.x = W * 0.36;
    rival.x = W * 0.64;
    // Estela y cuerpo, igual que en el juego.
    app.drawF(rival, 0, gy, s, g);
    app.drawF(player, 0, gy, s, g);
    for (const spark of state.sparks) {
      if (spark.at > 0) continue;
      const target = fighter(spark.side),
        k = spark.age / 0.22,
        x = target.x + target.face * (target.q.hx - 10) * s,
        y = gy - 36 * s;
      g.strokeStyle = spark.color;
      g.globalAlpha = 1 - k;
      g.lineWidth = 4 * s * (1 - k);
      g.beginPath();
      g.arc(x, y, (8 + 26 * k) * s, 0, 6.29);
      g.stroke();
      g.globalAlpha = 1;
    }
    g.textAlign = "center";
    for (const [f, name] of [[player, "TÚ"], [rival, "RIVAL"]]) {
      const style = app.STYLES[f.style];
      g.fillStyle = style.color;
      g.font = "bold " + Math.round(14 * Math.min(s, 2)) + "px system-ui,sans-serif";
      g.fillText(name + " · " + STYLE_LABELS[f.style], f.x, gy + 34 * Math.min(s, 2));
    }
    if (state.last) {
      g.fillStyle = "#ffffff";
      g.font = "bold " + Math.round(26 * Math.min(s, 2)) + "px system-ui,sans-serif";
      g.fillText(state.last, W / 2, H * 0.14);
    }
  };

  return state;
}
