import { api } from './api';

export interface RelatorioReservaItem {
  id: string;
  professorNome: string;
  salaNome: string;
  data: string;
  horarioInicio: string;
  horarioFim: string;
  turma: string;
  semestre: string;
  periodo: string;
  status: string;
  justificativa?: string | null;
  criadoEm: string;
}

export interface RelatorioTotais {
  total: number;
  aprovadas: number;
  aguardando: number;
  rejeitadas: number;
  canceladas: number;
}

export interface RelatorioReservasResult {
  reservas: RelatorioReservaItem[];
  totais: RelatorioTotais;
  filtros: Record<string, string | undefined>;
}

export interface ReservasPorMes {
  mes: string;
  aprovadas: number;
  rejeitadas: number;
  aguardando: number;
  canceladas: number;
  total: number;
}

export interface ReservasPorSala {
  sala: string;
  tipo: string;
  total: number;
}

export interface ReservasPorStatus {
  status: string;
  total: number;
}

export interface ReservasPorProfessor {
  professor: string;
  total: number;
}

export interface MetricasResult {
  reservasPorMes: ReservasPorMes[];
  reservasPorSala: ReservasPorSala[];
  reservasPorStatus: ReservasPorStatus[];
  reservasPorProfessor: ReservasPorProfessor[];
  taxaAprovacao: number;
  totalGeral: number;
}

export const relatorioService = {
  gerarRelatorioReservas: async (filtros: {
    semestre?: string;
    status?: string;
    classId?: string;
  }): Promise<RelatorioReservasResult> => {
    const params = new URLSearchParams();
    if (filtros.semestre) params.set('semestre', filtros.semestre);
    if (filtros.status) params.set('status', filtros.status);
    if (filtros.classId) params.set('classId', filtros.classId);
    const { data } = await api.get<RelatorioReservasResult>(`/relatorio/reservas?${params.toString()}`);
    return data;
  },

  buscarMetricas: async (): Promise<MetricasResult> => {
    const { data } = await api.get<MetricasResult>('/relatorio/metricas');
    return data;
  },
};
