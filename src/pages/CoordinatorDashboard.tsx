import { type ReactNode, useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  CalendarCheck2,
  CheckCircle2,
  ClipboardList,
  Clock,
  RefreshCcw,
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
import { Reserva, ReservaStatus, reservaService } from '../services/reservaService';

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
  const [expandedSeries, setExpandedSeries] = useState<Record<string, boolean>>({});

  // Salas
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [classesLoading, setClassesLoading] = useState(false);
  const [classesError, setClassesError] = useState('');
  const [onlyAvailableClasses, setOnlyAvailableClasses] = useState(false);

  // ── Loaders ──────────────────────────────────────────────────────────────

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
    void loadReservas();
  }, [loadReservas]);

  useEffect(() => {
    void loadClasses();
  }, [loadClasses]);

  // ── Ações ─────────────────────────────────────────────────────────────────

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

  async function handleAprovarSerie(serieId: string) {
    try {
      setReservasSuccess('');
      setReservasError('');
      await reservaService.aprovarSerie(serieId);
      setReservasSuccess('Reservas da serie aprovadas com sucesso!');
      await loadReservas();
    } catch {
      setReservasError('Nao foi possivel aprovar as reservas da serie.');
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

  const reservasAgrupadas = Object.values(
    reservasFiltradas.reduce<Record<string, { principal: Reserva; reservas: Reserva[]; isSerie: boolean }>>((acc, reserva) => {
      const key = reserva.serieId ? `serie-${reserva.serieId}` : `reserva-${reserva.id}`;
      if (!acc[key]) {
        acc[key] = { principal: reserva, reservas: [], isSerie: Boolean(reserva.serieId) };
      }
      acc[key].reservas.push(reserva);
      acc[key].reservas.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
      acc[key].principal = acc[key].reservas[0];
      return acc;
    }, {})
  );

  const classesFiltradas = filtroTipoSala
    ? classes.filter((item) => item.type === filtroTipoSala)
    : classes;

  const totalAguardando = reservas.filter((r) => r.status === 'AGUARDANDO').length;
  const totalAprovadas = reservas.filter((r) => r.status === 'APROVADA').length;
  const totalRejeitadas = reservas.filter((r) => r.status === 'REJEITADA').length;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="container py-8 space-y-8">
      {rejeitarId && (
        <RejeitarModal
          reservaId={rejeitarId}
          onConfirm={handleRejeitarReserva}
          onCancel={() => setRejeitarId(null)}
        />
      )}

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
        {/* ── RESERVAS ── */}
        <Card className="border-brand-teal/10 bg-white/85">
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
              {!reservasLoading && reservasAgrupadas.length === 0 && (
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
              {!reservasLoading && reservasAgrupadas.length > 0 && (
                <div className="grid gap-4">
                  {reservasAgrupadas.map((grupo) => {
                    const reserva = grupo.principal;
                    const pendentes = grupo.reservas.filter((item) => item.status === 'AGUARDANDO');
                    const serieId = reserva.serieId ?? '';
                    const isExpanded = Boolean(expandedSeries[serieId]);
                    const primeiraData = formatDate(grupo.reservas[0].data);
                    const ultimaData = formatDate(grupo.reservas[grupo.reservas.length - 1].data);

                    return (
                    <div
                      key={grupo.isSerie ? `serie-${serieId}` : reserva.id}
                      className="flex flex-col gap-4 rounded-[24px] border border-brand-teal/10 bg-gradient-to-r from-white to-brand-mist/20 p-5 md:flex-row md:items-start md:justify-between"
                    >
                      <div className="space-y-3 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-lg font-bold text-brand-ink">
                            {grupo.isSerie ? 'Reserva semestral' : 'Sala'}: {reserva.salaNome ?? reserva.salaId}
                          </h2>
                          <Badge variant={statusVariant((pendentes.length > 0 ? 'AGUARDANDO' : reserva.status) as ReservaStatus)}>
                            {statusLabel((pendentes.length > 0 ? 'AGUARDANDO' : reserva.status) as ReservaStatus)}
                          </Badge>
                          {grupo.isSerie && (
                            <span className="inline-flex items-center rounded-full bg-brand-teal/10 px-2.5 py-0.5 text-xs font-semibold text-brand-teal">
                              {grupo.reservas.length} datas · {pendentes.length} pendente{pendentes.length !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>

                        <div className="grid gap-1.5 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-3">
                          <p>
                            <span className="font-medium text-brand-ink">Professor:</span>{' '}
                            {reserva.professorNome ?? 'N/D'}
                          </p>
                          <p>
                            <span className="font-medium text-brand-ink">Data:</span>{' '}
                            {grupo.isSerie ? `${primeiraData} ate ${ultimaData}` : formatDate(reserva.data)}
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

                        {grupo.isSerie && isExpanded && (
                          <div className="mt-4 grid gap-2 rounded-2xl border border-brand-teal/10 bg-white/70 p-3">
                            {grupo.reservas.map((item) => (
                              <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 text-sm">
                                <span className="font-medium text-brand-ink">{formatDate(item.data)}</span>
                                <span className="text-muted-foreground">{formatHorario(item)}</span>
                                <Badge variant={statusVariant(item.status)}>{statusLabel(item.status)}</Badge>
                                {item.status === 'AGUARDANDO' && (
                                  <div className="flex gap-2">
                                    <Button size="sm" onClick={() => void handleAprovarReserva(item.id)}>
                                      Aprovar
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => setRejeitarId(item.id)}>
                                      Rejeitar
                                    </Button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {pendentes.length > 0 && (
                        <div className="flex shrink-0 flex-col gap-2 sm:flex-row md:flex-col">
                          {grupo.isSerie ? (
                            <>
                              <Button
                                className="bg-emerald-600 text-white hover:bg-emerald-700"
                                onClick={() => void handleAprovarSerie(serieId)}
                              >
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                Aprovar todas
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => setExpandedSeries((prev) => ({ ...prev, [serieId]: !prev[serieId] }))}
                              >
                                {isExpanded ? 'Ocultar datas' : 'Aprovar especificas'}
                              </Button>
                            </>
                          ) : (
                            <Button
                              className="bg-emerald-600 text-white hover:bg-emerald-700"
                              onClick={() => void handleAprovarReserva(reserva.id)}
                            >
                              <CheckCircle2 className="mr-2 h-4 w-4" />
                              Aprovar
                            </Button>
                          )}
                          {!grupo.isSerie && (
                            <Button
                              className="border-rose-200 text-rose-600 hover:bg-rose-50"
                              onClick={() => setRejeitarId(reserva.id)}
                              variant="outline"
                            >
                              <XCircle className="mr-2 h-4 w-4" />
                              Rejeitar
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

        {/* ── SALAS (quick view) ── */}
          <Card className="border-brand-teal/10 bg-white/85">
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
    </div>
  );
}
