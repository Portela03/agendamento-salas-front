import { useEffect, useState } from 'react';
import { AlertTriangle, ArrowLeft, LoaderCircle, RefreshCcw, Search, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Reserva, reservaService } from '../services/reservaService';
import { useAuth } from '../hooks/useAuth';

function statusLabel(status: string) {
  if (status === 'APROVADA') return 'Aprovada';
  if (status === 'REJEITADA') return 'Rejeitada';
  if (status === 'CANCELADA') return 'Cancelada';
  return 'Aguardando';
}

function statusVariant(status: string): 'approved' | 'rejected' | 'waiting' | 'default' {
  if (status === 'APROVADA') return 'approved';
  if (status === 'REJEITADA') return 'rejected';
  if (status === 'CANCELADA') return 'default';
  return 'waiting';
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('pt-BR');
}

function formatHorario(reserva: Reserva) {
  if (reserva.horarioInicio && reserva.horarioFim) {
    return `${reserva.horarioInicio} - ${reserva.horarioFim}`;
  }
  return reserva.horario ?? 'N/D';
}

function CancelarModal({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-[24px] border border-brand-wine/20 bg-white p-6 shadow-2xl high-contrast:border-yellow-400 high-contrast:bg-gray-900">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 high-contrast:bg-red-950 high-contrast:text-red-400">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-brand-ink high-contrast:text-yellow-400">Cancelar reserva</h2>
            <p className="text-sm text-muted-foreground high-contrast:text-gray-300">Tem certeza que deseja cancelar?</p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-6 high-contrast:text-gray-300">
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
          <Button className="flex-1 high-contrast:border-yellow-400 high-contrast:text-yellow-400 high-contrast:hover:bg-yellow-400/10" onClick={onCancel} variant="outline">
            Voltar
          </Button>
        </div>
      </div>
    </div>
  );
}

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
                  {isCoordenador ? 'Histórico de todas as reservas' : 'Histórico de reservas em uma visão clara e organizada.'}
                </h1>
                <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
                  Consulte as reservas já solicitadas, acompanhe o status e volte para o dashboard quando precisar abrir uma nova solicitação.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={() => navigate(isCoordenador ? '/coordenador/dashboard' : '/professor/dashboard')} variant="outline">
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
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-teal">Histórico de reservas</p>
                <CardTitle className="text-3xl text-brand-ink">Reservas já registradas</CardTitle>
                <CardDescription className="max-w-2xl">
                  Abaixo estão as solicitações enviadas para o sistema, organizadas para facilitar a consulta.
                </CardDescription>
              </div>

              <Button onClick={() => void loadReservas()} variant="secondary">
                <RefreshCcw className="mr-2 h-4 w-4" />
                Atualizar lista
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-6 md:p-8">
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

            {!isLoading && !error && reservas.length === 0 && (
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

            {!isLoading && !error && reservas.length > 0 && (
              <div className="grid gap-4">
                {reservas.map((reserva) => (
                  <div
                    key={reserva.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-[24px] border border-brand-teal/10 bg-gradient-to-r from-white to-brand-mist/20 p-5"
                  >
                    <div className="space-y-3 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-lg font-bold text-brand-ink">
                          Sala: {reserva.salaNome ?? reserva.salaId}
                        </h2>
                        <Badge variant={statusVariant(reserva.status ?? '')}>
                          {statusLabel(reserva.status ?? '')}
                        </Badge>
                      </div>

                      <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-3">
                        <p>
                          <span className="font-medium text-brand-ink">Data:</span>{' '}
                          {reserva.data ? formatDate(reserva.data) : 'N/D'}
                        </p>
                        <p>
                          <span className="font-medium text-brand-ink">Horário:</span>{' '}
                          {formatHorario(reserva)}
                        </p>
                        <p>
                          <span className="font-medium text-brand-ink">Turma:</span>{' '}
                          {reserva.turma ?? 'N/D'}
                        </p>
                      </div>

                      {reserva.justificativa && (
                        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                          <span className="font-semibold">Motivo da rejeição:</span>{' '}
                          {reserva.justificativa}
                        </div>
                      )}
                    </div>

                    {reserva.status !== 'CANCELADA' && reserva.status !== 'REJEITADA' && (
                      <div className="flex-shrink-0 mt-2 sm:mt-0">
                         <Button
                           variant="outline"
                           className="w-full sm:w-auto border-rose-200 text-rose-600 hover:bg-rose-50"
                           onClick={() => setCancelarReservaId(reserva.id)}
                         >
                           <XCircle className="mr-2 h-4 w-4" />
                           Cancelar Reserva
                         </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── Versão inline para uso dentro de abas ─────────────────────────────────────

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

  useEffect(() => { void loadReservas(); }, [isCoordenador]);

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
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-3xl text-brand-ink">Histórico de Reservas</CardTitle>
          <CardDescription className="mt-1">Consulte as reservas já solicitadas e acompanhe o status de cada uma.</CardDescription>
        </div>
        <Button onClick={() => void loadReservas()} variant="secondary">
          <RefreshCcw className="mr-2 h-4 w-4" />
          Atualizar lista
        </Button>
      </CardHeader>

      <CardContent className="space-y-4 p-6">
        {isLoading && (
          <div className="flex items-center gap-3 rounded-2xl border border-brand-teal/15 bg-brand-teal/5 px-4 py-3 text-sm text-brand-teal">
            <LoaderCircle className="h-4 w-4 animate-spin" /> Carregando histórico...
          </div>
        )}

        {success && !isLoading && (
          <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {success}
          </div>
        )}

        {error && !isLoading && (
          <div className="mb-4 rounded-2xl border border-brand-wine/20 bg-brand-wine/5 px-4 py-3 text-sm text-brand-wine">{error}</div>
        )}

        {!isLoading && !error && reservas.length === 0 && (
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

        {!isLoading && !error && reservas.length > 0 && (
          <div className="grid gap-4">
            {reservas.map((reserva) => (
              <div key={reserva.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-[24px] border border-brand-teal/10 bg-gradient-to-r from-white to-brand-mist/20 p-5">
                <div className="space-y-3 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-lg font-bold text-brand-ink">Sala: {reserva.salaNome ?? reserva.salaId}</h2>
                    <Badge variant={statusVariant(reserva.status ?? '')}>{statusLabel(reserva.status ?? '')}</Badge>
                  </div>
                  <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-3">
                    <p><span className="font-medium text-brand-ink">Data:</span>{' '}{reserva.data ? formatDate(reserva.data) : 'N/D'}</p>
                    <p><span className="font-medium text-brand-ink">Horário:</span>{' '}{formatHorario(reserva)}</p>
                    <p><span className="font-medium text-brand-ink">Turma:</span>{' '}{reserva.turma ?? 'N/D'}</p>
                  </div>
                  {reserva.justificativa && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                      <span className="font-semibold">Motivo da rejeição:</span>{' '}{reserva.justificativa}
                    </div>
                  )}
                </div>

                {reserva.status !== 'CANCELADA' && reserva.status !== 'REJEITADA' && (
                  <div className="flex-shrink-0 mt-2 sm:mt-0">
                     <Button
                       variant="outline"
                       className="w-full sm:w-auto border-rose-200 text-rose-600 hover:bg-rose-50"
                       onClick={() => setCancelarReservaId(reserva.id)}
                     >
                       <XCircle className="mr-2 h-4 w-4" />
                       Cancelar Reserva
                     </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
    </>
  );
}