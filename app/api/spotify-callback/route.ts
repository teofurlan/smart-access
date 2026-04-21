import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.json({ error: 'No se recibió ningún código de Spotify' }, { status: 400 });
  }

  const client_id = process.env.SPOTIFY_CLIENT_ID;
  const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
  const redirect_uri = process.env.SPOTIFY_REDIRECT_URI;

  const basicAuth = Buffer.from(`${client_id}:${client_secret}`).toString('base64');

  try {
    // ⚠️ AQUÍ ESTÁ LA CORRECCIÓN: La URL oficial para pedir tokens
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirect_uri as string,
      }),
    });

    const data = await response.json();

    if (data.error) {
        return NextResponse.json({ error: "Spotify rechazó la petición", detalle: data }, { status: 400 });
    }

    return NextResponse.json({
      mensaje: "¡ÉXITO! Copia el refresh_token de abajo y guárdalo en tu archivo .env local y en Vercel como SPOTIFY_REFRESH_TOKEN.",
      refresh_token: data.refresh_token
    });

  } catch (error) {
    return NextResponse.json({ error: 'Fallo al intercambiar el token' }, { status: 500 });
  }
}