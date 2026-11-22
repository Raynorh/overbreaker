import test from "node:test";
import assert from "node:assert/strict";

// A small browser adapter checks wiring and rules; it cannot verify actual drawing/audio.
const listeners = new Map(),
  elements = new Map();
const context = new Proxy(
  {},
  {
    get(target, key) {
      if (key in target) return target[key];
      if (key === "createLinearGradient" || key === "createRadialGradient")
        return () => ({ addColorStop() {} });
      return () => {};
    },
  },
);
function element(id) {
  if (!elements.has(id)) {
    const classes = new Set();
    elements.set(id, {
      id,
      style: { setProperty() {} },
      dataset: {},
      classList: {
        add: (x) => classes.add(x),
        remove: (x) => classes.delete(x),
        contains: (x) => classes.has(x),
        toggle(x, on) {
          on ? classes.add(x) : classes.delete(x);
        },
      },
      getContext: () => context,
      getBoundingClientRect: () => ({ height: 300, bottom: 400 }),
      addEventListener() {},
      querySelectorAll: () => [],
      pause() {
        this.paused = true;
      },
      play() {
        this.paused = false;
        return Promise.resolve();
      },
      paused: true,
      playbackRate: 1,
    });
  }
  return elements.get(id);
}
globalThis.localStorage = {};
globalThis.document = {
  getElementById: element,
  querySelectorAll: () => [],
  addEventListener(type, fn) {
    listeners.set(type, fn);
  },
};
globalThis.window = globalThis;
globalThis.addEventListener = (type, fn) => listeners.set(type, fn);
globalThis.requestAnimationFrame = () => 1;
globalThis.innerWidth = 1000;
globalThis.innerHeight = 800;
globalThis.devicePixelRatio = 1;
const { application: app } = await import("../src/main.js");

test("menu, combat, pause, rematch and rendering are wired", () => {
  assert.equal(app.mode, "menu");
  app.loop(16);
  app.newMatch();
  assert.equal(app.mode, "play");
  app.loop(32);
  app.R.intro = 0;
  const note = { l: 0, t: app.R.t + 1, T: 2 };
  app.R.notes = [note];
  app.press(0);
  assert.equal(note.done, undefined);
  app.R.t = note.t;
  app.press(0);
  assert.equal(note.done, 1);
  assert.equal(app.M.perf, 1);
  assert.equal(app.R.p.an, "jab");
  for (let frame = 3; frame < 1500; frame++) app.loop(frame * 16);
  app.newMatch();
  app.DN[0] = 1;
  listeners.get("blur")();
  assert.equal(app.mode, "pause");
  assert.equal(app.DN[0], 0);
  app.draw();
  app.setMode("play");
  app.loop(25000);
  assert.equal(app.mode, "pause");
  app.endMatch(false);
  assert.equal(app.mode, "over");
  app.draw();
  app.newMatch();
  app.toMenu();
});
test("survival, HUD variants, preview, and configuration paths execute", () => {
  app.gameMode = "survival";
  app.newMatch();
  app.R.intro = 0;
  for (let frame = 1; frame < 1000; frame++) {
    app.update(0.016);
    if (app.mode !== "play") break;
  }
  for (const hud of [0, 1, 2]) {
    app.hudMode = hud;
    app.draw();
  }
  for (const panel of ["menu", "audio", "arena", "hud", "keys"])
    app.openConfig(panel);
  element("editPanel").classList.add("show");
  app.stickPreview();
  app.toMenu();
});

test("drawing fighters is read-only and preview uses its own context", () => {
  const fighter = app.mkF(1, "#fff", "#333");
  fighter.an = "jab";
  for (let i = 0; i < 10; i++) {
    fighter.at += 0.016;
    app.spring(fighter, 0.016);
  }
  const before = structuredClone(fighter);
  const mainContext = app.g;
  app.drawF(fighter, false, 100, 1, context);
  app.drawF(fighter, false, 100, 2, context);
  assert.deepEqual(fighter, before);
  assert.equal(app.g, mainContext);
});

test("slow motion does not change note time, and every short frame interval is consumed", () => {
  app.newMatch();
  app.R.intro = 0;
  app.slow = 1;
  const start = app.R.t;
  app.last = 100;
  app.loop(300);
  assert.ok(Math.abs(app.R.t - start - 0.2) < 1e-9);
  app.toMenu();
});

test("boxing attack library exposes distinct procedural animations", () => {
  for (const name of ["jab", "cross", "hook", "uppercut"]) {
    assert.ok(app.AN[name], `missing ${name} animation`);
    assert.ok(app.AN[name][0] > 0);
    assert.ok(app.AN[name][1].length >= 4);
  }
  assert.deepEqual(app.MOVES, ["jab", "cross", "hook", "uppercut"]);
  for (const [lane, expected] of app.MOVES.entries()) {
    app.newMatch();
    app.R.intro = 0;
    const note = { l: lane, t: app.R.t + 0.1, T: 1, role: "atk" };
    app.R.notes = [note];
    app.R.t = note.t;
    app.press(lane);
    assert.equal(note.done, 1);
    assert.equal(app.R.p.an, expected);
  }
  app.toMenu();
});
