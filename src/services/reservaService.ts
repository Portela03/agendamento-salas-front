import { api } from './api';

export type ReservaStatus = 'AGUARDANDO' | 'APROVADA' | 'REJEITADA';

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
};
