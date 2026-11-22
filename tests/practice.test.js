import test from "node:test";
import assert from "node:assert/strict";
import { createPractice, PLAYER_KEYS, RIVAL_KEYS } from "../src/practice/practice.js";
import { createRecordingContext } from "./helpers/browser-stub.js";

// Estas pruebas verifican el Boxeo dibujado con código; los sprites se prueban aparte.
const procedural = (practice) => {
  practice.setStyle("p", "boxing");
  practice.setStyle("e", "boxing");
  return practice;
};
const run = (practice, seconds) => {
  for (let t = 0; t < seconds; t += 1 / 60) practice.step(1 / 60);
};

test("cada tecla del jugador dispara su animación y el rival reacciona al impactar", () => {
  const practice = procedural(createPractice());
  practice.perform("p", PLAYER_KEYS.a);
  assert.equal(practice.player.an, "jab");
  assert.equal(practice.rival.an, "idle", "el rival espera al impacto");
  assert.equal(practice.rival.pend.an, "box_hurtJab");
  run(practice, 0.15);
  assert.equal(practice.rival.an, "box_hurtJab");
  assert.equal(practice.last, "JAB");
});

test("los estilos de cada luchador se cambian por separado", () => {
  const practice = procedural(createPractice());
  assert.ok(practice.setStyle("p", "taekwondo"));
  assert.ok(!practice.setStyle("p", "inexistente"));
  assert.equal(practice.player.style, "taekwondo");
  assert.equal(practice.rival.style, "boxing");
  practice.perform("p", PLAYER_KEYS.d);
  assert.equal(practice.app.animation(practice.player), practice.app.AN.tkd_spin);
  assert.equal(practice.rival.pend.an, "box_hurtHook");
  assert.equal(practice.last, "GIRATORIA");
});

test("bloqueo, parry y esquiva: el rival que se defiende no reacciona", () => {
  const practice = procedural(createPractice());
  practice.perform("e", RIVAL_KEYS[4]);
  run(practice, 0.05); // la defensa sigue a la acción enemiga por unos milisegundos
  practice.perform("p", PLAYER_KEYS.s);
  assert.equal(practice.rival.pend, null);
  assert.equal(practice.rival.an, "block");
  assert.ok(practice.perform("p", PLAYER_KEYS.l), "esquiva de Boxeo");
  run(practice, 0.1);
  assert.equal(practice.player.an, "box_dodge");
  practice.setStyle("p", "taekwondo");
  assert.equal(practice.perform("p", PLAYER_KEYS.l), false, "Taekwondo no tiene esquiva");
  assert.equal(practice.labels("p").dodge, null);
});

test("las animaciones terminan solas y la cámara lenta las alarga", () => {
  const fast = procedural(createPractice());
  fast.perform("p", PLAYER_KEYS.f);
  run(fast, 0.2);
  assert.equal(fast.player.an, "uppercut");
  run(fast, 0.4);
  assert.equal(fast.player.an, "idle");
  const slow = procedural(createPractice());
  slow.speed = 0.25;
  slow.perform("p", PLAYER_KEYS.f);
  run(slow, 0.6);
  assert.equal(slow.player.an, "uppercut", "a cuarto de velocidad sigue en curso");
});

test("la demostración encadena los cuatro golpes en orden", () => {
  const practice = procedural(createPractice());
  const seen = [];
  practice.demo([0, 1, 2, 3], 0.5);
  for (let t = 0; t < 2.2; t += 1 / 60) {
    practice.step(1 / 60);
    if (seen.at(-1) !== practice.player.an && practice.player.an !== "idle")
      seen.push(practice.player.an);
  }
  assert.deepEqual(seen, ["jab", "cross", "hook", "uppercut"]);
});

test("el escenario se dibuja con ambos estilos sin dejar resplandor encendido", () => {
  const practice = procedural(createPractice());
  practice.setStyle("p", "taekwondo");
  practice.perform("p", PLAYER_KEYS.a);
  run(practice, 0.2);
  const g = createRecordingContext();
  g.createLinearGradient = () => ({ addColorStop() {} });
  g.fillRect = () => {};
  g.shadowBlur = 0;
  practice.draw(g, 900, 500);
  assert.ok(g.fills.length > 20, "dibujó luchadores");
  assert.equal(g.shadowBlur, 0);
});

