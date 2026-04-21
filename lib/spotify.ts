const client_id = process.env.SPOTIFY_CLIENT_ID || '';
const client_secret = process.env.SPOTIFY_CLIENT_SECRET || '';
const refresh_token = process.env.SPOTIFY_REFRESH_TOKEN || '';

const basicAuth = Buffer.from(`${client_id}:${client_secret}`).toString('base64');
const TOKEN_ENDPOINT = `https://accounts.spotify.com/api/token`;
const PLAY_ENDPOINT = `https://api.spotify.com/v1/me/player/play`;

// 1. Función interna para pedir un token fresco de 1 hora
async function getAccessToken() {
    const response = await fetch(TOKEN_ENDPOINT, {
        method: 'POST',
        headers: {
            Authorization: `Basic ${basicAuth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token,
        }),
        // Evitamos que Next.js guarde esto en caché
        cache: 'no-store',
    });

    return response.json();
}

// 2. La función que exportamos para darle Play a la música
export async function playLabVibe() {
    try {
        const { access_token } = await getAccessToken();

        if (!access_token) {
            console.error("No se pudo obtener el Access Token de Spotify");
            return false;
        }

        const response = await fetch(PLAY_ENDPOINT, {
            method: 'PUT',
            headers: {
                Authorization: `Bearer ${access_token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                // URI de una playlist de Synthwave/Hacking (puedes poner la tuya)
                context_uri: "spotify:playlist:37i9dQZF1DX4sWSpwq3LiO"
            }),
        });

        // Spotify devuelve 204 No Content si todo salió perfecto
        if (response.status === 204) {
            console.log("▶️ ¡Música activada en el laboratorio!");
            return true;
        } else {
            const errorData = await response.json();
            console.warn("Spotify no pudo darle play:", errorData);
            return false;
        }
    } catch (error) {
        console.error("Error crítico comunicándose con Spotify:", error);
        return false;
    }
}