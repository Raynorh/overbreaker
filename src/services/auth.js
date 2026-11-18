
export async function initializeAuth(app) {
  app.auth = {
    status: "pending",
    user: null,
    isGuest: false,
    error: null,
  };

  // En pruebas fuera del navegador no intentamos conectar con Supabase.
  if (
    typeof location === "undefined" ||
    !["http:", "https:"].includes(location.protocol)
  ) {
    app.auth.status = "unavailable";
    return null;
  }

  try {
    const { supabase, signInAsGuest } = await import("./supabase.js");

    const { data, error } = await supabase.auth.getSession();

    if (error) throw error;

    let session = data.session;

    if (!session) {
      const guestData = await signInAsGuest();
      session = guestData.session;
    }

    app.auth.user = session?.user ?? null;
    app.auth.isGuest = session?.user?.is_anonymous === true;
    app.auth.status = "ready";

    return session;
  } catch (error) {
    app.auth.status = "offline";
    app.auth.error = error.message;
    console.error("OVERBREAKER: no se pudo iniciar la sesión:", error);

    return null;
  }
}
