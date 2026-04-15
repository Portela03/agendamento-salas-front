import { type FormEvent, type ReactNode, useState } from 'react';
import { ArrowLeft, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { api } from '../services/api';


export function SolicitarReservaPage() {
  const navigate = useNavigate();
  const [salaId, setSalaId] = useState('');
  const [data, setData] = useState('');
  const [horario, setHorario] = useState('');
  const [periodo, setPeriodo] = useState('');
  const [semestre, setSemestre] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      setIsSubmitting(true);


await api.post('/reservas', {
  salaId,
  data: new Date(data).toISOString(),
  horario,
  periodo,
  semestre,
});


      setSuccess('Solicitação enviada com sucesso. O pedido foi registrado para análise.');
      setSalaId('');
      setData('');
      setHorario('');
      setPeriodo('');
      setSemestre('');
    } catch {
      setError('Não foi possível enviar a solicitação agora. Verifique os campos e tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-transparent">
      <div className="container py-8">
        <div className="rounded-[32px] border border-brand-teal/10 bg-white/85 p-8 shadow-panel">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-4">
              <Badge className="w-fit" variant="default">
                Área do professor
              </Badge>
              <div>
                <h1 className="font-serif text-4xl leading-tight text-brand-ink md:text-5xl">
                  Solicite uma reserva com clareza e poucos passos.
                </h1>
                <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
                  Preencha os dados da sala, data e horário para registrar sua solicitação no fluxo institucional.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={() => navigate('/professor/dashboard')} variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar ao dashboard
              </Button>
            </div>
          </div>
        </div>

        <Card className="mt-8 overflow-hidden border-brand-teal/10 bg-white/90 shadow-panel">
          <div className="h-2 bg-gradient-to-r from-brand-wine via-brand-teal to-brand-wine" />

          <CardHeader className="border-b border-brand-teal/10 bg-gradient-to-r from-brand-mist/30 via-white to-brand-mist/20 pb-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-2">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-teal">Formulário de reserva</p>
                <CardTitle className="text-3xl text-brand-ink">Preencha os dados para registrar a solicitação</CardTitle>
                <CardDescription className="max-w-2xl">
                  A tela foi organizada para manter o fluxo direto, com hierarquia visual clara e foco no envio.
                </CardDescription>
              </div>

              <div className="rounded-full border border-brand-teal/10 bg-white px-4 py-2 text-sm text-brand-ink shadow-sm">
                Fluxo institucional
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6 md:p-8">
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Sala" htmlFor="salaId">
                  <Input
                    id="salaId"
                    placeholder="Ex.: 301"
                    required
                    value={salaId}
                    onChange={(event) => setSalaId(event.target.value)}
                  />
                </Field>

                <Field label="Data" htmlFor="data">
                  <Input
                    id="data"
                    required
                    type="date"
                    value={data}
                    onChange={(event) => setData(event.target.value)}
                  />
                </Field>

                <Field label="Horário" htmlFor="horario">
                  <Input
                    id="horario"
                    placeholder="Ex.: 19:00 - 21:00"
                    required
                    value={horario}
                    onChange={(event) => setHorario(event.target.value)}
                  />
                </Field>

                <Field label="Período" htmlFor="periodo">
                  <Select id="periodo" required value={periodo} onChange={(event) => setPeriodo(event.target.value)}>
                    <option value="">Selecione um período</option>
                    <option value="matutino">Matutino</option>
                    <option value="vespertino">Vespertino</option>
                    <option value="noturno">Noturno</option>
                  </Select>
                </Field>
              </div>

              <Field label="Semestre" htmlFor="semestre">
                <Input
                  id="semestre"
                  placeholder="Ex.: 2026/1"
                  required
                  value={semestre}
                  onChange={(event) => setSemestre(event.target.value)}
                />
              </Field>

              {error && (
                <div className="rounded-2xl border border-brand-wine/20 bg-brand-wine/5 px-4 py-3 text-sm text-brand-wine">
                  {error}
                </div>
              )}

              {success && (
                <div className="rounded-2xl border border-brand-teal/20 bg-brand-teal/5 px-4 py-3 text-sm text-brand-teal">
                  {success}
                </div>
              )}

              <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center">
                <Button className="group w-full sm:w-auto" disabled={isSubmitting} size="lg" type="submit">
                  {isSubmitting ? 'Enviando...' : 'Solicitar reserva'}
                  <Send className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Button>

                <Button className="w-full sm:w-auto" onClick={() => navigate('/professor/dashboard')} type="button" variant="outline">
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
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
