'use client';

import { useState } from 'react';

export default function SimuladorNFC() {
  const [uid, setUid] = useState('32A66F21');
  const [respuesta, setRespuesta] = useState<any>(null);
  const [cargando, setCargando] = useState(false);

  const simularEscaneo = async () => {
    setCargando(true);
    setRespuesta(null);

    try {
      const res = await fetch('/api/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid })
      });

      const data = await res.json();
      setRespuesta({ status: res.status, data });
    } catch (error) {
      setRespuesta({ error: 'Fallo al conectar con la API' });
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
      <div className="bg-gray-800 p-8 rounded-xl shadow-2xl max-w-md w-full border border-gray-700">
        <h1 className="text-2xl font-bold mb-2 text-center text-blue-400">ESP32 Virtual</h1>
        <p className="text-sm text-gray-400 mb-6 text-center">Simula el escaneo de un tag NFC</p>

        <div className="mb-4">
          <label className="block text-sm mb-2 text-gray-300">UID de la Tarjeta</label>
          <input
            type="text"
            value={uid}
            onChange={(e) => setUid(e.target.value)}
            className="w-full bg-gray-700 text-white border border-gray-600 rounded p-2 focus:outline-none focus:border-blue-500 font-mono"
          />
        </div>

        <button
          onClick={simularEscaneo}
          disabled={cargando}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded transition-colors disabled:opacity-50"
        >
          {cargando ? 'Transmitiendo...' : '📡 Acercar Tarjeta'}
        </button>

        {respuesta && (
          <div className={`mt-6 p-4 rounded ${respuesta.status === 200 ? 'bg-green-900/30 border border-green-500' : 'bg-red-900/30 border border-red-500'}`}>
            <h3 className="text-sm font-bold mb-2">Respuesta del Servidor:</h3>
            <pre className="text-xs font-mono whitespace-pre-wrap">
              {JSON.stringify(respuesta.data, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}