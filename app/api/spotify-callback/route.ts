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

    // Codificamos las credenciales en Base64 como exige Spotify
    const basicAuth = Buffer.from(`${client_id}:${client_secret}`).toString('base64');

    try {
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

        // ¡Acá está el premio! Lo mostramos en pantalla para que lo copies
        return NextResponse.json({
            mensaje: "¡ÉXITO! Copia el refresh_token de abajo y guárdalo en tu archivo .env como SPOTIFY_REFRESH_TOKEN. Ya no necesitas volver a iniciar sesión.",
            refresh_token: data.refresh_token,
            nota: "El access_token expira en 1 hora, pero el refresh_token dura para siempre."
        });

    } catch (error) {
        return NextResponse.json({ error: 'Fallo al intercambiar el token' }, { status: 500 });
    }
}