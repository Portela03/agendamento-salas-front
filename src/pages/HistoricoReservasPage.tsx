import { useEffect, useState } from 'react';
import { CalendarDays, ChevronDown, ChevronRight, LoaderCircle, RefreshCcw, Search } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Reserva, reservaService } from '../services/reservaService';

// ── Helpers ──────────────────────────────────────────────────────────────────

function statusLabel(status: string) {
  if (status === 'APROVADA') return 'Aprovada';
  if (status === 'REJEITADA') return 'Rejeitada';
  if (status === 'PARCIAL') return 'Parcial';
  return 'Aguardando';
}

function statusVariant(status: string): 'approved' | 'rejected' | 'waiting' | 'partial' {
  if (status === 'APROVADA') return 'approved';
  if (status === 'REJEITADA') return 'rejected';
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

// ── Agrupamento ────────────────────────────────────────────────────────────────

type GrupoReserva = {
  key: string;
  isSerie: boolean;
  principal: Reserva;
  reservas: Reserva[];
};

function agrupar(reservas: Reserva[]): GrupoReserva[] {
  const map: Record<string, GrupoReserva> = {};
  for (const r of reservas) {
    const key = r.serieId ? `serie-${r.serieId}` : `reserva-${r.id}`;
    if (!map[key]) {
      map[key] = { key, isSerie: Boolean(r.serieId), principal: r, reservas: [] };
    }
    map[key].reservas.push(r);
  }
  // Sort each group by date ascending, pick first as principal
  for (const g of Object.values(map)) {
    g.reservas.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
    g.principal = g.reservas[0];
  }
  // Sort groups by createdAt descending (most recently created group first)
  return Object.values(map).sort((a, b) => {
    const createdA = a.principal.createdAt ? new Date(a.principal.createdAt).getTime() : new Date(a.principal.data).getTime();
    const createdB = b.principal.createdAt ? new Date(b.principal.createdAt).getTime() : new Date(b.principal.data).getTime();
    return createdB - createdA;
  });
}

// ── Componente de card individual ────────────────────────────────────────────

function ReservaCard({ reserva }: { reserva: Reserva }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-teal/10 bg-white px-4 py-3 text-sm">
      <div className="flex items-center gap-3">
        <CalendarDays className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
        <span className="font-medium text-brand-ink">{formatDate(reserva.data)}</span>
        <span className="text-muted-foreground">{formatHorario(reserva)}</span>
      </div>
      <Badge variant={statusVariant(reserva.status ?? '')}>{statusLabel(reserva.status ?? '')}</Badge>
    </div>
  );
}

// ── Componente de grupo ───────────────────────────────────────────────────────

