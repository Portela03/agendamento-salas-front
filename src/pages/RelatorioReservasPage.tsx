import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  FileDown,
  FileText,
  Filter,
  Loader2,
  Printer,
  XCircle,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { relatorioService, type RelatorioReservaItem, type RelatorioTotais } from '../services/relatorioService';
import { listClassesPaginated } from '../services/classService';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Select } from '../components/ui/select';

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

function exportarCSV(reservas: RelatorioReservaItem[], totais: RelatorioTotais) {
  const header = ['#', 'Professor', 'Sala', 'Data', 'Horario', 'Turma', 'Semestre', 'Status'];
  const rows = reservas.map((r, i) => [
    i + 1,
    r.professorNome,
    r.salaNome,
    formatDate(r.data),
    `${r.horarioInicio} - ${r.horarioFim}`,
    r.turma || '-',
    r.semestre,
    statusLabel(r.status),
  ]);
  const totaisRow = ['', '', '', '', '', '', 'TOTAIS',
    `Total: ${totais.total} | Aprovadas: ${totais.aprovadas} | Aguardando: ${totais.aguardando} | Rejeitadas: ${totais.rejeitadas} | Canceladas: ${totais.canceladas}`];
  const csvContent = [header, ...rows, [], totaisRow]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `relatorio-reservas-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportarPDF(reservas: RelatorioReservaItem[], totais: RelatorioTotais, semestre: string, status: string) {
  const doc = new jsPDF({ orientation: 'landscape' });
  doc.setFontSize(16);
  doc.text('Relatorio de Reservas', 14, 16);
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(
    `Gerado em ${new Date().toLocaleString('pt-BR')}${semestre ? '  Semestre: ' + semestre : ''}${status ? '  Status: ' + statusLabel(status) : ''}`,
    14, 22,
  );
  autoTable(doc, {
    startY: 28,
    head: [['#', 'Professor', 'Sala', 'Data', 'Horario', 'Turma', 'Semestre', 'Status']],
    body: reservas.map((r, i) => [
      i + 1, r.professorNome, r.salaNome, formatDate(r.data),
      `${r.horarioInicio} - ${r.horarioFim}`, r.turma || '-', r.semestre, statusLabel(r.status),
    ]),
    foot: [[
      { content: `Total Geral: ${totais.total}`, colSpan: 2, styles: { fontStyle: 'bold' } },
      { content: `Aprovadas: ${totais.aprovadas}`, styles: { textColor: [22, 163, 74] } },
      { content: `Aguardando: ${totais.aguardando}`, styles: { textColor: [161, 98, 7] } },
      { content: `Rejeitadas: ${totais.rejeitadas}`, styles: { textColor: [220, 38, 38] } },
      { content: `Canceladas: ${totais.canceladas}`, colSpan: 3, styles: { textColor: [100, 116, 139] } },
    ]],
    styles: { fontSize: 8 },
    headStyles: { fillColor: [13, 148, 136] },
    footStyles: { fillColor: [240, 253, 250], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [249, 250, 251] },
  });
  doc.save(`relatorio-reservas-${new Date().toISOString().slice(0, 10)}.pdf`);
}

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
      setErro('Erro ao carregar relatorio. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [semestre, status, classId]);

  useEffect(() => {
    buscar();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Relatorio de Reservas</h1>
          <p className="text-sm text-gray-500">Listagem completa das reservas com totalizacao consolidada</p>
        </div>
        {buscado && totais && (
          <div className="flex flex-wrap gap-2 print:hidden">
            <Button variant="outline" onClick={() => exportarCSV(reservas, totais)} className="gap-2">
              <FileDown className="h-4 w-4" />Exportar CSV
            </Button>
            <Button variant="outline" onClick={() => exportarPDF(reservas, totais, semestre, status)} className="gap-2">
              <FileText className="h-4 w-4" />Exportar PDF
            </Button>
            <Button onClick={() => window.print()} className="gap-2">
              <Printer className="h-4 w-4" />Imprimir
            </Button>
          </div>
        )}
      </div>

      <Card className="print:hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="h-4 w-4" />Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="min-w-[160px] flex-1">
              <label className="mb-1 block text-xs font-medium text-gray-600">Semestre</label>
              <input type="text" placeholder="Ex: 2026.1" value={semestre}
                onChange={(e) => setSemestre(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal" />
            </div>
            <div className="min-w-[160px] flex-1">
              <label className="mb-1 block text-xs font-medium text-gray-600">Status</label>
              <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                {STATUS_OPTIONS.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
              </Select>
            </div>
            <div className="min-w-[200px] flex-1">
              <label className="mb-1 block text-xs font-medium text-gray-600">Sala / Espaco</label>
              <Select value={classId} onChange={(e) => setClassId(e.target.value)}>
                <option value=''>Todas as salas</option>
                {salas.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
              </Select>
            </div>
            <Button onClick={buscar} disabled={loading} className="gap-2 shrink-0">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Filter className="h-4 w-4" />}
              Aplicar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {erro && (<div className="rounded-md bg-red-50 p-4 text-sm text-red-700">{erro}</div>)}

      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-brand-teal" />
        </div>
      )}

      {buscado && !loading && !erro && (
        <div ref={printRef} className="space-y-4">
          <div className="hidden print:block mb-6">
            <h1 className="text-xl font-bold">Relatorio de Reservas</h1>
            <p className="text-sm text-gray-500">
              Gerado em {new Date().toLocaleString('pt-BR')}
              {semestre && ` - Semestre: ${semestre}`}
              {status && ` - Status: ${statusLabel(status)}`}
            </p>
            <hr className="mt-2" />
          </div>

          {totais && (
            <Card className="border-2 border-brand-teal/30 bg-brand-teal/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-brand-teal">Totalizacao Consolidada</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                  <TotalCard label="Total Geral" value={totais.total} colorClass="bg-gray-100 text-gray-800" icon={<Clock className="h-5 w-5" />} />
                  <TotalCard label="Aprovadas" value={totais.aprovadas} colorClass="bg-green-50 text-green-700" icon={<CheckCircle2 className="h-5 w-5" />} />
                  <TotalCard label="Aguardando" value={totais.aguardando} colorClass="bg-yellow-50 text-yellow-700" icon={<Clock className="h-5 w-5" />} />
                  <TotalCard label="Rejeitadas" value={totais.rejeitadas} colorClass="bg-red-50 text-red-700" icon={<XCircle className="h-5 w-5" />} />
                  <TotalCard label="Canceladas" value={totais.canceladas} colorClass="bg-gray-50 text-gray-600" icon={<XCircle className="h-5 w-5" />} />
                </div>
              </CardContent>
            </Card>
          )}

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
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">Horario</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">Turma</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">Semestre</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {reservas.length === 0 ? (
                      <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Nenhuma reserva encontrada com os filtros aplicados.</td></tr>
                    ) : (
                      reservas.map((r, i) => (
                        <tr key={r.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                          <td className="px-4 py-3 font-medium text-gray-900">{r.professorNome}</td>
                          <td className="px-4 py-3 text-gray-700">{r.salaNome}</td>
                          <td className="px-4 py-3 text-gray-700">{formatDate(r.data)}</td>
                          <td className="px-4 py-3 text-gray-700">{r.horarioInicio} - {r.horarioFim}</td>
                          <td className="px-4 py-3 text-gray-700">{r.turma || '-'}</td>
                          <td className="px-4 py-3 text-gray-700">{r.semestre}</td>
                          <td className="px-4 py-3"><Badge variant={statusVariant(r.status)}>{statusLabel(r.status)}</Badge></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function TotalCard({ label, value, colorClass, icon }: { label: string; value: number; colorClass: string; icon: React.ReactNode }) {
  return (
    <div className={`flex flex-col items-center rounded-xl p-4 ${colorClass}`}>
      {icon}
      <span className="mt-1 text-2xl font-bold">{value}</span>
      <span className="mt-0.5 text-center text-xs font-medium">{label}</span>
    </div>
  );
}
