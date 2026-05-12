import { useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNotifications } from '../hooks/useNotifications';
import { Toast, useToast } from '../components/Toast';
import { SolicitarReservaInline } from './SolicitarReservaPage';

export function ProfessorDashboard() {
  const { user } = useAuth();
  const { unreadNotifications, markAllAsRead } = useNotifications();
  const { toasts, addToast, dismiss } = useToast();

  useEffect(() => {
    if (unreadNotifications.length === 0) return;

    unreadNotifications.forEach((n) => {
      const type =
        n.type === 'RESERVA_APROVADA'
          ? 'success'
          : n.type === 'RESERVA_REJEITADA'
          ? 'error'
          : 'info';
      addToast(n.message, type);
    });

    void markAllAsRead();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unreadNotifications.length]);

  return (
    <div className="container py-8">
      <div className="mb-6">
        <h1 className="font-serif text-3xl text-brand-ink">
          Olá, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Solicite uma reserva de sala abaixo ou use o menu lateral para navegar.
        </p>
      </div>

      <SolicitarReservaInline />

      <Toast toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
