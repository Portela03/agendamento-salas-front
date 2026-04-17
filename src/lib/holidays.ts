/**
 * holidays.ts
 * Módulo puro de feriados e bloqueios acadêmicos.
 *
 * Para anos com calendário FATEC definido (ex: 2026), usa os dados exatos
 * aprovados pela congregação (incluindo emendas de feriados e recesso oficial).
 * Para outros anos, cai no fallback de feriados nacionais calculados dinamicamente.
 *
 * Fonte 2026: Calendário FATEC Zona Leste aprovado em reunião de 11/11/2025
 * e homologado em 12/12/2025.
 *
 * Períodos letivos 2026:
 *   1º Semestre — Início aulas: 04/02 | Término aulas: 27/06 | Encerramento: 04/07
 *   2º Semestre — Início aulas: 03/08 | Término aulas: 14/12 | Encerramento: 21/12
 */

export interface Feriado {
  label: string;
  tipo: 'nacional' | 'academico';
}

// ── Algoritmo de Páscoa (Anonymous Gregorian / Meeus) ────────────────────────

function calcularPascoa(ano: number): Date {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(ano, mes - 1, dia);
}

function addDias(data: Date, dias: number): Date {
  const d = new Date(data);
  d.setDate(d.getDate() + dias);
  return d;
}

function toKey(data: Date): string {
  const dd = String(data.getDate()).padStart(2, '0');
  const mm = String(data.getMonth() + 1).padStart(2, '0');
  const yyyy = data.getFullYear();
  return `${yyyy}-${mm}-${dd}`;
}

// ── Calendário específico da FATEC Zona Leste ─────────────────────────────────
// Atualizar anualmente conforme o calendário oficial aprovado pela congregação.
// Todos os intervalos são inclusivos. mês: 1-12.

interface PeriodoFATEC {
  inicio: [number, number]; // [mes, dia]
  fim: [number, number];    // [mes, dia] — inclusive
  label: string;
  tipo: Feriado['tipo'];
}

