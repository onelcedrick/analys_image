import { useCallback, useEffect, useRef, useState } from "react";
import { currentBase, detectApiBase, resetApiDetection, pingServer } from "../lib/apiClient";

export interface ServerStatus {
  /** true si le backend FastAPI répond sur /api/health */
  serverUp: boolean;
  /** base résolue ("" = même origine, sinon http://localhost:8000) */
  base: string;
  /** true pendant la toute première détection */
  checking: boolean;
  /** relance manuelle la détection */
  recheck: () => void;
  /** horodatage du dernier ping keep-alive réussi */
  lastPingAt: number | null;
}

const POLL_MS = 4000;
/** Keep-alive déploiement (Hugging Face free tier) — toutes les 2 minutes */
const KEEPALIVE_MS = 120_000;

/**
 * Surveille la disponibilité du backend + ping keep-alive périodique.
 */
export function useServerStatus(): ServerStatus {
  const [serverUp, setServerUp] = useState(false);
  const [base, setBase] = useState("");
  const [checking, setChecking] = useState(true);
  const [lastPingAt, setLastPingAt] = useState<number | null>(null);
  const timer = useRef<number | null>(null);
  const keepAlive = useRef<number | null>(null);

  const check = useCallback(async () => {
    const found = await detectApiBase();
    if (found === null) {
      resetApiDetection();
      setServerUp(false);
      setBase("");
    } else {
      setServerUp(true);
      setBase(currentBase());
    }
    setChecking(false);
  }, []);

  const sendPing = useCallback(async () => {
    const ok = await pingServer();
    if (ok) {
      setLastPingAt(Date.now());
      setServerUp(true);
      setBase(currentBase());
    }
  }, []);

  useEffect(() => {
    check();
    timer.current = window.setInterval(check, POLL_MS);
    // Premier ping après 5 s, puis toutes les 2 min
    const first = window.setTimeout(() => {
      sendPing();
      keepAlive.current = window.setInterval(sendPing, KEEPALIVE_MS);
    }, 5000);
    return () => {
      if (timer.current !== null) window.clearInterval(timer.current);
      if (keepAlive.current !== null) window.clearInterval(keepAlive.current);
      window.clearTimeout(first);
    };
  }, [check, sendPing]);

  const recheck = useCallback(() => {
    resetApiDetection();
    setChecking(true);
    check();
  }, [check]);

  return { serverUp, base, checking, recheck, lastPingAt };
}
