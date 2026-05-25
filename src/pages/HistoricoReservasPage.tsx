import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  LoaderCircle,
  RefreshCcw,
  Search,
  XCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { Reserva, reservaService } from '../services/reservaService';
import { useAuth } from '../hooks/useAuth';
import { Pagination } from '../components/Pagination';

// ── Helpers ──────────────────────────────────────────────────────────────────

function statusLabel(status: string) {
  if (status === 'APROVADA') return 'Aprovada';
  if (status === 'REJEITADA') return 'Rejeitada';
  if (status === 'CANCELADA') return 'Cancelada';
  if (status === 'PARCIAL') return 'Parcial';
  return 'Aguardando';
}

function statusVariant(status: string): 'approved' | 'rejected' | 'waiting' | 'default' | 'partial' {
  if (status === 'APROVADA') return 'approved';
  if (status === 'REJEITADA') return 'rejected';
  if (status === 'CANCELADA') return 'default';
  if (status === 'PARCIAL') return 'partial';
  return 'waiting';
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pt-BR');
}

function formatHorario(reserva: Reserva) {
  if (reserva.horarioInicio && reserva.horarioFim) {
    return `${reserva.horarioInicio} - ${reserva.horarioFim}`;
  }
  return reserva.horario ?? 'N/D';
}

// ── Modal de cancelamento ────────────────────────────────────────────────────

