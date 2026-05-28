import { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { BarChart2, Loader2, PieChart as PieIcon, TrendingUp } from 'lucide-react';
import { relatorioService, type MetricasResult } from '../services/relatorioService';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

// ── Paleta de cores ───────────────────────────────────────────────────────────
const COR_APROVADA = '#22c55e';
const COR_AGUARDANDO = '#eab308';
const COR_REJEITADA = '#ef4444';
const COR_CANCELADA = '#94a3b8';

const STATUS_CORES: Record<string, string> = {
  APROVADA: COR_APROVADA,
  AGUARDANDO: COR_AGUARDANDO,
  REJEITADA: COR_REJEITADA,
  CANCELADA: COR_CANCELADA,
};

const SALAS_CORES = ['#0d9488', '#7c3aed', '#2563eb', '#ea580c', '#16a34a', '#db2777', '#ca8a04'];

function statusLabel(s: string) {
  if (s === 'APROVADA') return 'Aprovada';
  if (s === 'REJEITADA') return 'Rejeitada';
  if (s === 'CANCELADA') return 'Cancelada';
  if (s === 'AGUARDANDO') return 'Aguardando';
  return s;
}

// ── Componente principal ──────────────────────────────────────────────────────
export function DashboardMetricasPage() {
  const [dados, setDados] = useState<MetricasResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    relatorioService
      .buscarMetricas()
      .then(setDados)
      .catch(() => setErro('Erro ao carregar métricas. Tente novamente.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-10 w-10 animate-spin text-brand-teal" />
      </div>
    );
  }

  if (erro) {
    return (
      <div className="p-6">
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">{erro}</div>
      </div>
    );
  }

  if (!dados) return null;

  return (
    <div className="space-y-8 p-6">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard de Métricas</h1>
        <p className="text-sm text-gray-500">
          Indicadores operacionais e acadêmicos para acompanhamento gerencial
        </p>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <ResumoCard
          label="Total de Reservas"
          value={dados.totalGeral}
          color="text-brand-teal"
          bg="bg-teal-50"
        />
        <ResumoCard
          label="Taxa de Aprovação"
          value={`${dados.taxaAprovacao}%`}
          color="text-green-600"
          bg="bg-green-50"
        />
        <ResumoCard
          label="Salas Utilizadas"
          value={dados.reservasPorSala.length}
          color="text-violet-600"
          bg="bg-violet-50"
        />
        <ResumoCard
          label="Professores Ativos"
          value={dados.reservasPorProfessor.length}
          color="text-blue-600"
          bg="bg-blue-50"
        />
      </div>

      {/* Linha: evolução mensal */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4 text-brand-teal" />
            Evolução de Reservas por Mês
          </CardTitle>
        </CardHeader>
        <CardContent>
          {dados.reservasPorMes.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">Sem dados suficientes para exibir.</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dados.reservasPorMes} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="aprovadas" name="Aprovadas" stroke={COR_APROVADA} strokeWidth={2} dot />
                <Line type="monotone" dataKey="aguardando" name="Aguardando" stroke={COR_AGUARDANDO} strokeWidth={2} dot />
                <Line type="monotone" dataKey="rejeitadas" name="Rejeitadas" stroke={COR_REJEITADA} strokeWidth={2} dot />
                <Line type="monotone" dataKey="canceladas" name="Canceladas" stroke={COR_CANCELADA} strokeWidth={2} dot />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Barras: reservas por sala + Pizza: por status */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Barras por sala */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart2 className="h-4 w-4 text-brand-teal" />
              Reservas por Sala / Espaço
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dados.reservasPorSala.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">Sem dados.</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={dados.reservasPorSala.slice(0, 10)}
                  layout="vertical"
                  margin={{ top: 0, right: 20, left: 10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis dataKey="sala" type="category" tick={{ fontSize: 11 }} width={100} />
                  <Tooltip />
                  <Bar dataKey="total" name="Reservas" radius={[0, 4, 4, 0]}>
                    {dados.reservasPorSala.slice(0, 10).map((_, index) => (
                      <Cell key={index} fill={SALAS_CORES[index % SALAS_CORES.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Pizza por status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <PieIcon className="h-4 w-4 text-brand-teal" />
              Distribuição por Status
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            {dados.reservasPorStatus.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">Sem dados.</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={dados.reservasPorStatus}
                      dataKey="total"
                      nameKey="status"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      label={({ status, percent }) =>
                        `${statusLabel(status as string)} ${(percent * 100).toFixed(1)}%`
                      }
                      labelLine={false}
                    >
                      {dados.reservasPorStatus.map((entry, index) => (
                        <Cell
                          key={index}
                          fill={STATUS_CORES[entry.status] ?? SALAS_CORES[index % SALAS_CORES.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v, name) => [v, statusLabel(name as string)]} />
                  </PieChart>
                </ResponsiveContainer>

                {/* Legenda manual */}
                <div className="mt-2 flex flex-wrap justify-center gap-3">
                  {dados.reservasPorStatus.map((entry) => (
                    <div key={entry.status} className="flex items-center gap-1.5 text-xs">
                      <span
                        className="inline-block h-3 w-3 rounded-full"
                        style={{ backgroundColor: STATUS_CORES[entry.status] ?? '#94a3b8' }}
                      />
                      {statusLabel(entry.status)}: <strong>{entry.total}</strong>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Barras: top professores */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart2 className="h-4 w-4 text-brand-teal" />
            Top 10 Professores por Número de Reservas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {dados.reservasPorProfessor.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">Sem dados.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={dados.reservasPorProfessor} margin={{ top: 5, right: 20, left: 0, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="professor" tick={{ fontSize: 11, angle: -30, textAnchor: 'end' }} interval={0} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="total" name="Reservas" fill="#0d9488" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Card de resumo ────────────────────────────────────────────────────────────
function ResumoCard({
  label,
  value,
  color,
  bg,
}: {
  label: string;
  value: string | number;
  color: string;
  bg: string;
}) {
  return (
    <div className={`rounded-xl p-4 ${bg} flex flex-col items-center text-center`}>
      <span className={`text-3xl font-bold ${color}`}>{value}</span>
      <span className="mt-1 text-xs font-medium text-gray-600">{label}</span>
    </div>
  );
}
