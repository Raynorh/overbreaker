import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { canJudge, classifyHit } from "../src/game/rules.js";
import { readHud, readVolumes } from "../src/storage/browser-storage.js";
import { createTimers, replaceAudioSource } from "../src/app/lifecycle.js";
import { unzip, validateAudio } from "../src/audio/imports.js";

test("judgment boundaries preserve early hits without consuming distant notes", () => {
  assert.equal(canJudge(-0.351), false);
  assert.equal(classifyHit(-0.35), "EARLY");
  assert.equal(classifyHit(-0.065), "PERFECT");
  assert.equal(classifyHit(0.065), "PERFECT");
  assert.equal(classifyHit(0.14), "GOOD");
  assert.equal(classifyHit(0.141), null);
  assert.equal(canJudge(NaN), false);
});
test("stored settings reject malformed types, ranges and unexpected fields", () => {
  assert.deepEqual(
    readVolumes({ ob_vol: '{"m":0.4,"mus":2,"sfx":"0.3","extra":0}' }),
    { m: 0.4, mus: 1, sfx: 1 },
  );
  assert.deepEqual(readVolumes({ ob_vol: "invalid" }), {
    m: 1,
    mus: 1,
    sfx: 1,
  });
  assert.equal(readHud({ ob_hud: "2" }), 2);
  for (const value of ["3", "-1", "0.5", "NaN"])
    assert.equal(readHud({ ob_hud: value }), 0);
});
test("rematch cancels pending end-of-match callbacks", () => {
  const callbacks = new Map();
  let sequence = 0,
    calls = 0;
  const timers = createTimers(
    (fn) => {
      callbacks.set(++sequence, fn);
      return sequence;
    },
    (id) => callbacks.delete(id),
  );
  timers.schedule(() => calls++, 700);
  timers.clear();
  for (const callback of callbacks.values()) callback();
  assert.equal(calls, 0);
  timers.schedule(() => calls++, 500);
  callbacks.get(sequence)();
  assert.equal(calls, 1);
});
test("replacing music releases the previous object URL", () => {
  const element = { pause() {} };
  replaceAudioSource(element, new Blob(["one"]));
  const previous = element.src;
  replaceAudioSource(element, new Blob(["two"]));
  assert.notEqual(previous, element.src);
  // Node resolves live Blob URLs; a revoked URL no longer resolves.
  return import("node:buffer").then(({ resolveObjectURL }) =>
    assert.equal(resolveObjectURL(previous), undefined),
  );
});
test("actual bundled archive passes bounded extraction and audio signatures", async () => {
  const file = await readFile(new URL("../sonidos.zip", import.meta.url));
  const entries = await unzip(
    file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength),
  );
  assert.equal(entries.length, 53);
  entries.forEach((entry) => validateAudio(entry.buf));
});
test("malformed archives and non-audio contents are rejected", async () => {
  await assert.rejects(unzip(new ArrayBuffer(10)));
  await assert.rejects(unzip(new ArrayBuffer(22)));
  assert.throws(() =>
    validateAudio(new TextEncoder().encode("<script>").buffer),
  );
  const zip = new Uint8Array(22);
  const view = new DataView(zip.buffer);
  view.setUint32(0, 0x06054b50, true);
  view.setUint16(10, 129, true);
  await assert.rejects(unzip(zip.buffer), /Demasiados/);
});

test("presentation events can be detached without changing rules", async () => {
  const { createEvents } = await import("../src/app/events.js");
  const events = createEvents();
  let count = 0;
  const detach = events.on("hit", (damage) => (count += damage));
  events.emit("hit", 3);
  detach();
  events.emit("hit", 4);
  assert.equal(count, 3);
});
