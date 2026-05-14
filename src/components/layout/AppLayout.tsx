import { useState, useEffect, useRef } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { useAuth } from '../../hooks/useAuth';
import { useNotifications } from '../../hooks/useNotifications';
import { Notificacao } from '../../services/notificacaoService';

// ── Tipos de toast ────────────────────────────────────────────────────────────

type ToastVariant = 'approved' | 'rejected' | 'new_request' | 'new_user';

type AppToast = {
  id: string;
  title: string;
  message: string;
  variant: ToastVariant;
};

const variantStyles: Record<ToastVariant, { bar: string; icon: string; title: string; bg: string; border: string }> = {
  approved:    { bar: 'bg-emerald-500', icon: '✅', title: 'text-emerald-800', bg: 'bg-emerald-50',  border: 'border-emerald-200' },
  rejected:    { bar: 'bg-rose-500',    icon: '❌', title: 'text-rose-800',    bg: 'bg-rose-50',     border: 'border-rose-200' },
  new_request: { bar: 'bg-brand-teal',  icon: '📋', title: 'text-brand-teal',  bg: 'bg-white',       border: 'border-brand-teal/30' },
  new_user:    { bar: 'bg-violet-500',  icon: '👤', title: 'text-violet-800',  bg: 'bg-violet-50',   border: 'border-violet-200' },
};

// ── Componente de toast individual ────────────────────────────────────────────

function AppToastItem({ toast, onDismiss }: { toast: AppToast; onDismiss: (id: string) => void }) {
  const style = variantStyles[toast.variant];

  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 6000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <div
      role="alert"
      className={`relative flex w-[340px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border shadow-lg transition-all duration-300 ${style.bg} ${style.border}`}
    >
      {/* Barra lateral colorida */}
      <div className={`w-1 flex-shrink-0 ${style.bar}`} />

      <div className="flex flex-1 items-start gap-3 px-4 py-3">
        <span className="mt-0.5 text-base leading-none">{style.icon}</span>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-bold ${style.title}`}>{toast.title}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground line-clamp-3">
            {toast.message}
          </p>
        </div>
        <button
          onClick={() => onDismiss(toast.id)}
          className="ml-1 flex-shrink-0 text-muted-foreground/50 hover:text-muted-foreground transition text-sm"
          aria-label="Fechar"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

// ── Conversor de notificação → toast ─────────────────────────────────────────

function toToasts(notifications: Notificacao[]): AppToast[] {
  // Agrupa por serieId (para séries aprovadas/rejeitadas — professor)
  // A mensagem da notificação já vem do backend. Para séries, queremos apenas 1 toast.
  // Estratégia: agrupar notificações do mesmo tipo disparadas juntas (mesmo minuto + mesmo conteúdo parcial).
  // Como o backend gera 1 notif por reserva da série, vamos deduplicar por prefixo de mensagem.

  const seriesSeen = new Set<string>();
  const result: AppToast[] = [];

  for (const n of notifications) {
    if (n.type === 'RESERVA_APROVADA') {
      // Tenta extrair nome da sala para deduplicar série
      const key = `APROVADA-${n.message.slice(0, 40)}`;
      if (seriesSeen.has(key)) continue;
      seriesSeen.add(key);
      result.push({
        id: n.id,
        title: 'Reserva aprovada!',
        message: n.message,
        variant: 'approved',
      });
    } else if (n.type === 'RESERVA_REJEITADA') {
      result.push({
        id: n.id,
        title: 'Reserva rejeitada',
        message: n.message,
        variant: 'rejected',
      });
    } else if (n.type === 'NOVA_RESERVA') {
      result.push({
        id: n.id,
        title: 'Nova solicitação de reserva',
        message: n.message,
        variant: 'new_request',
      });
    } else if (n.type === 'NOVO_USUARIO') {
      result.push({
        id: n.id,
        title: 'Novo professor cadastrado',
        message: n.message,
        variant: 'new_user',
      });
    }
  }

  return result;
}

// ── Gerenciador de notificações (ambos os roles) ──────────────────────────────

function NotificationManager() {
  const { unreadNotifications, markAllAsRead } = useNotifications();
  const [toasts, setToasts] = useState<AppToast[]>([]);
  const processedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const fresh = unreadNotifications.filter((n) => !processedRef.current.has(n.id));
    if (fresh.length === 0) return;

    fresh.forEach((n) => processedRef.current.add(n.id));

    const newToasts = toToasts(fresh);
    if (newToasts.length > 0) {
      setToasts((prev) => [...prev, ...newToasts]);
    }
    void markAllAsRead();
  }, [unreadNotifications, markAllAsRead]);

  const dismiss = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));

  if (toasts.length === 0) return null;

  return (
    <div className="fixed right-4 top-20 z-[70] flex flex-col gap-2">
      {toasts.map((toast) => (
        <AppToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
      ))}
    </div>
  );
}

// ── Layout principal ──────────────────────────────────────────────────────────

export function AppLayout() {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 1024);

  return (
    <div className="min-h-screen bg-brand-sand">
      <Navbar onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Notificações em tempo real para todos os roles */}
      {user && <NotificationManager />}

      <main
        className={`pt-16 transition-all duration-300 ease-in-out ${
          sidebarOpen ? 'lg:ml-64' : 'lg:ml-16'
        }`}
      >
        <Outlet />
      </main>
    </div>
  );
}
