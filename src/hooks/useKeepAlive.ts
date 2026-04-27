import { useEffect } from 'react';
import { api } from '../services/api';

const PING_INTERVAL_MS = 10 * 60 * 1000; // 10 minutos — abaixo do limite de 15 min do Render

/**
 * useKeepAlive
 *
 * Pings GET /api/health every 10 minutes so the Render free-tier backend
 * never reaches the 15-minute inactivity threshold that triggers sleep.
 *
 * - Fires immediately on mount (wakes the server if it's cold).
 * - Then repeats at a fixed interval.
 * - Clears the interval on unmount.
 * - All failures are silently swallowed — this is best-effort and must not affect UX.
 */
export function useKeepAlive() {
  useEffect(() => {
    function ping() {
      void api.get('/health').catch(() => {
        // Silent — a failed ping is fine; the next one will retry.
      });
    }

    // Wake up immediately
    ping();

    const intervalId = setInterval(ping, PING_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, []);
}
