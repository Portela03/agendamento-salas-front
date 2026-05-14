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
  salaId: string;
  data: string;
  horario: string;
  horarioInicio?: string;
  horarioFim?: string;
  turma?: string;
  periodo?: string;
  semestre?: string;
  status: ReservaStatus;
  justificativa?: string;
  createdAt: string;
  professorNome?: string;
  salaNome?: string;
}

export const reservaService = {
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
