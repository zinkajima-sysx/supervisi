"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { CheckCircle2, Info, TriangleAlert, XCircle } from "lucide-react";

type ToastKind = "success" | "error" | "info" | "warning";

type ToastItem = {
  id: string;
  kind: ToastKind;
  title?: string;
  message: string;
  durationMs: number;
};

type ToastInput = Omit<ToastItem, "id"> & { id?: string };

type ToastApi = {
  show: (t: ToastInput) => string;
  success: (message: string, title?: string) => string;
  error: (message: string, title?: string) => string;
  info: (message: string, title?: string) => string;
  warning: (message: string, title?: string) => string;
  dismiss: (id: string) => void;
  clear: () => void;
};

const ToastContext = createContext<ToastApi | null>(null);

function uid() {
  try {
    return crypto.randomUUID();
  } catch {
    return `t_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }
}

function kindToAlert(kind: ToastKind): string {
  if (kind === "success") return "alert-success";
  if (kind === "error") return "alert-error";
  if (kind === "warning") return "alert-warning";
  return "alert-info";
}

function kindToIcon(kind: ToastKind) {
  if (kind === "success") return CheckCircle2;
  if (kind === "error") return XCircle;
  if (kind === "warning") return TriangleAlert;
  return Info;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const timers = useRef(new Map<string, number>());

  const dismiss = useCallback((id: string) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
    const handle = timers.current.get(id);
    if (handle) {
      window.clearTimeout(handle);
      timers.current.delete(id);
    }
  }, []);

  const clear = useCallback(() => {
    setItems([]);
    for (const handle of timers.current.values()) window.clearTimeout(handle);
    timers.current.clear();
  }, []);

  const show = useCallback(
    (t: ToastInput) => {
      const id = t.id ?? uid();
      const durationMs = Number.isFinite(t.durationMs) ? t.durationMs : 3500;
      const item: ToastItem = {
        id,
        kind: t.kind,
        title: t.title,
        message: t.message,
        durationMs,
      };

      setItems((prev) => [item, ...prev].slice(0, 6));
      const existing = timers.current.get(id);
      if (existing) window.clearTimeout(existing);
      const handle = window.setTimeout(() => dismiss(id), durationMs);
      timers.current.set(id, handle);
      return id;
    },
    [dismiss]
  );

  const api = useMemo<ToastApi>(
    () => ({
      show,
      success: (message, title) => show({ kind: "success", title, message, durationMs: 3000 }),
      error: (message, title) => show({ kind: "error", title, message, durationMs: 4500 }),
      info: (message, title) => show({ kind: "info", title, message, durationMs: 3500 }),
      warning: (message, title) => show({ kind: "warning", title, message, durationMs: 4000 }),
      dismiss,
      clear,
    }),
    [dismiss, clear, show]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast toast-top toast-end z-[9999]">
        {items.map((t) => {
          const Icon = kindToIcon(t.kind);
          return (
            <div
              key={t.id}
              role="status"
              className={`alert ${kindToAlert(t.kind)} shadow-lg border border-base-content/10 bg-base-100`}
            >
              <Icon aria-hidden="true" className="h-5 w-5" />
              <div className="min-w-0">
                {t.title ? <div className="font-bold">{t.title}</div> : null}
                <div className="text-sm font-medium opacity-80 break-words">{t.message}</div>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-xs btn-circle"
                aria-label="Tutup notifikasi"
                onClick={() => dismiss(t.id)}
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