const FATEC_CALENDAR: Record<number, PeriodoFATEC[]> = {
  /**
   * Calendário 2026 — FATEC Zona Leste
   * Fonte: aprovado em reunião de 11/11/2025, homologado em 12/12/2025.
   */
  2026: [
    // ── JANEIRO ──────────────────────────────────────────────────────────────
    { inicio: [1, 1],   fim: [1, 1],   label: 'Confraternização Universal',            tipo: 'nacional'  },

    // ── FEVEREIRO ─────────────────────────────────────────────────────────────
    // Carnaval + Quarta-Feira de Cinzas (14 a 18/02)
    { inicio: [2, 14],  fim: [2, 18],  label: 'Carnaval / Quarta-Feira de Cinzas',     tipo: 'nacional'  },

    // ── ABRIL ─────────────────────────────────────────────────────────────────
    // Paixão de Cristo + emenda (03 e 04/04)
    { inicio: [4, 3],   fim: [4, 4],   label: 'Paixão de Cristo',                      tipo: 'nacional'  },
    // Tiradentes + emenda (20 e 21/04)
    { inicio: [4, 20],  fim: [4, 21],  label: 'Tiradentes',                            tipo: 'nacional'  },

    // ── MAIO ──────────────────────────────────────────────────────────────────
    // Dia do Trabalho + emenda (01 e 02/05)
    { inicio: [5, 1],   fim: [5, 2],   label: 'Dia do Trabalho',                       tipo: 'nacional'  },

    // ── JUNHO ─────────────────────────────────────────────────────────────────
    // Corpus Christi + emenda (04 a 06/06)
    { inicio: [6, 4],   fim: [6, 6],   label: 'Corpus Christi',                        tipo: 'nacional'  },

    // ── JULHO ─────────────────────────────────────────────────────────────────
    // Recesso Acadêmico 1º Semestre (10 a 25/07)
    { inicio: [7, 10],  fim: [7, 25],  label: 'Recesso Acadêmico — 1º Semestre',        tipo: 'academico' },

    // ── SETEMBRO ──────────────────────────────────────────────────────────────
    // Independência do Brasil (07/09)
    { inicio: [9, 7],   fim: [9, 7],   label: 'Independência do Brasil',               tipo: 'nacional'  },

    // ── OUTUBRO ───────────────────────────────────────────────────────────────
    // Nossa Sra. Aparecida — Feriado (12/10)
    { inicio: [10, 12], fim: [10, 12], label: 'Nossa Sra. Aparecida',                  tipo: 'nacional'  },
    // Dia do Professor — Não haverá aula (Decreto Federal nº 52.682/1963) (15/10)
    { inicio: [10, 15], fim: [10, 15], label: 'Dia do Professor',                      tipo: 'academico' },
    // Dia do Servidor Público — Não haverá aula (Decreto nº 70.273/2025) (28/10)
    { inicio: [10, 28], fim: [10, 28], label: 'Dia do Servidor Público',               tipo: 'academico' },

    // ── NOVEMBRO ──────────────────────────────────────────────────────────────
    // Finados — Feriado (02/11)
    { inicio: [11, 2],  fim: [11, 2],  label: 'Finados',                               tipo: 'nacional'  },
    // Proclamação da República — Feriado (15/11)
    { inicio: [11, 15], fim: [11, 15], label: 'Proclamação da República',              tipo: 'nacional'  },
    // Dia da Consciência Negra + emenda (20 e 21/11)
    { inicio: [11, 20], fim: [11, 21], label: 'Dia da Consciência Negra',              tipo: 'nacional'  },

    // ── DEZEMBRO ──────────────────────────────────────────────────────────────
    // Natal — Feriado (25/12)
    { inicio: [12, 25], fim: [12, 25], label: 'Natal',                                 tipo: 'nacional'  },
    // Recesso Acadêmico Fim de Ano (26 a 31/12)
    { inicio: [12, 26], fim: [12, 31], label: 'Recesso Acadêmico — Fim de Ano',        tipo: 'academico' },
  ],

  // ── Adicione aqui o calendário de 2027 quando publicado pela congregação ──
  // 2027: [ ... ],
};

// ── Builder ──────────────────────────────────────────────────────────────────

export function buildHolidayMap(ano: number): Map<string, Feriado> {
  const map = new Map<string, Feriado>();

  function add(data: Date, label: string, tipo: Feriado['tipo']) {
    map.set(toKey(data), { label, tipo });
  }

  function addRange(
    inicioMes: number, inicioDia: number,
    fimMes: number,   fimDia: number,
    label: string, tipo: Feriado['tipo'],
  ) {
    const inicio  = new Date(ano, inicioMes - 1, inicioDia);
    const fim     = new Date(ano, fimMes - 1, fimDia);
    let current   = new Date(inicio);
    while (current <= fim) {
      add(new Date(current), label, tipo);
      current.setDate(current.getDate() + 1);
    }
  }

  // ── Usar calendário oficial FATEC quando disponível ───────────────────────
  const periodos = FATEC_CALENDAR[ano];
  if (periodos) {
    for (const p of periodos) {
      addRange(p.inicio[0], p.inicio[1], p.fim[0], p.fim[1], p.label, p.tipo);
    }
    return map;
  }

  // ── Fallback: feriados nacionais calculados dinamicamente ─────────────────
  // (usado para anos sem calendário FATEC definido)

  const pascoa = calcularPascoa(ano);

  // Fixos
  add(new Date(ano, 0, 1),   'Confraternização Universal',    'nacional');
  add(new Date(ano, 3, 21),  'Tiradentes',                    'nacional');
  add(new Date(ano, 4, 1),   'Dia do Trabalho',               'nacional');
  add(new Date(ano, 8, 7),   'Independência do Brasil',       'nacional');
  add(new Date(ano, 9, 12),  'Nossa Sra. Aparecida',          'nacional');
  add(new Date(ano, 10, 2),  'Finados',                       'nacional');
  add(new Date(ano, 10, 15), 'Proclamação da República',      'nacional');
  add(new Date(ano, 10, 20), 'Dia da Consciência Negra',      'nacional');
  add(new Date(ano, 11, 25), 'Natal',                         'nacional');

  // Móveis (baseados na Páscoa)
  add(addDias(pascoa, -48), 'Segunda-feira de Carnaval',       'nacional');
  add(addDias(pascoa, -47), 'Terça-feira de Carnaval',         'nacional');
  add(addDias(pascoa, -2),  'Paixão de Cristo',                'nacional');
  add(pascoa,               'Páscoa',                          'nacional');
  add(addDias(pascoa, 60),  'Corpus Christi',                  'nacional');

  // Recesso acadêmico genérico
  for (let d = 21; d <= 31; d++) {
    const dt = new Date(ano, 6, d);
    if (dt.getMonth() === 6) add(dt, 'Recesso Acadêmico — Julho', 'academico');
  }
  for (let d = 26; d <= 31; d++) {
    add(new Date(ano, 11, d), 'Recesso Acadêmico — Fim de Ano', 'academico');
  }

  return map;
}

