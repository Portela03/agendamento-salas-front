import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Info,
  RefreshCcw,
  X,
  BookOpen,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { fetchCalendario } from '../services/calendarService';
import { listClasses, ClassItem } from '../services/classService';
import { Reserva } from '../services/reservaService';
import { buildHolidayMap, getFeriado, Feriado, getSemestreAtivo, isForaDoPeriodoLetivo, Semestre } from '../lib/holidays';

// ── Helpers ──────────────────────────────────────────────────────────────────

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const SEMANAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const PERIODOS = [
  { value: '', label: 'Todos os períodos' },
  { value: 'matutino', label: 'Matutino' },
  { value: 'vespertino', label: 'Vespertino' },
  { value: 'noturno', label: 'Noturno' },
];

function isoDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function sameDay(a: Date, b: Date) {
  return isoDate(a) === isoDate(b);
}

function getDiasDoMes(ano: number, mes: number): Date[] {
  // mes 0-indexed
  const total = new Date(ano, mes + 1, 0).getDate();
  return Array.from({ length: total }, (_, i) => new Date(ano, mes, i + 1));
}

function formatHorarioReserva(reserva: Reserva): string {
  if (reserva.horarioInicio && reserva.horarioFim) {
    return `${reserva.horarioInicio} - ${reserva.horarioFim}`;
  }
  return reserva.horario;
}

// ── Tipos locais ─────────────────────────────────────────────────────────────

interface DayInfo {
  date: Date;
  reservas: Reserva[];
  feriado: Feriado | null;
  isToday: boolean;
  isPast: boolean;
  isCurrentMonth: boolean;
  isForaPeriodo: boolean;
  isDomingo: boolean; // domingos nunca têm aulas
}

// ── Painel lateral de detalhes ────────────────────────────────────────────────

