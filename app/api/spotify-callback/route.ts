import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.json({ error: 'No se recibió ningún código de Spotify' }, { status: 400 });
  }

  const client_id = process.env.SPOTIFY_CLIENT_ID?.trim();
  const client_secret = process.env.SPOTIFY_CLIENT_SECRET?.trim();
  const redirect_uri =
    process.env.SPOTIFY_REDIRECT_URI?.trim() ||
    new URL('/api/spotify-callback', request.url).toString();

  if (!client_id || !client_secret) {
    return NextResponse.json(
      { error: 'Faltan SPOTIFY_CLIENT_ID o SPOTIFY_CLIENT_SECRET en entorno' },
      { status: 500 },
    );
  }

  const basicAuth = Buffer.from(`${client_id}:${client_secret}`).toString('base64');

  // Armamos la URL de token por separado
  const tokenUrl = 'https://' + 'accounts.spotify.com' + '/api/token';

  try {
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirect_uri,
      }),
    });

    const data = await response.json();

    if (data.error) {
        return NextResponse.json({ error: "Spotify rechazó la petición", detalle: data }, { status: 400 });
    }

    return NextResponse.json({
      mensaje: "¡ÉXITO! Copia el refresh_token de abajo y guárdalo en tu archivo .env local y en Vercel.",
      refresh_token: data.refresh_token
    });

  } catch (error) {
    return NextResponse.json({ error: 'Fallo al intercambiar el token' }, { status: 500 });
  }
}