function GrupoCard({ grupo }: { grupo: GrupoReserva }) {
  const [expanded, setExpanded] = useState(false);
  const { principal, reservas, isSerie } = grupo;

  const statusGeral = (() => {
    if (reservas.some((r) => r.status === 'AGUARDANDO')) return 'AGUARDANDO';
    if (reservas.every((r) => r.status === 'APROVADA')) return 'APROVADA';
    if (reservas.every((r) => r.status === 'REJEITADA')) return 'REJEITADA';
    // Mixed: some approved, some rejected
    return 'PARCIAL';
  })();

  const primeiraData = formatDate(reservas[0].data);
  const ultimaData = formatDate(reservas[reservas.length - 1].data);

  return (
    <div className={`overflow-hidden rounded-[24px] border transition-all ${
      isSerie ? 'border-brand-teal/20' : 'border-brand-teal/10'
    } bg-gradient-to-r from-white to-brand-mist/20`}>

      {/* Header do card */}
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
                <span className="text-xs text-muted-foreground">
                  {reservas.length} aulas
                </span>
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
                  <span className="font-medium text-brand-ink">Turma:</span>{' '}
                  {principal.turma}
                </p>
              )}
            </div>
          </div>

          {/* Botão expandir — apenas para séries */}
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
        </div>

        {/* Motivo de rejeição (reserva única) */}
        {!isSerie && principal.justificativa && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            <span className="font-semibold">Motivo da rejeição:</span>{' '}
            {principal.justificativa}
          </div>
        )}
      </div>

      {/* Lista expandível de datas da série */}
      {isSerie && expanded && (
        <div className="border-t border-brand-teal/10 bg-white/60 p-4 space-y-2">
          {/* Resumo de status da série */}
          <div className="mb-3 flex flex-wrap gap-2">
            {(['APROVADA', 'AGUARDANDO', 'REJEITADA'] as const).map((s) => {
              const count = reservas.filter((r) => r.status === s).length;
              if (count === 0) return null;
              return (
                <span key={s} className="inline-flex items-center gap-1 rounded-full border border-brand-teal/10 bg-white px-2.5 py-0.5 text-xs">
                  <Badge variant={statusVariant(s)} className="h-2 w-2 rounded-full p-0" />
                  {statusLabel(s)}: <strong>{count}</strong>
                </span>
              );
            })}
          </div>

          {reservas.map((r) => (
            <div key={r.id}>
              <ReservaCard reserva={r} />
              {r.justificativa && (
                <div className="mt-1 ml-4 rounded-lg border border-rose-100 bg-rose-50 px-3 py-1.5 text-xs text-rose-700">
                  <span className="font-semibold">Motivo:</span> {r.justificativa}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Lista compartilhada ───────────────────────────────────────────────────────

function ListaReservas({ reservas, isLoading, error, onRefresh }: {
  reservas: Reserva[];
  isLoading: boolean;
  error: string;
  onRefresh: () => void;
}) {
  const grupos = agrupar(reservas);

  return (
    <>
      <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between border-b border-brand-teal/10 bg-gradient-to-r from-brand-mist/30 via-white to-brand-mist/20 pb-6">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-teal">Histórico de reservas</p>
          <CardTitle className="text-3xl text-brand-ink">Reservas já registradas</CardTitle>
          <CardDescription className="max-w-2xl">
            Reservas únicas aparecem individualmente. Reservas semestrais são agrupadas — clique em "Ver X datas" para expandir.
          </CardDescription>
        </div>
        <Button onClick={onRefresh} variant="secondary">
          <RefreshCcw className="mr-2 h-4 w-4" />
          Atualizar lista
        </Button>
      </CardHeader>

      <CardContent className="p-6 md:p-8">
        {isLoading && (
          <div className="flex items-center gap-3 rounded-2xl border border-brand-teal/15 bg-brand-teal/5 px-4 py-3 text-sm text-brand-teal">
            <LoaderCircle className="h-4 w-4 animate-spin" />
            Carregando histórico...
          </div>
        )}

        {error && !isLoading && (
          <div className="rounded-2xl border border-brand-wine/20 bg-brand-wine/5 px-4 py-3 text-sm text-brand-wine">
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
              Assim que existirem reservas enviadas, elas aparecerão aqui com seus principais detalhes.
            </p>
          </div>
        )}

        {!isLoading && !error && grupos.length > 0 && (
          <div className="grid gap-4">
            {grupos.map((grupo) => (
              <GrupoCard key={grupo.key} grupo={grupo} />
            ))}
          </div>
        )}
      </CardContent>
    </>
  );
}

// ── Página completa ───────────────────────────────────────────────────────────

export function HistoricoReservasPage() {
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  async function loadReservas() {
    try {
      setIsLoading(true);
      setError('');
      const data = await reservaService.listarPorProfessor();
      setReservas(data);
    } catch {
      setError('Não foi possível carregar o histórico de reservas agora.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { void loadReservas(); }, []);

  return (
    <div className="min-h-screen bg-transparent">
      <div className="container py-8">
        <div className="rounded-[32px] border border-brand-teal/10 bg-white/85 p-8 shadow-panel">
          <div className="space-y-4">
            <Badge className="w-fit" variant="default">Área do professor</Badge>
            <div>
              <h1 className="font-serif text-4xl leading-tight text-brand-ink md:text-5xl">
                Histórico de reservas em uma visão clara e organizada.
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
                Consulte as reservas já solicitadas, acompanhe o status e volte para o dashboard quando precisar abrir uma nova solicitação.
              </p>
            </div>
          </div>
        </div>

        <Card className="mt-8 overflow-hidden border-brand-teal/10 bg-white/90 shadow-panel">
          <div className="h-2 bg-gradient-to-r from-brand-wine via-brand-teal to-brand-wine" />
          <ListaReservas
            reservas={reservas}
            isLoading={isLoading}
            error={error}
            onRefresh={() => void loadReservas()}
          />
        </Card>
      </div>
    </div>
  );
}

// ── Versão inline para uso dentro de abas ────────────────────────────────────

export function HistoricoReservasInline() {
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  async function loadReservas() {
    try {
      setIsLoading(true);
      setError('');
      const data = await reservaService.listarPorProfessor();
      setReservas(data);
    } catch {
      setError('Não foi possível carregar o histórico de reservas agora.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { void loadReservas(); }, []);

  return (
    <Card className="rounded-tl-none border-brand-teal/10 bg-white/85">
      <ListaReservas
        reservas={reservas}
        isLoading={isLoading}
        error={error}
        onRefresh={() => void loadReservas()}
      />
    </Card>
  );
}
