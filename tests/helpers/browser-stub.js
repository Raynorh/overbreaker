// Adaptador mínimo de navegador para ejecutar la aplicación completa en Node.
// Permite comprobar conexiones y reglas; no verifica dibujo ni audio reales.
const context = new Proxy(
  {},
  {
    get(target, key) {
      if (key in target) return target[key];
      if (key === "createLinearGradient" || key === "createRadialGradient")
        return () => ({ addColorStop() {} });
      return () => {};
    },
    set(target, key, value) {
      target[key] = value;
      return true;
    },
  },
);
const elements = new Map();
const listeners = new Map();
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
      pause() {},
      play: () => Promise.resolve(),
      paused: true,
      playbackRate: 1,
    });
  }
  return elements.get(id);
}

export async function loadApplication() {
  globalThis.localStorage = {};
  globalThis.document = {
    getElementById: element,
    querySelectorAll: () => [],
    addEventListener: (type, fn) => listeners.set(type, fn),
  };
  globalThis.window = globalThis;
  globalThis.addEventListener = (type, fn) => listeners.set(type, fn);
  globalThis.requestAnimationFrame = () => 1;
  globalThis.innerWidth = 1000;
  globalThis.innerHeight = 800;
  globalThis.devicePixelRatio = 1;
  const { application } = await import("../../src/main.js");
  return application;
}

// Contexto que registra los puntos de cada trazo ya transformados a pantalla.
export function createRecordingContext() {
  let matrix = [1, 0, 0, 1, 0, 0];
  const stack = [];
  let path = [];
  const strokes = [];
  const fills = [];
  const point = (x, y) => [
    matrix[0] * x + matrix[2] * y + matrix[4],
    matrix[1] * x + matrix[3] * y + matrix[5],
  ];
  const ctx = {
    strokeStyle: "#000",
    fillStyle: "#000",
    lineWidth: 1,
    strokes,
    fills,
    save: () => stack.push([matrix, ctx.strokeStyle, ctx.fillStyle]),
    restore: () => ([matrix, ctx.strokeStyle, ctx.fillStyle] = stack.pop()),
    translate(x, y) {
      matrix = [...matrix.slice(0, 4), ...point(x, y)];
    },
    scale(x, y) {
      matrix = [matrix[0] * x, matrix[1] * x, matrix[2] * y, matrix[3] * y, matrix[4], matrix[5]];
    },
    rotate(angle) {
      const c = Math.cos(angle),
        s = Math.sin(angle);
      matrix = [
        matrix[0] * c + matrix[2] * s,
        matrix[1] * c + matrix[3] * s,
        -matrix[0] * s + matrix[2] * c,
        -matrix[1] * s + matrix[3] * c,
        matrix[4],
        matrix[5],
      ];
    },
    beginPath: () => (path = []),
    moveTo: (x, y) => path.push(point(x, y)),
    lineTo: (x, y) => path.push(point(x, y)),
    arc: (x, y) => path.push(point(x, y)),
    ellipse() {},
    fill: () => fills.push({ color: ctx.fillStyle, points: path.slice() }),
    fillText() {},
    stroke: () =>
      strokes.push({ color: ctx.strokeStyle, points: path.slice() }),
  };
  return ctx;
}
