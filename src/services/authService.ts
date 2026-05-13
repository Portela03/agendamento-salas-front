import { api } from './api';

export async function solicitarResetSenha(email: string) {
  const { data } = await api.post('/resetSenha/esqueceu-senha', { email });
  return data;
}

export async function confirmarResetSenha(token: string, novaSenha: string) {
  const { data } = await api.post('/resetSenha/reset-senha', {
    token,
    password: novaSenha,
  });
  return data;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface UserData {
  id: string;
  name: string;
  email: string;
  role: 'PROFESSOR' | 'COORDENADOR';
}

export interface LoginResponse {
  token: string;
  user: UserData;
}

export const authService = {
  login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
    const { data } = await api.post<LoginResponse>('/auth/login', credentials);
    return data;
  },
};
