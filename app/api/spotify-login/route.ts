import { NextResponse } from 'next/server';

export async function GET() {
  const client_id = process.env.SPOTIFY_CLIENT_ID || '';
  const redirect_uri = process.env.SPOTIFY_REDIRECT_URI || '';
  
  const scope = 'user-modify-playback-state user-read-playback-state';

  // 1. Armamos el dominio por separado para que el chat no lo rompa
  const dominioSeguro = 'https://' + 'accounts.spotify.com';
  const ruta = '/authorize';

  // 2. Construimos los parámetros de forma nativa
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: client_id,
    scope: scope,
    redirect_uri: redirect_uri,
  });

  // 3. Unimos todo
  const authUrl = `${dominioSeguro}${ruta}?${params.toString()}`;

  return NextResponse.redirect(authUrl);
}