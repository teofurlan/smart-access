const TOKEN_ENDPOINT = "https://accounts.spotify.com/api/token";
const PLAY_ENDPOINT = "https://api.spotify.com/v1/me/player/play";

type TokenSuccess = { access_token: string };
type TokenError = { error: string; error_description?: string };

function getSpotifyCredentials() {
  const client_id = process.env.SPOTIFY_CLIENT_ID?.trim() ?? "";
  const client_secret = process.env.SPOTIFY_CLIENT_SECRET?.trim() ?? "";
  const refresh_token = process.env.SPOTIFY_REFRESH_TOKEN?.trim() ?? "";

  return { client_id, client_secret, refresh_token };
}

/** Intercambia refresh_token por access_token. Lee env en runtime (Vercel, etc.). */
async function getAccessToken(): Promise<TokenSuccess | TokenError> {
  const { client_id, client_secret, refresh_token } = getSpotifyCredentials();

  if (!client_id || !client_secret) {
    return {
      error: "invalid_client_config",
      error_description: "Faltan SPOTIFY_CLIENT_ID o SPOTIFY_CLIENT_SECRET",
    };
  }
  if (!refresh_token) {
    return {
      error: "missing_refresh_token",
      error_description:
        "SPOTIFY_REFRESH_TOKEN no está definido. Obtén uno con /api/spotify-login y añádelo en el entorno de deploy.",
    };
  }

  const basicAuth = Buffer.from(`${client_id}:${client_secret}`).toString("base64");

  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token,
    }),
    cache: "no-store",
  });

  const data: unknown = await response.json();

  if (!response.ok || typeof data !== "object" || data === null) {
    console.error("Spotify token: respuesta no OK", response.status, data);
    return {
      error: "token_request_failed",
      error_description: `HTTP ${response.status}`,
    };
  }

  const body = data as Record<string, unknown>;

  if (typeof body.access_token === "string") {
    return { access_token: body.access_token };
  }

  const err = typeof body.error === "string" ? body.error : "unknown_error";
  const desc =
    typeof body.error_description === "string" ? body.error_description : JSON.stringify(body);
  console.error("Spotify token rechazado:", err, desc);
  return { error: err, error_description: desc };
}

const DEFAULT_PLAYLIST_URI = "spotify:playlist:37i9dQZF1DX4sWSpwq3LiO";

/** Da play a la playlist configurada (o la default). Requiere dispositivo activo en la cuenta de Spotify. */
export async function playLabVibe() {
  try {
    const tokenResult = await getAccessToken();

    if ("error" in tokenResult) {
      console.error(
        "No se pudo obtener el Access Token de Spotify:",
        tokenResult.error,
        tokenResult.error_description ?? "",
      );
      return false;
    }

    const { access_token } = tokenResult;
    const context_uri =
      process.env.SPOTIFY_PLAYLIST_URI?.trim() || DEFAULT_PLAYLIST_URI;

    const response = await fetch(PLAY_ENDPOINT, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ context_uri }),
    });

    if (response.status === 204) {
      console.log("Spotify: reproducción iniciada");
      return true;
    }

    const text = await response.text();
    let errorData: unknown;
    try {
      errorData = JSON.parse(text) as unknown;
    } catch {
      errorData = text;
    }
    console.warn("Spotify no pudo darle play:", response.status, errorData);
    return false;
  } catch (error) {
    console.error("Error crítico comunicándose con Spotify:", error);
    return false;
  }
}
