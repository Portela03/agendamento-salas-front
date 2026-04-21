import { useNavigate } from 'react-router-dom';
import { CalendarDays, CalendarPlus2, History, LogOut } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { useAuth } from '../hooks/useAuth';

export function ProfessorDashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-transparent">
      <div className="container py-8">
        <div className="rounded-[32px] border border-brand-teal/10 bg-white/85 p-8 shadow-panel">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-4">
              <Badge className="w-fit" variant="default">
                Área do professor
              </Badge>
              <div>
                <h1 className="font-serif text-4xl leading-tight text-brand-ink md:text-5xl">
                  Sua rotina acadêmica em um painel claro e direto.
                </h1>
                <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
                  Consulte reservas, acompanhe salas disponíveis e organize solicitações sem ruído visual nem excesso de etapas.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-full border border-brand-teal/10 bg-brand-mist/30 px-4 py-2 text-sm text-brand-ink">
                Professor: <span className="font-semibold">{user?.name}</span>
              </div>
              <Button onClick={signOut} variant="secondary">
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3 rounded-[28px] border border-brand-teal/10 bg-white/80 px-6 py-5 shadow-panel">
          <div className="flex-1 space-y-1">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-teal">Fluxo de reservas</p>
            <p className="text-base text-brand-ink">Clique para abrir a página de solicitação e preencher o formulário separado.</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button onClick={() => navigate('/professor/reservas')} size="lg">
              <CalendarPlus2 className="mr-2 h-4 w-4" />
              Solicitar reserva
            </Button>

            <Button onClick={() => navigate('/professor/historicoreservas')} size="lg" variant="outline">
              <History className="mr-2 h-4 w-4" />
              Histórico de reservas
            </Button>

            <Button onClick={() => navigate('/professor/calendario')} size="lg" variant="outline">
              <CalendarDays className="mr-2 h-4 w-4" />
              Ver calendário
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
