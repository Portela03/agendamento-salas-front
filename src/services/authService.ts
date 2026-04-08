import { api } from './api';

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
