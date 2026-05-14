import { useAuth } from '../hooks/useAuth';

import { SolicitarReservaInline } from './SolicitarReservaPage';

export function ProfessorDashboard() {
  const { user } = useAuth();
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


    </div>
  );
}
