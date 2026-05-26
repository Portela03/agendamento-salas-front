import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CalendarDays, CalendarOff, ChevronLeft, ChevronRight, ChevronDown, Clock, LoaderCircle, Moon, Send, Star, Sun, Sunset } from 'lucide-react';

import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { listAvaiables, type ClassItem } from '../services/classService';
import { fetchCalendario } from '../services/calendarService';
import { reservaService, type Reserva } from '../services/reservaService';
import { buildHolidayMap, getFeriado, getSemestreAtivo, isForaDoPeriodoLetivo } from '../lib/holidays';

// ── Calendário ────────────────────────────────────────────────────────────────

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const SEMANAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];

// ── Dados estáticos FATEC Zona Leste ─────────────────────────────────────────

type Turno = 'manha' | 'tarde' | 'noite';

interface SlotHorario {
  turno: Turno;
  label: string;
  inicio: string;
  fim: string;
}

interface Curso {
  sigla: string;
  nome: string;
  slots: SlotHorario[];
}

// Horários oficiais FATEC Zona Leste — por curso.
// Fonte: site oficial dos cursos (atualizado em 2026).
const CURSOS: Curso[] = [
  {
    sigla: 'ADS', nome: 'Análise e Desenvolvimento de Sistemas',
    slots: [
      { turno: 'tarde', label: 'Tarde', inicio: '13:00', fim: '18:20' },
      { turno: 'noite', label: 'Noite', inicio: '19:20', fim: '22:50' },
    ],
  },
  {
    sigla: 'CE', nome: 'Comércio Exterior',
    slots: [
      { turno: 'manha', label: 'Manhã',  inicio: '07:30', fim: '12:50' },
      { turno: 'tarde', label: 'Tarde',  inicio: '15:50', fim: '19:20' },
    ],
  },
  {
    sigla: 'DPP', nome: 'Desenvolvimento de Produtos Plásticos',
    slots: [
      { turno: 'noite', label: 'Noite', inicio: '19:20', fim: '22:50' },
    ],
  },
  {
    sigla: 'DSM', nome: 'Desenvolvimento de Software Multiplataforma',
    slots: [
      { turno: 'manha', label: 'Manhã', inicio: '08:00', fim: '11:30' },
      { turno: 'noite', label: 'Noite', inicio: '19:20', fim: '22:50' },
    ],
  },
  {
    sigla: 'GRH', nome: 'Gestão de Recursos Humanos',
    slots: [
      { turno: 'manha', label: 'Manhã', inicio: '07:30', fim: '11:00' },
    ],
  },
  {
    sigla: 'GE', nome: 'Gestão Empresarial',
    slots: [
      { turno: 'manha', label: 'Manhã', inicio: '07:30', fim: '11:00' },
      { turno: 'noite', label: 'Noite', inicio: '19:20', fim: '22:50' },
    ],
  },
  {
    sigla: 'LOG', nome: 'Logística',
    slots: [
      { turno: 'manha', label: 'Manhã', inicio: '08:00', fim: '11:30' },
      { turno: 'noite', label: 'Noite', inicio: '19:20', fim: '22:50' },
    ],
  },
  {
    sigla: 'POL', nome: 'Polímeros',
    slots: [
      { turno: 'noite', label: 'Noite', inicio: '19:20', fim: '22:50' },
    ],
  },
];

const SEMESTRES = [1, 2, 3, 4, 5, 6];

// ── Utilitários ───────────────────────────────────────────────────────────────

type ModoReserva = 'unica' | 'semestre';

