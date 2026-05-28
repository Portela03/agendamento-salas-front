import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Accessibility,
  Building2,
  CalendarDays,
  CalendarPlus2,
  History,
  LayoutDashboard,
  LogOut,
  ShieldOff,
  Users2,
  FileText,
  BarChart2,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { Notificacao } from '../../services/notificacaoService';
import ContrastToggle from '../ContrastToggle';
import { FontSizeControls } from '../accessibility/FontSizeControls';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  notifications?: Notificacao[];
}


// Tipos de notificação relevantes por rota
const notifTypesForRoute: Partial<Record<string, Notificacao['type'][]>> = {
  '/coordenador/dashboard': ['NOVA_RESERVA', 'NOVO_USUARIO'],
  '/coordenador/usuarios':  ['NOVO_USUARIO'],
  '/coordenador/historico': ['NOVA_RESERVA'],
  '/professor/historicoreservas': ['RESERVA_APROVADA', 'RESERVA_REJEITADA'],
};

function getBadgeCount(to: string, notifications: Notificacao[]): number {
  const types = notifTypesForRoute[to];
  if (!types) return 0;
  return notifications.filter((n) => !n.read && types.includes(n.type)).length;
}

const professorLinks = [
  { to: '/professor/reservas', label: 'Solicitar Reserva', icon: CalendarPlus2 },
  { to: '/professor/historicoreservas', label: 'Histórico', icon: History },
  { to: '/professor/calendario', label: 'Calendário', icon: CalendarDays },
];

const coordenadorLinks = [
  { to: '/coordenador/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/coordenador/salas', label: 'Gerenciar Salas', icon: Building2 },
  { to: '/coordenador/usuarios', label: 'Gestão de Perfis', icon: Users2 },
  { to: '/coordenador/calendario', label: 'Calendário', icon: CalendarDays },
  { to: '/coordenador/periodos', label: 'Controle de Períodos', icon: ShieldOff },
  { to: '/coordenador/historico', label: 'Histórico', icon: History },
  { to: '/coordenador/relatorios', label: 'Relatórios', icon: FileText },
  { to: '/coordenador/metricas', label: 'Métricas', icon: BarChart2 },
];


export function Sidebar({ isOpen, onClose, notifications = [] }: SidebarProps) {
  const { user, signOut } = useAuth();
  const links = user?.role === 'COORDENADOR' ? coordenadorLinks : professorLinks;
  const [accessibilityOpen, setAccessibilityOpen] = useState(false);

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

          {links.map(({ to, label, icon: Icon }) => {
            const badge = getBadgeCount(to, notifications);
            return (
              <NavLink
                key={to}
                to={to}
                title={!isOpen ? label : undefined}
                onClick={onClose}
                className={({ isActive }) =>
                  `relative flex items-center rounded-xl py-3 text-sm font-medium transition-colors ${
                    isOpen ? 'gap-3 px-4' : 'justify-center px-0'
                  } ${
                    isActive
                      ? 'border-l-4 border-brand-wine bg-white/15 text-white ' + (isOpen ? 'pl-3' : 'border-none')
                      : 'text-white/75 hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                {/* Ícone com bolinha quando sidebar fechada */}
                <span className="relative flex-shrink-0">
                  <Icon className="h-4 w-4" />
                  {badge > 0 && !isOpen && (
                    <span className="absolute -right-1.5 -top-1.5 flex h-3.5 min-w-[0.875rem] items-center justify-center rounded-full bg-rose-500 px-0.5 text-[9px] font-bold text-white leading-none">
                      {badge > 9 ? '9+' : badge}
                    </span>
                  )}
                </span>
                {/* Label + badge quando sidebar aberta */}
                {isOpen && (
                  <>
                    <span className="flex-1 truncate">{label}</span>
                    {badge > 0 && (
                      <span className="ml-auto flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white leading-none">
                        {badge > 99 ? '99+' : badge}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </div>

        <div className="px-2 pb-3">
          <div className="mb-3">
            <div className={`relative ${isOpen ? '' : 'flex justify-center'}`}>
              <button
                type="button"
                onClick={() => setAccessibilityOpen((v) => !v)}
                className={`flex w-full items-center rounded-xl py-3 text-sm font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white ${
                  isOpen ? 'gap-3 px-3' : 'justify-center px-0'
                }`}
                aria-expanded={accessibilityOpen}
                aria-label="Acessibilidade"
                title={!isOpen ? 'Acessibilidade' : undefined}
              >
                <Accessibility className="h-4 w-4 shrink-0" />
                {isOpen && <span>Acessibilidade</span>}
                {isOpen && (
                  <span className="ml-auto text-[10px] font-bold">
                    {accessibilityOpen ? '−' : '+'}
                  </span>
                )}
              </button>

              {accessibilityOpen && (
                <div
                  className={`${
                    isOpen ? 'mt-2' : 'absolute left-full top-0 z-40 ml-2 w-56'
                  } rounded-2xl border border-white/10 bg-brand-teal/95 p-2 shadow-xl backdrop-blur`}
                >
                  <div className="flex flex-col gap-1.5">
                    <ContrastToggle />
                    <FontSizeControls />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-white/10 px-2 py-4">
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