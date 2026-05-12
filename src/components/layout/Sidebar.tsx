import { NavLink } from 'react-router-dom';
import {
  Building2,
  CalendarDays,
  CalendarPlus2,
  History,
  LayoutDashboard,
  LogOut,
  Users2,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const professorLinks = [
  { to: '/professor/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/professor/reservas', label: 'Solicitar Reserva', icon: CalendarPlus2 },
  { to: '/professor/historicoreservas', label: 'Histórico', icon: History },
  { to: '/professor/calendario', label: 'Calendário', icon: CalendarDays },
];

const coordenadorLinks = [
  { to: '/coordenador/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/coordenador/salas', label: 'Gerenciar Salas', icon: Building2 },
  { to: '/coordenador/usuarios', label: 'Gestão de Perfis', icon: Users2 },
  { to: '/coordenador/calendario', label: 'Calendário', icon: CalendarDays },
];

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user, signOut } = useAuth();

  const links = user?.role === 'COORDENADOR' ? coordenadorLinks : professorLinks;

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        aria-label="Menu de navegação"
        className={`fixed left-0 top-16 z-30 flex h-[calc(100vh-4rem)] flex-col bg-brand-teal shadow-lg transition-all duration-300 ease-in-out
          ${
            /* Mobile: slides in/out as full drawer; hidden when closed */
            isOpen ? 'w-64' : '-translate-x-full lg:translate-x-0 lg:w-16'
          }`}
      >
      {/* Nav links */}
      <div className="flex flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden px-2 py-4">
        {isOpen && (
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">
            Navegação
          </p>
        )}

        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            title={!isOpen ? label : undefined}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center rounded-xl py-3 text-sm font-medium transition-colors ${
                isOpen ? 'gap-3 px-4' : 'justify-center px-0'
              } ${
                isActive
                  ? 'border-l-4 border-brand-wine bg-white/15 text-white ' + (isOpen ? 'pl-3' : 'border-none')
                  : 'text-white/75 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            {isOpen && <span className="truncate">{label}</span>}
          </NavLink>
        ))}
      </div>

      {/* Footer */}
      <div className="border-t border-white/10 px-2 py-4">
        {isOpen && user && (
          <div className="mb-3 flex items-center gap-3 rounded-xl bg-white/10 px-3 py-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20 text-xs font-bold text-white">
              {getInitials(user.name)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{user.name}</p>
              <p className="text-[11px] text-white/50">
                {user.role === 'COORDENADOR' ? 'Coordenador' : 'Professor'}
              </p>
            </div>
          </div>
        )}

        <button
          title="Sair"
          className={`flex w-full items-center rounded-xl py-3 text-sm font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white ${
            isOpen ? 'gap-3 px-3' : 'justify-center px-0'
          }`}
          onClick={signOut}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {isOpen && <span>Sair</span>}
        </button>
      </div>
    </aside>
    </>
  );
}

