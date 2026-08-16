import { useState, useEffect } from 'react';

const BACKEND_BASE = 'http://localhost:8000';

export function useServerStatus() {
  const [serverUp, setServerUp] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let alive = true;
    const check = async () => {
      try {
        const res = await fetch(`${BACKEND_BASE}/health`, { method: 'GET' });
        if (alive) setServerUp(res.ok);
      } catch {
        if (alive) setServerUp(false);
      } finally {
        if (alive) setChecking(false);
      }
    };
    check();
    return () => { alive = false; };
  }, []);

  return { serverUp, checking, base: BACKEND_BASE };
}