test("el Boxeador con GIF es el estilo por defecto y responde a todas las teclas", () => {
  const practice = createPractice();
  assert.equal(practice.player.style, "boxeador");
  practice.perform("p", PLAYER_KEYS.a);
  assert.equal(practice.app.animationName(practice.player), "gif_jab");
  // El jab ya está extendido al empezar: conecta al instante.
  assert.equal(practice.app.animationName(practice.rival), "gif_hurtJab");
  practice.perform("p", PLAYER_KEYS.s);
  assert.equal(practice.rival.pend.an, "gif_hurtCross", "el cross conecta tras su preparación");
  const expected = { s: "gif_cross", d: "gif_hook", f: "gif_uppercut", j: "gif_block", k: "gif_parry", l: "gif_dodge", m: "gif_move" };
  for (const [key, name] of Object.entries(expected)) {
    practice.perform("p", PLAYER_KEYS[key]);
    assert.equal(practice.app.animationName(practice.player), name, "tecla " + key);
  }
  assert.equal(practice.labels("p").move, "DESPLAZAMIENTO");
  practice.setStyle("p", "taekwondo");
  assert.equal(practice.perform("p", PLAYER_KEYS.m), false, "Taekwondo no tiene desplazamiento");
});

test("toda defensa responde a una acción enemiga y el golpe conecta justo después", () => {
  for (const sprite of [true, false]) {
    for (const [key, attack] of [["j", "punch"], ["k", "kick"], ["l", "kick"]]) {
      const practice = createPractice();
      if (!sprite) procedural(practice);
      if (!sprite && key === "m") continue;
      const app = practice.app;
      practice.perform("p", PLAYER_KEYS[key]);
      let defendAt = null, attackAt = null;
      for (let t = 0; t < 0.6; t += 1 / 240) {
        practice.step(1 / 240);
        if (defendAt === null && practice.player.an !== "idle") defendAt = t;
        if (attackAt === null && practice.rival.an === attack) attackAt = t;
      }
      assert.ok(defendAt !== null && attackAt !== null, (sprite ? "sprites " : "código ") + key + ": defiende y el rival ataca");
      const impact = attackAt + app.impactDelayOf(practice.rival, attack);
      assert.ok(Math.abs(impact - (defendAt + app.ENEMY_IMPACT_OFFSET)) < 0.02, key + ": impacto " + (impact - defendAt).toFixed(3) + " s tras defender");
    }
  }
});

test("la defensa perfecta usa el contraataque y la reacción del rival llega con él", () => {
  const practice = createPractice();
  practice.perfect = true;
  practice.perform("p", PLAYER_KEYS.j);
  run(practice, 0.4);
  assert.equal(practice.app.animationName(practice.rival), "gif_hurtJab", "el rival recibe el contraataque");
  assert.notEqual(practice.rival.an, "punch", "y no llegó a completar su golpe");
  practice.perform("p", PLAYER_KEYS.k);
  run(practice, 0.05);
  assert.equal(practice.player.an, "parryC");
});

test("los momentos puntuales se pueden ver uno a uno y se reinician", () => {
  const practice = createPractice();
  for (const [key, name] of [["g", "gif_greet"], ["h", "gif_adren"], ["t", "gif_tired"], ["v", "gif_win"], ["x", "gif_fall"], ["z", "gif_getup"]]) {
    assert.ok(practice.perform("p", PLAYER_KEYS[key]), key);
    assert.equal(practice.app.animationName(practice.player), name, key);
  }
  practice.perform("p", PLAYER_KEYS.r);
  assert.equal(practice.player.an, "idle");
  assert.equal(practice.rival.an, "idle");
  practice.setStyle("p", "taekwondo");
  assert.equal(practice.perform("p", PLAYER_KEYS.h), false, "otros estilos no tienen esa pose");
});