function toIsoDate(date: Date): string {
  const yyyy = String(date.getFullYear());
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function parseIsoDate(isoDate: string): Date {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function sameDay(a: Date, b: Date): boolean {
  return toIsoDate(a) === toIsoDate(b);
}

function getDiasDoMes(ano: number, mes: number): Date[] {
  const total = new Date(ano, mes + 1, 0).getDate();
  return Array.from({ length: total }, (_, i) => new Date(ano, mes, i + 1));
}

function toMinutes(hhmm: string): number | null {
  const match = /^(\d{1,2}):(\d{2})(?::\d{2}(?:\.\d{1,3})?)?$/.exec(hhmm.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function resolveReservaInterval(reserva: Reserva): { inicio: number; fim: number } | null {
  const timeMatches = reserva.horario?.match(/\d{1,2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?/g) ?? [];
  const fallbackInicio = timeMatches[0]?.trim() ?? '';
  const fallbackFim = timeMatches[1]?.trim() ?? fallbackInicio;
  const inicioStr = (reserva.horarioInicio || fallbackInicio || '').trim();
  const fimStr = (reserva.horarioFim || fallbackFim || inicioStr).trim();
  const inicio = toMinutes(inicioStr);
  let fim = toMinutes(fimStr);
  if (inicio === null || fim === null) return null;
  if (fim <= inicio) fim = inicio + 1;
  return { inicio, fim };
}

function hasIntervalOverlap(inicioA: number, fimA: number, inicioB: number, fimB: number): boolean {
  return inicioA < fimB && fimA > inicioB;
}

function isSameDate(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getReservaClassId(reserva: Reserva): string {
  return reserva.salaId || reserva.classId || '';
}

function getReservaSemestrePreview(dataInicialIso: string): string[] {
  if (!dataInicialIso) return [];
  const dataInicial = parseIsoDate(dataInicialIso);
  const semestre = getSemestreAtivo(dataInicial);
  if (!semestre) return [];
  const dataFim = parseIsoDate(semestre.terminoAulas);
  const datas: string[] = [];
  const cursor = new Date(dataInicial);
  while (cursor <= dataFim) {
    const feriado = getFeriado(cursor, buildHolidayMap(cursor.getFullYear()));
    if (cursor.getDay() !== 0 && !feriado) {
      datas.push(toIsoDate(cursor));
    }
    cursor.setDate(cursor.getDate() + 7);
  }
  return datas;
}



// ── Hook compartilhado de lógica de reserva ───────────────────────────────────

function useReservaLogic() {
  const now = new Date();

  const [mesAtual, setMesAtual] = useState(now.getMonth());
  const [anoAtual, setAnoAtual] = useState(now.getFullYear());

  const [classesDisponiveis, setClassesDisponiveis] = useState<ClassItem[]>([]);
  const [reservasMes, setReservasMes] = useState<Reserva[]>([]);

  // Novos estados estruturados
  const [cursoSigla, setCursoSigla] = useState('');
  const [semestre, setSemestre] = useState<number | null>(null);
  const [turnoSelecionado, setTurnoSelecionado] = useState<Turno | null>(null);

  const [salaId, setSalaId] = useState('');
  const [dataSelecionada, setDataSelecionada] = useState('');
  const [modoReserva, setModoReserva] = useState<ModoReserva>('unica');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingCalendar, setLoadingCalendar] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [conflitosSemestre, setConflitosSemestre] = useState<string[]>([]);

  // Derivações
  const cursoAtual = useMemo(() => CURSOS.find(c => c.sigla === cursoSigla) ?? null, [cursoSigla]);
  const slotSelecionado = useMemo(
    () => cursoAtual?.slots.find(s => s.turno === turnoSelecionado) ?? null,
    [cursoAtual, turnoSelecionado]
  );
  const horarioInicio = slotSelecionado?.inicio ?? '';
  const horarioFim = slotSelecionado?.fim ?? '';
  const turmaString = cursoSigla && semestre ? `${cursoSigla} ${semestre}` : '';

  const inicioMin = useMemo(() => toMinutes(horarioInicio), [horarioInicio]);
  const fimMin = useMemo(() => toMinutes(horarioFim), [horarioFim]);
  const intervaloValido = inicioMin !== null && fimMin !== null && inicioMin < fimMin;

  const holidayMapMes = useMemo(() => buildHolidayMap(anoAtual), [anoAtual]);

  const feriadoAviso = useMemo(() => {
    if (!dataSelecionada) return null;
    const selectedDate = parseIsoDate(dataSelecionada);
    if (selectedDate.getDay() === 0) return { label: 'Domingo', tipo: 'academico' as const };
    return getFeriado(selectedDate, buildHolidayMap(selectedDate.getFullYear()));
  }, [dataSelecionada]);

  const loadReservasMes = useCallback(async () => {
    try {
      setLoadingCalendar(true);
      const result = await fetchCalendario({ mes: mesAtual + 1, ano: anoAtual, incluirAguardando: true });
      setReservasMes(result);
    } catch {
      setError('Não foi possível carregar as reservas para calcular a disponibilidade.');
    } finally {
      setLoadingCalendar(false);
    }
  }, [anoAtual, mesAtual]);

  useEffect(() => {
    async function loadClasses() {
      try {
        setLoadingClasses(true);
        const result = await listAvaiables();
        setClassesDisponiveis(result);
      } catch {
        setError('Não foi possível carregar as salas disponíveis.');
      } finally {
        setLoadingClasses(false);
      }
    }
    void loadClasses();
  }, []);

  useEffect(() => { void loadReservasMes(); }, [loadReservasMes]);

  const diasDoMes = useMemo(() => getDiasDoMes(anoAtual, mesAtual), [anoAtual, mesAtual]);
  const primeiroDiaSemana = diasDoMes[0]?.getDay() ?? 0;

  const hojeZerado = useMemo(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d;
  }, []);

  // Verifica salas disponíveis em um dia, dado o slot de horário selecionado
  const getSalasDisponiveisNoDia = useCallback(
    (date: Date): ClassItem[] => {
      const nowLocal = new Date();
      const nowMinutes = nowLocal.getHours() * 60 + nowLocal.getMinutes();
      const feriado = getFeriado(date, holidayMapMes);
      const dateZero = new Date(date); dateZero.setHours(0, 0, 0, 0);

      if (date.getDay() === 0 || !!feriado || isForaDoPeriodoLetivo(date) || dateZero < hojeZerado) return [];

      const reservasNoDia = reservasMes.filter((reserva) => {
        const reservaDate = new Date(reserva.data);
        return sameDay(reservaDate, date) && reserva.status !== 'REJEITADA';
      });

      if (intervaloValido && fimMin !== null && isSameDate(date, nowLocal)) {
        if (fimMin <= nowMinutes) return [];
      }

      if (!intervaloValido || inicioMin === null || fimMin === null) return classesDisponiveis;

      return classesDisponiveis.filter((sala) => {
        const reservasDaSala = reservasNoDia.filter((reserva) => getReservaClassId(reserva) === sala.id);
        if (reservasDaSala.length === 0) return true;
        return reservasDaSala.every((reserva) => {
          const intervalo = resolveReservaInterval(reserva);
          if (!intervalo) return false;
          return !hasIntervalOverlap(inicioMin, fimMin, intervalo.inicio, intervalo.fim);
        });
      });
    },
    [classesDisponiveis, fimMin, holidayMapMes, hojeZerado, inicioMin, intervaloValido, reservasMes]
  );

  // Verifica se um turno está disponível no dia selecionado (ao menos 1 sala livre)
  const isTurnoDisponivel = useCallback(
    (slot: SlotHorario, date: Date): boolean => {
      const nowLocal = new Date();
      const nowMinutes = nowLocal.getHours() * 60 + nowLocal.getMinutes();
      const feriado = getFeriado(date, holidayMapMes);
      const dateZero = new Date(date); dateZero.setHours(0, 0, 0, 0);

      if (date.getDay() === 0 || !!feriado || isForaDoPeriodoLetivo(date) || dateZero < hojeZerado) return false;

      const slotInicio = toMinutes(slot.inicio);
      const slotFim = toMinutes(slot.fim);
      if (slotInicio === null || slotFim === null) return false;

      if (isSameDate(date, nowLocal) && slotFim <= nowMinutes) return false;

      const reservasNoDia = reservasMes.filter((reserva) => {
        const reservaDate = new Date(reserva.data);
        return sameDay(reservaDate, date) && reserva.status !== 'REJEITADA';
      });

      return classesDisponiveis.some((sala) => {
        const reservasDaSala = reservasNoDia.filter((r) => getReservaClassId(r) === sala.id);
        if (reservasDaSala.length === 0) return true;
        return reservasDaSala.every((reserva) => {
          const intervalo = resolveReservaInterval(reserva);
          if (!intervalo) return false;
          return !hasIntervalOverlap(slotInicio, slotFim, intervalo.inicio, intervalo.fim);
        });
      });
    },
    [classesDisponiveis, holidayMapMes, hojeZerado, reservasMes]
  );

  const salasNoDiaSelecionado = useMemo(() => {
    if (!dataSelecionada) return [];
    return getSalasDisponiveisNoDia(parseIsoDate(dataSelecionada));
  }, [dataSelecionada, getSalasDisponiveisNoDia]);

  const previaReservaSemestre = useMemo(() => getReservaSemestrePreview(dataSelecionada), [dataSelecionada]);

  // Limpa sala se deixar de estar disponível
  useEffect(() => {
    if (!salaId || !dataSelecionada) return;
    if (!salasNoDiaSelecionado.some((sala) => sala.id === salaId)) setSalaId('');
  }, [dataSelecionada, salaId, salasNoDiaSelecionado]);

  // Limpa turno ao trocar curso
  useEffect(() => { setTurnoSelecionado(null); setSemestre(null); }, [cursoSigla]);
  // Limpa turno ao trocar semestre
  useEffect(() => { setTurnoSelecionado(null); }, [semestre]);

  function prevMes() {
    if (mesAtual === 0) { setMesAtual(11); setAnoAtual((a) => a - 1); }
    else setMesAtual((a) => a - 1);
  }

  function nextMes() {
    if (mesAtual === 11) { setMesAtual(0); setAnoAtual((a) => a + 1); }
    else setMesAtual((a) => a + 1);
  }

  function onSelectDia(date: Date) {
    setDataSelecionada(toIsoDate(date));
    setError(''); setSuccess(''); setConflitosSemestre([]);
  }

  function resetForm() {
    setSalaId(''); setDataSelecionada('');
    setCursoSigla(''); setSemestre(null); setTurnoSelecionado(null);
  }

  async function handleSubmit(e: FormEvent, ignorarConflitos = false) {
    e.preventDefault();
    setError(''); setSuccess(''); setConflitosSemestre([]);

    if (!turmaString) { setError('Selecione o curso e o semestre.'); return; }
    if (!turnoSelecionado) { setError('Selecione um turno de horário.'); return; }
    if (!dataSelecionada) { setError('Selecione um dia no calendário.'); return; }
    if (feriadoAviso) { setError(`Não é possível agendar em feriado/recesso: ${feriadoAviso.label}.`); return; }
    if (!salaId) { setError('Selecione uma sala disponível para o dia escolhido.'); return; }
    if (!salasNoDiaSelecionado.some((sala) => sala.id === salaId)) {
      setError('A sala selecionada não está mais disponível no horário escolhido.'); return;
    }

    const dataSelecionadaDate = parseIsoDate(dataSelecionada);
    const _now = new Date();
    const _nowMinutes = _now.getHours() * 60 + _now.getMinutes();
    if (isSameDate(dataSelecionadaDate, _now) && inicioMin !== null && inicioMin <= _nowMinutes) {
      setError('Para o dia de hoje, o horário de início deve ser maior que o horário atual.'); return;
    }

    try {
      setIsSubmitting(true);
      const [year, month, day] = dataSelecionada.split('-').map(Number);
      const payload = {
        classId: salaId,
        data: new Date(year, month - 1, day, 12, 0, 0).toISOString(),
        horarioInicio,
        horarioFim,
        turma: turmaString,
        ignorarConflitos,
      };

      if (modoReserva === 'semestre') {
        const resultado = await reservaService.criarSemestre(payload);
        const ignoradas = resultado.datasIgnoradas.length;
        setSuccess(
          `Solicitação semestral enviada: ${resultado.total} reserva${resultado.total !== 1 ? 's' : ''} em ${resultado.semestre}.${ignoradas ? ` ${ignoradas} data${ignoradas !== 1 ? 's' : ''} bloqueada${ignoradas !== 1 ? 's' : ''} foram ignoradas.` : ''}`
        );
      } else {
        await reservaService.criar(payload);
        setSuccess('Solicitação enviada com sucesso.');
      }

      resetForm();
      await loadReservasMes();
    } catch (err: any) {
      if (err?.response?.data?.code === 'SEMESTER_CONFLICTS') {
        setConflitosSemestre(err.response.data.conflitos ?? []);
      }
      setError(err?.response?.data?.message ?? 'Não foi possível enviar a solicitação agora.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return {
    // estado
    mesAtual, anoAtual, classesDisponiveis, reservasMes,
    cursoSigla, semestre, turnoSelecionado, salaId, dataSelecionada, modoReserva,
    isSubmitting, loadingClasses, loadingCalendar, error, success, conflitosSemestre,
    // derivados
    cursoAtual, slotSelecionado, horarioInicio, horarioFim, turmaString,
    inicioMin, fimMin, intervaloValido, holidayMapMes, feriadoAviso,
    diasDoMes, primeiroDiaSemana, hojeZerado,
    salasNoDiaSelecionado, previaReservaSemestre,
    // setters
    setCursoSigla, setSemestre, setTurnoSelecionado, setSalaId, setModoReserva,
    // funções
    prevMes, nextMes, onSelectDia, handleSubmit, isTurnoDisponivel, loadReservasMes,
    setConflitosSemestre, setError,
  };
}

// ── Helpers do design ─────────────────────────────────────────────────────────

function StepBadge({ n, label }: { n: number; label: string }) {
  return (
    <div className="mb-3 flex items-center gap-2.5">
      <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-teal text-[11px] font-bold text-white shadow-sm">
        {n}
      </span>
      <span className="text-sm font-semibold text-brand-ink">{label}</span>
    </div>
  );
}

function turnoIcon(turno: Turno) {
  if (turno === 'manha') return <Sun className="h-6 w-6" />;
  if (turno === 'tarde') return <Sunset className="h-6 w-6" />;
  return <Moon className="h-6 w-6" />;
}

const TURNO_COLOR: Record<Turno, { icon: string; ring: string; bg: string; border: string }> = {
  manha: { icon: 'text-amber-500',  ring: 'ring-amber-400/40',  bg: 'bg-amber-50',   border: 'border-amber-300' },
  tarde: { icon: 'text-orange-500', ring: 'ring-orange-400/40', bg: 'bg-orange-50',  border: 'border-orange-300' },
  noite: { icon: 'text-indigo-500', ring: 'ring-indigo-400/40', bg: 'bg-indigo-50',  border: 'border-indigo-300' },
};

// ── Seção: Seleção de Curso, Semestre e Turno ─────────────────────────────────

function SecaoTurmaHorario({
  prefix,
  cursoSigla, setCursoSigla,
  semestre, setSemestre,
  turnoSelecionado, setTurnoSelecionado,
  cursoAtual,
  dataSelecionada, isTurnoDisponivel,
  loadingClasses,
}: {
  prefix: string;
  cursoSigla: string; setCursoSigla: (v: string) => void;
  semestre: number | null; setSemestre: (v: number | null) => void;
  turnoSelecionado: Turno | null; setTurnoSelecionado: (v: Turno | null) => void;
  cursoAtual: Curso | null;
  dataSelecionada: string;
  isTurnoDisponivel: (slot: SlotHorario, date: Date) => boolean;
  loadingClasses: boolean;
}) {
  const diaDate = dataSelecionada ? parseIsoDate(dataSelecionada) : null;

  return (
    <div className="space-y-5">

      {/* ── Passo 1 — Curso ── */}
      <div className="rounded-2xl border border-brand-teal/10 bg-white/80 p-4">
        <StepBadge n={1} label="Selecione o curso" />
        <div className="relative">
          <select
            id={`${prefix}-curso`}
            value={cursoSigla}
            onChange={(e) => setCursoSigla(e.target.value)}
            className="w-full appearance-none rounded-xl border border-brand-teal/20 bg-white py-3 pl-4 pr-10 text-sm text-brand-ink shadow-sm transition focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/25"
          >
            <option value="">-- Selecione o curso --</option>
            {CURSOS.map((c) => (
              <option key={c.sigla} value={c.sigla}>{c.nome}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-teal/60" />
        </div>
      </div>

      {/* ── Passo 2 — Semestre ── */}
      {cursoSigla && (
        <div className="rounded-2xl border border-brand-teal/10 bg-white/80 p-4">
          <StepBadge n={2} label="Selecione o semestre" />
          <div className="flex flex-wrap gap-2">
            {SEMESTRES.map((s) => {
              const ativo = semestre === s;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSemestre(ativo ? null : s)}
                  className={`relative flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold shadow-sm transition-all duration-150 ${
                    ativo
                      ? 'bg-brand-teal text-white ring-4 ring-brand-teal/25 scale-110'
                      : 'border border-brand-teal/20 bg-white text-brand-ink hover:border-brand-teal/40 hover:bg-brand-mist/30 hover:scale-105'
                  }`}
                >
                  {s}º
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Passo 3 — Turno ── */}
      {cursoSigla && semestre && cursoAtual && (
        <div className="rounded-2xl border border-brand-teal/10 bg-white/80 p-4">
          <StepBadge n={3} label="Selecione o turno" />
          <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${cursoAtual.slots.length}, 1fr)` }}>
            {cursoAtual.slots.map((slot) => {
              const disponivel = diaDate ? isTurnoDisponivel(slot, diaDate) : true;
              const selecionado = turnoSelecionado === slot.turno;
              const cores = TURNO_COLOR[slot.turno];

              return (
                <button
                  key={slot.turno}
                  type="button"
                  disabled={loadingClasses || (diaDate !== null && !disponivel)}
                  onClick={() => setTurnoSelecionado(selecionado ? null : slot.turno)}
                  className={`group flex flex-col items-center gap-2 rounded-2xl border p-4 text-center transition-all duration-200 ${
                    selecionado
                      ? `${cores.bg} ${cores.border} ring-2 ${cores.ring} shadow-sm scale-[1.03]`
                      : diaDate && !disponivel
                      ? 'cursor-not-allowed border-slate-200 bg-slate-50 opacity-50'
                      : 'border-brand-teal/10 bg-white hover:shadow-md hover:scale-[1.02] hover:border-brand-teal/25'
                  }`}
                >
                  {/* Ícone */}
                  <span className={`transition-colors ${
                    selecionado ? cores.icon
                    : diaDate && !disponivel ? 'text-slate-400'
                    : `${cores.icon} opacity-70 group-hover:opacity-100`
                  }`}>
                    {turnoIcon(slot.turno)}
                  </span>

                  {/* Label + horário */}
                  <div>
                    <p className={`text-sm font-bold leading-tight ${
                      selecionado ? 'text-brand-ink' : 'text-brand-ink'
                    }`}>
                      {slot.label}
                    </p>
                    <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">
                      {slot.inicio} – {slot.fim}
                    </p>
                  </div>

                  {/* Badge de status */}
                  {diaDate && (
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      !disponivel
                        ? 'bg-rose-100 text-rose-600'
                        : selecionado
                        ? `${cores.bg} ${cores.icon}`
                        : 'bg-emerald-50 text-emerald-600'
                    }`}>
                      {!disponivel ? 'Sem salas' : selecionado ? 'Selecionado' : 'Disponível'}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Calendário ────────────────────────────────────────────────────────────────

function CalendarioMes({
  mesAtual, anoAtual, diasDoMes, primeiroDiaSemana,
  holidayMapMes, hojeZerado, loadingClasses, loadingCalendar,
  dataSelecionada, prevMes, nextMes, onSelectDia,
}: {
  mesAtual: number; anoAtual: number;
  diasDoMes: Date[]; primeiroDiaSemana: number;
  holidayMapMes: Map<string, any>; hojeZerado: Date;
  loadingClasses: boolean; loadingCalendar: boolean;
  dataSelecionada: string;
  prevMes: () => void; nextMes: () => void;
  onSelectDia: (date: Date) => void;
}) {
  return (
    <div className="rounded-[24px] border border-brand-teal/10 bg-white/85 p-4">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-semibold text-brand-ink">4. Selecione o dia no calendário</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={prevMes}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-brand-teal/20 text-brand-teal transition hover:bg-brand-teal hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <p className="min-w-[150px] text-center text-sm font-semibold text-brand-ink">
            {MESES[mesAtual]} {anoAtual}
          </p>
          <button
            type="button"
            onClick={nextMes}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-brand-teal/20 text-brand-teal transition hover:bg-brand-teal hover:text-white"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mb-2 grid grid-cols-7 gap-1">
        {SEMANAS.map((d) => (
          <div key={d} className="py-2 text-center text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: primeiroDiaSemana }).map((_, idx) => (
          <div key={`empty-${idx}`} className="min-h-[88px]" />
        ))}
        {diasDoMes.map((dia) => {
          const iso = toIsoDate(dia);
          const feriado = getFeriado(dia, holidayMapMes);
          const diaZero = new Date(dia); diaZero.setHours(0, 0, 0, 0);
          const isDomingo = dia.getDay() === 0;
          const isPast = diaZero < hojeZerado;
          const foraPeriodo = isForaDoPeriodoLetivo(dia);
          const bloqueado = isDomingo || !!feriado || foraPeriodo || isPast;
          const isSelected = dataSelecionada === iso;

          const blockStyle = isPast
            ? { bg: 'bg-slate-100', border: 'border-slate-200', num: 'text-slate-300 line-through', icon: <Clock className="h-3 w-3" />, label: 'Passado', labelColor: 'text-slate-400' }
            : isDomingo
            ? { bg: 'bg-slate-50', border: 'border-slate-200', num: 'text-slate-400', icon: <Sunset className="h-3 w-3" />, label: 'Domingo', labelColor: 'text-slate-400' }
            : feriado
            ? { bg: 'bg-amber-50', border: 'border-amber-200', num: 'text-amber-600', icon: <Star className="h-3 w-3" />, label: feriado.label, labelColor: 'text-amber-500' }
            : { bg: 'bg-blue-50', border: 'border-blue-200', num: 'text-blue-400', icon: <CalendarOff className="h-3 w-3" />, label: 'Fora do período', labelColor: 'text-blue-400' };

          return (
            <button
              key={iso}
              type="button"
              disabled={bloqueado || loadingClasses}
              onClick={() => onSelectDia(dia)}
              className={`min-h-[88px] rounded-xl border p-2 text-left transition ${
                isSelected
                  ? 'border-brand-teal bg-brand-teal/10 ring-2 ring-brand-teal/20'
                  : bloqueado
                  ? `${blockStyle.border} ${blockStyle.bg}`
                  : 'border-brand-teal/10 bg-white hover:bg-brand-mist/20'
              }`}
            >
              {bloqueado ? (
                <>
                  <p className={`text-sm font-bold ${blockStyle.num}`}>{dia.getDate()}</p>
                  <div className={`mt-1.5 flex items-center gap-1 ${blockStyle.labelColor}`}>
                    {blockStyle.icon}
                    <p className="line-clamp-1 text-[9px] font-medium leading-tight">{blockStyle.label}</p>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold">{dia.getDate()}</p>
                  {loadingCalendar && <p className="mt-1 text-[10px] leading-tight text-muted-foreground">...</p>}
                </>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Seção de salas disponíveis ────────────────────────────────────────────────

function SecaoSalas({
  dataSelecionada, intervaloValido, salasNoDiaSelecionado, salaId, setSalaId, loadingClasses,
}: {
  dataSelecionada: string; intervaloValido: boolean;
  salasNoDiaSelecionado: ClassItem[]; salaId: string;
  setSalaId: (id: string) => void; loadingClasses: boolean;
}) {
  if (!dataSelecionada) return null;

  if (!intervaloValido) {
    return (
      <div className="flex items-center gap-3 rounded-[24px] border border-brand-teal/10 bg-brand-mist/10 px-4 py-3 text-sm text-muted-foreground">
        <CalendarDays className="h-4 w-4 flex-shrink-0 text-brand-teal" />
        <p>Dia selecionado: <span className="font-semibold text-brand-ink">{parseIsoDate(dataSelecionada).toLocaleDateString('pt-BR')}</span>. Selecione um turno para ver as salas disponíveis.</p>
      </div>
    );
  }

  return (
    <div className="rounded-[24px] border border-brand-teal/10 bg-brand-mist/10 p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-brand-ink">
          5. Escolha a sala — {parseIsoDate(dataSelecionada).toLocaleDateString('pt-BR')}
        </p>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-teal px-3 py-1 text-sm font-bold text-white shadow-sm">
          {salasNoDiaSelecionado.length}
          <span className="font-normal opacity-90">{salasNoDiaSelecionado.length === 1 ? 'sala' : 'salas'}</span>
        </span>
      </div>

      {loadingClasses ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          Carregando salas...
        </div>
      ) : salasNoDiaSelecionado.length === 0 ? (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <CalendarDays className="h-4 w-4" />
          Nenhuma sala disponível nesse dia para o turno informado.
        </div>
      ) : (
        <div className="space-y-4">
          {(['AUDITORIO', 'SALA', 'LABORATORIO'] as const).map((tipo) => {
            const grupo = salasNoDiaSelecionado.filter(s => s.type === tipo);
            if (grupo.length === 0) return null;
            const labelInfo = tipo === 'AUDITORIO'
              ? { label: 'Auditórios', color: 'bg-violet-600' }
              : tipo === 'SALA'
              ? { label: 'Salas', color: 'bg-brand-wine' }
              : { label: 'Laboratórios', color: 'bg-brand-teal' };
            return (
              <div key={tipo}>
                <div className="mb-2 flex items-center gap-2">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold text-white ${labelInfo.color}`}>
                    {labelInfo.label}
                  </span>
                  <span className="text-xs text-muted-foreground">{grupo.length} disponível{grupo.length !== 1 ? 'eis' : ''}</span>
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  {grupo.map((sala) => (
                    <button
                      key={sala.id}
                      type="button"
                      onClick={() => setSalaId(sala.id)}
                      className={`rounded-xl border p-3 text-left transition ${
                        sala.id === salaId
                          ? 'border-brand-teal bg-brand-teal/10'
                          : 'border-brand-teal/15 bg-white hover:bg-brand-mist/20'
                      }`}
                    >
                      <p className="font-semibold text-brand-ink">{sala.name}</p>
                      <p className="text-xs text-muted-foreground">Capacidade: {sala.capacity}</p>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Componente Principal: SolicitarReservaPage ────────────────────────────────

export function SolicitarReservaPage() {
  const logic = useReservaLogic();

  const {
    mesAtual, anoAtual, diasDoMes, primeiroDiaSemana,
    cursoSigla, semestre, turnoSelecionado, salaId, dataSelecionada, modoReserva,
    isSubmitting, loadingClasses, loadingCalendar, error, success, conflitosSemestre,
    cursoAtual, slotSelecionado, intervaloValido, holidayMapMes, feriadoAviso,
    hojeZerado, salasNoDiaSelecionado, previaReservaSemestre, classesDisponiveis,
    setCursoSigla, setSemestre, setTurnoSelecionado, setSalaId, setModoReserva,
    prevMes, nextMes, onSelectDia, handleSubmit, isTurnoDisponivel,
    turmaString,
  } = logic;

  return (
    <div className="min-h-screen bg-transparent">
      <div className="container py-8">
        <div className="rounded-[32px] border border-brand-teal/10 bg-white/85 p-8 shadow-panel">
          <div className="mb-6 flex items-center justify-between gap-3">
            <div>
              <Badge variant="default">Reserva de sala</Badge>
              <h1 className="mt-3 font-serif text-3xl text-brand-ink">Solicitar reserva</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Selecione o curso, semestre, turno, dia e sala para enviar sua solicitação.
              </p>
            </div>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>

            {/* Passo 1–3: Curso, Semestre e Turno */}
            <SecaoTurmaHorario
              prefix="page"
              cursoSigla={cursoSigla} setCursoSigla={setCursoSigla}
              semestre={semestre} setSemestre={setSemestre}
              turnoSelecionado={turnoSelecionado} setTurnoSelecionado={setTurnoSelecionado}
              cursoAtual={cursoAtual}
              dataSelecionada={dataSelecionada}
              isTurnoDisponivel={isTurnoDisponivel}
              loadingClasses={loadingClasses}
            />

            {/* Resumo do turno selecionado */}
            {slotSelecionado && (
              <div className="flex items-center gap-2 rounded-xl border border-brand-teal/20 bg-brand-teal/5 px-4 py-2 text-sm">
                <Clock className="h-4 w-4 text-brand-teal flex-shrink-0" />
                <span className="text-brand-ink">
                  Turno selecionado: <strong>{slotSelecionado.label}</strong> — {slotSelecionado.inicio} às {slotSelecionado.fim}
                </span>
              </div>
            )}

            {/* Tipo de reserva */}
            <div className="rounded-[20px] border border-brand-teal/10 bg-white/80 p-3">
              <p className="mb-2 text-sm font-semibold text-brand-ink">Tipo de reserva</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setModoReserva('unica')}
                  className={`rounded-xl border px-4 py-3 text-left text-sm transition ${
                    modoReserva === 'unica'
                      ? 'border-brand-teal bg-brand-teal/10 text-brand-ink'
                      : 'border-brand-teal/15 bg-white text-muted-foreground hover:bg-brand-mist/20'
                  }`}
                >
                  <span className="font-semibold">Reserva única</span>
                </button>
                <button
                  type="button"
                  onClick={() => setModoReserva('semestre')}
                  className={`rounded-xl border px-4 py-3 text-left text-sm transition ${
                    modoReserva === 'semestre'
                      ? 'border-brand-teal bg-brand-teal/10 text-brand-ink'
                      : 'border-brand-teal/15 bg-white text-muted-foreground hover:bg-brand-mist/20'
                  }`}
                >
                  <span className="font-semibold">Semanal até o fim do semestre</span>
                </button>
              </div>
              {modoReserva === 'semestre' && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {dataSelecionada && previaReservaSemestre.length > 0
                    ? `${previaReservaSemestre.length} data${previaReservaSemestre.length !== 1 ? 's' : ''} prevista${previaReservaSemestre.length !== 1 ? 's' : ''}; o sistema valida conflitos antes de criar.`
                    : 'O sistema valida todas as semanas antes de criar as reservas.'}
                </p>
              )}
            </div>

            {/* Calendário — Passo 4 */}
            <CalendarioMes
              mesAtual={mesAtual} anoAtual={anoAtual}
              diasDoMes={diasDoMes} primeiroDiaSemana={primeiroDiaSemana}
              holidayMapMes={holidayMapMes} hojeZerado={hojeZerado}
              loadingClasses={loadingClasses} loadingCalendar={loadingCalendar}
              dataSelecionada={dataSelecionada}
              prevMes={prevMes} nextMes={nextMes} onSelectDia={onSelectDia}
            />

            {/* Salas — Passo 5 */}
            <SecaoSalas
              dataSelecionada={dataSelecionada} intervaloValido={intervaloValido}
              salasNoDiaSelecionado={salasNoDiaSelecionado}
              salaId={salaId} setSalaId={setSalaId}
              loadingClasses={loadingClasses}
            />

            {/* Avisos */}
            {feriadoAviso && (
              <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <div>
                  <p className="font-semibold">
                    {feriadoAviso.label === 'Domingo' ? 'Domingo' : feriadoAviso.tipo === 'academico' ? 'Recesso Acadêmico' : 'Feriado Nacional'}
                  </p>
                  <p>
                    {feriadoAviso.label === 'Domingo'
                      ? 'Aos domingos não há aulas. Selecione outro dia.'
                      : `${feriadoAviso.label} — agendamentos nesta data são bloqueados.`}
                  </p>
                </div>
              </div>
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}

            {modoReserva === 'semestre' && conflitosSemestre.length > 0 && (
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={() => void handleSubmit({ preventDefault() { } } as FormEvent, true)}
              >
                Reservar pulando datas com conflito
              </Button>
            )}

            {success && <p className="text-sm text-green-600">{success}</p>}

            <Button
              className="group"
              disabled={
                isSubmitting || loadingClasses || loadingCalendar ||
                classesDisponiveis.length === 0 || !!feriadoAviso ||
                !turmaString || !turnoSelecionado || !intervaloValido ||
                !dataSelecionada || !salaId
              }
              type="submit"
            >
              {isSubmitting ? 'Enviando...' : modoReserva === 'semestre' ? 'Solicitar reservas do semestre' : 'Solicitar reserva'}
              <Send className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ── Versão Inline (para uso dentro de abas) ───────────────────────────────────

export function SolicitarReservaInline() {
  const logic = useReservaLogic();

  const {
    mesAtual, anoAtual, diasDoMes, primeiroDiaSemana,
    cursoSigla, semestre, turnoSelecionado, salaId, dataSelecionada, modoReserva,
    isSubmitting, loadingClasses, loadingCalendar, error, success, conflitosSemestre,
    cursoAtual, slotSelecionado, intervaloValido, holidayMapMes, feriadoAviso,
    hojeZerado, salasNoDiaSelecionado, previaReservaSemestre, classesDisponiveis,
    setCursoSigla, setSemestre, setTurnoSelecionado, setSalaId, setModoReserva,
    prevMes, nextMes, onSelectDia, handleSubmit, isTurnoDisponivel,
    turmaString,
  } = logic;

  return (
    <div className="rounded-b-[24px] rounded-tr-[24px] border border-brand-teal/10 bg-white/85 p-6 shadow-panel">
      <form className="space-y-5" onSubmit={handleSubmit}>

        {/* Passo 1–3: Curso, Semestre e Turno */}
        <SecaoTurmaHorario
          prefix="inline"
          cursoSigla={cursoSigla} setCursoSigla={setCursoSigla}
          semestre={semestre} setSemestre={setSemestre}
          turnoSelecionado={turnoSelecionado} setTurnoSelecionado={setTurnoSelecionado}
          cursoAtual={cursoAtual}
          dataSelecionada={dataSelecionada}
          isTurnoDisponivel={isTurnoDisponivel}
          loadingClasses={loadingClasses}
        />

        {/* Resumo do turno selecionado */}
        {slotSelecionado && (
          <div className="flex items-center gap-2 rounded-xl border border-brand-teal/20 bg-brand-teal/5 px-4 py-2 text-sm">
            <Clock className="h-4 w-4 text-brand-teal flex-shrink-0" />
            <span className="text-brand-ink">
              Turno: <strong>{slotSelecionado.label}</strong> — {slotSelecionado.inicio} às {slotSelecionado.fim}
            </span>
          </div>
        )}

        {/* Tipo de reserva */}
        <div className="rounded-[20px] border border-brand-teal/10 bg-white/80 p-3">
          <p className="mb-2 text-sm font-semibold text-brand-ink">Tipo de reserva</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setModoReserva('unica')}
              className={`rounded-xl border px-4 py-3 text-left text-sm transition ${
                modoReserva === 'unica'
                  ? 'border-brand-teal bg-brand-teal/10 text-brand-ink'
                  : 'border-brand-teal/15 bg-white text-muted-foreground hover:bg-brand-mist/20'
              }`}
            >
              <span className="font-semibold">Reserva única</span>
            </button>
            <button
              type="button"
              onClick={() => setModoReserva('semestre')}
              className={`rounded-xl border px-4 py-3 text-left text-sm transition ${
                modoReserva === 'semestre'
                  ? 'border-brand-teal bg-brand-teal/10 text-brand-ink'
                  : 'border-brand-teal/15 bg-white text-muted-foreground hover:bg-brand-mist/20'
              }`}
            >
              <span className="font-semibold">Semanal até o fim do semestre</span>
            </button>
          </div>
          {modoReserva === 'semestre' && (
            <p className="mt-2 text-xs text-muted-foreground">
              {dataSelecionada && previaReservaSemestre.length > 0
                ? `${previaReservaSemestre.length} data${previaReservaSemestre.length !== 1 ? 's' : ''} prevista${previaReservaSemestre.length !== 1 ? 's' : ''}; o sistema valida conflitos antes de criar.`
                : 'O sistema valida todas as semanas antes de criar as reservas.'}
            </p>
          )}
        </div>

        {/* Calendário — Passo 4 */}
        <CalendarioMes
          mesAtual={mesAtual} anoAtual={anoAtual}
          diasDoMes={diasDoMes} primeiroDiaSemana={primeiroDiaSemana}
          holidayMapMes={holidayMapMes} hojeZerado={hojeZerado}
          loadingClasses={loadingClasses} loadingCalendar={loadingCalendar}
          dataSelecionada={dataSelecionada}
          prevMes={prevMes} nextMes={nextMes} onSelectDia={onSelectDia}
        />

        {/* Salas — Passo 5 */}
        <SecaoSalas
          dataSelecionada={dataSelecionada} intervaloValido={intervaloValido}
          salasNoDiaSelecionado={salasNoDiaSelecionado}
          salaId={salaId} setSalaId={setSalaId}
          loadingClasses={loadingClasses}
        />

        {/* Avisos */}
        {feriadoAviso && (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <div>
              <p className="font-semibold">
                {feriadoAviso.label === 'Domingo' ? 'Domingo' : feriadoAviso.tipo === 'academico' ? 'Recesso Acadêmico' : 'Feriado Nacional'}
              </p>
              <p>
                {feriadoAviso.label === 'Domingo'
                  ? 'Aos domingos não há aulas. Selecione outro dia.'
                  : `${feriadoAviso.label} — agendamentos nesta data são bloqueados.`}
              </p>
            </div>
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        {modoReserva === 'semestre' && conflitosSemestre.length > 0 && (
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={() => void handleSubmit({ preventDefault() { } } as FormEvent, true)}
          >
            Reservar pulando datas com conflito
          </Button>
        )}

        {success && <p className="text-sm text-green-600">{success}</p>}

        <Button
          className="group"
          disabled={
            isSubmitting || loadingClasses || loadingCalendar ||
            classesDisponiveis.length === 0 || !!feriadoAviso ||
            !turmaString || !turnoSelecionado || !intervaloValido ||
            !dataSelecionada || !salaId
          }
          type="submit"
        >
          {isSubmitting ? 'Enviando...' : modoReserva === 'semestre' ? 'Solicitar reservas do semestre' : 'Solicitar reserva'}
          <Send className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Button>
      </form>
    </div>
  );
}
