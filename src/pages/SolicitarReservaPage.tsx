import { FormEvent, ReactNode, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, LoaderCircle, Send } from 'lucide-react';

import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { api } from '../services/api';
import { listAvaiables, type ClassItem } from '../services/classService';

export function SolicitarReservaPage() {
  const navigate = useNavigate();

  const [classesDisponiveis, setClassesDisponiveis] = useState<ClassItem[]>([]);
  const [salaId, setSalaId] = useState('');
  const [data, setData] = useState('');
  const [horario, setHorario] = useState('');
  const [periodo, setPeriodo] = useState('');
  const [semestre, setSemestre] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    async function load() {
      try {
        setLoadingClasses(true);
        const result = await listAvaiables();
        setClassesDisponiveis(result);
      } catch {
        setError('Não foi possível carregar as classes disponíveis.');
      } finally {
        setLoadingClasses(false);
      }
    }

    void load();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!salaId) {
      setError('Selecione uma sala/classe.');
      return;
    }

    try {
      setIsSubmitting(true);

      const [year, month, day] = data.split('-').map(Number);
      const dataLocal = new Date(year, month - 1, day, 12, 0, 0);

      await api.post('/reservas', {
        classId: salaId,
        data: dataLocal.toISOString(),
        horario,
        periodo,
        semestre,
      });


      setSuccess('Solicitação enviada com sucesso.');
      setSalaId('');
      setData('');
      setHorario('');
      setPeriodo('');
      setSemestre('');
    } catch (err: any) {
      const serverMsg = err?.response?.data?.message;
      setError(serverMsg ?? 'Não foi possível enviar a solicitação agora.');
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
                Selecione a classe disponível e preencha os dados da solicitação.
              </p>
            </div>

            <Button variant="outline" onClick={() => navigate('/professor/dashboard')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <Field htmlFor="salaId" label="Classe">
              {loadingClasses ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Carregando classes...
                </div>
              ) : (
                <Select id="salaId" required value={salaId} onChange={(e) => setSalaId(e.target.value)}>
                  <option value="">Selecione uma classe</option>
                  {classesDisponiveis.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} — {c.type} — Capacidade: {c.capacity}
                    </option>
                  ))}
                </Select>
              )}
            </Field>

            <div className="grid gap-4 md:grid-cols-2">
              <Field htmlFor="data" label="Data">
                <Input id="data" type="date" required value={data} onChange={(e) => setData(e.target.value)} />
              </Field>

              <Field htmlFor="horario" label="Horário">
                <Input
                  id="horario"
                  type="time"
                  required
                  value={horario}
                  onChange={(e) => setHorario(e.target.value)}
                />
              </Field>

              <Field htmlFor="periodo" label="Período">
                <Input
                  id="periodo"
                  placeholder="Ex: Noturno"
                  required
                  value={periodo}
                  onChange={(e) => setPeriodo(e.target.value)}
                />
              </Field>

              <Field htmlFor="semestre" label="Semestre">
                <Input
                  id="semestre"
                  placeholder="Ex: 2026.1"
                  required
                  value={semestre}
                  onChange={(e) => setSemestre(e.target.value)}
                />
              </Field>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
            {success && <p className="text-sm text-green-600">{success}</p>}

            <Button
              className="group"
              disabled={isSubmitting || loadingClasses || classesDisponiveis.length === 0}
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