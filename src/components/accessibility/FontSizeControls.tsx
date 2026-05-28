import { useEffect, useMemo, useState } from 'react';
import { Minus, Plus, RotateCcw } from 'lucide-react';

const STORAGE_KEY = 'agendamento-salas-font-scale';
const FONT_SCALES = [0.85, 0.9, 1, 1.1, 1.2, 1.3, 1.4] as const;
const DEFAULT_INDEX = 2;

function readInitialIndex() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const parsed = stored ? Number(stored) : FONT_SCALES[DEFAULT_INDEX];
    const foundIndex = FONT_SCALES.findIndex((scale) => scale === parsed);
    return foundIndex >= 0 ? foundIndex : DEFAULT_INDEX;
  } catch {
    return DEFAULT_INDEX;
  }
}

export function FontSizeControls() {
  const [scaleIndex, setScaleIndex] = useState(readInitialIndex);
  const scale = FONT_SCALES[scaleIndex];

  useEffect(() => {
    document.documentElement.style.fontSize = `${scale * 100}%`;

    try {
      window.localStorage.setItem(STORAGE_KEY, String(scale));
    } catch {
      // Preference persistence is optional.
    }
  }, [scale]);

  const label = useMemo(() => `${Math.round(scale * 100)}%`, [scale]);

   return (
    <div
      aria-label="Controles de tamanho da fonte"
      className="flex w-full items-center justify-between gap-1.5 rounded-xl border border-brand-teal/15 bg-white/95 p-1.5 shadow-soft"
      role="group"
    >
      <button
        type="button"
        aria-label="Diminuir tamanho da fonte"
        disabled={scaleIndex === 0}
        onClick={() => setScaleIndex((current) => Math.max(0, current - 1))}
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-brand-teal/10 bg-white text-brand-teal transition hover:bg-brand-mist/50 focus:outline-none focus:ring-2 focus:ring-brand-teal/30 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Minus className="h-4 w-4" />
      </button>

      <button
        type="button"
        aria-label="Restaurar tamanho padrão da fonte"
        onClick={() => setScaleIndex(DEFAULT_INDEX)}
        className="flex h-9 flex-1 items-center justify-center gap-1 rounded-xl border border-brand-teal/10 bg-white px-2 text-[11px] font-bold text-brand-ink transition hover:bg-brand-mist/50 focus:outline-none focus:ring-2 focus:ring-brand-teal/30"
      >
        <RotateCcw className="h-3.5 w-3.5" />
        {label}
      </button>

      <button
        type="button"
        aria-label="Aumentar tamanho da fonte"
        disabled={scaleIndex === FONT_SCALES.length - 1}
        onClick={() => setScaleIndex((current) => Math.min(FONT_SCALES.length - 1, current + 1))}
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-brand-teal/10 bg-white text-brand-teal transition hover:bg-brand-mist/50 focus:outline-none focus:ring-2 focus:ring-brand-teal/30 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
