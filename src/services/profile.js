
import { supabase } from "./supabase.js";

async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();

  if (error) throw error;

  if (!data.user) {
    throw new Error("No hay una sesión activa.");
  }

  return data.user;
}

export async function getMyProfile() {
  const user = await getCurrentUser();

  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, display_name, created_at, updated_at")
    .eq("user_id", user.id)
    .single();

  if (error) throw error;

  return data;
}

export async function setMyDisplayName(displayName) {
  if (typeof displayName !== "string") {
    throw new Error("El alias debe ser texto.");
  }

  const alias = displayName.trim();

  if (alias.length < 3 || alias.length > 20) {
    throw new Error("El alias debe tener entre 3 y 20 caracteres.");
  }

  if (!/^[a-zA-Z0-9_]+$/.test(alias)) {
    throw new Error(
      "El alias solo puede contener letras, números y guion bajo."
    );
  }

  const user = await getCurrentUser();

  const { data, error } = await supabase
    .from("profiles")
    .update({ display_name: alias })
    .eq("user_id", user.id)
    .select("user_id, display_name, created_at, updated_at")
    .single();

  if (error) throw error;

  return data;
}
