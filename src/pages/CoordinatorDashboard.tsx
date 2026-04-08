import { type ReactNode, useEffect, useState } from 'react';
import { CheckCircle2, LogOut, RefreshCcw, ShieldCheck, Users2 } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { useAuth } from '../hooks/useAuth';
import { PendingUser, userService } from '../services/userService';

export function CoordinatorDashboard() {
  const { user, signOut } = useAuth();
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  async function loadPendingUsers() {
    try {
      setIsLoading(true);
      setError('');
      const result = await userService.listPending();
      setPendingUsers(result.users);
    } catch {
      setError('Erro ao carregar usuários pendentes.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleApprove(userId: string) {
    try {
      await userService.approve(userId);
      await loadPendingUsers();
    } catch {
      setError('Não foi possível aprovar o usuário.');
    }
  }

  useEffect(() => {
    void loadPendingUsers();
  }, []);

  return (
    <div className="min-h-screen bg-transparent">
      <div className="container py-8">
        <div className="mb-8 rounded-[32px] border border-black/5 bg-gradient-to-r from-brand-ink via-brand-teal to-brand-teal p-8 text-white shadow-panel">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-4">
              <Badge className="w-fit bg-white/12 text-white" variant="subtle">
                Painel do coordenador
              </Badge>
              <div>
                <h1 className="font-serif text-4xl leading-tight md:text-5xl">Aprovação de acessos e governança do sistema</h1>
                <p className="mt-3 max-w-2xl text-base leading-7 text-white/75">
                  Centralize a triagem de novos usuários, acompanhe o volume pendente e mantenha o ambiente de reservas
                  sob controle institucional.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm">
                Sessão ativa: <span className="font-semibold">{user?.name}</span>
              </div>
              <Button className="bg-white text-brand-teal hover:bg-white/90" onClick={signOut} variant="outline">
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          <StatCard description="Aguardando validação" icon={<Users2 className="h-5 w-5" />} title="Pendentes" value={String(pendingUsers.length)} />
          <StatCard description="Critério institucional" icon={<ShieldCheck className="h-5 w-5" />} title="Fluxo" value="Manual" />
          <StatCard description="Liberação imediata" icon={<CheckCircle2 className="h-5 w-5" />} title="Após aprovação" value="Ativo" />
        </div>

        <Card className="mt-8 border-brand-teal/10 bg-white/85">
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-3xl text-brand-ink">Solicitações pendentes</CardTitle>
              <CardDescription>
                Aprove professores cadastrados e libere o primeiro acesso com apenas um clique.
              </CardDescription>
            </div>
            <Button onClick={() => void loadPendingUsers()} variant="secondary">
              <RefreshCcw className="mr-2 h-4 w-4" />
              Atualizar lista
            </Button>
          </CardHeader>

          <CardContent className="space-y-4">
            {isLoading && <PanelMessage tone="info">Carregando usuários pendentes...</PanelMessage>}
            {error && <PanelMessage tone="error">{error}</PanelMessage>}
            {!isLoading && pendingUsers.length === 0 && (
              <PanelMessage tone="info">Nenhum usuário aguardando aprovação neste momento.</PanelMessage>
            )}

            {pendingUsers.map((pendingUser) => (
              <div
                key={pendingUser.id}
                className="flex flex-col gap-4 rounded-[24px] border border-brand-teal/10 bg-gradient-to-r from-white to-brand-mist/20 p-5 md:flex-row md:items-center md:justify-between"
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-lg font-bold text-brand-ink">{pendingUser.name}</h2>
                    <Badge variant="pending">Pendente</Badge>
                    <Badge variant={pendingUser.role === 'COORDENADOR' ? 'coordinator' : 'professor'}>
                      {pendingUser.role === 'COORDENADOR' ? 'Coordenador' : 'Professor'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{pendingUser.email}</p>
                  <p className="text-xs uppercase tracking-[0.2em] text-brand-teal/80">Perfil solicitado e aguardando aprovação</p>
                </div>

                <Button className="md:min-w-36" onClick={() => void handleApprove(pendingUser.id)}>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Aprovar acesso
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ description, icon, title, value }: { description: string; icon: ReactNode; title: string; value: string }) {
  return (
    <Card className="border-white/60 bg-white/75">
      <CardContent className="flex items-start justify-between p-6">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">{title}</p>
          <p className="mt-3 font-serif text-4xl text-brand-ink">{value}</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-teal text-white">{icon}</div>
      </CardContent>
    </Card>
  );
}

function PanelMessage({ children, tone }: { children: ReactNode; tone: 'error' | 'info' }) {
  return (
    <div
      className={tone === 'error'
        ? 'rounded-2xl border border-brand-wine/20 bg-brand-wine/5 px-4 py-3 text-sm text-brand-wine'
        : 'rounded-2xl border border-brand-teal/15 bg-brand-teal/5 px-4 py-3 text-sm text-brand-teal'}
    >
      {children}
    </div>
  );
}
