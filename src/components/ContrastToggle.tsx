import { useEffect, useState } from "react";

export default function ContrastToggle() {
  const KEY = "highContrast";
  const [on, setOn] = useState<boolean>(() => {
    try {
      return localStorage.getItem(KEY) === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const html = document.documentElement;
    if (on) {
      html.classList.add("high-contrast");
    } else {
      html.classList.remove("high-contrast");
    }
    try {
      localStorage.setItem(KEY, on ? "true" : "false");
    } catch {}
  }, [on]);

  return (
    <button
      aria-pressed={on}
      onClick={() => setOn((v) => !v)}
      className="flex h-9 w-full items-center justify-between gap-2 rounded-xl border border-brand-teal/15 bg-white/95 px-2.5 py-1.5 text-[11px] font-semibold text-brand-ink shadow-soft transition hover:bg-brand-mist/50 focus:outline-none focus:ring-2 focus:ring-brand-teal/30"
      title="Alternar alto contraste"
    >
      <span>Alto contraste</span>
      <span
        className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
          on ? "bg-brand-teal text-white" : "bg-brand-mist/60 text-brand-ink/70"
        }`}
      >
        {on ? "ON" : "OFF"}
      </span>
    </button>
  );
}