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
      className="px-3 py-1.5 rounded border text-white/80 hover:bg-white/10 text-sm font-medium"
      title="Alternar alto contraste"
    >
      {on ? "🎨 AC: ON" : "🎨 AC: OFF"}
    </button>
  );
}