function CancelarModal({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-[24px] border border-brand-wine/20 bg-white p-6 shadow-2xl high-contrast:border-yellow-400 high-contrast:bg-gray-900">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 high-contrast:bg-red-950 high-contrast:text-red-400">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-brand-ink high-contrast:text-yellow-400">
              Cancelar reserva
            </h2>
            <p className="text-sm text-muted-foreground high-contrast:text-gray-300">
              Tem certeza que deseja cancelar?
            </p>
          </div>
        </div>

        <p className="mb-6 text-sm text-muted-foreground high-contrast:text-gray-300">
          Esta ação não poderá ser desfeita. A reserva será marcada como cancelada.
        </p>

        <div className="mt-4 flex gap-3">
          <Button
            className="flex-1 bg-rose-600 text-white hover:bg-rose-700 high-contrast:bg-red-600 high-contrast:text-white high-contrast:hover:bg-red-700"
            onClick={onConfirm}
          >
            <XCircle className="mr-2 h-4 w-4" />
            Confirmar cancelamento
          </Button>
          <Button
            className="flex-1 high-contrast:border-yellow-400 high-contrast:text-yellow-400 high-contrast:hover:bg-yellow-400/10"
            onClick={onCancel}
            variant="outline"
          >
            Voltar
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Agrupamento ──────────────────────────────────────────────────────────────

type GrupoReserva = {
  key: string;
  isSerie: boolean;
  principal: Reserva;
  reservas: Reserva[];
};

function agruparReservas(reservas: Reserva[]): GrupoReserva[] {
  const map: Record<string, GrupoReserva> = {};

  for (const reserva of reservas) {
    const key = reserva.serieId ? `serie-${reserva.serieId}` : `reserva-${reserva.id}`;

    if (!map[key]) {
      map[key] = {
        key,
        isSerie: Boolean(reserva.serieId),
        principal: reserva,
        reservas: [],
      };
    }

    map[key].reservas.push(reserva);
  }

  for (const grupo of Object.values(map)) {
    grupo.reservas.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
    grupo.principal = grupo.reservas[0];
  }

  return Object.values(map).sort((a, b) => {
    const createdA = new Date(a.principal.createdAt).getTime();
    const createdB = new Date(b.principal.createdAt).getTime();
    return createdB - createdA;
  });
}

// ── Card de item ─────────────────────────────────────────────────────────────

function ReservaItem({
  reserva,
  onCancelar,
}: {
  reserva: Reserva;
  onCancelar?: (id: string) => void;
}) {
  const podeCancelar =
    onCancelar &&
    reserva.status !== 'CANCELADA' &&
    reserva.status !== 'REJEITADA';

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-brand-teal/10 bg-white px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            <span className="font-medium text-brand-ink">{formatDate(reserva.data)}</span>
            <span className="text-muted-foreground">{formatHorario(reserva)}</span>
          </div>
          <Badge variant={statusVariant(reserva.status ?? '')}>
            {statusLabel(reserva.status ?? '')}
          </Badge>
        </div>

        {reserva.turma && (
          <p className="text-muted-foreground">
            <span className="font-medium text-brand-ink">Turma:</span> {reserva.turma}
          </p>
        )}

        {reserva.justificativa && (
          <div className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-1.5 text-xs text-rose-700">
            <span className="font-semibold">Motivo:</span> {reserva.justificativa}
          </div>
        )}
      </div>

      {podeCancelar && (
        <div className="flex-shrink-0">
          <Button
            variant="outline"
            className="w-full border-rose-200 text-rose-600 hover:bg-rose-50 sm:w-auto"
            onClick={() => onCancelar(reserva.id)}
          >
            <XCircle className="mr-2 h-4 w-4" />
            Cancelar Reserva
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Card de grupo ────────────────────────────────────────────────────────────

function GrupoCard({
  grupo,
  onCancelar,
}: {
  grupo: GrupoReserva;
  onCancelar?: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const { principal, reservas, isSerie } = grupo;

  const statusGeral = (() => {
    if (reservas.some((r) => r.status === 'AGUARDANDO')) return 'AGUARDANDO';
    if (reservas.every((r) => r.status === 'APROVADA')) return 'APROVADA';
    if (reservas.every((r) => r.status === 'REJEITADA')) return 'REJEITADA';
    if (reservas.every((r) => r.status === 'CANCELADA')) return 'CANCELADA';
    return 'PARCIAL';
  })();

  const primeiraData = formatDate(reservas[0].data);
  const ultimaData = formatDate(reservas[reservas.length - 1].data);

  const podeCancelar = !isSerie && onCancelar && principal.status !== 'CANCELADA' && principal.status !== 'REJEITADA';

  return (
    <div
      className={`overflow-hidden rounded-[24px] border transition-all ${
        isSerie ? 'border-brand-teal/20' : 'border-brand-teal/10'
      } bg-gradient-to-r from-white to-brand-mist/20`}
    >
      <div className="p-5 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              {isSerie && (
                <span className="inline-flex items-center rounded-full bg-brand-teal/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-brand-teal">
                  Semestral
                </span>
              )}

              <h2 className="text-base font-bold text-brand-ink">
                {principal.salaNome ?? principal.salaId}
              </h2>

              <Badge variant={statusVariant(statusGeral)}>{statusLabel(statusGeral)}</Badge>

              {isSerie && (
                <span className="text-xs text-muted-foreground">{reservas.length} aulas</span>
              )}
            </div>

            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <p>
                <span className="font-medium text-brand-ink">
                  {isSerie ? 'Período:' : 'Data:'}
                </span>{' '}
                {isSerie ? `${primeiraData} → ${ultimaData}` : primeiraData}
              </p>
              <p>
                <span className="font-medium text-brand-ink">Horário:</span>{' '}
                {formatHorario(principal)}
              </p>
              {principal.turma && (
                <p>
                  <span className="font-medium text-brand-ink">Turma:</span> {principal.turma}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {isSerie && (
              <button
                type="button"
                onClick={() => setExpanded((p) => !p)}
                className="flex items-center gap-1.5 rounded-xl border border-brand-teal/20 px-3 py-1.5 text-xs font-semibold text-brand-teal transition hover:bg-brand-teal hover:text-white"
              >
                {expanded ? (
                  <>
                    <ChevronDown className="h-3.5 w-3.5" />
                    Ocultar datas
                  </>
                ) : (
                  <>
                    <ChevronRight className="h-3.5 w-3.5" />
                    Ver {reservas.length} datas
                  </>
                )}
              </button>
            )}

            {podeCancelar && (
              <Button
                variant="outline"
                className="border-rose-200 text-rose-600 hover:bg-rose-50 whitespace-nowrap"
                onClick={() => onCancelar(principal.id)}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Cancelar Reserva
              </Button>
            )}
          </div>
        </div>

        {!isSerie && principal.justificativa && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            <span className="font-semibold">Motivo da rejeição:</span> {principal.justificativa}
          </div>
        )}
      </div>

      {isSerie && expanded && (
        <div className="border-t border-brand-teal/10 bg-white/60 p-4 space-y-2">
          <div className="mb-3 flex flex-wrap gap-2">
            {(['APROVADA', 'AGUARDANDO', 'REJEITADA'] as const).map((s) => {
              const count = reservas.filter((r) => r.status === s).length;
              if (count === 0) return null;

              return (
                <span
                  key={s}
                  className="inline-flex items-center gap-1 rounded-full border border-brand-teal/10 bg-white px-2.5 py-0.5 text-xs"
                >
                  <Badge variant={statusVariant(s)} className="h-2 w-2 rounded-full p-0" />
                  {statusLabel(s)}: <strong>{count}</strong>
                </span>
              );
            })}
          </div>

          {reservas.map((r) => (
            <ReservaItem key={r.id} reserva={r} onCancelar={onCancelar} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Lista compartilhada ──────────────────────────────────────────────────────

function ListaReservas({
  reservas,
  isLoading,
  error,
  success,
  onRefresh,
  onCancelar,
}: {
  reservas: Reserva[];
  isLoading: boolean;
  error: string;
  success?: string;
  onRefresh: () => void;
  onCancelar?: (id: string) => void;
}) {
  const [page, setPage] = useState(1);
  const [filtroStatus, setFiltroStatus] = useState('');
  const [filtroData, setFiltroData] = useState('');
  const [filtroPeriodo, setFiltroPeriodo] = useState('');

  const reservasFiltradas = reservas.filter((r) => {
    if (filtroStatus && r.status !== filtroStatus) return false;
    if (filtroPeriodo && r.periodo !== filtroPeriodo) return false;
    if (filtroData) {
      const rDate = new Date(r.data).toISOString().split('T')[0];
      if (rDate !== filtroData) return false;
    }
    return true;
  });

  const grupos = agruparReservas(reservasFiltradas);

  // Zera a página se mudar as reservas e a página atual ficar fora do limite
  const limit = 10;
  const totalPages = Math.ceil(grupos.length / limit) || 1;
  useEffect(() => {
    if (page > totalPages) {
      setPage(1);
    }
  }, [totalPages, page, filtroStatus, filtroData, filtroPeriodo]);

  const gruposPaginados = grupos.slice((page - 1) * limit, page * limit);

  return (
    <>
      <CardHeader className="flex flex-col gap-3 border-b border-brand-teal/10 bg-gradient-to-r from-brand-mist/30 via-white to-brand-mist/20 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-teal">
            Histórico de reservas
          </p>
          <CardTitle className="text-3xl text-brand-ink">Reservas já registradas</CardTitle>
          <CardDescription className="max-w-2xl">
            Reservas únicas aparecem individualmente. Reservas semestrais são agrupadas.
          </CardDescription>
        </div>

        <Button onClick={onRefresh} variant="secondary">
          <RefreshCcw className="mr-2 h-4 w-4" />
          Atualizar lista
        </Button>
      </CardHeader>

      <CardContent className="p-6 md:p-8 space-y-4">
        <div className="flex flex-wrap gap-3 rounded-2xl border border-brand-teal/10 bg-brand-mist/20 p-4">
          <div className="min-w-[160px] flex-1">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Status
            </label>
            <Select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
            >
              <option value="">Todos</option>
              <option value="AGUARDANDO">Aguardando</option>
              <option value="APROVADA">Aprovada</option>
              <option value="REJEITADA">Rejeitada</option>
              <option value="CANCELADA">Cancelada</option>
            </Select>
          </div>

          <div className="min-w-[160px] flex-1">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Data da Reserva
            </label>
            <Input
              type="date"
              value={filtroData}
              onChange={(e) => setFiltroData(e.target.value)}
            />
          </div>

          <div className="min-w-[160px] flex-1">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Horário
            </label>
            <Select
              value={filtroPeriodo}
              onChange={(e) => setFiltroPeriodo(e.target.value)}
            >
              <option value="">Todos</option>
              <option value="matutino">Matutino</option>
              <option value="vespertino">Vespertino</option>
              <option value="noturno">Noturno</option>
            </Select>
          </div>

          {(filtroStatus || filtroData || filtroPeriodo) && (
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setFiltroStatus('');
                  setFiltroData('');
                  setFiltroPeriodo('');
                }}
              >
                Limpar filtros
              </Button>
            </div>
          )}
        </div>

        {isLoading && (
          <div className="flex items-center gap-3 rounded-2xl border border-brand-teal/15 bg-brand-teal/5 px-4 py-3 text-sm text-brand-teal">
            <LoaderCircle className="h-4 w-4 animate-spin" />
            Carregando histórico...
          </div>
        )}

        {success && !isLoading && (
          <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {success}
          </div>
        )}

        {error && !isLoading && (
          <div className="mb-4 rounded-2xl border border-brand-wine/20 bg-brand-wine/5 px-4 py-3 text-sm text-brand-wine">
            {error}
          </div>
        )}

        {!isLoading && !error && grupos.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-[28px] border border-dashed border-brand-teal/20 bg-brand-mist/20 px-6 py-12 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-wine text-white">
              <Search className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-bold text-brand-ink">Nenhuma reserva encontrada</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
              {(filtroStatus || filtroData || filtroPeriodo)
                ? 'Nenhuma reserva corresponde aos filtros aplicados.'
                : 'Assim que existirem reservas enviadas, elas aparecerão aqui com seus principais detalhes.'}
            </p>
          </div>
        )}

        {!isLoading && !error && grupos.length > 0 && (
          <>
            <div className="grid gap-4">
              {gruposPaginados.map((grupo) => (
                <GrupoCard key={grupo.key} grupo={grupo} onCancelar={onCancelar} />
              ))}
            </div>
            
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </>
        )}
      </CardContent>
    </>
  );
}

// ── Página completa ──────────────────────────────────────────────────────────

export function HistoricoReservasPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isCoordenador = user?.role === 'COORDENADOR';

  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [cancelarReservaId, setCancelarReservaId] = useState<string | null>(null);

  async function loadReservas() {
    try {
      setIsLoading(true);
      setError('');
      setSuccess('');
      const data = isCoordenador
        ? await reservaService.listarTodas()
        : await reservaService.listarPorProfessor();
      setReservas(data);
    } catch {
      setError('Não foi possível carregar o histórico de reservas agora.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCancelar(id: string) {
    try {
      setError('');
      setSuccess('');
      await reservaService.cancelar(id);
      setSuccess('Reserva cancelada com sucesso!');
      await loadReservas();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Não foi possível cancelar a reserva.');
    }
  }

  useEffect(() => {
    void loadReservas();
  }, [isCoordenador]);

  return (
    <div className="min-h-screen bg-transparent">
      {cancelarReservaId && (
        <CancelarModal
          onConfirm={() => {
            void handleCancelar(cancelarReservaId);
            setCancelarReservaId(null);
          }}
          onCancel={() => setCancelarReservaId(null)}
        />
      )}

      <div className="container py-8">
        <div className="rounded-[32px] border border-brand-teal/10 bg-white/85 p-8 shadow-panel">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-4">
              <Badge className="w-fit" variant="default">
                {isCoordenador ? 'Área do coordenador' : 'Área do professor'}
              </Badge>
              <div>
                <h1 className="font-serif text-4xl leading-tight text-brand-ink md:text-5xl">
                  {isCoordenador
                    ? 'Histórico de todas as reservas'
                    : 'Histórico de reservas em uma visão clara e organizada.'}
                </h1>
                <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
                  Consulte as reservas já solicitadas, acompanhe o status e volte para o dashboard quando precisar abrir uma nova solicitação.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                onClick={() => navigate(isCoordenador ? '/coordenador/dashboard' : '/professor/dashboard')}
                variant="outline"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar ao dashboard
              </Button>
            </div>
          </div>
        </div>

        <Card className="mt-8 overflow-hidden border-brand-teal/10 bg-white/90 shadow-panel">
          <div className="h-2 bg-gradient-to-r from-brand-wine via-brand-teal to-brand-wine" />
          <ListaReservas
            reservas={reservas}
            isLoading={isLoading}
            error={error}
            success={success}
            onRefresh={() => void loadReservas()}
            onCancelar={(id) => setCancelarReservaId(id)}
          />
        </Card>
      </div>
    </div>
  );
}

// ── Versão inline para uso dentro de abas ────────────────────────────────────

export function HistoricoReservasInline() {
  const { user } = useAuth();
  const isCoordenador = user?.role === 'COORDENADOR';

  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [cancelarReservaId, setCancelarReservaId] = useState<string | null>(null);

  async function loadReservas() {
    try {
      setIsLoading(true);
      setError('');
      setSuccess('');
      const data = isCoordenador
        ? await reservaService.listarTodas()
        : await reservaService.listarPorProfessor();
      setReservas(data);
    } catch {
      setError('Não foi possível carregar o histórico de reservas agora.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCancelar(id: string) {
    try {
      setError('');
      setSuccess('');
      await reservaService.cancelar(id);
      setSuccess('Reserva cancelada com sucesso!');
      await loadReservas();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Não foi possível cancelar a reserva.');
    }
  }

  useEffect(() => {
    void loadReservas();
  }, [isCoordenador]);

  return (
    <>
      {cancelarReservaId && (
        <CancelarModal
          onConfirm={() => {
            void handleCancelar(cancelarReservaId);
            setCancelarReservaId(null);
          }}
          onCancel={() => setCancelarReservaId(null)}
        />
      )}

      <Card className="rounded-tl-none border-brand-teal/10 bg-white/85">
        <ListaReservas
          reservas={reservas}
          isLoading={isLoading}
          error={error}
          success={success}
          onRefresh={() => void loadReservas()}
          onCancelar={(id) => setCancelarReservaId(id)}
        />
      </Card>
    </>
  );
}