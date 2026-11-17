// Seconds relative to the note's target time. Keep intentional early hits bounded.
export const HIT_WINDOW = Object.freeze({
  early: 0.35,
  late: 0.14,
  perfect: 0.065,
});
export function canJudge(delta) {
  return (
    Number.isFinite(delta) &&
    delta >= -HIT_WINDOW.early &&
    delta <= HIT_WINDOW.late
  );
}
export function classifyHit(delta) {
  if (!canJudge(delta)) return null;
  return delta < -HIT_WINDOW.perfect
    ? "EARLY"
    : Math.abs(delta) <= HIT_WINDOW.perfect
      ? "PERFECT"
      : "GOOD";
}
