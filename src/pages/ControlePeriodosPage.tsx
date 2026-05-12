import { PeriodoInativoProfessorManager } from '../components/PeriodoInativoProfessorManager';
import { Toast, useToast } from '../components/Toast';

export function ControlePeriodosPage() {
  const { toasts, dismiss } = useToast();

  return (
    <div className="container py-8 space-y-8">
      <PeriodoInativoProfessorManager />
      <Toast toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
