import { useEffect, useRef, useState } from 'react';
import { Bell, CheckCircle, LogOut, Menu, Trash2, Undo2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import ContrastToggle from '../ContrastToggle';
import { Notificacao } from '../../services/notificacaoService';

interface NavbarProps {
  onToggleSidebar: () => void;
  unreadCount: number;
  notifications: Notificacao[];
  onMarkAllAsRead: () => void;
  onMarkOneAsRead: (id: string) => void;
  onDeleteOne: (id: string) => void;
}

const typeConfig: Record<Notificacao['type'], { icon: string; label: string; color: string }> = {
  NOVA_RESERVA:      { icon: '📋', label: 'Nova solicitação de reserva', color: 'text-brand-teal' },
  NOVO_USUARIO:      { icon: '👤', label: 'Novo professor cadastrado',    color: 'text-violet-600' },
  RESERVA_APROVADA:  { icon: '✅', label: 'Reserva aprovada',             color: 'text-emerald-600' },
  RESERVA_REJEITADA: { icon: '❌', label: 'Reserva rejeitada',            color: 'text-rose-600' },
  USUARIO_APROVADO:  { icon: '✅', label: 'Cadastro aprovado',            color: 'text-emerald-600' },
};

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `${mins}min atrás`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h atrás`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'ontem';
  return `${days}d atrás`;
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}

export function Navbar({
  onToggleSidebar,
  unreadCount,
  notifications,
  onMarkAllAsRead,
  onMarkOneAsRead,
  onDeleteOne,
}: NavbarProps) {
  const { user, signOut } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Record<string, number>>({});
  const countdownRefs = useRef<Record<string, ReturnType<typeof setInterval>>>({});
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const refs = countdownRefs.current;
    return () => { Object.values(refs).forEach(clearInterval); };
  }, []);

  function startDelete(id: string) {
    const SECONDS = 5;
    setPendingDelete((prev) => ({ ...prev, [id]: SECONDS }));

    const interval = setInterval(() => {
      setPendingDelete((prev) => {
        const remaining = (prev[id] ?? 0) - 1;
        if (remaining <= 0) {
          clearInterval(interval);
          delete countdownRefs.current[id];
          onDeleteOne(id);
          const { [id]: _, ...rest } = prev;
          return rest;
        }
        return { ...prev, [id]: remaining };
      });
    }, 1000);

    countdownRefs.current[id] = interval;
  }

  function undoDelete(id: string) {
    clearInterval(countdownRefs.current[id]);
    delete countdownRefs.current[id];
    setPendingDelete((prev) => {
      const { [id]: _, ...rest } = prev;
      return rest;
    });
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;

      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(target)) {
        setNotifOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleOpenNotif() {
    setNotifOpen((prev) => !prev);
  }

  const sorted = [...notifications].sort((a, b) => {
    if (a.read !== b.read) return a.read ? 1 : -1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const hasUnread = notifications.some((n) => !n.read);

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

      {/* Right controls */}
      <div className="ml-auto flex items-center gap-2">
        <ContrastToggle />

        {/* ── Sino de notificações ── */}
        {user && (
          <div className="relative" ref={notifRef}>
            <button
              aria-label="Notificações"
              className="relative flex h-9 w-9 items-center justify-center rounded-xl text-white/80 transition-colors hover:bg-white/10 hover:text-white"
              onClick={handleOpenNotif}
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white leading-none">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {/* ── Painel de notificações ── */}
            {notifOpen && (
              <div className="absolute right-0 top-full mt-2 flex max-h-[480px] w-80 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
                {/* Cabeçalho */}
                <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-100 px-4 py-3">
                  <h3 className="text-sm font-bold text-gray-800">
                    Notificações
                    {unreadCount > 0 && (
                      <span className="ml-2 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                        {unreadCount}
                      </span>
                    )}
                  </h3>
                  {hasUnread && (
                    <button
                      onClick={onMarkAllAsRead}
                      className="text-xs text-brand-teal hover:underline"
                    >
                      Marcar todas como lidas
                    </button>
                  )}
                </div>

                {/* Lista */}
                <div className="flex-1 overflow-y-auto">
                  {sorted.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                      <Bell className="h-8 w-8 text-gray-300" />
                      <p className="text-sm text-gray-400">Nenhuma notificação</p>
                    </div>
                  ) : (
                    sorted.map((n) => {
                      const cfg = typeConfig[n.type];
                      const isPending = n.id in pendingDelete;
                      const countdown = pendingDelete[n.id];
                      return (
                        <div
                          key={n.id}
                          className={`relative flex items-start gap-3 border-b border-gray-50 px-4 py-3 last:border-0 transition-colors ${
                            isPending
                              ? 'bg-rose-50'
                              : !n.read
                              ? 'bg-brand-teal/5'
                              : 'bg-white hover:bg-gray-50'
                          }`}
                        >
                          {isPending ? (
                            <div className="flex flex-1 items-center gap-3">
                              <Trash2 className="h-4 w-4 flex-shrink-0 text-rose-400" />
                              <p className="flex-1 text-xs text-rose-600">
                                Notificação removida.{' '}
                                <button
                                  onClick={() => undoDelete(n.id)}
                                  className="inline-flex items-center gap-1 font-semibold underline hover:no-underline"
                                >
                                  <Undo2 className="h-3 w-3" />
                                  Desfazer
                                </button>
                              </p>
                              <span className="ml-1 flex-shrink-0 rounded-full bg-rose-200 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">
                                {countdown}s
                              </span>
                            </div>
                          ) : (
                            <>
                              <span className="mt-0.5 flex-shrink-0 text-base leading-none">
                                {cfg.icon}
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</p>
                                <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-gray-600">
                                  {n.message}
                                </p>
                                <p className="mt-1 text-[10px] text-gray-400">
                                  {relativeTime(n.createdAt)}
                                </p>
                              </div>
                              <div className="ml-1 flex flex-shrink-0 flex-col items-center gap-1.5">
                                {!n.read && (
                                  <span className="h-2 w-2 rounded-full bg-rose-500" />
                                )}
                                {!n.read && (
                                  <button
                                    onClick={() => onMarkOneAsRead(n.id)}
                                    aria-label="Marcar como lida"
                                    title="Marcar como lida"
                                    className="flex h-6 w-6 items-center justify-center rounded-full text-gray-300 transition-colors hover:bg-emerald-100 hover:text-emerald-600"
                                  >
                                    <CheckCircle className="h-3.5 w-3.5" />
                                  </button>
                                )}
                                <button
                                  onClick={() => startDelete(n.id)}
                                  aria-label="Remover notificação"
                                  className="flex h-6 w-6 items-center justify-center rounded-full text-gray-300 transition-colors hover:bg-rose-100 hover:text-rose-500"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* User dropdown */}
        {user && (
          <div className="relative ml-2" ref={dropdownRef}>
            <button
              aria-label={user.name}
              className="flex items-center gap-2 rounded-xl px-2 py-1.5 transition-colors hover:bg-white/10"
              onClick={() => setDropdownOpen((prev) => !prev)}
            >
              <span className="hidden text-sm text-white/70 sm:block">{user.name}</span>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-sm font-bold text-white ring-2 ring-white/20">
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
      </div>
    </header>
  );
}