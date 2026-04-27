import { useEffect, useState } from 'react';
import { CalendarDays, CalendarPlus2, History, LogOut } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { useAuth } from '../hooks/useAuth';
import { useNotifications } from '../hooks/useNotifications';
import { Toast, useToast } from '../components/Toast';
import { SolicitarReservaInline } from './SolicitarReservaPage';
import { HistoricoReservasInline } from './HistoricoReservasPage';
import { CalendarioInline } from './CalendarioPage';

type Tab = 'solicitar' | 'historico' | 'calendario';

export function ProfessorDashboard() {
  const { user, signOut } = useAuth();
  const { unreadNotifications, markAllAsRead } = useNotifications();
  const { toasts, addToast, dismiss } = useToast();
  const [tab, setTab] = useState<Tab>('solicitar');

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
    <div className="min-h-screen bg-transparent">
      <div className="container py-8">
        {/* Header */}
        <div className="mb-8 rounded-[32px] border border-black/5 bg-gradient-to-r from-brand-ink via-brand-teal to-brand-teal p-8 text-white shadow-panel">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-4">
              <Badge className="w-fit bg-white/12 text-white" variant="subtle">
                Área do professor
              </Badge>
              <div>
                <h1 className="font-serif text-4xl leading-tight md:text-5xl">
                  Sua rotina acadêmica em um painel claro.
                </h1>
                <p className="mt-3 max-w-2xl text-base leading-7 text-white/75">
                  Solicite reservas, acompanhe seu histórico e consulte o calendário de disponibilidade — tudo aqui.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm">
                Professor: <span className="font-semibold">{user?.name}</span>
              </div>
              <Button className="bg-white text-brand-teal hover:bg-white/90" onClick={signOut} variant="outline">
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </Button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-0 flex gap-2 border-b border-brand-teal/15 pb-0">
          <button
            id="tab-solicitar"
            className={`px-5 py-3 text-sm font-semibold rounded-t-xl transition-colors ${
              tab === 'solicitar'
                ? 'bg-white border border-b-white border-brand-teal/15 text-brand-ink -mb-px shadow-sm'
                : 'text-muted-foreground hover:text-brand-ink'
            }`}
            onClick={() => setTab('solicitar')}
          >
            <CalendarPlus2 className="inline mr-2 h-4 w-4" />
            Solicitar Reserva
          </button>

          <button
            id="tab-historico"
            className={`px-5 py-3 text-sm font-semibold rounded-t-xl transition-colors ${
              tab === 'historico'
                ? 'bg-white border border-b-white border-brand-teal/15 text-brand-ink -mb-px shadow-sm'
                : 'text-muted-foreground hover:text-brand-ink'
            }`}
            onClick={() => setTab('historico')}
          >
            <History className="inline mr-2 h-4 w-4" />
            Histórico de Reservas
          </button>

          <button
            id="tab-calendario"
            className={`px-5 py-3 text-sm font-semibold rounded-t-xl transition-colors ${
              tab === 'calendario'
                ? 'bg-white border border-b-white border-brand-teal/15 text-brand-ink -mb-px shadow-sm'
                : 'text-muted-foreground hover:text-brand-ink'
            }`}
            onClick={() => setTab('calendario')}
          >
            <CalendarDays className="inline mr-2 h-4 w-4" />
            Calendário
          </button>
        </div>

        {/* Conteúdo das abas */}
        {tab === 'solicitar' && <SolicitarReservaInline />}
        {tab === 'historico' && <HistoricoReservasInline />}
        {tab === 'calendario' && <CalendarioInline />}
      </div>

      <Toast toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
