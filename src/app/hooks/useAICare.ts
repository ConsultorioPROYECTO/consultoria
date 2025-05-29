import { useState } from 'react';

interface AICareResponse {
  [key: string]: unknown;
}

interface UseAICareResult {
  data: AICareResponse | null;
  loading: boolean;
  error: string | null;
  fetchAICare: (text: string) => Promise<void>;
}

// Cambia estos valores por tus credenciales reales
const BASIC_AUTH_USER = 'devUser';
const BASIC_AUTH_PASS = 'Rigjeq-jujgy7-vejqexv';

export function useAICare(): UseAICareResult {
  const [data, setData] = useState<AICareResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAICare = async (text: string) => {
    setLoading(true);
    setError(null);
    setData(null);
    console.log('[AI Care Hook] fetchAICare llamado con:', text);
    try {
      const url = 'https://n8n.srv828784.hstgr.cloud/webhook/Ai-care';
      console.log('[AI Care Hook] URL:', url);
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + btoa(`${BASIC_AUTH_USER}:${BASIC_AUTH_PASS}`),
      };
      console.log('[AI Care Hook] Headers:', headers);
      const body = JSON.stringify({ text });
      console.log('[AI Care Hook] Body:', body);
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body,
      });
      console.log('[AI Care Hook] Response recibido:', response);
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      const result: AICareResponse = await response.json();
      console.log('[AI Care Hook] JSON result:', result);
      setData(result);
    } catch (err) {
      console.error('[AI Care Hook] Error en fetchAICare:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, fetchAICare };
}
