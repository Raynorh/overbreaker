export function readHud(storage) {
  try {
    storage ??= globalThis.localStorage;
    const n = Number(storage.ob_hud);
    return Number.isInteger(n) && n >= 0 && n <= 2 ? n : 0;
  } catch {
    return 0;
  }
}
export function readVolumes(storage) {
  const result = { m: 1, mus: 1, sfx: 1 };
  try {
    storage ??= globalThis.localStorage;
    const data = JSON.parse(storage.ob_vol || "null");
    for (const key of Object.keys(result)) {
      const value = data?.[key];
      if (
        typeof value === "number" &&
        Number.isFinite(value) &&
        value >= 0 &&
        value <= 1
      )
        result[key] = value;
    }
  } catch {
    /* Invalid or unavailable storage uses defaults. */
  }
  return result;
}
export function createSoundStore(database = globalThis.indexedDB) {
  let connection;
  function open() {
    if (!connection)
      connection = new Promise((resolve, reject) => {
        if (!database) {
          reject(new Error("IndexedDB no disponible"));
          return;
        }
        const request = database.open("ob_v", 1);
        request.onupgradeneeded = () => request.result.createObjectStore("s");
        request.onerror = () => {
          connection = null;
          reject(request.error);
        };
        request.onsuccess = () => {
          const db = request.result;
          db.onversionchange = () => {
            db.close();
            connection = null;
          };
          resolve(db);
        };
      });
    return connection;
  }
  return {
    async put(key, value) {
      const db = await open();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction("s", "readwrite");
        transaction.objectStore("s").put(value, key);
        transaction.oncomplete = () => resolve();
        transaction.onabort = transaction.onerror = () =>
          reject(transaction.error || new Error("No se pudo guardar el audio"));
      });
    },
    async all() {
      const db = await open();
      return new Promise((resolve, reject) => {
        const result = Object.create(null),
          transaction = db.transaction("s");
        const request = transaction.objectStore("s").openCursor();
        request.onsuccess = () => {
          const cursor = request.result;
          if (cursor) {
            result[cursor.key] = cursor.value;
            cursor.continue();
          }
        };
        transaction.oncomplete = () => resolve(result);
        transaction.onabort = transaction.onerror = () =>
          reject(transaction.error);
      });
    },
  };
}
