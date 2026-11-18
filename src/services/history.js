
import { supabase } from "./supabase.js";

async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();

  if (error) throw error;

  if (!data.user) {
    throw new Error("No hay una sesión activa.");
  }

  return data.user;
}

// Actualiza el récord personal de supervivencia si se supera.
async function updateSurvivalRecord(userId, match) {
  const { data: currentRecord, error: readError } = await supabase
    .from("survival_records")
    .select("best_score")
    .eq("player_id", userId)
    .maybeSingle();

  if (readError) throw readError;

  const newBest = Math.floor(match.score);
  const previousBest = currentRecord?.best_score ?? -1;

  if (newBest <= previousBest) return false;

  const { error: saveError } = await supabase
    .from("survival_records")
    .upsert(
      {
        player_id: userId,
        match_id: match.match_id,
        best_score: newBest,
        achieved_at: new Date().toISOString(),
      },
      { onConflict: "player_id" },
    );

  if (saveError) throw saveError;

  return true;
}

// Guarda el resultado de una partida.
export async function saveMatch({
  gameMode,
  result,
  score = 0,
  durationSeconds = 0,
  opponentPlayerId = null,
  stats = {},
}) {
  const validModes = ["fight", "survival", "pvp"];
  const validResults = ["win", "loss", "draw", "abandoned"];

  if (!validModes.includes(gameMode)) {
    throw new Error("El modo de juego no es válido.");
  }

  if (!validResults.includes(result)) {
    throw new Error("El resultado de la partida no es válido.");
  }

  if (!Number.isFinite(score) || score < 0) {
    throw new Error("La puntuación no es válida.");
  }

  if (
    !Number.isFinite(durationSeconds) ||
    durationSeconds < 0
  ) {
    throw new Error("La duración no es válida.");
  }

  if (
    stats === null ||
    typeof stats !== "object" ||
    Array.isArray(stats)
  ) {
    throw new Error("Las estadísticas no son válidas.");
  }

  const user = await getCurrentUser();

  const match = {
    player_id: user.id,
    game_mode: gameMode,
    result,
    score: Math.floor(score),
    duration_seconds: Math.floor(durationSeconds),
    stats,
  };

  if (opponentPlayerId) {
    match.opponent_player_id = opponentPlayerId;
  }

  const { data, error } = await supabase
    .from("match_history")
    .insert(match)
    .select()
    .single();

  if (error) throw error;

  // Solo una supervivencia terminada normalmente puede establecer récord.
  if (gameMode === "survival" && result === "loss") {
    await updateSurvivalRecord(user.id, data);
  }

  return data;
}

// Recupera las partidas del jugador.
export async function getMyMatchHistory(limit = 20) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new Error("El límite debe estar entre 1 y 100.");
  }

  const user = await getCurrentUser();

  const { data, error } = await supabase
    .from("match_history")
    .select(`
      match_id,
      game_mode,
      result,
      score,
      duration_seconds,
      stats,
      created_at
    `)
    .eq("player_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return data;
}
// Calcula las estadísticas acumuladas del jugador.
export async function getMyProfileStatistics() {
  const user = await getCurrentUser();

  async function countMatches(gameMode = null, result = null) {
    let query = supabase
      .from("match_history")
      .select("match_id", { count: "exact", head: true })
      .eq("player_id", user.id);

    if (gameMode) query = query.eq("game_mode", gameMode);
    if (result) query = query.eq("result", result);

    const { count, error } = await query;

    if (error) throw error;

    return count ?? 0;
  }

  async function getBestScore(gameMode = null) {
    let query = supabase
      .from("match_history")
      .select("score")
      .eq("player_id", user.id)
      .order("score", { ascending: false })
      .limit(1);

    if (gameMode) query = query.eq("game_mode", gameMode);

    const { data, error } = await query.maybeSingle();

    if (error) throw error;

    return Number(data?.score ?? 0);
  }

  const modes = ["fight", "survival", "pvp"];

  const [
    total,
    wins,
    losses,
    draws,
    abandoned,
    bestScore,
    modeStatistics,
  ] = await Promise.all([
    countMatches(),
    countMatches(null, "win"),
    countMatches(null, "loss"),
    countMatches(null, "draw"),
    countMatches(null, "abandoned"),
    getBestScore(),
    Promise.all(
      modes.map(async (mode) => ({
        mode,
        played: await countMatches(mode),
        wins: await countMatches(mode, "win"),
        losses: await countMatches(mode, "loss"),
        abandoned: await countMatches(mode, "abandoned"),
        bestScore: await getBestScore(mode),
      })),
    ),
  ]);

  return {
    total,
    wins,
    losses,
    draws,
    abandoned,
    bestScore,
    winRate: total > 0
      ? Math.round((wins / total) * 100)
      : 0,
    modes: modeStatistics,
  };
}