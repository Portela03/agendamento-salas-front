import { api } from './api';
import { UserData } from './authService';

export type UserRole = 'PROFESSOR' | 'COORDENADOR';
export type UserStatus = 'PENDENTE' | 'APROVADO';

export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface RegisterUserPayload {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface PendingUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
}

export interface CreateUserResponse {
  user: Omit<UserData, 'role'> & { role: UserRole; createdAt: string };
}

export interface RegisterUserResponse {
  user: Omit<UserData, 'role'> & { role: UserRole; status: 'PENDENTE'; createdAt: string };
}

/**
 * userService — encapsulates all /api/users calls.
 * Requires a valid COORDENADOR JWT (injected automatically by the api interceptor).
 */
export const userService = {
  create: async (payload: CreateUserPayload): Promise<CreateUserResponse> => {
    const { data } = await api.post<CreateUserResponse>('/users', payload);
    return data;
  },

  register: async (payload: RegisterUserPayload): Promise<RegisterUserResponse> => {
    const { data } = await api.post<RegisterUserResponse>('/users/register', payload);
    return data;
  },

  listPending: async (): Promise<{ users: PendingUser[] }> => {
    const { data } = await api.get<{ users: PendingUser[] }>('/users/pending');
    return data;
  },

  approve: async (userId: string): Promise<void> => {
    await api.patch(`/users/${userId}/approve`);
  },

  reject: async (userId: string): Promise<void> => {
    await api.delete(`/users/${userId}/reject`);
  },
};
