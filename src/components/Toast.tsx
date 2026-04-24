import { useEffect, useRef, useState } from 'react';

export type ToastType = 'success' | 'info' | 'warning' | 'error';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

const typeStyles: Record<ToastType, string> = {
  success: 'bg-green-600 text-white',
  info: 'bg-brand-teal text-white',
  warning: 'bg-amber-500 text-white',
  error: 'bg-red-600 text-white',
};

function ToastMessage({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: string) => void }) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Slight delay so the enter animation fires
    const enter = setTimeout(() => setVisible(true), 10);
    timerRef.current = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDismiss(toast.id), 300);
    }, 5000);
    return () => {
      clearTimeout(enter);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [toast.id, onDismiss]);

  return (
    <div
      role="alert"
      className={`
        flex items-start gap-3 rounded-2xl px-5 py-4 shadow-lg text-sm max-w-sm w-full
        transition-all duration-300
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
        ${typeStyles[toast.type]}
      `}
    >
      <span className="flex-1 leading-relaxed">{toast.message}</span>
      <button
        onClick={() => {
          setVisible(false);
          setTimeout(() => onDismiss(toast.id), 300);
        }}
        className="ml-2 shrink-0 opacity-70 hover:opacity-100 transition-opacity text-lg leading-none"
        aria-label="Fechar"
      >
        ✕
      </button>
    </div>
  );
}

export function Toast({ toasts, onDismiss }: ToastProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 items-end">
      {toasts.map((t) => (
        <ToastMessage key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

// ── useToast hook ─────────────────────────────────────────────────────────────

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = (message: string, type: ToastType = 'info') => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const dismiss = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return { toasts, addToast, dismiss };
}
