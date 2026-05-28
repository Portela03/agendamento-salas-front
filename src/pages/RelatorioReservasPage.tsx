import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Download,
  Filter,
  Loader2,
  XCircle,
} from 'lucide-react';
import { relatorioService, type RelatorioReservaItem, type RelatorioTotais } from '../services/relatorioService';
import { listClassesPaginated } from '../services/classService';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Select } from '../components/ui/select';

// ── Helpers ───────────────────────────────────────────────────────────────────
const STATUS_OPTIONS = [
  { value: '', label: 'Todos os status' },
  { value: 'AGUARDANDO', label: 'Aguardando' },
  { value: 'APROVADA', label: 'Aprovada' },
  { value: 'REJEITADA', label: 'Rejeitada' },
  { value: 'CANCELADA', label: 'Cancelada' },
];

function statusLabel(s: string) {
  if (s === 'APROVADA') return 'Aprovada';
  if (s === 'REJEITADA') return 'Rejeitada';
  if (s === 'CANCELADA') return 'Cancelada';
  return 'Aguardando';
}

function statusVariant(s: string): 'approved' | 'rejected' | 'waiting' | 'default' {
  if (s === 'APROVADA') return 'approved';
  if (s === 'REJEITADA') return 'rejected';
  if (s === 'CANCELADA') return 'default';
  return 'waiting';
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR');
}

// ── Componente ────────────────────────────────────────────────────────────────
export function RelatorioReservasPage() {
  const [semestre, setSemestre] = useState('');
  const [status, setStatus] = useState('');
  const [classId, setClassId] = useState('');
  const [salas, setSalas] = useState<{ id: string; name: string }[]>([]);
  const [reservas, setReservas] = useState<RelatorioReservaItem[]>([]);
  const [totais, setTotais] = useState<RelatorioTotais | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [buscado, setBuscado] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Carrega lista de salas para o filtro
  useEffect(() => {
    listClassesPaginated(false, 1, 200).then((r) => setSalas(r.data)).catch(() => {});
  }, []);

  const buscar = useCallback(async () => {
    setLoading(true);
    setErro('');
    setBuscado(true);
    try {
      const resultado = await relatorioService.gerarRelatorioReservas({ semestre, status, classId });
      setReservas(resultado.reservas);
      setTotais(resultado.totais);
    } catch {
      setErro('Erro ao carregar relatório. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [semestre, status, classId]);

  // Carrega automaticamente na montagem
  useEffect(() => {
    buscar();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 p-6">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Relatório de Reservas</h1>
          <p className="text-sm text-gray-500">
            Listagem completa das reservas com totalização consolidada
          </p>
        </div>
        <Button onClick={handlePrint} className="gap-2 print:hidden">
          <Download className="h-4 w-4" />
          Imprimir / Exportar
        </Button>
      </div>

      {/* Filtros */}
      <Card className="print:hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="h-4 w-4" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="min-w-[160px] flex-1">
              <label className="mb-1 block text-xs font-medium text-gray-600">Semestre</label>
              <input
                type="text"
                placeholder="Ex: 2026.1"
                value={semestre}
                onChange={(e) => setSemestre(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal"
              />
            </div>

            <div className="min-w-[160px] flex-1">
              <label className="mb-1 block text-xs font-medium text-gray-600">Status</label>
              <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </Select>
            </div>

            <div className="min-w-[200px] flex-1">
              <label className="mb-1 block text-xs font-medium text-gray-600">Sala / Espaço</label>
              <Select value={classId} onChange={(e) => setClassId(e.target.value)}>
                <option value=''>Todas as salas</option>
                {salas.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </Select>
            </div>

            <Button onClick={buscar} disabled={loading} className="gap-2 shrink-0">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Filter className="h-4 w-4" />}
              Aplicar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Erro */}
      {erro && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">{erro}</div>
      )}

      {/* Área imprimível */}
      {buscado && !loading && !erro && (
        <div ref={printRef} className="space-y-4">
          {/* Cabeçalho do relatório (visível na impressão) */}
          <div className="hidden print:block mb-6">
            <h1 className="text-xl font-bold">Relatório de Reservas</h1>
            <p className="text-sm text-gray-500">
              Gerado em {new Date().toLocaleString('pt-BR')}
              {semestre && ` • Semestre: ${semestre}`}
              {status && ` • Status: ${statusLabel(status)}`}
            </p>
            <hr className="mt-2" />
          </div>

          {/* Tabela */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">#</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">Professor</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">Sala</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">Data</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">Horário</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">Turma</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">Semestre</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {reservas.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                          Nenhuma reserva encontrada com os filtros aplicados.
                        </td>
                      </tr>
                    ) : (
                      reservas.map((r, i) => (
                        <tr key={r.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                          <td className="px-4 py-3 font-medium text-gray-900">{r.professorNome}</td>
                          <td className="px-4 py-3 text-gray-700">{r.salaNome}</td>
                          <td className="px-4 py-3 text-gray-700">{formatDate(r.data)}</td>
                          <td className="px-4 py-3 text-gray-700">
                            {r.horarioInicio} – {r.horarioFim}
                          </td>
                          <td className="px-4 py-3 text-gray-700">{r.turma || '—'}</td>
                          <td className="px-4 py-3 text-gray-700">{r.semestre}</td>
                          <td className="px-4 py-3">
                            <Badge variant={statusVariant(r.status)}>{statusLabel(r.status)}</Badge>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Totalização */}
          {totais && (
            <Card className="border-2 border-brand-teal/30 bg-brand-teal/5">
              <CardHeader>
                <CardTitle className="text-base font-semibold text-brand-teal">
                  Totalização Consolidada
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
                  <TotalCard
                    label="Total Geral"
                    value={totais.total}
                    colorClass="bg-gray-100 text-gray-800"
                    icon={<Clock className="h-5 w-5" />}
                  />
                  <TotalCard
                    label="Aprovadas"
                    value={totais.aprovadas}
                    colorClass="bg-green-50 text-green-700"
                    icon={<CheckCircle2 className="h-5 w-5" />}
                  />
                  <TotalCard
                    label="Aguardando"
                    value={totais.aguardando}
                    colorClass="bg-yellow-50 text-yellow-700"
                    icon={<Clock className="h-5 w-5" />}
                  />
                  <TotalCard
                    label="Rejeitadas"
                    value={totais.rejeitadas}
                    colorClass="bg-red-50 text-red-700"
                    icon={<XCircle className="h-5 w-5" />}
                  />
                  <TotalCard
                    label="Canceladas"
                    value={totais.canceladas}
                    colorClass="bg-gray-50 text-gray-600"
                    icon={<XCircle className="h-5 w-5" />}
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Loading inicial */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-brand-teal" />
        </div>
      )}
    </div>
  );
}

// ── Sub-componente de totalização ─────────────────────────────────────────────
function TotalCard({
  label,
  value,
  colorClass,
  icon,
}: {
  label: string;
  value: number;
  colorClass: string;
  icon: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col items-center rounded-xl p-4 ${colorClass}`}>
      {icon}
      <span className="mt-1 text-2xl font-bold">{value}</span>
      <span className="mt-0.5 text-center text-xs font-medium">{label}</span>
    </div>
  );
}
