import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CalendarRange, Check, ChevronRight, Lock, LockOpen, Trash2, X } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { PeriodoInativoProfessor, reservaService } from '../services/reservaService';
import { useToast } from '../components/Toast';

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function formatarData(data: string) {
  return new Date(data).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
}

function calcularDias(inicio: string, fim: string) {
  const ms = new Date(fim).getTime() - new Date(inicio).getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24)) + 1;
}

function extractError(err: unknown, fallback: string) {
  if (typeof err === 'object' && err !== null) {
    const e = err as any;
    if (e.response?.data?.message) return e.response.data.message as string;
    if (e instanceof Error) return e.message;
  }
  return fallback;
}

/* ─── Modal de confirmação ────────────────────────────────────────────────── */
function ConfirmModal({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div ref={ref} className="mx-4 w-full max-w-md rounded-[28px] border border-rose-200 bg-white p-8 shadow-2xl">
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100">
          <Trash2 className="h-6 w-6 text-rose-600" />
        </div>
        <h2 className="text-xl font-bold text-brand-ink">Remover bloqueio?</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Ao remover o período inativo, os professores voltarão a poder realizar reservas de salas imediatamente.
        </p>
        <div className="mt-6 flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onCancel}>
            Cancelar
          </Button>
          <Button
            className="flex-1 bg-rose-600 text-white hover:bg-rose-700"
            onClick={onConfirm}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Sim, remover
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ─── Componente principal ────────────────────────────────────────────────── */
export function PeriodoInativoProfessorManager() {
  const { addToast } = useToast();
  const [periodo, setPeriodo] = useState<PeriodoInativoProfessor | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [formData, setFormData] = useState({ dataInicio: '', dataFim: '' });

  const loadPeriodo = async () => {
    try {
      setLoading(true);
      setError('');
      const resultado = await reservaService.obterPeriodoInativoProfessor();
      setPeriodo(resultado);
    } catch (err) {
      setError(extractError(err, 'Erro ao carregar período inativo'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadPeriodo(); }, []);

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.dataInicio || !formData.dataFim) { setError('Preencha ambas as datas'); return; }
    try {
      setLoading(true);
      setError('');
      await reservaService.definirPeriodoInativoProfessor(formData.dataInicio, formData.dataFim);
      addToast('Período inativo atualizado com sucesso', 'info');
      setShowForm(false);
      setFormData({ dataInicio: '', dataFim: '' });
      await loadPeriodo();
    } catch (err) {
      const msg = extractError(err, 'Erro ao salvar período');
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRemover = async () => {
    setShowConfirm(false);
    try {
      setLoading(true);
      setError('');
      await reservaService.removerPeriodoInativoProfessor();
      addToast('Período inativo removido com sucesso', 'info');
      setPeriodo(null);
    } catch (err) {
      const msg = extractError(err, 'Erro ao remover período');
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const isAtivo = !!periodo;
  const diasBloqueados = periodo ? calcularDias(periodo.dataInicio, periodo.dataFim) : 0;

  return (
    <>
      {showConfirm && (
        <ConfirmModal
          onConfirm={handleRemover}
          onCancel={() => setShowConfirm(false)}
        />
      )}

      <div className="overflow-hidden rounded-[32px] border border-brand-teal/10 bg-white/90 shadow-panel">

        {/* ── Hero header ──────────────────────────────────────────────── */}
        <div className="relative overflow-hidden bg-gradient-to-br from-brand-teal via-brand-teal/90 to-brand-ink px-8 py-10">
          {/* decorative circles */}
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/5" />
          <div className="pointer-events-none absolute -bottom-10 -left-10 h-48 w-48 rounded-full bg-white/5" />

          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-5">
              <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
                {isAtivo
                  ? <Lock className="h-7 w-7 text-white" />
                  : <LockOpen className="h-7 w-7 text-white/80" />
                }
              </div>
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
                    Administração
                  </span>
                  <span className="text-white/30">·</span>
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                    isAtivo ? 'bg-rose-500/20 text-rose-200' : 'bg-emerald-500/20 text-emerald-300'
                  }`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${isAtivo ? 'bg-rose-400 animate-pulse' : 'bg-emerald-400'}`} />
                    {isAtivo ? 'Bloqueio ativo' : 'Liberado'}
                  </span>
                </div>
                <h1 className="text-2xl font-bold text-white">Bloqueio Temporário de Reservas</h1>
                <p className="mt-1 max-w-lg text-sm leading-6 text-white/60">
                  Defina um intervalo de datas em que o perfil "Professor" não poderá realizar reservas de salas.
                </p>
              </div>
            </div>

            {!showForm && (
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="flex flex-shrink-0 items-center gap-2 rounded-2xl bg-white/15 px-5 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/25"
              >
                <CalendarRange className="h-4 w-4" />
                {isAtivo ? 'Editar período' : 'Definir período'}
              </button>
            )}
          </div>
        </div>

        <div className="p-8 space-y-6">

          {/* Erro */}
          {error && (
            <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {/* ── Período ativo ──────────────────────────────────────────── */}
          {isAtivo && !showForm && (
            <div className="overflow-hidden rounded-[24px] border border-rose-200 bg-gradient-to-br from-rose-50 to-orange-50">
              {/* barra de alerta topo */}
              <div className="flex items-center gap-3 border-b border-rose-100 bg-rose-100/60 px-6 py-3">
                <span className="flex h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-rose-700">
                  Período de bloqueio configurado
                </p>
              </div>

              <div className="p-6">
                {/* Timeline visual */}
                <div className="flex items-center gap-4">
                  {/* Data início */}
                  <div className="flex-1 rounded-2xl border border-rose-200 bg-white p-4 text-center shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Início</p>
                    <p className="mt-1 text-lg font-bold text-brand-ink">{formatarData(periodo!.dataInicio)}</p>
                  </div>

                  {/* Seta central com contagem */}
                  <div className="flex flex-col items-center gap-1">
                    <div className="h-px w-10 bg-rose-300" />
                    <span className="rounded-full bg-rose-500 px-2.5 py-0.5 text-xs font-bold text-white">
                      {diasBloqueados}d
                    </span>
                    <div className="h-px w-10 bg-rose-300" />
                  </div>

                  {/* Data fim */}
                  <div className="flex-1 rounded-2xl border border-rose-200 bg-white p-4 text-center shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Término</p>
                    <p className="mt-1 text-lg font-bold text-brand-ink">{formatarData(periodo!.dataFim)}</p>
                  </div>
                </div>

                <p className="mt-4 text-center text-sm text-muted-foreground">
                  {diasBloqueados === 1
                    ? 'Apenas 1 dia bloqueado.'
                    : `${diasBloqueados} dias consecutivos bloqueados para novas reservas de professores.`}
                </p>

                {/* Ações */}
                <div className="mt-6 flex flex-wrap gap-3 justify-end">
                  <Button
                    variant="outline"
                    className="border-rose-200 text-rose-600 hover:bg-rose-50"
                    disabled={loading}
                    onClick={() => setShowConfirm(true)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Remover bloqueio
                  </Button>
                  <Button
                    className="bg-brand-teal text-white hover:bg-brand-teal/90"
                    onClick={() => {
                      setFormData({
                        dataInicio: periodo!.dataInicio.split('T')[0],
                        dataFim: periodo!.dataFim.split('T')[0],
                      });
                      setShowForm(true);
                    }}
                  >
                    Editar período
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ── Nenhum período ─────────────────────────────────────────── */}
          {!isAtivo && !showForm && (
            <div className="flex flex-col items-center justify-center rounded-[24px] border border-dashed border-brand-teal/20 bg-brand-mist/10 px-6 py-16 text-center">
              <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100">
                <LockOpen className="h-7 w-7 text-emerald-600" />
              </div>
              <h3 className="text-lg font-bold text-brand-ink">Reservas liberadas</h3>
              <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                Nenhum período de bloqueio está ativo. Professores podem realizar reservas normalmente.
              </p>
              <Button
                onClick={() => setShowForm(true)}
                className="mt-6 bg-brand-teal text-white hover:bg-brand-teal/90"
              >
                <CalendarRange className="mr-2 h-4 w-4" />
                Configurar bloqueio
              </Button>
            </div>
          )}

          {/* ── Formulário ─────────────────────────────────────────────── */}
          {showForm && (
            <form onSubmit={handleSalvar} className="overflow-hidden rounded-[24px] border border-brand-teal/15 bg-brand-teal/5">
              <div className="flex items-center justify-between border-b border-brand-teal/10 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-teal/15">
                    <CalendarRange className="h-4 w-4 text-brand-teal" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-brand-ink">
                      {isAtivo ? 'Editar período de bloqueio' : 'Novo período de bloqueio'}
                    </p>
                    <p className="text-xs text-muted-foreground">Defina a data de início e término</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setFormData({ dataInicio: '', dataFim: '' }); setError(''); }}
                  className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground hover:bg-brand-teal/10 hover:text-brand-ink transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-6 space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Data de início</span>
                    <input
                      type="date"
                      value={formData.dataInicio}
                      onChange={(e) => setFormData({ ...formData, dataInicio: e.target.value })}
                      className="h-12 w-full rounded-2xl border border-brand-teal/20 bg-white px-4 text-sm text-brand-ink shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-teal/30"
                      required
                    />
                  </label>
                  <label className="grid gap-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Data de término</span>
                    <input
                      type="date"
                      value={formData.dataFim}
                      onChange={(e) => setFormData({ ...formData, dataFim: e.target.value })}
                      className="h-12 w-full rounded-2xl border border-brand-teal/20 bg-white px-4 text-sm text-brand-ink shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-teal/30"
                      required
                    />
                  </label>
                </div>

                {/* Prévia da duração */}
                {formData.dataInicio && formData.dataFim && formData.dataFim >= formData.dataInicio && (
                  <div className="flex items-center gap-3 rounded-2xl border border-brand-teal/15 bg-white px-4 py-3">
                    <CalendarRange className="h-4 w-4 flex-shrink-0 text-brand-teal" />
                    <p className="text-sm text-muted-foreground">
                      Duração: <span className="font-semibold text-brand-ink">
                        {calcularDias(formData.dataInicio, formData.dataFim)} dia{calcularDias(formData.dataInicio, formData.dataFim) !== 1 ? 's' : ''}
                      </span> bloqueado{calcularDias(formData.dataInicio, formData.dataFim) !== 1 ? 's' : ''}.
                    </p>
                  </div>
                )}

                <div className="flex flex-wrap gap-3">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="flex-1 sm:flex-initial bg-brand-teal text-white hover:bg-brand-teal/90"
                  >
                    <Check className="mr-2 h-4 w-4" />
                    {loading ? 'Salvando...' : 'Salvar bloqueio'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={loading}
                    onClick={() => { setShowForm(false); setFormData({ dataInicio: '', dataFim: '' }); setError(''); }}
                    className="flex-1 sm:flex-initial"
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
