import { useEffect, useState } from 'react';
import { Calendar, AlertTriangle, Check, Trash2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { PeriodoInativoProfessor, reservaService } from '../services/reservaService';
import { useToast } from '../components/Toast';

export function PeriodoInativoProfessorManager() {
  const { addToast } = useToast();
  const [periodo, setPeriodo] = useState<PeriodoInativoProfessor | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    dataInicio: '',
    dataFim: '',
  });

  const loadPeriodo = async () => {
    try {
      setLoading(true);
      setError('');
      const resultado = await reservaService.obterPeriodoInativoProfessor();
      setPeriodo(resultado);
    } catch (err) {
      // Extract error message from axios response if available
      let errorMsg = 'Erro ao carregar período inativo';
      if (typeof err === 'object' && err !== null) {
        const axiosErr = err as any;
        if (axiosErr.response?.data?.message) {
          errorMsg = axiosErr.response.data.message;
        } else if (err instanceof Error) {
          errorMsg = err.message;
        }
      }
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPeriodo();
  }, []);

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.dataInicio || !formData.dataFim) {
      setError('Preencha ambas as datas');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await reservaService.definirPeriodoInativoProfessor(formData.dataInicio, formData.dataFim);
      addToast('Período inativo atualizado com sucesso', 'info');
      setShowForm(false);
      setFormData({ dataInicio: '', dataFim: '' });
      await loadPeriodo();
    } catch (err) {
      // Extract error message from axios response if available
      let errorMsg = 'Erro ao salvar período';
      if (typeof err === 'object' && err !== null) {
        const axiosErr = err as any;
        if (axiosErr.response?.data?.message) {
          errorMsg = axiosErr.response.data.message;
        } else if (err instanceof Error) {
          errorMsg = err.message;
        }
      }
      setError(errorMsg);
      addToast(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRemover = async () => {
    if (!window.confirm('Deseja remover o período inativo? Professores voltarão a poder reservar salas.')) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      await reservaService.removerPeriodoInativoProfessor();
      addToast('Período inativo removido com sucesso', 'info');
      setPeriodo(null);
    } catch (err) {
      // Extract error message from axios response if available
      let errorMsg = 'Erro ao remover período';
      if (typeof err === 'object' && err !== null) {
        const axiosErr = err as any;
        if (axiosErr.response?.data?.message) {
          errorMsg = axiosErr.response.data.message;
        } else if (err instanceof Error) {
          errorMsg = err.message;
        }
      }
      setError(errorMsg);
      addToast(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString('pt-BR');
  };

  return (
    <Card className="rounded-tl-none border-brand-teal/10 bg-white/85">
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-brand-teal" />
            Bloqueio Temporário de Reservas
          </CardTitle>
          <CardDescription>
            Configure um intervalo de datas em que o perfil "Professor" não poderá realizar reservas de salas
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {error && (
          <div className="rounded-2xl border border-brand-wine/20 bg-brand-wine/5 px-4 py-3 text-sm text-brand-wine">
            {error}
          </div>
        )}

        {/* Exibição do período atual */}
        {periodo && !showForm && (
          <div className="rounded-2xl border border-brand-teal/15 bg-brand-teal/5 p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-brand-ink">Período ativo</h3>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col">
                    <span className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                      Data inicial
                    </span>
                    <span className="mt-1 font-semibold text-brand-ink">
                      {formatarData(periodo.dataInicio)}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                      Data final
                    </span>
                    <span className="mt-1 font-semibold text-brand-ink">
                      {formatarData(periodo.dataFim)}
                    </span>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <Badge className="bg-brand-wine/10 text-brand-wine" variant="subtle">
                    <AlertTriangle className="mr-1 h-3 w-3" />
                    Bloqueado
                  </Badge>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                onClick={() => setShowForm(true)}
                className="flex-1 sm:flex-initial bg-brand-teal text-white hover:bg-brand-teal/90"
              >
                Editar período
              </Button>
              <Button
                onClick={handleRemover}
                disabled={loading}
                className="flex-1 sm:flex-initial border-rose-200 text-rose-600 hover:bg-rose-50"
                variant="outline"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Remover
              </Button>
            </div>
          </div>
        )}

        {/* Mensagem de nenhum período definido */}
        {!periodo && !showForm && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-brand-teal/15 bg-brand-teal/5 px-6 py-12 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-teal/10 text-brand-teal">
              <Calendar className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-brand-ink">Nenhum período configurado</h3>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              Defina um intervalo de datas para bloquear reservas do perfil Professor.
            </p>
            <Button
              onClick={() => setShowForm(true)}
              className="mt-6 bg-brand-teal text-white hover:bg-brand-teal/90"
            >
              <Calendar className="mr-2 h-4 w-4" />
              Definir período
            </Button>
          </div>
        )}

        {/* Formulário */}
        {showForm && (
          <form onSubmit={handleSalvar} className="space-y-4 rounded-2xl border border-brand-teal/15 bg-brand-teal/5 p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-brand-ink">
                Data de início
                <input
                  type="date"
                  value={formData.dataInicio}
                  onChange={(e) => setFormData({ ...formData, dataInicio: e.target.value })}
                  className="h-12 w-full rounded-2xl border border-brand-teal/15 bg-white px-4 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-teal/40"
                  required
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-brand-ink">
                Data de término
                <input
                  type="date"
                  value={formData.dataFim}
                  onChange={(e) => setFormData({ ...formData, dataFim: e.target.value })}
                  className="h-12 w-full rounded-2xl border border-brand-teal/15 bg-white px-4 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-teal/40"
                  required
                />
              </label>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 sm:flex-initial bg-brand-teal text-white hover:bg-brand-teal/90"
              >
                <Check className="mr-2 h-4 w-4" />
                Salvar
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setFormData({ dataInicio: '', dataFim: '' });
                }}
                disabled={loading}
                className="flex-1 sm:flex-initial"
                variant="outline"
              >
                Cancelar
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
