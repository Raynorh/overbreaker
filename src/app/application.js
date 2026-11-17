import { install as ai } from "../game/ai.js";
import { install as effects } from "../rendering/effects.js";
import { createEvents } from "./events.js";
import { install as runtime } from "./runtime.js";
import { install as audio } from "../audio/audio.js";
import { install as fighters } from "../rendering/fighters.js";
import { install as combat } from "../game/combat.js";
import { install as controls } from "../ui/controls.js";
import { install as ui } from "../ui/interface.js";
import { install as renderer } from "../rendering/renderer.js";
import { install as loop } from "./loop.js";
import { readHud, readVolumes, createSoundStore } from "../storage/browser-storage.js";
import { canJudge, classifyHit } from "../game/rules.js";
import { bootstrapAudio } from "../audio/bootstrap.js";
import { createTimers, replaceAudioSource } from "./lifecycle.js";

export function createApplication() {
  const store = createSoundStore();
  const app = {
    events: createEvents(),
    readHud,
    readVolumes,
    canJudge,
    classifyHit,
    replaceAudioSource,
    timers: createTimers(),
    idbPut: store.put,
    idbAll: store.all,
  };
  app.bootstrapAudio = () => bootstrapAudio(app);
  const initialize = [
    runtime,
    audio,
    fighters,
    effects,
    ai,
    combat,
    controls,
    ui,
    renderer,
    loop,
  ].map((install) => install(app));
  initialize.forEach((start) => start());
  for (const name of Object.keys(app.S))
    app.events.on("sound:" + name, (...args) => app.S[name](...args));
  for (const name of ["pop", "spark", "voice"])
    app.events.on(name, (...args) => app[name](...args));
  const loseFocus = () => {
    app.DN.fill(0);
    for (const key of Object.keys(app.PM)) delete app.PM[key];
    if (app.mode === "play") app.setMode("pause");
  };
  window.addEventListener("blur", loseFocus);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) loseFocus();
  });
  return app;
}
