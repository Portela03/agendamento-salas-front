import { type ReactNode } from 'react';
import { CalendarDays, LogOut, MapPinned, NotebookTabs } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { useAuth } from '../hooks/useAuth';

export function ProfessorDashboard() {
  const { user, signOut } = useAuth();

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

        <div className="mt-8 grid gap-5 md:grid-cols-3">
          <ProfessorCard
            description="Planeje o uso dos espaços por período letivo e horário disponível."
            icon={<CalendarDays className="h-5 w-5" />}
            title="Agenda"
          />
          <ProfessorCard
            description="Visualize salas com contexto mais claro, sem depender de consultas dispersas."
            icon={<MapPinned className="h-5 w-5" />}
            title="Salas"
          />
          <ProfessorCard
            description="Acompanhe solicitações e histórico com uma leitura mais humana do processo."
            icon={<NotebookTabs className="h-5 w-5" />}
            title="Solicitações"
          />
        </div>

        <Card className="mt-8 bg-gradient-to-br from-brand-teal to-brand-ink text-white">
          <CardHeader>
            <CardTitle className="text-white">Ambiente pronto para reservas</CardTitle>
            <CardDescription className="text-white/70">
              A base visual do painel já está preparada para receber os próximos módulos do professor.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="max-w-2xl text-sm leading-7 text-white/80">
              Quando você adicionar os fluxos de reserva, consulta de disponibilidade e histórico, essa estrutura já suporta crescimento sem perder consistência visual.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ProfessorCard({ description, icon, title }: { description: string; icon: ReactNode; title: string }) {
  return (
    <Card className="border-white/60 bg-white/80">
      <CardContent className="p-6">
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-wine text-white">{icon}</div>
        <h2 className="text-xl font-bold text-brand-ink">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
