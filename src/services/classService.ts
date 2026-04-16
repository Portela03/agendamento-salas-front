import { api } from './api';

export type ClassType = 'LABORATORIO' | 'SALA' | 'AUDITORIO';
export type ClassStatus = 'DISPONIVEL' | 'INDISPONIVEL';

export type ClassItem = {
  id: string;
  name: string;
  description?: string | null;
  capacity: number;
  type: ClassType;
  status?: ClassStatus | null;
};

type ApiClass = Partial<ClassItem> & {
  id?: string | number;
  nome?: string;
};

type CreateClassPayload = {
  name: string;
  description?: string;
  capacity: number;
  type: ClassType;
};

type UpdateClassPayload = {
  name: string;
  description?: string;
  capacity: number;
  type: ClassType;
  status: ClassStatus;
};

const FIXED_TOKEN = 'token-fixo-coordenador';

function getAuthConfig() {
  const appToken = localStorage.getItem('@agendamento:token');
  return {
    headers: {
      Authorization: `Bearer ${appToken || FIXED_TOKEN}`,
    },
  };
}

function normalizeClass(item: ApiClass): ClassItem {
  return {
    id: String(item?.id ?? ''),
    name: String(item?.name ?? item?.nome ?? ''),
    description: item?.description ?? null,
    capacity: Number(item?.capacity ?? 0),
    type: (item?.type as ClassType) ?? 'SALA',
    status: (item?.status as ClassStatus) ?? null,
  };
}

function normalizeList(data: any): ClassItem[] {
  const raw = Array.isArray(data)
    ? data
    : Array.isArray(data?.classes)
    ? data.classes
    : Array.isArray(data?.class) // <- muitos backends retornam { class: [] }
    ? data.class
    : Array.isArray(data?.data)
    ? data.data
    : [];

  return raw.map((item: ApiClass) => normalizeClass(item));
}

async function getWithFallback(endpoints: string[]) {
  let lastError: unknown;
  for (const endpoint of endpoints) {
    try {
      return await api.get(endpoint, getAuthConfig());
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}


export async function listAvaiables(): Promise<ClassItem[]> {
  const { data } = await getWithFallback(['/class/avaiables', '/class/available']);
  return normalizeList(data);
}

export async function listClasses(onlyAvailable = false): Promise<ClassItem[]> {
  const endpoints = onlyAvailable
    ? ['/class/avaiables', '/class/available']
    : ['/class', '/class/listall', '/class/listAll'];

  const { data } = await getWithFallback(endpoints);
  return normalizeList(data);
}

export async function createClass(payload: CreateClassPayload): Promise<ClassItem> {
  const { data } = await api.post('/class', payload, getAuthConfig());
  return normalizeClass(data?.class ?? data);
}

export async function updateClass(id: string, payload: UpdateClassPayload): Promise<ClassItem> {
  const { data } = await api.patch(`/class/${id}`, payload, getAuthConfig());
  return normalizeClass(data?.class ?? data);
}