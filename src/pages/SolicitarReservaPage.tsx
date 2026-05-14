import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CalendarDays, CalendarOff, ChevronLeft, ChevronRight, Clock, LoaderCircle, Send, Star, Sunset } from 'lucide-react';

import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { listAvaiables, type ClassItem } from '../services/classService';
import { fetchCalendario } from '../services/calendarService';
import { reservaService, type Reserva } from '../services/reservaService';
import { buildHolidayMap, getFeriado, getSemestreAtivo, isForaDoPeriodoLetivo } from '../lib/holidays';

const MESES = [
  'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const SEMANAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];

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

export function SolicitarReservaPage() {
  const now = new Date();

  const [mesAtual, setMesAtual] = useState(now.getMonth());
  const [anoAtual, setAnoAtual] = useState(now.getFullYear());

  const [classesDisponiveis, setClassesDisponiveis] = useState<ClassItem[]>([]);
  const [reservasMes, setReservasMes] = useState<Reserva[]>([]);

  const [salaId, setSalaId] = useState('');
  const [dataSelecionada, setDataSelecionada] = useState('');
  const [horarioInicio, setHorarioInicio] = useState('');
  const [horarioFim, setHorarioFim] = useState('');
  const [turma, setTurma] = useState('');
  const [modoReserva, setModoReserva] = useState<ModoReserva>('unica');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingCalendar, setLoadingCalendar] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [conflitosSemestre, setConflitosSemestre] = useState<string[]>([]);

  const inicioMin = useMemo(() => toMinutes(horarioInicio), [horarioInicio]);
  const fimMin = useMemo(() => toMinutes(horarioFim), [horarioFim]);
  const intervaloPreenchido = horarioInicio.length > 0 && horarioFim.length > 0;
  const intervaloValido = inicioMin !== null && fimMin !== null && inicioMin < fimMin;

  const holidayMapMes = useMemo(() => buildHolidayMap(anoAtual), [anoAtual]);

  const feriadoAviso = useMemo(() => {
    if (!dataSelecionada) return null;
    const selectedDate = parseIsoDate(dataSelecionada);

    if (selectedDate.getDay() === 0) {
      return { label: 'Domingo', tipo: 'academico' as const };
    }

    const holidayMap = buildHolidayMap(selectedDate.getFullYear());
    return getFeriado(selectedDate, holidayMap);
  }, [dataSelecionada]);

  const loadReservasMes = useCallback(async () => {
    try {
      setLoadingCalendar(true);
      const result = await fetchCalendario({
        mes: mesAtual + 1,
        ano: anoAtual,
        incluirAguardando: true,
      });
      setReservasMes(result);
    } catch {
      setError('Nao foi possivel carregar as reservas para calcular a disponibilidade.');
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
        setError('Nao foi possivel carregar as salas disponiveis.');
      } finally {
        setLoadingClasses(false);
      }
    }

    void loadClasses();
  }, []);

  useEffect(() => {
    void loadReservasMes();
  }, [loadReservasMes]);

  const diasDoMes = useMemo(() => getDiasDoMes(anoAtual, mesAtual), [anoAtual, mesAtual]);
  const primeiroDiaSemana = diasDoMes[0]?.getDay() ?? 0;

  const hojeZerado = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const getSalasDisponiveisNoDia = useCallback(
    (date: Date): ClassItem[] => {
      const nowLocal = new Date();
      const nowMinutes = nowLocal.getHours() * 60 + nowLocal.getMinutes();

      const feriado = getFeriado(date, holidayMapMes);
      const dateZero = new Date(date);
      dateZero.setHours(0, 0, 0, 0);

      if (date.getDay() === 0 || !!feriado || isForaDoPeriodoLetivo(date) || dateZero < hojeZerado) {
        return [];
      }

      const reservasNoDia = reservasMes.filter((reserva) => {
        const reservaDate = new Date(reserva.data);
        return sameDay(reservaDate, date) && reserva.status !== 'REJEITADA';
      });

      // Para hoje: bloquear somente se o horário de fim já passou
      if (intervaloValido && fimMin !== null && isSameDate(date, nowLocal)) {
        if (fimMin <= nowMinutes) {
          return [];
        }
      }

      if (!intervaloValido || inicioMin === null || fimMin === null) {
        return classesDisponiveis;
      }

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



  const salasNoDiaSelecionado = useMemo(() => {
    if (!dataSelecionada) return [];
    return getSalasDisponiveisNoDia(parseIsoDate(dataSelecionada));
  }, [dataSelecionada, getSalasDisponiveisNoDia]);

  const previaReservaSemestre = useMemo(
    () => getReservaSemestrePreview(dataSelecionada),
    [dataSelecionada]
  );

  useEffect(() => {
    if (!salaId || !dataSelecionada) return;

    const aindaDisponivel = salasNoDiaSelecionado.some((sala) => sala.id === salaId);
    if (!aindaDisponivel) {
      setSalaId('');
    }
  }, [dataSelecionada, salaId, salasNoDiaSelecionado]);

  function prevMes() {
    if (mesAtual === 0) {
      setMesAtual(11);
      setAnoAtual((old) => old - 1);
      return;
    }

    setMesAtual((old) => old - 1);
  }

  function nextMes() {
    if (mesAtual === 11) {
      setMesAtual(0);
      setAnoAtual((old) => old + 1);
      return;
    }

    setMesAtual((old) => old + 1);
  }

  function onSelectDia(date: Date) {
    const isoDate = toIsoDate(date);
    setDataSelecionada(isoDate);
    setError('');
    setSuccess('');
    setConflitosSemestre([]);
  }

  async function handleSubmit(e: FormEvent, ignorarConflitos = false) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setConflitosSemestre([]);

    if (!turma.trim()) {
      setError('Informe a turma.');
      return;
    }

    if (!intervaloPreenchido || !intervaloValido) {
      setError('Informe horario de inicio e termino validos.');
      return;
    }

    if (!dataSelecionada) {
      setError('Selecione um dia no calendario.');
      return;
    }

    const dataSelecionadaDate = parseIsoDate(dataSelecionada);
    const _now = new Date();
    const _nowMinutes = _now.getHours() * 60 + _now.getMinutes();
    if (isSameDate(dataSelecionadaDate, _now) && inicioMin !== null && inicioMin <= _nowMinutes) {
      setError('Para o dia de hoje, o horario de inicio deve ser maior que o horario atual.');
      return;
    }

    if (feriadoAviso) {
      setError(`Nao e possivel agendar em feriado/recesso: ${feriadoAviso.label}.`);
      return;
    }

    if (!salaId) {
      setError('Selecione uma sala disponivel para o dia escolhido.');
      return;
    }

    const salaAindaDisponivel = salasNoDiaSelecionado.some((sala) => sala.id === salaId);
    if (!salaAindaDisponivel) {
      setError('A sala selecionada nao esta mais disponivel no horario escolhido.');
      return;
    }

    try {
      setIsSubmitting(true);

      const [year, month, day] = dataSelecionada.split('-').map(Number);
      const dataLocal = new Date(year, month - 1, day, 12, 0, 0);

      const payload = {
        classId: salaId,
        data: dataLocal.toISOString(),
        horarioInicio,
        horarioFim,
        turma: turma.trim(),
        ignorarConflitos,
      };

      if (modoReserva === 'semestre') {
        const resultado = await reservaService.criarSemestre(payload);
        const ignoradas = resultado.datasIgnoradas.length;
        setSuccess(
          `Solicitacao semestral enviada: ${resultado.total} reserva${resultado.total !== 1 ? 's' : ''} em ${resultado.semestre}.${ignoradas ? ` ${ignoradas} data${ignoradas !== 1 ? 's' : ''} bloqueada${ignoradas !== 1 ? 's' : ''} foram ignoradas.` : ''}`
        );
      } else {
        await reservaService.criar(payload);
        setSuccess('Solicitacao enviada com sucesso.');
      }

      setSalaId('');
      setDataSelecionada('');
      setHorarioInicio('');
      setHorarioFim('');
      setTurma('');
      await loadReservasMes();
    } catch (err: any) {
      const serverMsg = err?.response?.data?.message;
      if (err?.response?.data?.code === 'SEMESTER_CONFLICTS') {
        setConflitosSemestre(err.response.data.conflitos ?? []);
      }
      setError(serverMsg ?? 'Nao foi possivel enviar a solicitacao agora.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-transparent">
      <div className="container py-8">
        <div className="rounded-[32px] border border-brand-teal/10 bg-white/85 p-8 shadow-panel">
          <div className="mb-6 flex items-center justify-between gap-3">
            <div>
              <Badge variant="default">Reserva de sala</Badge>
              <h1 className="mt-3 font-serif text-3xl text-brand-ink">Solicitar reserva</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Informe turma e horario, veja o calendario com disponibilidade e escolha a sala pelo dia.
              </p>
            </div>

          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-3">
              <Field htmlFor="turma" label="Turma">
                <Input
                  id="turma"
                  placeholder="Ex: DSM 4A"
                  required
                  value={turma}
                  onChange={(e) => setTurma(e.target.value)}
                />
              </Field>

              <Field htmlFor="horarioInicio" label="Horario de inicio">
                <Input
                  id="horarioInicio"
                  type="time"
                  required
                  value={horarioInicio}
                  onChange={(e) => setHorarioInicio(e.target.value)}
                />
              </Field>

              <Field htmlFor="horarioFim" label="Horario de termino">
                <Input
                  id="horarioFim"
                  type="time"
                  required
                  value={horarioFim}
                  onChange={(e) => setHorarioFim(e.target.value)}
                />
              </Field>
            </div>

            <div className="rounded-[20px] border border-brand-teal/10 bg-white/80 p-3">
              <p className="mb-2 text-sm font-semibold text-brand-ink">Tipo de reserva</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setModoReserva('unica')}
                  className={`rounded-xl border px-4 py-3 text-left text-sm transition ${modoReserva === 'unica'
                      ? 'border-brand-teal bg-brand-teal/10 text-brand-ink'
                      : 'border-brand-teal/15 bg-white text-muted-foreground hover:bg-brand-mist/20'
                    }`}
                >
                  <span className="font-semibold">Reserva unica</span>
                </button>
                <button
                  type="button"
                  onClick={() => setModoReserva('semestre')}
                  className={`rounded-xl border px-4 py-3 text-left text-sm transition ${modoReserva === 'semestre'
                      ? 'border-brand-teal bg-brand-teal/10 text-brand-ink'
                      : 'border-brand-teal/15 bg-white text-muted-foreground hover:bg-brand-mist/20'
                    }`}
                >
                  <span className="font-semibold">Semanal ate o fim do semestre</span>
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

            <div className="rounded-[24px] border border-brand-teal/10 bg-white/85 p-4">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-semibold text-brand-ink">Selecione o dia no calendario</p>
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
                {SEMANAS.map((diaSemana) => (
                  <div
                    key={diaSemana}
                    className="py-2 text-center text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground"
                  >
                    {diaSemana}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: primeiroDiaSemana }).map((_, idx) => (
                  <div key={`empty-${idx}`} className="min-h-[88px]" />
                ))}

                {diasDoMes.map((dia) => {
                  const isoDate = toIsoDate(dia);
                  const feriado = getFeriado(dia, holidayMapMes);
                  const diaZero = new Date(dia);
                  diaZero.setHours(0, 0, 0, 0);

                  const isDomingo = dia.getDay() === 0;
                  const isPast = diaZero < hojeZerado;
                  const foraPeriodo = isForaDoPeriodoLetivo(dia);
                  const bloqueado = isDomingo || !!feriado || foraPeriodo || isPast;
                  const isSelected = dataSelecionada === isoDate;

                  // Visual config por tipo de bloqueio
                  const blockStyle = isPast
                    ? { bg: 'bg-slate-100', border: 'border-slate-200', num: 'text-slate-300 line-through', icon: <Clock className="h-3 w-3" />, label: 'Passado', labelColor: 'text-slate-400' }
                    : isDomingo
                    ? { bg: 'bg-slate-50', border: 'border-slate-200', num: 'text-slate-400', icon: <Sunset className="h-3 w-3" />, label: 'Domingo', labelColor: 'text-slate-400' }
                    : feriado
                    ? { bg: 'bg-amber-50', border: 'border-amber-200', num: 'text-amber-600', icon: <Star className="h-3 w-3" />, label: feriado.label, labelColor: 'text-amber-500' }
                    : { bg: 'bg-blue-50', border: 'border-blue-200', num: 'text-blue-400', icon: <CalendarOff className="h-3 w-3" />, label: 'Fora do período', labelColor: 'text-blue-400' };

                  return (
                    <button
                      key={isoDate}
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

            {dataSelecionada && !intervaloValido && (
              <div className="flex items-center gap-3 rounded-[24px] border border-brand-teal/10 bg-brand-mist/10 px-4 py-3 text-sm text-muted-foreground">
                <CalendarDays className="h-4 w-4 flex-shrink-0 text-brand-teal" />
                <p>Dia selecionado: <span className="font-semibold text-brand-ink">{parseIsoDate(dataSelecionada).toLocaleDateString('pt-BR')}</span>. Preencha o horário de início e término para ver as salas disponíveis.</p>
              </div>
            )}

            {dataSelecionada && intervaloValido && (
              <div className="rounded-[24px] border border-brand-teal/10 bg-brand-mist/10 p-4">
                {/* Header: título + badge */}
                <div className="mb-4 flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-brand-ink">
                    Salas disponíveis em {parseIsoDate(dataSelecionada).toLocaleDateString('pt-BR')}
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
                    Nenhuma sala disponivel nesse dia para o horario informado.
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
                                className={`rounded-xl border p-3 text-left transition ${sala.id === salaId
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
            )}

            {feriadoAviso && (
              <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <div>
                  <p className="font-semibold">
                    {feriadoAviso.label === 'Domingo'
                      ? 'Domingo'
                      : feriadoAviso.tipo === 'academico'
                        ? 'Recesso Academico'
                        : 'Feriado Nacional'}
                  </p>
                  <p>
                    {feriadoAviso.label === 'Domingo'
                      ? 'Aos domingos nao ha aulas. Selecione outro dia.'
                      : `${feriadoAviso.label} - agendamentos nesta data sao bloqueados.`}
                  </p>
                </div>
              </div>
            )}

            {!intervaloValido && intervaloPreenchido && (
              <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <p>A hora de termino deve ser maior que a hora de inicio.</p>
              </div>
            )}

            {dataSelecionada && intervaloValido && (() => {
              const _now = new Date();
              const _nowMin = _now.getHours() * 60 + _now.getMinutes();
              const dia = parseIsoDate(dataSelecionada);
              const isHoje = isSameDate(dia, _now);
              if (!isHoje || inicioMin === null) return null;
              if (inicioMin > _nowMin) return null;
              return (
                <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <p>Para hoje, escolha um horario de inicio posterior ao horario atual.</p>
                </div>
              );
            })()}

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
                isSubmitting ||
                loadingClasses ||
                loadingCalendar ||
                classesDisponiveis.length === 0 ||
                !!feriadoAviso ||
                !intervaloValido ||
                !dataSelecionada ||
                !salaId ||
                !turma.trim()
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

function Field({ children, htmlFor, label }: { children: ReactNode; htmlFor: string; label: string }) {
  return (
    <label className="block space-y-2" htmlFor={htmlFor}>
      <span className="text-sm font-semibold text-brand-ink">{label}</span>
      {children}
    </label>
  );
}

// ── Versão inline para uso dentro de abas ─────────────────────────────────────

export function SolicitarReservaInline() {
  const now = new Date();

  const [mesAtual, setMesAtual] = useState(now.getMonth());
  const [anoAtual, setAnoAtual] = useState(now.getFullYear());

  const [classesDisponiveis, setClassesDisponiveis] = useState<ClassItem[]>([]);
  const [reservasMes, setReservasMes] = useState<Reserva[]>([]);

  const [salaId, setSalaId] = useState('');
  const [dataSelecionada, setDataSelecionada] = useState('');
  const [horarioInicio, setHorarioInicio] = useState('');
  const [horarioFim, setHorarioFim] = useState('');
  const [turma, setTurma] = useState('');
  const [modoReserva, setModoReserva] = useState<ModoReserva>('unica');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingCalendar, setLoadingCalendar] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [conflitosSemestre, setConflitosSemestre] = useState<string[]>([]);

  const inicioMin = useMemo(() => toMinutes(horarioInicio), [horarioInicio]);
  const fimMin = useMemo(() => toMinutes(horarioFim), [horarioFim]);
  const intervaloPreenchido = horarioInicio.length > 0 && horarioFim.length > 0;
  const intervaloValido = inicioMin !== null && fimMin !== null && inicioMin < fimMin;

  const holidayMapMes = useMemo(() => buildHolidayMap(anoAtual), [anoAtual]);

  const feriadoAviso = useMemo(() => {
    if (!dataSelecionada) return null;
    const selectedDate = parseIsoDate(dataSelecionada);
    if (selectedDate.getDay() === 0) return { label: 'Domingo', tipo: 'academico' as const };
    const holidayMap = buildHolidayMap(selectedDate.getFullYear());
    return getFeriado(selectedDate, holidayMap);
  }, [dataSelecionada]);

  const loadReservasMes = useCallback(async () => {
    try {
      setLoadingCalendar(true);
      const result = await fetchCalendario({ mes: mesAtual + 1, ano: anoAtual, incluirAguardando: true });
      setReservasMes(result);
    } catch {
      setError('Nao foi possivel carregar as reservas para calcular a disponibilidade.');
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
        setError('Nao foi possivel carregar as salas disponiveis.');
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
      // Para hoje: bloquear somente se o horário de fim já passou
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



  const salasNoDiaSelecionado = useMemo(() => {
    if (!dataSelecionada) return [];
    return getSalasDisponiveisNoDia(parseIsoDate(dataSelecionada));
  }, [dataSelecionada, getSalasDisponiveisNoDia]);

  const previaReservaSemestre = useMemo(
    () => getReservaSemestrePreview(dataSelecionada),
    [dataSelecionada]
  );

  useEffect(() => {
    if (!salaId || !dataSelecionada) return;
    if (!salasNoDiaSelecionado.some((sala) => sala.id === salaId)) setSalaId('');
  }, [dataSelecionada, salaId, salasNoDiaSelecionado]);

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
    setError('');
    setSuccess('');
    setConflitosSemestre([]);
  }

  async function handleSubmit(e: FormEvent, ignorarConflitos = false) {
    e.preventDefault();
    setError(''); setSuccess(''); setConflitosSemestre([]);
    if (!turma.trim()) { setError('Informe a turma.'); return; }
    if (!intervaloPreenchido || !intervaloValido) { setError('Informe horario de inicio e termino validos.'); return; }
    if (!dataSelecionada) { setError('Selecione um dia no calendario.'); return; }
    const dataSelecionadaDate = parseIsoDate(dataSelecionada);
    const _now = new Date();
    const _nowMinutes = _now.getHours() * 60 + _now.getMinutes();
    if (isSameDate(dataSelecionadaDate, _now) && inicioMin !== null && inicioMin <= _nowMinutes) {
      setError('Para o dia de hoje, o horario de inicio deve ser maior que o horario atual.'); return;
    }
    if (feriadoAviso) { setError(`Nao e possivel agendar em feriado/recesso: ${feriadoAviso.label}.`); return; }
    if (!salaId) { setError('Selecione uma sala disponivel para o dia escolhido.'); return; }
    if (!salasNoDiaSelecionado.some((sala) => sala.id === salaId)) {
      setError('A sala selecionada nao esta mais disponivel no horario escolhido.'); return;
    }
    try {
      setIsSubmitting(true);
      const [year, month, day] = dataSelecionada.split('-').map(Number);
      const payload = {
        classId: salaId,
        data: new Date(year, month - 1, day, 12, 0, 0).toISOString(),
        horarioInicio, horarioFim, turma: turma.trim(),
        ignorarConflitos,
      };

      if (modoReserva === 'semestre') {
        const resultado = await reservaService.criarSemestre(payload);
        const ignoradas = resultado.datasIgnoradas.length;
        setSuccess(
          `Solicitacao semestral enviada: ${resultado.total} reserva${resultado.total !== 1 ? 's' : ''} em ${resultado.semestre}.${ignoradas ? ` ${ignoradas} data${ignoradas !== 1 ? 's' : ''} bloqueada${ignoradas !== 1 ? 's' : ''} foram ignoradas.` : ''}`
        );
      } else {
        await reservaService.criar(payload);
        setSuccess('Solicitacao enviada com sucesso.');
      }

      setSalaId(''); setDataSelecionada(''); setHorarioInicio(''); setHorarioFim(''); setTurma('');
      await loadReservasMes();
    } catch (err: any) {
      if (err?.response?.data?.code === 'SEMESTER_CONFLICTS') {
        setConflitosSemestre(err.response.data.conflitos ?? []);
      }
      setError(err?.response?.data?.message ?? 'Nao foi possivel enviar a solicitacao agora.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="rounded-b-[24px] rounded-tr-[24px] border border-brand-teal/10 bg-white/85 p-6 shadow-panel">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-3">
          <Field htmlFor="turma-inline" label="Turma">
            <input id="turma-inline" className="w-full rounded-xl border border-brand-teal/20 bg-white px-3 py-2 text-sm text-brand-ink placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-teal/30" placeholder="Ex: DSM 4A" required value={turma} onChange={(e) => setTurma(e.target.value)} />
          </Field>
          <Field htmlFor="horarioInicio-inline" label="Horário de início">
            <input id="horarioInicio-inline" type="time" className="w-full rounded-xl border border-brand-teal/20 bg-white px-3 py-2 text-sm text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-teal/30" required value={horarioInicio} onChange={(e) => setHorarioInicio(e.target.value)} />
          </Field>
          <Field htmlFor="horarioFim-inline" label="Horário de término">
            <input id="horarioFim-inline" type="time" className="w-full rounded-xl border border-brand-teal/20 bg-white px-3 py-2 text-sm text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-teal/30" required value={horarioFim} onChange={(e) => setHorarioFim(e.target.value)} />
          </Field>
        </div>

        <div className="rounded-[20px] border border-brand-teal/10 bg-white/80 p-3">
          <p className="mb-2 text-sm font-semibold text-brand-ink">Tipo de reserva</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setModoReserva('unica')}
              className={`rounded-xl border px-4 py-3 text-left text-sm transition ${modoReserva === 'unica'
                  ? 'border-brand-teal bg-brand-teal/10 text-brand-ink'
                  : 'border-brand-teal/15 bg-white text-muted-foreground hover:bg-brand-mist/20'
                }`}
            >
              <span className="font-semibold">Reserva unica</span>
            </button>
            <button
              type="button"
              onClick={() => setModoReserva('semestre')}
              className={`rounded-xl border px-4 py-3 text-left text-sm transition ${modoReserva === 'semestre'
                  ? 'border-brand-teal bg-brand-teal/10 text-brand-ink'
                  : 'border-brand-teal/15 bg-white text-muted-foreground hover:bg-brand-mist/20'
                }`}
            >
              <span className="font-semibold">Semanal ate o fim do semestre</span>
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

        {/* Calendário de seleção */}
        <div className="rounded-[24px] border border-brand-teal/10 bg-white/85 p-4">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-semibold text-brand-ink">Selecione o dia no calendário</p>
            <div className="flex items-center gap-2">
              <button type="button" onClick={prevMes} className="flex h-9 w-9 items-center justify-center rounded-xl border border-brand-teal/20 text-brand-teal transition hover:bg-brand-teal hover:text-white">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <p className="min-w-[150px] text-center text-sm font-semibold text-brand-ink">{MESES[mesAtual]} {anoAtual}</p>
              <button type="button" onClick={nextMes} className="flex h-9 w-9 items-center justify-center rounded-xl border border-brand-teal/20 text-brand-teal transition hover:bg-brand-teal hover:text-white">
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
            {Array.from({ length: primeiroDiaSemana }).map((_, idx) => <div key={`empty-${idx}`} className="min-h-[88px]" />)}
            {diasDoMes.map((dia) => {
              const iso = toIsoDate(dia);
              const feriado = getFeriado(dia, holidayMapMes);
              const diaZero = new Date(dia); diaZero.setHours(0, 0, 0, 0);
              const isDomingo = dia.getDay() === 0;
              const isPast = diaZero < hojeZerado;
              const foraPeriodo = isForaDoPeriodoLetivo(dia);
              const bloqueado = isDomingo || !!feriado || foraPeriodo || isPast;
              const isSelected = dataSelecionada === iso;

              // Visual config por tipo de bloqueio
              const blockStyle = isPast
                ? { bg: 'bg-slate-100', border: 'border-slate-200', num: 'text-slate-300 line-through', icon: <Clock className="h-3 w-3" />, label: 'Passado', labelColor: 'text-slate-400' }
                : isDomingo
                ? { bg: 'bg-slate-50', border: 'border-slate-200', num: 'text-slate-400', icon: <Sunset className="h-3 w-3" />, label: 'Domingo', labelColor: 'text-slate-400' }
                : feriado
                ? { bg: 'bg-amber-50', border: 'border-amber-200', num: 'text-amber-600', icon: <Star className="h-3 w-3" />, label: feriado.label, labelColor: 'text-amber-500' }
                : { bg: 'bg-blue-50', border: 'border-blue-200', num: 'text-blue-400', icon: <CalendarOff className="h-3 w-3" />, label: 'Fora do período', labelColor: 'text-blue-400' };

              return (
                <button key={iso} type="button" disabled={bloqueado || loadingClasses} onClick={() => onSelectDia(dia)}
                  className={`min-h-[88px] rounded-xl border p-2 text-left transition ${
                    isSelected ? 'border-brand-teal bg-brand-teal/10 ring-2 ring-brand-teal/20'
                      : bloqueado ? `${blockStyle.border} ${blockStyle.bg}`
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

        {/* Salas disponíveis no dia selecionado */}
        {dataSelecionada && !intervaloValido && (
          <div className="flex items-center gap-3 rounded-[24px] border border-brand-teal/10 bg-brand-mist/10 px-4 py-3 text-sm text-muted-foreground">
            <CalendarDays className="h-4 w-4 flex-shrink-0 text-brand-teal" />
            <p>Dia selecionado: <span className="font-semibold text-brand-ink">{parseIsoDate(dataSelecionada).toLocaleDateString('pt-BR')}</span>. Preencha o horário de início e término para ver as salas disponíveis.</p>
          </div>
        )}

        {dataSelecionada && intervaloValido && (
          <div className="rounded-[24px] border border-brand-teal/10 bg-brand-mist/10 p-4">
            {/* Header: título + badge */}
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-brand-ink">
                Salas disponíveis em {parseIsoDate(dataSelecionada).toLocaleDateString('pt-BR')}
              </p>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-teal px-3 py-1 text-sm font-bold text-white shadow-sm">
                {salasNoDiaSelecionado.length}
                <span className="font-normal opacity-90">{salasNoDiaSelecionado.length === 1 ? 'sala' : 'salas'}</span>
              </span>
            </div>

            {loadingClasses ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <LoaderCircle className="h-4 w-4 animate-spin" /> Carregando salas...
              </div>
            ) : salasNoDiaSelecionado.length === 0 ? (
              <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                <CalendarDays className="h-4 w-4" /> Nenhuma sala disponível nesse dia para o horário informado.
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
                          <button key={sala.id} type="button" onClick={() => setSalaId(sala.id)}
                            className={`rounded-xl border p-3 text-left transition ${sala.id === salaId ? 'border-brand-teal bg-brand-teal/10' : 'border-brand-teal/15 bg-white hover:bg-brand-mist/20'}`}
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
        )}

        {/* Avisos */}
        {feriadoAviso && (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <div>
              <p className="font-semibold">{feriadoAviso.label === 'Domingo' ? 'Domingo' : feriadoAviso.tipo === 'academico' ? 'Recesso Acadêmico' : 'Feriado Nacional'}</p>
              <p>{feriadoAviso.label === 'Domingo' ? 'Aos domingos não há aulas. Selecione outro dia.' : `${feriadoAviso.label} — agendamentos nesta data são bloqueados.`}</p>
            </div>
          </div>
        )}
        {!intervaloValido && intervaloPreenchido && (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <p>A hora de término deve ser maior que a hora de início.</p>
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
          disabled={isSubmitting || loadingClasses || loadingCalendar || classesDisponiveis.length === 0 || !!feriadoAviso || !intervaloValido || !dataSelecionada || !salaId || !turma.trim()}
          type="submit"
        >
          {isSubmitting ? 'Enviando...' : modoReserva === 'semestre' ? 'Solicitar reservas do semestre' : 'Solicitar reserva'}
          <Send className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Button>
      </form>
    </div>
  );
}
