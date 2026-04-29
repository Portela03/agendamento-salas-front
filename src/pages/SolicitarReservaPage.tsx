import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, CalendarDays, ChevronLeft, ChevronRight, LoaderCircle, Send } from 'lucide-react';

import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { api } from '../services/api';
import { listAvaiables, type ClassItem } from '../services/classService';
import { fetchCalendario } from '../services/calendarService';
import type { Reserva } from '../services/reservaService';
import { buildHolidayMap, getFeriado } from '../lib/holidays';

const MESES = [
  'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const SEMANAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];

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
  const match = /^(\d{2}):(\d{2})$/.exec(hhmm);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function resolveReservaInterval(reserva: Reserva): { inicio: number; fim: number } | null {
  const fallbackInicio = reserva.horario?.split('-')[0]?.trim() ?? '';
  const fallbackFim = reserva.horario?.split('-')[1]?.trim() ?? fallbackInicio;

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

export function SolicitarReservaPage() {
  const navigate = useNavigate();
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

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingCalendar, setLoadingCalendar] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const nowLocal = new Date();
  const nowMinutes = nowLocal.getHours() * 60 + nowLocal.getMinutes();

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
      const feriado = getFeriado(date, holidayMapMes);
      const dateZero = new Date(date);
      dateZero.setHours(0, 0, 0, 0);

      if (date.getDay() === 0 || !!feriado || dateZero < hojeZerado) {
        return [];
      }

      const reservasNoDia = reservasMes.filter((reserva) => {
        const reservaDate = new Date(reserva.data);
        return sameDay(reservaDate, date) && reserva.status !== 'REJEITADA';
      });

      if (intervaloValido && inicioMin !== null && fimMin !== null && isSameDate(date, nowLocal)) {
        if (fimMin <= nowMinutes || inicioMin <= nowMinutes) {
          return [];
        }
      }

      if (!intervaloValido || inicioMin === null || fimMin === null) {
        return classesDisponiveis;
      }

      return classesDisponiveis.filter((sala) => {
        const reservasDaSala = reservasNoDia.filter((reserva) => reserva.salaId === sala.id);
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

  const disponibilidadePorDia = useMemo(() => {
    const map = new Map<string, number>();

    for (const dia of diasDoMes) {
      const iso = toIsoDate(dia);
      map.set(iso, getSalasDisponiveisNoDia(dia).length);
    }

    return map;
  }, [diasDoMes, getSalasDisponiveisNoDia]);

  const salasNoDiaSelecionado = useMemo(() => {
    if (!dataSelecionada) return [];
    return getSalasDisponiveisNoDia(parseIsoDate(dataSelecionada));
  }, [dataSelecionada, getSalasDisponiveisNoDia]);

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
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

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
    if (isSameDate(dataSelecionadaDate, nowLocal) && inicioMin !== null && inicioMin <= nowMinutes) {
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

      await api.post('/reservas', {
        classId: salaId,
        data: dataLocal.toISOString(),
        horarioInicio,
        horarioFim,
        turma: turma.trim(),
      });

      setSuccess('Solicitacao enviada com sucesso.');
      setSalaId('');
      setDataSelecionada('');
      setHorarioInicio('');
      setHorarioFim('');
      setTurma('');
      await loadReservasMes();
    } catch (err: any) {
      const serverMsg = err?.response?.data?.message;
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

            <Button variant="outline" onClick={() => navigate('/professor/dashboard')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
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
                  const bloqueado = isDomingo || !!feriado || isPast;
                  const isSelected = dataSelecionada === isoDate;
                  const disponiveis = disponibilidadePorDia.get(isoDate) ?? 0;

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
                          ? 'border-slate-200 bg-slate-50 text-muted-foreground/60'
                          : 'border-brand-teal/10 bg-white hover:bg-brand-mist/20'
                      }`}
                    >
                      <p className="text-sm font-semibold">{dia.getDate()}</p>

                      {bloqueado ? (
                        <p className="mt-1 text-[10px] leading-tight">
                          {isPast ? 'Dia passado' : isDomingo ? 'Domingo' : 'Feriado'}
                        </p>
                      ) : loadingCalendar ? (
                        <p className="mt-1 text-[10px] leading-tight">Carregando...</p>
                      ) : (
                        <>
                          <p className="mt-1 line-clamp-1 text-[10px] font-semibold text-brand-teal">
                            {disponiveis} sala{disponiveis !== 1 ? 's' : ''} disponivel{disponiveis !== 1 ? 'eis' : ''}
                          </p>
                          {!intervaloValido && (
                            <p className="mt-1 text-[10px] leading-tight text-muted-foreground">
                              Defina horario para disponibilidade exata
                            </p>
                          )}
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {dataSelecionada && (
              <div className="rounded-[24px] border border-brand-teal/10 bg-brand-mist/10 p-4">
                <p className="mb-2 text-sm font-semibold text-brand-ink">
                  Salas disponiveis em {parseIsoDate(dataSelecionada).toLocaleDateString('pt-BR')}
                </p>

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
                  <div className="grid gap-2 md:grid-cols-2">
                    {salasNoDiaSelecionado.map((sala) => (
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
                        <p className="text-xs text-muted-foreground">
                          {sala.type} - Capacidade: {sala.capacity}
                        </p>
                      </button>
                    ))}
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
              const dia = parseIsoDate(dataSelecionada);
              const isHoje = isSameDate(dia, nowLocal);
              if (!isHoje || inicioMin === null) return null;
              if (inicioMin > nowMinutes) return null;
              return (
                <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <p>Para hoje, escolha um horario de inicio posterior ao horario atual.</p>
                </div>
              );
            })()}

            {error && <p className="text-sm text-red-600">{error}</p>}
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
              {isSubmitting ? 'Enviando...' : 'Solicitar reserva'}
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

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingCalendar, setLoadingCalendar] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const nowLocal = new Date();
  const nowMinutes = nowLocal.getHours() * 60 + nowLocal.getMinutes();

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
      const feriado = getFeriado(date, holidayMapMes);
      const dateZero = new Date(date); dateZero.setHours(0, 0, 0, 0);
      if (date.getDay() === 0 || !!feriado || dateZero < hojeZerado) return [];
      const reservasNoDia = reservasMes.filter((reserva) => {
        const reservaDate = new Date(reserva.data);
        return sameDay(reservaDate, date) && reserva.status !== 'REJEITADA';
      });
      if (intervaloValido && inicioMin !== null && fimMin !== null && isSameDate(date, nowLocal)) {
        if (fimMin <= nowMinutes || inicioMin <= nowMinutes) return [];
      }
      if (!intervaloValido || inicioMin === null || fimMin === null) return classesDisponiveis;
      return classesDisponiveis.filter((sala) => {
        const reservasDaSala = reservasNoDia.filter((reserva) => reserva.salaId === sala.id);
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

  const disponibilidadePorDia = useMemo(() => {
    const map = new Map<string, number>();
    for (const dia of diasDoMes) { map.set(toIsoDate(dia), getSalasDisponiveisNoDia(dia).length); }
    return map;
  }, [diasDoMes, getSalasDisponiveisNoDia]);

  const salasNoDiaSelecionado = useMemo(() => {
    if (!dataSelecionada) return [];
    return getSalasDisponiveisNoDia(parseIsoDate(dataSelecionada));
  }, [dataSelecionada, getSalasDisponiveisNoDia]);

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
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!turma.trim()) { setError('Informe a turma.'); return; }
    if (!intervaloPreenchido || !intervaloValido) { setError('Informe horario de inicio e termino validos.'); return; }
    if (!dataSelecionada) { setError('Selecione um dia no calendario.'); return; }
    const dataSelecionadaDate = parseIsoDate(dataSelecionada);
    if (isSameDate(dataSelecionadaDate, nowLocal) && inicioMin !== null && inicioMin <= nowMinutes) {
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
      await api.post('/reservas', {
        classId: salaId,
        data: new Date(year, month - 1, day, 12, 0, 0).toISOString(),
        horarioInicio, horarioFim, turma: turma.trim(),
      });
      setSuccess('Solicitacao enviada com sucesso.');
      setSalaId(''); setDataSelecionada(''); setHorarioInicio(''); setHorarioFim(''); setTurma('');
      await loadReservasMes();
    } catch (err: any) {
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
              const bloqueado = isDomingo || !!feriado || isPast;
              const isSelected = dataSelecionada === iso;
              const disponiveis = disponibilidadePorDia.get(iso) ?? 0;
              return (
                <button key={iso} type="button" disabled={bloqueado || loadingClasses} onClick={() => onSelectDia(dia)}
                  className={`min-h-[88px] rounded-xl border p-2 text-left transition ${
                    isSelected ? 'border-brand-teal bg-brand-teal/10 ring-2 ring-brand-teal/20'
                    : bloqueado ? 'border-slate-200 bg-slate-50 text-muted-foreground/60'
                    : 'border-brand-teal/10 bg-white hover:bg-brand-mist/20'
                  }`}
                >
                  <p className="text-sm font-semibold">{dia.getDate()}</p>
                  {bloqueado ? (
                    <p className="mt-1 text-[10px] leading-tight">{isPast ? 'Dia passado' : isDomingo ? 'Domingo' : 'Feriado'}</p>
                  ) : loadingCalendar ? (
                    <p className="mt-1 text-[10px] leading-tight">Carregando...</p>
                  ) : (
                        <p className="mt-1 line-clamp-1 text-[10px] font-semibold text-brand-teal">
                          {disponiveis} {disponiveis === 1 ? 'sala disponível' : 'salas disponíveis'}
                        </p>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Salas disponíveis no dia selecionado */}
        {dataSelecionada && (
          <div className="rounded-[24px] border border-brand-teal/10 bg-brand-mist/10 p-4">
            <p className="mb-2 text-sm font-semibold text-brand-ink">
              Salas disponíveis em {parseIsoDate(dataSelecionada).toLocaleDateString('pt-BR')}
            </p>
            {loadingClasses ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <LoaderCircle className="h-4 w-4 animate-spin" /> Carregando salas...
              </div>
            ) : salasNoDiaSelecionado.length === 0 ? (
              <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                <CalendarDays className="h-4 w-4" /> Nenhuma sala disponível nesse dia para o horário informado.
              </div>
            ) : (
              <div className="grid gap-2 md:grid-cols-2">
                {salasNoDiaSelecionado.map((sala) => (
                  <button key={sala.id} type="button" onClick={() => setSalaId(sala.id)}
                    className={`rounded-xl border p-3 text-left transition ${
                      sala.id === salaId ? 'border-brand-teal bg-brand-teal/10' : 'border-brand-teal/15 bg-white hover:bg-brand-mist/20'
                    }`}
                  >
                    <p className="font-semibold text-brand-ink">{sala.name}</p>
                    <p className="text-xs text-muted-foreground">{sala.type} - Capacidade: {sala.capacity}</p>
                  </button>
                ))}
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
        {success && <p className="text-sm text-green-600">{success}</p>}

        <Button
          className="group"
          disabled={isSubmitting || loadingClasses || loadingCalendar || classesDisponiveis.length === 0 || !!feriadoAviso || !intervaloValido || !dataSelecionada || !salaId || !turma.trim()}
          type="submit"
        >
          {isSubmitting ? 'Enviando...' : 'Solicitar reserva'}
          <Send className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Button>
      </form>
    </div>
  );
}
