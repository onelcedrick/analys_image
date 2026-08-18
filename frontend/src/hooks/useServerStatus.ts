import { useEffect, useState } from 'react';

const BASE_URL = 'http://localhost:8000';

export function useServerStatus() {
  const [serverUp, setServerUp] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let alive = true;
    const check = async () => {
      try {
        const res = await fetch(`${BASE_URL}/health`, { signal: AbortSignal.timeout(1500) });
        if (alive) setServerUp(res.ok);
      } catch {
        if (alive) setServerUp(false);
      } finally {
        if (alive) setChecking(false);
      }
    };
    check();
    const id = setInterval(check, 5000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  return { serverUp, checking, base: BASE_URL };
}
