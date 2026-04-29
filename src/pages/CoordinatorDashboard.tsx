import { type ReactNode, useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  CalendarCheck2,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock,
  LogOut,
  RefreshCcw,
  ShieldCheck,
  Users2,
  XCircle,
  FlaskConical,
  GraduationCap,
  Mic2,
  PencilLine,
  Filter,
} from 'lucide-react';
import { ClassItem, listClasses } from '../services/classService';
import { Link } from 'react-router-dom';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Select } from '../components/ui/select';
import { useAuth } from '../hooks/useAuth';
import { PendingUser, userService } from '../services/userService';
import { Reserva, ReservaStatus, reservaService } from '../services/reservaService';
import { useNotifications } from '../hooks/useNotifications';
import { Toast, useToast } from '../components/Toast';
import { CalendarioInline } from './CalendarioPage';

// ── Helpers ───────────────────────────────────────────────────────────────────

function statusLabel(status: ReservaStatus) {
  if (status === 'APROVADA') return 'Aprovada';
  if (status === 'REJEITADA') return 'Rejeitada';
  return 'Aguardando';
}

function statusVariant(status: ReservaStatus): 'approved' | 'rejected' | 'waiting' {
  if (status === 'APROVADA') return 'approved';
  if (status === 'REJEITADA') return 'rejected';
  return 'waiting';
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('pt-BR');
}

function formatHorario(reserva: Reserva) {
  if (reserva.horarioInicio && reserva.horarioFim) {
    return `${reserva.horarioInicio} - ${reserva.horarioFim}`;
  }
  return reserva.horario;
}

function classTypeLabel(type?: ClassItem['type']) {
  if (type === 'LABORATORIO') return 'Laboratório';
  if (type === 'AUDITORIO') return 'Auditório';
  return 'Sala';
}

function TypeIcon({ type }: { type?: ClassItem['type'] }) {
  if (type === 'LABORATORIO') return <FlaskConical className="h-4 w-4" />;
  if (type === 'AUDITORIO') return <Mic2 className="h-4 w-4" />;
  return <GraduationCap className="h-4 w-4" />;
}

// ── Modal de Justificativa ────────────────────────────────────────────────────

interface ModalProps {
  reservaId: string;
  onConfirm: (id: string, justificativa: string) => void;
  onCancel: () => void;
}