function DayPanel({
  info,
  onClose,
}: {
  info: DayInfo;
  onClose: () => void;
}) {
  const label = info.date.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative flex h-full w-full max-w-md flex-col overflow-y-auto bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-brand-teal/10 bg-white/95 p-6 backdrop-blur">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-teal">
              Detalhes do dia
            </p>
            <h2 className="mt-1 text-lg font-bold capitalize text-brand-ink">{label}</h2>
          </div>
          <button
            id="close-day-panel"
            onClick={onClose}
            className="rounded-xl p-2 text-muted-foreground transition hover:bg-brand-mist/30 hover:text-brand-ink"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Feriado banner */}
        {info.feriado && (
          <div
            className={`mx-6 mt-4 rounded-2xl px-4 py-3 text-sm font-medium ${
              info.feriado.tipo === 'academico'
                ? 'border border-amber-200 bg-amber-50 text-amber-800'
                : 'border border-rose-200 bg-rose-50 text-rose-800'
            }`}
          >
            <span className="mr-2">
              {info.feriado.tipo === 'academico' ? '🎓' : '🇧🇷'}
            </span>
            {info.feriado.tipo === 'academico' ? 'Recesso Acadêmico' : 'Feriado Nacional'}
            {' — '}
            <span className="font-semibold">{info.feriado.label}</span>
            <p className="mt-1 text-xs font-normal opacity-75">
              Agendamentos nesta data estão bloqueados.
            </p>
          </div>
        )}

        {/* Reservas */}
        <div className="flex-1 space-y-3 p-6">
          {info.reservas.length === 0 && !info.feriado && (
            <div className="flex flex-col items-center justify-center rounded-[24px] border border-dashed border-brand-teal/20 bg-brand-mist/10 py-12 text-center">
              <CalendarDays className="mb-3 h-8 w-8 text-brand-teal/40" />
              <p className="text-sm text-muted-foreground">Nenhuma reserva aprovada neste dia.</p>
            </div>
          )}

          {info.reservas.map((r) => (
            <div
              key={r.id}
              className="rounded-2xl border border-brand-teal/10 bg-gradient-to-br from-white to-brand-mist/20 p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-brand-ink">{r.salaNome ?? r.salaId}</p>
                <span className="flex-shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                  Aprovada
                </span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <p><span className="font-medium text-brand-ink">Professor:</span> {r.professorNome ?? '—'}</p>
                <p><span className="font-medium text-brand-ink">Horário:</span> {formatHorarioReserva(r)}</p>
                <p><span className="font-medium text-brand-ink">Turma:</span> {r.turma ?? '—'}</p>
                <p><span className="font-medium text-brand-ink">Status:</span> {r.status}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Célula do calendário ──────────────────────────────────────────────────────

function DayCell({
  info,
  onClick,
}: {
  info: DayInfo;
  onClick: () => void;
}) {
  const hasFeriado = !!info.feriado;
  const hasReservas = info.reservas.length > 0;

  let bg = 'bg-white hover:bg-brand-mist/20';
  if (info.isForaPeriodo || info.isDomingo) bg = 'bg-slate-50/70 hover:bg-slate-100/60';
  if (info.isToday) bg = 'bg-brand-teal/8 ring-2 ring-brand-teal/30 hover:bg-brand-teal/12';
  if (info.isPast && !info.isForaPeriodo && !info.isDomingo) bg = 'bg-gray-50/80 hover:bg-gray-100/60';
  if (hasFeriado && info.feriado?.tipo === 'nacional') bg = 'bg-rose-50/80 hover:bg-rose-50';
  if (hasFeriado && info.feriado?.tipo === 'academico') bg = 'bg-amber-50/80 hover:bg-amber-50';

  return (
    <button
      id={`day-cell-${isoDate(info.date)}`}
      onClick={onClick}
      className={`group relative flex min-h-[88px] w-full flex-col rounded-xl border p-2 text-left transition-all ${
        info.isForaPeriodo || info.isDomingo
          ? 'border-slate-200/60'
          : 'border-brand-teal/8'
      } ${bg}`}
    >
      {/* Número do dia */}
      <span
        className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold transition
          ${
            info.isToday
              ? 'bg-brand-teal text-white'
              : info.isDomingo || info.isForaPeriodo
              ? 'text-muted-foreground/40'
              : info.isPast
              ? 'text-muted-foreground/50'
              : 'text-brand-ink'
          }`}
      >
        {info.date.getDate()}
      </span>

      {/* Indicador: domingo */}
      {info.isDomingo && !hasFeriado && !info.isForaPeriodo && (
        <span className="mt-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
          Sem aulas
        </span>
      )}

      {/* Indicador: fora do período letivo */}
      {info.isForaPeriodo && !hasFeriado && (
        <span className="mt-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
          Fora do período
        </span>
      )}

      {/* Badge de feriado */}
      {hasFeriado && (
        <span
          className={`mt-1 line-clamp-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold leading-tight ${
            info.feriado?.tipo === 'academico'
              ? 'bg-amber-100 text-amber-700'
              : 'bg-rose-100 text-rose-700'
          }`}
        >
          {info.feriado?.tipo === 'academico' ? `🎓 ${info.feriado?.label}` : `🇧🇷 ${info.feriado?.label}`}
        </span>
      )}

      {/* Indicadores de reserva */}
      {hasReservas && (
        <div className="mt-auto flex flex-wrap gap-1 pt-1">
          {info.reservas.slice(0, 3).map((r) => (
            <span
              key={r.id}
              className="line-clamp-1 max-w-full rounded-md bg-brand-teal/15 px-1.5 py-0.5 text-[10px] font-medium text-brand-teal"
            >
              {r.salaNome ?? r.horario}
            </span>
          ))}
          {info.reservas.length > 3 && (
            <span className="rounded-md bg-brand-ink/10 px-1.5 py-0.5 text-[10px] font-medium text-brand-ink">
              +{info.reservas.length - 3}
            </span>
          )}
        </div>
      )}
    </button>
  );
}

// ── Page principal ────────────────────────────────────────────────────────────

export function CalendarioPage() {
  const hoje = new Date();
  const [mes, setMes] = useState(hoje.getMonth()); // 0-indexed
  const [ano, setAno] = useState(hoje.getFullYear());

  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [filtroSala, setFiltroSala] = useState('');
  const [filtroPeriodo, setFiltroPeriodo] = useState('');

  const [selectedDay, setSelectedDay] = useState<DayInfo | null>(null);

  // ── Semestre do mês exibido ─────────────────────────────────────────────────────────

  const semestreDoMes = useMemo((): Semestre | null => {
    // Retorna qual semestre inclui algum dia do mês exibido
    const meioMes = new Date(ano, mes, 15);
    return getSemestreAtivo(meioMes);
  }, [ano, mes]);

  // ── Feriados para o mês/ano exibido ──────────────────────────────────────

  const holidayMap = useMemo(() => buildHolidayMap(ano), [ano]);

  // ── Carregar salas (uma vez) ──────────────────────────────────────────────

  useEffect(() => {
    listClasses().then(setClasses).catch(() => {});
  }, []);

  // ── Carregar reservas ─────────────────────────────────────────────────────

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await fetchCalendario({
        mes: mes + 1, // API usa 1-12
        ano,
        classId: filtroSala || undefined,
        periodo: filtroPeriodo || undefined,
      });
      setReservas(data);
    } catch {
      setError('Não foi possível carregar o calendário.');
    } finally {
      setLoading(false);
    }
  }, [mes, ano, filtroSala, filtroPeriodo]);

  useEffect(() => { void load(); }, [load]);

  // ── Navegação de mês ──────────────────────────────────────────────────────

  function prevMes() {
    if (mes === 0) {
      setMes(11);
      setAno((a) => a - 1);
    } else {
      setMes(mes - 1);
    }
  }

  function nextMes() {
    if (mes === 11) {
      setMes(0);
      setAno((a) => a + 1);
    } else {
      setMes(mes + 1);
    }
  }

  // ── Construir grade do calendário ─────────────────────────────────────────

  const grid = useMemo<(DayInfo | null)[]>(() => {
    const dias = getDiasDoMes(ano, mes);
    const primeiroDS = dias[0].getDay(); // 0 = Dom

    const cells: (DayInfo | null)[] = Array(primeiroDS).fill(null);

    for (const date of dias) {
      const dayReservas = reservas.filter((r) => {
        const d = new Date(r.data);
        return sameDay(d, date);
      });

      cells.push({
        date,
        reservas: dayReservas,
        feriado: getFeriado(date, holidayMap),
        isToday: sameDay(date, hoje),
        isPast: date < hoje && !sameDay(date, hoje),
        isCurrentMonth: true,
        isForaPeriodo: isForaDoPeriodoLetivo(date),
        isDomingo: date.getDay() === 0,
      });
    }

    // Completar última semana (visual)
    while (cells.length % 7 !== 0) cells.push(null);

    return cells;
  }, [ano, mes, reservas, holidayMap]);

  // ── Resumo rápido ─────────────────────────────────────────────────────────

  const totalFeriados = useMemo(() => {
    return getDiasDoMes(ano, mes).filter((d) => getFeriado(d, holidayMap)).length;
  }, [ano, mes, holidayMap]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="container py-8">
      {selectedDay && (
        <DayPanel info={selectedDay} onClose={() => setSelectedDay(null)} />
      )}

        {/* Filtros */}
        <div className="mb-6 grid gap-3 rounded-[24px] border border-brand-teal/10 bg-white/85 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label id="label-filtro-sala" className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Sala
            </label>
            <select
              id="filtro-sala"
              aria-labelledby="label-filtro-sala"
              value={filtroSala}
              onChange={(e) => setFiltroSala(e.target.value)}
              className="w-full rounded-xl border border-brand-teal/20 bg-white px-3 py-2 text-sm text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-teal/30"
            >
              <option value="">Todas as salas</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label id="label-filtro-periodo" className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Período
            </label>
            <select
              id="filtro-periodo"
              aria-labelledby="label-filtro-periodo"
              value={filtroPeriodo}
              onChange={(e) => setFiltroPeriodo(e.target.value)}
              className="w-full rounded-xl border border-brand-teal/20 bg-white px-3 py-2 text-sm text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-teal/30"
            >
              {PERIODOS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>


          <div className="flex items-end">
            <Button
              id="btn-atualizar-calendario"
              variant="secondary"
              onClick={() => void load()}
              className="w-full"
              disabled={loading}
            >
              <RefreshCcw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Carregando…' : 'Atualizar'}
            </Button>
          </div>
        </div>

        {/* Calendário */}
        <div className="rounded-[28px] border border-brand-teal/10 bg-white/85 p-6 shadow-panel">

          {/* Banner de semestre */}
          {semestreDoMes ? (
            <div className="mb-5 flex flex-wrap items-center gap-2 rounded-2xl border border-brand-teal/15 bg-brand-teal/5 px-4 py-3">
              <BookOpen className="h-4 w-4 flex-shrink-0 text-brand-teal" />
              <span className="text-sm font-semibold text-brand-ink">{semestreDoMes.nome}</span>
              <span className="text-muted-foreground/40">|</span>
              <span className="text-sm text-muted-foreground">
                Aulas: {new Date(semestreDoMes.inicioAulas + 'T12:00:00').toLocaleDateString('pt-BR')}
                {' '}–{' '}
                {new Date(semestreDoMes.terminoAulas + 'T12:00:00').toLocaleDateString('pt-BR')}
              </span>
              <span className="text-muted-foreground/40">|</span>
              <span className="text-sm text-muted-foreground">
                Encerramento: {new Date(semestreDoMes.encerramentoOficial + 'T12:00:00').toLocaleDateString('pt-BR')}
              </span>
            </div>
          ) : (
            <div className="mb-5 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <BookOpen className="h-4 w-4 flex-shrink-0 text-slate-400" />
              <p className="text-sm text-slate-500">
                Este mês está fora do período letivo — não há aulas em atividade.
              </p>
            </div>
          )}

          {/* Navegação de mês */}
          <div className="mb-6 flex items-center justify-between">
            <button
              id="btn-mes-anterior"
              onClick={prevMes}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-brand-teal/15 text-brand-teal transition hover:bg-brand-teal hover:text-white"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <div className="text-center">
              <h2 className="font-serif text-2xl font-bold text-brand-ink">
                {MESES[mes]} {ano}
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {reservas.length} reserva{reservas.length !== 1 ? 's' : ''} aprovada{reservas.length !== 1 ? 's' : ''}
                {' · '}
                {totalFeriados} dia{totalFeriados !== 1 ? 's' : ''} bloqueado{totalFeriados !== 1 ? 's' : ''}
              </p>
            </div>

            <button
              id="btn-proximo-mes"
              onClick={nextMes}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-brand-teal/15 text-brand-teal transition hover:bg-brand-teal hover:text-white"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {/* Legenda */}
          <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-sm bg-brand-teal/15 ring-1 ring-brand-teal/30" />
              Reserva aprovada
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-sm bg-rose-100 ring-1 ring-rose-200" />
              Feriado nacional
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-sm bg-amber-100 ring-1 ring-amber-200" />
              Recesso acadêmico
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-brand-teal" />
              Hoje
            </span>
          </div>

          {error && (
            <div className="mb-4 rounded-2xl border border-brand-wine/20 bg-brand-wine/5 px-4 py-3 text-sm text-brand-wine">
              {error}
            </div>
          )}

          {/* Cabeçalho dias da semana */}
          <div className="mb-2 grid grid-cols-7 gap-1">
            {SEMANAS.map((s, i) => (
              <div
                key={s}
                className={`py-2 text-center text-xs font-semibold uppercase tracking-[0.14em] ${
                  i === 0 ? 'text-slate-400' : 'text-muted-foreground'
                }`}
              >
                {s}
              </div>
            ))}
          </div>

          {/* Grade de dias */}
          <div className="grid grid-cols-7 gap-1">
            {grid.map((info, idx) =>
              info ? (
                <DayCell
                  key={isoDate(info.date)}
                  info={info}
                  onClick={() => setSelectedDay(info)}
                />
              ) : (
                <div key={`empty-${idx}`} className="min-h-[88px]" />
              )
            )}
          </div>
        </div>

        {/* Info box */}
        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-brand-teal/10 bg-white/80 px-5 py-4 text-sm text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-teal" />
          <p>
            Apenas reservas com status <strong className="text-brand-ink">Aprovada</strong> aparecem no calendário.
            Dias marcados como feriado nacional ou recesso acadêmico são bloqueados automaticamente — não é possível
            agendar salas nessas datas.
          </p>
        </div>
    </div>
  );
}

// ── Versão inline para uso dentro de abas (sem header próprio) ────────────────

export function CalendarioInline() {
  const hoje = new Date();
  const [mes, setMes] = useState(hoje.getMonth());
  const [ano, setAno] = useState(hoje.getFullYear());

  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [filtroSala, setFiltroSala] = useState('');
  const [filtroPeriodo, setFiltroPeriodo] = useState('');
  const [selectedDay, setSelectedDay] = useState<DayInfo | null>(null);

  const semestreDoMes = useMemo((): Semestre | null => {
    const meioMes = new Date(ano, mes, 15);
    return getSemestreAtivo(meioMes);
  }, [ano, mes]);

  const holidayMap = useMemo(() => buildHolidayMap(ano), [ano]);

  useEffect(() => {
    listClasses().then(setClasses).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await fetchCalendario({
        mes: mes + 1,
        ano,
        classId: filtroSala || undefined,
        periodo: filtroPeriodo || undefined,
      });
      setReservas(data);
    } catch {
      setError('Não foi possível carregar o calendário.');
    } finally {
      setLoading(false);
    }
  }, [mes, ano, filtroSala, filtroPeriodo]);

  useEffect(() => { void load(); }, [load]);

  function prevMes() {
    if (mes === 0) { setMes(11); setAno((a) => a - 1); }
    else setMes(mes - 1);
  }

  function nextMes() {
    if (mes === 11) { setMes(0); setAno((a) => a + 1); }
    else setMes(mes + 1);
  }

  const grid = useMemo<(DayInfo | null)[]>(() => {
    const dias = getDiasDoMes(ano, mes);
    const primeiroDS = dias[0].getDay();
    const cells: (DayInfo | null)[] = Array(primeiroDS).fill(null);
    for (const date of dias) {
      const dayReservas = reservas.filter((r) => sameDay(new Date(r.data), date));
      cells.push({
        date, reservas: dayReservas, feriado: getFeriado(date, holidayMap),
        isToday: sameDay(date, hoje), isPast: date < hoje && !sameDay(date, hoje),
        isCurrentMonth: true, isForaPeriodo: isForaDoPeriodoLetivo(date),
        isDomingo: date.getDay() === 0,
      });
    }
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [ano, mes, reservas, holidayMap]);

  const totalFeriados = useMemo(() =>
    getDiasDoMes(ano, mes).filter((d) => getFeriado(d, holidayMap)).length,
  [ano, mes, holidayMap]);

  return (
    <Card className="border-brand-teal/10 bg-white/85 rounded-tl-none">
      {selectedDay && (
        <DayPanel info={selectedDay} onClose={() => setSelectedDay(null)} />
      )}

      <CardContent className="p-6">
        {/* Filtros */}
        <div className="mb-6 grid gap-3 rounded-[24px] border border-brand-teal/10 bg-brand-mist/10 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Sala</label>
            <select
              value={filtroSala}
              onChange={(e) => setFiltroSala(e.target.value)}
              className="w-full rounded-xl border border-brand-teal/20 bg-white px-3 py-2 text-sm text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-teal/30"
            >
              <option value="">Todas as salas</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Período</label>
            <select
              value={filtroPeriodo}
              onChange={(e) => setFiltroPeriodo(e.target.value)}
              className="w-full rounded-xl border border-brand-teal/20 bg-white px-3 py-2 text-sm text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-teal/30"
            >
              {PERIODOS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
          <div>
            
          </div>
          <div className="flex items-end">
            <Button variant="secondary" onClick={() => void load()} className="w-full" disabled={loading}>
              <RefreshCcw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Carregando…' : 'Atualizar'}
            </Button>
          </div>
        </div>

        {/* Calendário */}
        <div className="rounded-[24px] border border-brand-teal/10 bg-white/60 p-5">
          {semestreDoMes ? (
            <div className="mb-5 flex flex-wrap items-center gap-2 rounded-2xl border border-brand-teal/15 bg-brand-teal/5 px-4 py-3">
              <BookOpen className="h-4 w-4 flex-shrink-0 text-brand-teal" />
              <span className="text-sm font-semibold text-brand-ink">{semestreDoMes.nome}</span>
              <span className="text-muted-foreground/40">|</span>
              <span className="text-sm text-muted-foreground">
                Aulas: {new Date(semestreDoMes.inicioAulas + 'T12:00:00').toLocaleDateString('pt-BR')}
                {' '}–{' '}
                {new Date(semestreDoMes.terminoAulas + 'T12:00:00').toLocaleDateString('pt-BR')}
              </span>
            </div>
          ) : (
            <div className="mb-5 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <BookOpen className="h-4 w-4 flex-shrink-0 text-slate-400" />
              <p className="text-sm text-slate-500">Este mês está fora do período letivo.</p>
            </div>
          )}

          <div className="mb-6 flex items-center justify-between">
            <button onClick={prevMes} className="flex h-10 w-10 items-center justify-center rounded-xl border border-brand-teal/15 text-brand-teal transition hover:bg-brand-teal hover:text-white">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="text-center">
              <h2 className="font-serif text-2xl font-bold text-brand-ink">{MESES[mes]} {ano}</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {reservas.length} reserva{reservas.length !== 1 ? 's' : ''} aprovada{reservas.length !== 1 ? 's' : ''}
                {' · '}{totalFeriados} dia{totalFeriados !== 1 ? 's' : ''} bloqueado{totalFeriados !== 1 ? 's' : ''}
              </p>
            </div>
            <button onClick={nextMes} className="flex h-10 w-10 items-center justify-center rounded-xl border border-brand-teal/15 text-brand-teal transition hover:bg-brand-teal hover:text-white">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-brand-teal/15 ring-1 ring-brand-teal/30" />Reserva aprovada</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-rose-100 ring-1 ring-rose-200" />Feriado nacional</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-amber-100 ring-1 ring-amber-200" />Recesso acadêmico</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-brand-teal" />Hoje</span>
          </div>

          {error && (
            <div className="mb-4 rounded-2xl border border-brand-wine/20 bg-brand-wine/5 px-4 py-3 text-sm text-brand-wine">{error}</div>
          )}

          <div className="mb-2 grid grid-cols-7 gap-1">
            {SEMANAS.map((s, i) => (
              <div key={s} className={`py-2 text-center text-xs font-semibold uppercase tracking-[0.14em] ${i === 0 ? 'text-slate-400' : 'text-muted-foreground'}`}>{s}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {grid.map((info, idx) =>
              info ? (
                <DayCell key={isoDate(info.date)} info={info} onClick={() => setSelectedDay(info)} />
              ) : (
                <div key={`empty-${idx}`} className="min-h-[88px]" />
              )
            )}
          </div>
        </div>

        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-brand-teal/10 bg-white/80 px-5 py-4 text-sm text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-teal" />
          <p>Apenas reservas com status <strong className="text-brand-ink">Aprovada</strong> aparecem no calendário. Feriados e recessos são bloqueados automaticamente.</p>
        </div>
      </CardContent>
    </Card>
  );
}
