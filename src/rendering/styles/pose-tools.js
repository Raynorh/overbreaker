// Herramientas compartidas por los estilos de lucha (datos puros, sin Canvas).
//
// Convenciones:
// - Ángulos en radianes desde la vertical hacia abajo; positivo = hacia delante.
//   0 = hacia el suelo, 1.57 = horizontal hacia delante, 3.14 = hacia arriba.
// - Los brazos se escriben en ángulos de pantalla (`arm1: [brazo, antebrazo]`);
//   `pose()` los convierte a los ángulos relativos al pecho del esqueleto.
// - `arm1` es el brazo delantero y `arm2` el trasero.
// - Torso: `ln` inclina desde la cadera, `bn` flexiona el torso superior,
//   `rt` inclina el cuerpo entero y `tw` lo gira sobre su eje (1 de frente,
//   0 de canto, -1 de espaldas).

const LEG_BASE = 26;

export function createPoseTools(base) {
  const legLength = (hy) => LEG_BASE + Math.min(14, Math.max(0, hy)) * 0.5;
  const reach = (c, d) => Math.cos(c) + Math.cos(d);
  const footDrop = (pose, hy) =>
    hy +
    legLength(hy) * Math.max(reach(pose.c1, pose.d1), reach(pose.c2, pose.d2));
  const idleDrop = footDrop(base, 0);

  // La rodilla siempre se dobla hacia delante: el muslo debe apuntar más
  // adelante que la espinilla. Si no, se intercambian los dos ángulos; el tobillo
  // queda exactamente en el mismo sitio y solo cambia hacia dónde mira la rodilla.
  const knees = (pose) => {
    const out = { ...pose };
    for (const [c, d] of [["c1", "d1"], ["c2", "d2"]]) {
      if (out[c] !== undefined && out[d] !== undefined && out[c] < out[d])
        [out[c], out[d]] = [out[d], out[c]];
    }
    return out;
  };

  // Calcula `hy` para que el pie más bajo toque el suelo igual que en reposo.
  const planted = (partial) => {
    const fixed = knees(partial);
    if (fixed.hy !== undefined) return fixed;
    const full = { ...base, ...fixed };
    let lo = -60,
      hi = 45;
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2;
      if (footDrop(full, mid) < idleDrop) lo = mid;
      else hi = mid;
    }
    return { ...fixed, hy: Math.round(((lo + hi) / 2) * 10) / 10 };
  };

  // Pose parcial: brazos de pantalla -> relativos al pecho; pies en el suelo
  // salvo `air: true` (saltos y cuerpos lanzados).
  const pose = ({ arm1, arm2, air, ...rest }) => {
    const chest = (rest.ln ?? base.ln) + (rest.bn ?? base.bn);
    const out = { ...rest };
    if (arm1) [out.a1, out.b1] = [arm1[0] + chest, arm1[1] + chest];
    if (arm2) [out.a2, out.b2] = [arm2[0] + chest, arm2[1] + chest];
    return air ? knees(out) : planted(out);
  };

  return { pose, planted, knees };
}
