import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

interface ToastCtx {
  notify: (message: string) => void;
}

const Ctx = createContext<ToastCtx>({ notify: () => {} });

export function useToast(): ToastCtx {
  return useContext(Ctx);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<string | null>(null);

  const notify = useCallback((message: string) => setToast(message), []);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(id);
  }, [toast]);

  return (
    <Ctx.Provider value={{ notify }}>
      {children}
      {toast && (
        <div className="animate-toast fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-xl border border-teal/40 bg-panel px-4 py-3 text-[12.5px] font-medium text-ink shadow-2xl">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-teal/15 text-teal">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="m4.5 12.5 5 5 10-11" />
            </svg>
          </span>
          {toast}
        </div>
      )}
    </Ctx.Provider>
  );
}