import { Menu } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

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
  const { user } = useAuth();

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

      {/* Right: user initials badge */}
      {user && (
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-white/70 sm:block">{user.name}</span>
          <div
            aria-label={user.name}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-sm font-bold text-white ring-2 ring-white/20"
            title={user.name}
          >
            {getInitials(user.name)}
          </div>
        </div>
      )}
    </header>
  );
}
