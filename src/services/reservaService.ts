import { api } from './api';

export type ReservaStatus = 'AGUARDANDO' | 'APROVADA' | 'REJEITADA' | 'CANCELADA';

export interface PeriodoInativoProfessor {
  chave: string;
  dataInicio: string;
  dataFim: string;
  createdAt: string;
  updatedAt: string;
}

export interface Reserva {
  id: string;
  professorId: string;
  classId?: string;
  salaId: string;
  data: string;
  horario: string;
  horarioInicio?: string;
  horarioFim?: string;
  turma?: string;
  periodo?: string;
  semestre?: string;
  serieId?: string;
  serieTotal?: number;
  serieOrdem?: number;
  status: ReservaStatus;
  justificativa?: string;
  createdAt: string;
  professorNome?: string;
  salaNome?: string;
}

export interface CriarReservaPayload {
  classId: string;
  data: string;
  horarioInicio: string;
  horarioFim: string;
  turma: string;
  ignorarConflitos?: boolean;
}

export interface CriarReservasSemestreResponse {
  reservas: Reserva[];
  total: number;
  semestre: string;
  datasIgnoradas: Array<{
    data: string;
    motivo: string;
  }>;
}

export const reservaService = {
  criar: async (payload: CriarReservaPayload): Promise<Reserva> => {
    const { data } = await api.post<Reserva>('/reservas', payload);
    return data;
  },

  criarSemestre: async (payload: CriarReservaPayload): Promise<CriarReservasSemestreResponse> => {
    const { data } = await api.post<CriarReservasSemestreResponse>('/reservas/semestre', {
      ...payload,
      dataInicial: payload.data,
    });
    return data;
  },

  listarTodas: async (): Promise<Reserva[]> => {
    const { data } = await api.get<Reserva[]>('/reservas');
    return data;
  },

  listarPorProfessor: async (): Promise<Reserva[]> => {
    const { data } = await api.get<Reserva[]>('/reservas/minhas');
    return data;
  },

  aprovar: async (id: string): Promise<Reserva> => {
    const { data } = await api.patch<Reserva>(`/reservas/${id}/aprovar`);
    return data;
  },

  aprovarSerie: async (serieId: string): Promise<Reserva[]> => {
    const { data } = await api.patch<Reserva[]>(`/reservas/serie/${serieId}/aprovar`);
    return data;
  },

  rejeitar: async (id: string, justificativa: string): Promise<Reserva> => {
    const { data } = await api.patch<Reserva>(`/reservas/${id}/rejeitar`, { justificativa });
    return data;
  },

  cancelar: async (id: string): Promise<Reserva> => {
    const { data } = await api.patch<Reserva>(`/reservas/${id}/cancelar`);
    return data;
  },

  obterPeriodoInativoProfessor: async (): Promise<PeriodoInativoProfessor | null> => {
    try {
      const { data } = await api.get<PeriodoInativoProfessor | null>('/reservas/periodo-inativo-professor');
      return data;
    } catch {
      return null;
    }
  },

  definirPeriodoInativoProfessor: async (dataInicio: string, dataFim: string): Promise<PeriodoInativoProfessor> => {
    const { data } = await api.put<PeriodoInativoProfessor>('/reservas/periodo-inativo-professor', {
      dataInicio,
      dataFim,
    });
    return data;
  },

  removerPeriodoInativoProfessor: async (): Promise<void> => {
    await api.delete('/reservas/periodo-inativo-professor');
  },
};