function RejeitarModal({ reservaId, onConfirm, onCancel }: ModalProps) {
  const [justificativa, setJustificativa] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-[24px] border border-brand-wine/20 bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-brand-ink">Rejeitar reserva</h2>
            <p className="text-sm text-muted-foreground">Informe o motivo da rejeição</p>
          </div>
        </div>

        <textarea
          className="mt-2 w-full rounded-xl border border-brand-teal/20 bg-brand-mist/20 px-4 py-3 text-sm text-brand-ink placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-teal/30 resize-none"
          placeholder="Ex.: Conflito com evento institucional, sala em manutenção..."
          rows={4}
          value={justificativa}
          onChange={(e) => setJustificativa(e.target.value)}
        />

        <div className="mt-4 flex gap-3">
          <Button
            className="flex-1 bg-rose-600 text-white hover:bg-rose-700"
            disabled={justificativa.trim().length === 0}
            onClick={() => onConfirm(reservaId, justificativa)}
          >
            <XCircle className="mr-2 h-4 w-4" />
            Confirmar rejeição
          </Button>
          <Button className="flex-1" onClick={onCancel} variant="outline">
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Componentes auxiliares ────────────────────────────────────────────────────

function StatCard({
  description,
  icon,
  title,
  value,
}: {
  description: string;
  icon: ReactNode;
  title: string;
  value: string;
}) {
  return (
    <Card className="border-white/60 bg-white/75">
      <CardContent className="flex items-start justify-between p-6">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">{title}</p>
          <p className="mt-3 font-serif text-4xl text-brand-ink">{value}</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-teal text-white">
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}

function PanelMessage({ children, tone }: { children: ReactNode; tone: 'error' | 'info' }) {
  return (
    <div
      className={
        tone === 'error'
          ? 'rounded-2xl border border-brand-wine/20 bg-brand-wine/5 px-4 py-3 text-sm text-brand-wine'
          : 'rounded-2xl border border-brand-teal/15 bg-brand-teal/5 px-4 py-3 text-sm text-brand-teal'
      }
    >
      {children}
    </div>
  );
}

// ── Component Principal ───────────────────────────────────────────────────────

export function CoordinatorDashboard() {
  const { user, signOut } = useAuth();
  const { unreadNotifications, markAllAsRead } = useNotifications();
  const { toasts, addToast, dismiss } = useToast();

  // Show toast for each unread notification then mark all as read
  useEffect(() => {
    if (unreadNotifications.length === 0) return;
    unreadNotifications.forEach((n) => {
      addToast(n.message, n.type === 'NOVO_USUARIO' ? 'info' : 'info');
    });
    void markAllAsRead();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unreadNotifications.length]);

  // Usuários pendentes
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState('');

  // Reservas
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [reservasLoading, setReservasLoading] = useState(false);
  const [reservasError, setReservasError] = useState('');
  const [reservasSuccess, setReservasSuccess] = useState('');

  // Filtros
  const [filtroStatus, setFiltroStatus] = useState<'' | ReservaStatus>('');
  const [filtroPeriodo, setFiltroPeriodo] = useState('');
  const [filtroTipoSala, setFiltroTipoSala] = useState<'' | ClassItem['type']>('');

  // Modal rejeitar
  const [rejeitarId, setRejeitarId] = useState<string | null>(null);

  // Salas
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [classesLoading, setClassesLoading] = useState(false);
  const [classesError, setClassesError] = useState('');
  const [onlyAvailableClasses, setOnlyAvailableClasses] = useState(false);

  // Tab ativa
  const [tab, setTab] = useState<'usuarios' | 'reservas' | 'salas' | 'calendario'>('reservas');

  // ── Loaders ──────────────────────────────────────────────────────────────

  async function loadPendingUsers() {
    try {
      setUsersLoading(true);
      setUsersError('');
      const result = await userService.listPending();
      setPendingUsers(result.users);
    } catch {
      setUsersError('Erro ao carregar usuários pendentes.');
    } finally {
      setUsersLoading(false);
    }
  }

  const loadReservas = useCallback(async () => {
    try {
      setReservasLoading(true);
      setReservasError('');
      const data = await reservaService.listarTodas();
      setReservas(data);
    } catch {
      setReservasError('Não foi possível carregar as reservas.');
    } finally {
      setReservasLoading(false);
    }
  }, []);

  const loadClasses = useCallback(async () => {
    try {
      setClassesLoading(true);
      setClassesError('');
      const data = await listClasses(onlyAvailableClasses);
      setClasses(data);
    } catch {
      setClassesError('Não foi possível carregar as salas.');
    } finally {
      setClassesLoading(false);
    }
  }, [onlyAvailableClasses]);

  useEffect(() => {
    void loadPendingUsers();
    void loadReservas();
  }, [loadReservas]);

  useEffect(() => {
    void loadClasses();
  }, [loadClasses]);

  // ── Ações ─────────────────────────────────────────────────────────────────

  async function handleApproveUser(userId: string) {
    try {
      await userService.approve(userId);
      await loadPendingUsers();
    } catch {
      setUsersError('Não foi possível aprovar o usuário.');
    }
  }

  async function handleRejectUser(userId: string) {
    try {
      await userService.reject(userId);
      await loadPendingUsers();
    } catch {
      setUsersError('Não foi possível recusar o acesso.');
    }
  }

  async function handleAprovarReserva(id: string) {
    try {
      setReservasSuccess('');
      setReservasError('');
      await reservaService.aprovar(id);
      setReservasSuccess('Reserva aprovada com sucesso!');
      await loadReservas();
    } catch {
      setReservasError('Não foi possível aprovar a reserva.');
    }
  }

  async function handleRejeitarReserva(id: string, justificativa: string) {
    try {
      setReservasSuccess('');
      setReservasError('');
      setRejeitarId(null);
      await reservaService.rejeitar(id, justificativa);
      setReservasSuccess('Reserva rejeitada.');
      await loadReservas();
    } catch {
      setReservasError('Não foi possível rejeitar a reserva.');
    }
  }

  // ── Filtros ───────────────────────────────────────────────────────────────

  const reservasFiltradas = reservas.filter((r) => {
    if (filtroStatus && r.status !== filtroStatus) return false;
    if (filtroPeriodo && r.periodo !== filtroPeriodo) return false;
    return true;
  });

  const classesFiltradas = filtroTipoSala
    ? classes.filter((item) => item.type === filtroTipoSala)
    : classes;

  const totalAguardando = reservas.filter((r) => r.status === 'AGUARDANDO').length;
  const totalAprovadas = reservas.filter((r) => r.status === 'APROVADA').length;
  const totalRejeitadas = reservas.filter((r) => r.status === 'REJEITADA').length;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-transparent">
      {rejeitarId && (
        <RejeitarModal
          reservaId={rejeitarId}
          onConfirm={handleRejeitarReserva}
          onCancel={() => setRejeitarId(null)}
        />
      )}

      <div className="container py-8">
        {/* Header */}
        <div className="mb-8 rounded-[32px] border border-black/5 bg-gradient-to-r from-brand-ink via-brand-teal to-brand-teal p-8 text-white shadow-panel">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-4">
              <Badge className="w-fit bg-white/12 text-white" variant="subtle">
                Painel do coordenador
              </Badge>
              <div>
                <h1 className="font-serif text-4xl leading-tight md:text-5xl">
                  Gestão de Reservas e Acessos
                </h1>
                <p className="mt-3 max-w-2xl text-base leading-7 text-white/75">
                  Centralize a aprovação de reservas de salas, gerencie acessos de professores e mantenha o ambiente
                  institucional sob controle.
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

        {/* Stat Cards */}
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            description="Total de reservas"
            icon={<ClipboardList className="h-5 w-5" />}
            title="Reservas"
            value={String(reservas.length)}
          />
          <StatCard
            description="Aguardando análise"
            icon={<Clock className="h-5 w-5" />}
            title="Pendentes"
            value={String(totalAguardando)}
          />
          <StatCard
            description="Salas confirmadas"
            icon={<CalendarCheck2 className="h-5 w-5" />}
            title="Aprovadas"
            value={String(totalAprovadas)}
          />
          <StatCard
            description="Solicitações negadas"
            icon={<XCircle className="h-5 w-5" />}
            title="Rejeitadas"
            value={String(totalRejeitadas)}
          />
        </div>

        {/* Tabs */}
        <div className="mt-8 flex gap-2 border-b border-brand-teal/15 pb-0">
          <button
            id="tab-reservas"
            className={`px-5 py-3 text-sm font-semibold rounded-t-xl transition-colors ${
              tab === 'reservas'
                ? 'bg-white border border-b-white border-brand-teal/15 text-brand-ink -mb-px shadow-sm'
                : 'text-muted-foreground hover:text-brand-ink'
            }`}
            onClick={() => setTab('reservas')}
          >
            <ClipboardList className="inline mr-2 h-4 w-4" />
            Reservas de Salas
            {totalAguardando > 0 && (
              <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-wine text-[10px] font-bold text-white">
                {totalAguardando}
              </span>
            )}
          </button>

          <button
            id="tab-salas"
            className={`px-5 py-3 text-sm font-semibold rounded-t-xl transition-colors ${
              tab === 'salas'
                ? 'bg-white border border-b-white border-brand-teal/15 text-brand-ink -mb-px shadow-sm'
                : 'text-muted-foreground hover:text-brand-ink'
            }`}
            onClick={() => setTab('salas')}
          >
            <Building2 className="inline mr-2 h-4 w-4" />
            Salas
          </button>

          <button
            id="tab-usuarios"
            className={`px-5 py-3 text-sm font-semibold rounded-t-xl transition-colors ${
              tab === 'usuarios'
                ? 'bg-white border border-b-white border-brand-teal/15 text-brand-ink -mb-px shadow-sm'
                : 'text-muted-foreground hover:text-brand-ink'
            }`}
            onClick={() => setTab('usuarios')}
          >
            <Users2 className="inline mr-2 h-4 w-4" />
            Aprovação de Professores
            {pendingUsers.length > 0 && (
              <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-wine text-[10px] font-bold text-white">
                {pendingUsers.length}
              </span>
            )}
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
        {/* ── TAB: RESERVAS ── */}
        {tab === 'reservas' && (
          <Card className="rounded-tl-none border-brand-teal/10 bg-white/85">
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="text-3xl text-brand-ink">Solicitações de Reserva</CardTitle>
                <CardDescription className="mt-1">
                  Visualize, filtre, aprove ou rejeite as solicitações dos professores.
                </CardDescription>
              </div>
              <Button onClick={() => void loadReservas()} variant="secondary">
                <RefreshCcw className="mr-2 h-4 w-4" />
                Atualizar
              </Button>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Filtros */}
              <div className="flex flex-wrap gap-3 rounded-2xl border border-brand-teal/10 bg-brand-mist/20 p-4">
                <div className="flex-1 min-w-[160px]">
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Status
                  </label>
                  <Select
                    value={filtroStatus}
                    onChange={(e) => setFiltroStatus(e.target.value as '' | ReservaStatus)}
                  >
                    <option value="">Todos</option>
                    <option value="AGUARDANDO">Aguardando</option>
                    <option value="APROVADA">Aprovada</option>
                    <option value="REJEITADA">Rejeitada</option>
                  </Select>
                </div>
                <div className="flex-1 min-w-[160px]">
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Período
                  </label>
                  <Select value={filtroPeriodo} onChange={(e) => setFiltroPeriodo(e.target.value)}>
                    <option value="">Todos</option>
                    <option value="matutino">Matutino</option>
                    <option value="vespertino">Vespertino</option>
                    <option value="noturno">Noturno</option>
                  </Select>
                </div>

                {(filtroStatus || filtroPeriodo) && (
                  <div className="flex items-end">
                    <Button
                      variant="outline"
                      onClick={() => { setFiltroStatus(''); setFiltroPeriodo(''); }}
                    >
                      Limpar filtros
                    </Button>
                  </div>
                )}
              </div>

              {/* Feedback */}
              {reservasSuccess && <PanelMessage tone="info">{reservasSuccess}</PanelMessage>}
              {reservasError && <PanelMessage tone="error">{reservasError}</PanelMessage>}
              {reservasLoading && <PanelMessage tone="info">Carregando reservas...</PanelMessage>}

              {/* Lista vazia */}
              {!reservasLoading && reservasFiltradas.length === 0 && (
                <div className="flex flex-col items-center justify-center rounded-[28px] border border-dashed border-brand-teal/20 bg-brand-mist/20 px-6 py-12 text-center">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-teal/10 text-brand-teal">
                    <ClipboardList className="h-6 w-6" />
                  </div>
                  <h2 className="text-xl font-bold text-brand-ink">Nenhuma reserva encontrada</h2>
                  <p className="mt-2 max-w-xs text-sm text-muted-foreground">
                    {filtroStatus || filtroPeriodo
                      ? 'Nenhuma reserva corresponde aos filtros aplicados.'
                      : 'Assim que professores enviarem solicitações, elas aparecerão aqui.'}
                  </p>
                </div>
              )}

              {/* Lista de reservas */}
              {!reservasLoading && reservasFiltradas.length > 0 && (
                <div className="grid gap-4">
                  {reservasFiltradas.map((reserva) => (
                    <div
                      key={reserva.id}
                      className="flex flex-col gap-4 rounded-[24px] border border-brand-teal/10 bg-gradient-to-r from-white to-brand-mist/20 p-5 md:flex-row md:items-start md:justify-between"
                    >
                      <div className="space-y-3 flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <h2 className="text-lg font-bold text-brand-ink">
                            Sala: {reserva.salaNome ?? reserva.salaId}
                          </h2>
                          <Badge variant={statusVariant(reserva.status)}>
                            {statusLabel(reserva.status)}
                          </Badge>
                        </div>

                        <div className="grid gap-1.5 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-3">
                          <p>
                            <span className="font-medium text-brand-ink">Professor:</span>{' '}
                            {reserva.professorNome ?? 'N/D'}
                          </p>
                          <p>
                            <span className="font-medium text-brand-ink">Data:</span>{' '}
                            {formatDate(reserva.data)}
                          </p>
                          <p>
                            <span className="font-medium text-brand-ink">Horário:</span>{' '}
                            {formatHorario(reserva)}
                          </p>
                          <p>
                            <span className="font-medium text-brand-ink">Turma:</span>{' '}
                            {reserva.turma ?? 'N/D'}
                          </p>
                        </div>

                        {reserva.justificativa && (
                          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                            <span className="font-semibold">Motivo da rejeição:</span>{' '}
                            {reserva.justificativa}
                          </div>
                        )}
                      </div>

                      {reserva.status === 'AGUARDANDO' && (
                        <div className="flex shrink-0 flex-col gap-2 sm:flex-row md:flex-col">
                          <Button
                            className="bg-emerald-600 text-white hover:bg-emerald-700"
                            onClick={() => void handleAprovarReserva(reserva.id)}
                          >
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Aprovar
                          </Button>
                          <Button
                            className="border-rose-200 text-rose-600 hover:bg-rose-50"
                            onClick={() => setRejeitarId(reserva.id)}
                            variant="outline"
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            Rejeitar
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── TAB: USUÁRIOS ── */}
        {tab === 'usuarios' && (
          <Card className="rounded-tl-none border-brand-teal/10 bg-white/85">
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-3xl text-brand-ink">Aprovação de Professores</CardTitle>
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
              {usersLoading && <PanelMessage tone="info">Carregando usuários pendentes...</PanelMessage>}
              {usersError && <PanelMessage tone="error">{usersError}</PanelMessage>}
              {!usersLoading && pendingUsers.length === 0 && (
                <div className="flex flex-col items-center justify-center rounded-[28px] border border-dashed border-brand-teal/20 bg-brand-mist/20 px-6 py-12 text-center">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-teal text-white">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <h2 className="text-xl font-bold text-brand-ink">Nenhum professor pendente</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Todos os professores cadastrados já foram aprovados.
                  </p>
                </div>
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
                    <p className="text-xs uppercase tracking-[0.2em] text-brand-teal/80">
                      Perfil solicitado e aguardando aprovação
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button className="bg-emerald-600 text-white hover:bg-emerald-700 md:min-w-36" onClick={() => void handleApproveUser(pendingUser.id)}>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Aprovar acesso
                    </Button>
                    <Button className="border-rose-200 text-rose-600 hover:bg-rose-50 md:min-w-36" variant="outline" onClick={() => void handleRejectUser(pendingUser.id)}>
                      <XCircle className="mr-2 h-4 w-4" />
                      Recusar
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* ── TAB: SALAS ── */}
        {tab === 'salas' && (
          <Card className="rounded-tl-none border-brand-teal/10 bg-white/85">
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="text-3xl text-brand-ink">Salas Cadastradas</CardTitle>
                <CardDescription className="mt-1">
                  Consulte status, tipo e capacidade.
                </CardDescription>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button onClick={() => void loadClasses()} variant="secondary">
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  Atualizar
                </Button>

                <Link to="/coordenador/salas">
                  <Button>
                    <PencilLine className="mr-2 h-4 w-4" />
                    Gerenciar cadastro
                  </Button>
                </Link>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Filtro de tipo */}
              <div className="flex flex-wrap gap-3 rounded-2xl border border-brand-teal/10 bg-brand-mist/20 p-4">
                <div className="flex-1 min-w-[160px]">
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Tipo
                  </label>
                  <Select
                    value={filtroTipoSala}
                    onChange={(e) => setFiltroTipoSala(e.target.value as '' | ClassItem['type'])}
                  >
                    <option value="">Todos</option>
                    <option value="SALA">Sala</option>
                    <option value="LABORATORIO">Laboratório</option>
                    <option value="AUDITORIO">Auditório</option>
                  </Select>
                </div>

                <div className="flex items-end">
                  <Button variant="outline" onClick={() => setOnlyAvailableClasses((prev) => !prev)}>
                    <Filter className="mr-2 h-4 w-4" />
                    {onlyAvailableClasses ? 'Mostrando disponíveis' : 'Apenas disponíveis'}
                  </Button>
                </div>

                {filtroTipoSala && (
                  <div className="flex items-end">
                    <Button variant="outline" onClick={() => setFiltroTipoSala('')}>
                      Limpar filtro
                    </Button>
                  </div>
                )}
              </div>

              {classesError && <PanelMessage tone="error">{classesError}</PanelMessage>}
              {classesLoading && <PanelMessage tone="info">Carregando salas...</PanelMessage>}

              {!classesLoading && classesFiltradas.length === 0 && (
                <div className="flex flex-col items-center justify-center rounded-[28px] border border-dashed border-brand-teal/20 bg-brand-mist/20 px-6 py-12 text-center">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-teal/10 text-brand-teal">
                    <Building2 className="h-6 w-6" />
                  </div>
                  <h2 className="text-xl font-bold text-brand-ink">Nenhuma sala encontrada</h2>
                  <p className="mt-2 max-w-xs text-sm text-muted-foreground">
                    {classes.length === 0
                      ? 'Cadastre uma nova sala para começar.'
                      : 'Nenhuma sala corresponde ao filtro selecionado.'}
                  </p>
                </div>
              )}

              {!classesLoading && classesFiltradas.length > 0 && (
                <div className="grid gap-3 md:grid-cols-2">
                  {classesFiltradas.map((item) => (
                    <article
                      key={item.id}
                      className="rounded-2xl border border-brand-teal/10 bg-gradient-to-r from-white to-brand-mist/20 p-4"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-base font-semibold text-brand-ink">{item.name}</h3>
                        <span
                          className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                            item.status === 'DISPONIVEL'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-rose-100 text-rose-700'
                          }`}
                        >
                          {item.status ?? 'INDISPONIVEL'}
                        </span>
                      </div>

                      <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                        <p className="inline-flex items-center gap-2">
                          <TypeIcon type={item.type} />
                          {classTypeLabel(item.type)}
                        </p>
                        <p>Capacidade: {item.capacity} pessoas</p>
                        <p>Descrição: {item.description?.trim() ? item.description : '—'}</p>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
        {/* ── TAB: CALENDÁRIO ── */}
        {tab === 'calendario' && (
          <div className="mt-0">
            <CalendarioInline />
          </div>
        )}
      </div>
      <Toast toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}