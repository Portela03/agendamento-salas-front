import { api } from './api';
import { Reserva } from './reservaService';

export interface CalendarioFiltros {
  mes: number;
  ano: number;
  classId?: string;
  periodo?: string;
  semestre?: string;
  incluirAguardando?: boolean;
}

export async function fetchCalendario(filtros: CalendarioFiltros): Promise<Reserva[]> {
  const params = new URLSearchParams({
    mes: String(filtros.mes),
    ano: String(filtros.ano),
    ...(filtros.classId  ? { classId:  filtros.classId  } : {}),
    ...(filtros.periodo  ? { periodo:  filtros.periodo  } : {}),
    ...(filtros.semestre ? { semestre: filtros.semestre } : {}),
    ...(filtros.incluirAguardando ? { incluirAguardando: 'true' } : {}),
  });

  const { data } = await api.get<Reserva[]>(`/reservas/calendario?${params.toString()}`);
  return data;
}