/** Retorna informações do feriado/bloqueio, ou null se o dia for normal. */
export function getFeriado(data: Date, mapa: Map<string, Feriado>): Feriado | null {
  return mapa.get(toKey(data)) ?? null;
}

// ── Semestres letivos ─────────────────────────────────────────────────────────
// Fonte: calendário oficial FATEC Zona Leste.
// Atualizar anualmente.

export interface Semestre {
  nome: string;
  /** Data de início das aulas (ISO date: YYYY-MM-DD) */
  inicioAulas: string;
  /** Data de término das aulas */
  terminoAulas: string;
  /** Data de encerramento oficial do semestre (inclui período de exames) */
  encerramentoOficial: string;
}

export const FATEC_SEMESTRES: Record<number, Semestre[]> = {
  2026: [
    {
      nome: '1º Semestre 2026',
      inicioAulas:         '2026-02-04', // Início das aulas (1º Semestre Letivo)
      terminoAulas:        '2026-06-27', // Término das aulas do 1º Semestre Letivo
      encerramentoOficial: '2026-07-04', // Encerramento oficial do 1º Semestre
    },
    {
      nome: '2º Semestre 2026',
      inicioAulas:         '2026-08-03', // Início das aulas do 2º Semestre Letivo
      terminoAulas:        '2026-12-14', // Término das aulas do 2º Semestre Letivo
      encerramentoOficial: '2026-12-21', // Encerramento oficial do 2º Semestre
    },
  ],
  // Adicionar 2027 quando publicado pela congregação.
};

/**
 * Retorna o semestre ativo para uma data, ou null se fora do período letivo.
 * Usa a janela inicioAulas → encerramentoOficial (inclui exames finais)
 * para fins informativos no banner do calendário.
 */
export function getSemestreAtivo(data: Date): Semestre | null {
  const semestres = FATEC_SEMESTRES[data.getFullYear()];
  if (!semestres) return null;
  const key = toKey(data);
  return semestres.find((s) => key >= s.inicioAulas && key <= s.encerramentoOficial) ?? null;
}

/**
 * Retorna true se a data está FORA do período de aulas de todos os semestres definidos.
 * Usa terminoAulas como limite — após o último dia de aula, salas não devem ser agendadas.
 * Para anos sem dados, retorna false (sem restrição).
 */
export function isForaDoPeriodoLetivo(data: Date): boolean {
  const semestres = FATEC_SEMESTRES[data.getFullYear()];
  if (!semestres) return false;
  const key = toKey(data);
  return !semestres.some((s) => key >= s.inicioAulas && key <= s.terminoAulas);
}
