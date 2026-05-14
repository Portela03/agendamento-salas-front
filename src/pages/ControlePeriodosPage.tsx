import { PeriodoInativoProfessorManager } from '../components/PeriodoInativoProfessorManager';
import { Toast, useToast } from '../components/Toast';
import { Badge } from '../components/ui/badge';

export function ControlePeriodosPage() {
  const { toasts, dismiss } = useToast();

  return (
    <div className="min-h-screen bg-transparent">
      <div className="container py-8 space-y-8">

        {/* Page header */}
        <div className="rounded-[32px] border border-brand-teal/10 bg-white/85 p-8 shadow-panel">
          <div className="space-y-4">
            <Badge className="w-fit" variant="default">
              Área do coordenador
            </Badge>
            <div>
              <h1 className="font-serif text-4xl leading-tight text-brand-ink md:text-5xl">
                Controle de períodos e bloqueios.
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
                Gerencie os intervalos de tempo em que os professores ficam impedidos de realizar novas reservas de salas.
              </p>
            </div>
          </div>
        </div>

        <PeriodoInativoProfessorManager />
        <Toast toasts={toasts} onDismiss={dismiss} />
      </div>
    </div>
  );
}
