export function createTimers(schedule = setTimeout, cancel = clearTimeout) {
  const pending = new Set();
  return {
    schedule(callback, delay) {
      const id = schedule(() => {
        pending.delete(id);
        callback();
      }, delay);
      pending.add(id);
      return id;
    },
    clear() {
      for (const id of pending) cancel(id);
      pending.clear();
    },
  };
}
const audioUrls = new WeakMap();
export function replaceAudioSource(element, blob) {
  const previous = audioUrls.get(element);
  element.pause();
  element.src = URL.createObjectURL(blob);
  audioUrls.set(element, element.src);
  if (previous) URL.revokeObjectURL(previous);
}
