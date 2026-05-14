import { useEffect, useRef, useState } from 'react';
import { LogOut, Menu } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import ContrastToggle from '../ContrastToggle';

interface NavbarProps {
  onToggleSidebar: () => void;
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}

export function Navbar({ onToggleSidebar }: NavbarProps) {
  const { user, signOut } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between border-b border-white/10 bg-brand-teal px-4 shadow-sm">
      {/* Left: hamburger + logo */}
      <div className="flex items-center gap-4">
        <button
          aria-label="Abrir menu"
          className="flex h-9 w-9 items-center justify-center rounded-xl text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          onClick={onToggleSidebar}
        >
          <Menu className="h-5 w-5" />
        </button>

        <span className="font-serif text-lg font-semibold text-white tracking-wide select-none">
          Agendamento de Salas
        </span>
      </div>

      {/* Contraste + Right: user dropdown */}
      <div className="ml-auto flex items-center gap-2">
        <ContrastToggle /> {/* <-- inserido */}
      </div>
      
      {/* Right: user dropdown */}
      {user && (
        <div className="relative" ref={dropdownRef}>
          <button
            aria-label={user.name}
            className="flex items-center gap-2 rounded-xl px-2 py-1.5 transition-colors hover:bg-white/10"
            onClick={() => setDropdownOpen((prev) => !prev)}
          >
            <span className="hidden text-sm text-white/70 sm:block">{user.name}</span>
            <div
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-sm font-bold text-white ring-2 ring-white/20"
            >
              {getInitials(user.name)}
            </div>
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-2xl border border-white/10 bg-brand-teal shadow-xl">
              <div className="border-b border-white/10 px-4 py-3">
                <p className="truncate font-semibold text-white">{user.name}</p>
                <p className="truncate text-xs text-white/50">{user.email}</p>
                <p className="mt-0.5 text-xs text-white/40">
                  {user.role === 'COORDENADOR' ? 'Coordenador' : 'Professor'}
                </p>
              </div>
              <button
                className="flex w-full items-center gap-3 px-4 py-3 text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                onClick={() => { setDropdownOpen(false); signOut(); }}
              >
                <LogOut className="h-4 w-4" />
                Sair
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
