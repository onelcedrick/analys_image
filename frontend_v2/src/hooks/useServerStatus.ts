import { useCallback, useEffect, useRef, useState } from "react";
import { currentBase, detectApiBase, resetApiDetection } from "../lib/apiClient";

export interface ServerStatus {
  /** true si le backend FastAPI répond sur /api/health */
  serverUp: boolean;
  /** base résolue ("" = même origine, sinon http://localhost:8000) */
  base: string;
  /** true pendant la toute première détection */
  checking: boolean;
  /** relance manuelle la détection */
  recheck: () => void;
}

const POLL_MS = 4000;

/**
 * Surveille la disponibilité du backend. Si le serveur tombe, la détection
 * est ré-armée pour qu'une reprise soit captée au cycle suivant.
 */
export function useServerStatus(): ServerStatus {
  const [serverUp, setServerUp] = useState(false);
  const [base, setBase] = useState("");
  const [checking, setChecking] = useState(true);
  const timer = useRef<number | null>(null);

  const check = useCallback(async () => {
    const found = await detectApiBase();
    if (found === null) {
      // serveur absent : on ré-arme la détection pour le prochain cycle
      resetApiDetection();
      setServerUp(false);
      setBase("");
    } else {
      setServerUp(true);
      setBase(currentBase());
    }
    setChecking(false);
  }, []);

  useEffect(() => {
    check();
    timer.current = window.setInterval(check, POLL_MS);
    return () => {
      if (timer.current !== null) window.clearInterval(timer.current);
    };
  }, [check]);

  const recheck = useCallback(() => {
    resetApiDetection();
    setChecking(true);
    check();
  }, [check]);

  return { serverUp, base, checking, recheck };
}