import { api } from './api';

export interface Notificacao {
  id: string;
  userId: string;
  message: string;
  type:
    | 'NOVO_USUARIO'
    | 'USUARIO_APROVADO'
    | 'NOVA_RESERVA'
    | 'RESERVA_APROVADA'
    | 'RESERVA_REJEITADA';
  read: boolean;
  createdAt: string;
}

export const notificacaoService = {
  listar: async (): Promise<Notificacao[]> => {
    const { data } = await api.get<Notificacao[]>('/notificacoes');
    return data;
  },

  marcarTodasComoLidas: async (): Promise<void> => {
    await api.patch('/notificacoes/read-all');
  },

  deletar: async (id: string): Promise<void> => {
    await api.delete(`/notificacoes/${id}`);
  },
};
