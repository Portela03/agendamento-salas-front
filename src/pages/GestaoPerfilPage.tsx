import { type ReactNode, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  Filter,
  RefreshCcw,
  ShieldCheck,
  Trash2,
  XCircle,
} from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Select } from '../components/ui/select';
import { ManagedUser, PendingUser, userService } from '../services/userService';

// ── TruncatedEmail ───────────────────────────────────────────────────────────

function TruncatedEmail({ email }: { email: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useLayoutEffect(() => {
    if (ref.current) {
      setIsTruncated(ref.current.scrollWidth > ref.current.clientWidth);
    }
  }, [email]);

  return (
    <div>
      <div
        ref={ref}
        className={`text-sm text-muted-foreground ${expanded ? 'break-all' : 'truncate'}`}
      >
        {email}
      </div>
      {(isTruncated || expanded) && (
        <button
          type="button"
          className="text-xs text-brand-teal underline"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? 'ver menos' : 'ver mais'}
        </button>
      )}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function PanelMessage({ children, tone }: { children: ReactNode; tone: 'error' | 'info' }) {
  return (
    <div
      className={
        tone === 'error'
          ? 'rounded-2xl border border-brand-wine/20 bg-brand-wine/5 px-4 py-3 text-sm text-brand-wine'
          : 'rounded-2xl border border-brand-teal/15 bg-brand-teal/5 px-4 py-3 text-sm text-brand-teal'
      }
    >
      {children}
    </div>
  );
}

// ── Modal de edição de usuário ────────────────────────────────────────────────

interface EditUserModalProps {
  user: ManagedUser;
  onSave: (payload: { name: string; email: string; role: ManagedUser['role']; status: ManagedUser['status'] }) => void;
  onCancel: () => void;
}

function EditUserModal({ user, onSave, onCancel }: EditUserModalProps) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [role, setRole] = useState<ManagedUser['role']>(user.role);
  const [status, setStatus] = useState<ManagedUser['status']>(user.status);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-[24px] border border-brand-teal/15 bg-white p-6 shadow-2xl">
        <div className="mb-5">
          <h2 className="text-lg font-bold text-brand-ink">Editar perfil</h2>
          <p className="text-sm text-muted-foreground">Atualize os dados do usuário e salve no banco.</p>
        </div>

        <div className="grid gap-4">
          <label className="grid gap-2 text-sm font-medium text-brand-ink">
            Nome
            <input
              className="h-12 w-full rounded-2xl border border-brand-teal/15 bg-white/90 px-4 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-teal/40"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>

          <label className="grid gap-2 text-sm font-medium text-brand-ink">
            E-mail
            <input
              className="h-12 w-full rounded-2xl border border-brand-teal/15 bg-white/90 px-4 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-teal/40"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium text-brand-ink">
              Perfil
              <Select value={role} onChange={(e) => setRole(e.target.value as ManagedUser['role'])}>
                <option value="PROFESSOR">Professor</option>
                <option value="COORDENADOR">Coordenador</option>
              </Select>
            </label>

            <label className="grid gap-2 text-sm font-medium text-brand-ink">
              Status
              <Select value={status} onChange={(e) => setStatus(e.target.value as ManagedUser['status'])}>
                <option value="PENDENTE">Pendente</option>
                <option value="APROVADO">Ativo</option>
              </Select>
            </label>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <Button
            className="flex-1 bg-brand-teal text-white hover:bg-brand-teal/90"
            onClick={() => onSave({ name, email, role, status })}
          >
            Salvar alterações
          </Button>
          <Button className="flex-1" onClick={onCancel} variant="outline">
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export function GestaoPerfilPage() {
  // Usuários pendentes
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState('');

  // Gestão de perfis
  const [managedUsers, setManagedUsers] = useState<ManagedUser[]>([]);
  const [managementLoading, setManagementLoading] = useState(false);
  const [managementError, setManagementError] = useState('');
  const [managementSuccess, setManagementSuccess] = useState('');
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);

  // Filtros
  const [filtroPerfilUsuario, setFiltroPerfilUsuario] = useState<'' | PendingUser['role']>('');
  const [filtroStatusUsuario, setFiltroStatusUsuario] = useState<'' | PendingUser['status']>('');
  const [buscaUsuario, setBuscaUsuario] = useState('');

  // ── Loaders ───────────────────────────────────────────────────────────────

  const loadPendingUsers = useCallback(async () => {
    try {
      setUsersLoading(true);
      setUsersError('');
      const result = await userService.listPending();
      setPendingUsers(result.users);
    } catch {
      setUsersError('Erro ao carregar usuários pendentes.');
    } finally {
      setUsersLoading(false);
    }
  }, []);

  const loadManagedUsers = useCallback(async () => {
    try {
      setManagementLoading(true);
      setManagementError('');
      const result = await userService.listAll();
      setManagedUsers(result.users);
    } catch {
      setManagementError('Não foi possível carregar os perfis cadastrados.');
    } finally {
      setManagementLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPendingUsers();
    void loadManagedUsers();
  }, [loadPendingUsers, loadManagedUsers]);

  // ── Ações ─────────────────────────────────────────────────────────────────

  async function handleApproveUser(userId: string) {
    try {
      await userService.approve(userId);
      await loadPendingUsers();
    } catch {
      setUsersError('Não foi possível aprovar o usuário.');
    }
  }

  async function handleRejectUser(userId: string) {
    try {
      await userService.reject(userId);
      await loadPendingUsers();
    } catch {
      setUsersError('Não foi possível recusar o acesso.');
    }
  }

  async function handleSaveUser(payload: { name: string; email: string; role: ManagedUser['role']; status: ManagedUser['status'] }) {
    if (!editingUser) return;
    try {
      setManagementSuccess('');
      setManagementError('');
      await userService.update(editingUser.id, payload);
      setEditingUser(null);
      setManagementSuccess('Perfil atualizado com sucesso.');
      await Promise.all([loadManagedUsers(), loadPendingUsers()]);
    } catch {
      setManagementError('Não foi possível atualizar o perfil.');
    }
  }

  async function handleToggleUserStatus(userId: string) {
    try {
      setManagementSuccess('');
      setManagementError('');
      await userService.toggleStatus(userId);
      setManagementSuccess('Status do usuário atualizado.');
      await Promise.all([loadManagedUsers(), loadPendingUsers()]);
    } catch {
      setManagementError('Não foi possível alterar o status do usuário.');
    }
  }

  async function handleRemoveUser(userId: string) {
    const confirmed = window.confirm('Tem certeza que deseja remover este usuário?');
    if (!confirmed) return;
    try {
      setManagementSuccess('');
      setManagementError('');
      await userService.remove(userId);
      setManagementSuccess('Usuário removido com sucesso.');
      await Promise.all([loadManagedUsers(), loadPendingUsers()]);
    } catch {
      setManagementError('Não foi possível remover o usuário.');
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const usuariosFiltrados = managedUsers.filter((usuario) => {
    const matchPerfil = !filtroPerfilUsuario || usuario.role === filtroPerfilUsuario;
    const matchStatus = !filtroStatusUsuario || usuario.status === filtroStatusUsuario;
    const termoBusca = `${usuario.name} ${usuario.email}`.toLowerCase();
    const matchBusca = !buscaUsuario.trim() || termoBusca.includes(buscaUsuario.toLowerCase().trim());
    return matchPerfil && matchStatus && matchBusca;
  });

  return (
    <div className="container px-4 py-6 sm:py-8 space-y-6">
      {editingUser && (
        <EditUserModal
          user={editingUser}
          onCancel={() => setEditingUser(null)}
          onSave={(payload) => void handleSaveUser(payload)}
        />
      )}

      {/* Aprovação de Professores */}
      <Card className="border-brand-teal/10 bg-white/85">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-xl sm:text-3xl text-brand-ink">Aprovação de Professores</CardTitle>
            <CardDescription>
              Aprove ou recuse os novos cadastros que ainda aguardam liberação.
            </CardDescription>
          </div>
          <Button onClick={() => void loadPendingUsers()} variant="secondary">
            <RefreshCcw className="mr-2 h-4 w-4" />
            Atualizar fila
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          {usersLoading && <PanelMessage tone="info">Carregando usuários pendentes...</PanelMessage>}
          {usersError && <PanelMessage tone="error">{usersError}</PanelMessage>}

          {!usersLoading && pendingUsers.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-[28px] border border-dashed border-brand-teal/20 bg-brand-mist/20 px-6 py-12 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-teal text-white">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-bold text-brand-ink">Nenhum professor pendente</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Todos os professores cadastrados já foram aprovados.
              </p>
            </div>
          )}

          {pendingUsers.map((pendingUser) => (
            <div
              key={pendingUser.id}
              className="flex flex-col gap-4 rounded-[24px] border border-brand-teal/10 bg-gradient-to-r from-white to-brand-mist/20 p-5 md:flex-row md:items-center md:justify-between"
            >
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-lg font-bold text-brand-ink">{pendingUser.name}</h2>
                  <Badge variant="pending">Pendente</Badge>
                  <Badge variant={pendingUser.role === 'COORDENADOR' ? 'coordinator' : 'professor'}>
                    {pendingUser.role === 'COORDENADOR' ? 'Coordenador' : 'Professor'}
                  </Badge>
                </div>
                <p className="break-all text-sm text-muted-foreground">{pendingUser.email}</p>
                <p className="text-xs uppercase tracking-[0.2em] text-brand-teal/80">
                  Perfil solicitado e aguardando aprovação
                </p>
              </div>

              <div className="flex shrink-0 flex-col sm:flex-row gap-2">
                <Button
                  className="w-full sm:w-auto bg-emerald-600 text-white hover:bg-emerald-700 sm:min-w-36"
                  onClick={() => void handleApproveUser(pendingUser.id)}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Aprovar acesso
                </Button>
                <Button
                  className="w-full sm:w-auto border-rose-200 text-rose-600 hover:bg-rose-50 sm:min-w-36"
                  variant="outline"
                  onClick={() => void handleRejectUser(pendingUser.id)}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Recusar
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Gestão de Perfis */}
      <Card className="border-brand-teal/10 bg-white/85">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-xl sm:text-3xl text-brand-ink">Gestão de Perfis</CardTitle>
            <CardDescription>Consulte, edite, ative ou remova perfis direto do banco de dados.</CardDescription>
          </div>
          <Button
            onClick={() => {
              setFiltroPerfilUsuario('');
              setFiltroStatusUsuario('');
              setBuscaUsuario('');
              void loadManagedUsers();
            }}
            variant="secondary"
          >
            <RefreshCcw className="mr-2 h-4 w-4" />
            Atualizar lista
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Filtros */}
          <div className="flex flex-wrap gap-3 rounded-2xl border border-brand-teal/10 bg-brand-mist/20 p-4">
            <div className="flex-1 min-w-[170px]">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Perfil
              </label>
              <Select
                value={filtroPerfilUsuario}
                onChange={(e) => setFiltroPerfilUsuario(e.target.value as '' | PendingUser['role'])}
              >
                <option value="">Todos os perfis</option>
                <option value="COORDENADOR">Coordenador</option>
                <option value="PROFESSOR">Professor</option>
              </Select>
            </div>

            <div className="flex-1 min-w-[170px]">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Status
              </label>
              <Select
                value={filtroStatusUsuario}
                onChange={(e) => setFiltroStatusUsuario(e.target.value as '' | PendingUser['status'])}
              >
                <option value="">Todos os status</option>
                <option value="PENDENTE">Pendente</option>
                <option value="APROVADO">Ativo</option>
              </Select>
            </div>

            <div className="flex-1 min-w-[220px]">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Buscar
              </label>
              <input
                className="h-12 w-full rounded-2xl border border-brand-teal/15 bg-white/90 px-4 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal/40"
                placeholder="Nome ou e-mail..."
                value={buscaUsuario}
                onChange={(e) => setBuscaUsuario(e.target.value)}
              />
            </div>

            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setFiltroPerfilUsuario('');
                  setFiltroStatusUsuario('');
                  setBuscaUsuario('');
                }}
              >
                <Filter className="mr-2 h-4 w-4" />
                Limpar
              </Button>
            </div>
          </div>

          {managementSuccess && <PanelMessage tone="info">{managementSuccess}</PanelMessage>}
          {managementLoading && <PanelMessage tone="info">Carregando perfis...</PanelMessage>}
          {managementError && <PanelMessage tone="error">{managementError}</PanelMessage>}

          {!managementLoading && (
            <div className="rounded-[28px] border border-brand-teal/10 bg-white/80 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-brand-teal/10 px-5 py-4">
                <div>
                  <h2 className="text-xl font-bold text-brand-ink">Usuários cadastrados</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Gestão dos perfis disponíveis no sistema atual.
                  </p>
                </div>
                <Badge className="bg-brand-mist text-brand-ink" variant="subtle">
                  {usuariosFiltrados.length} usuário{usuariosFiltrados.length === 1 ? '' : 's'}
                </Badge>
              </div>

              <div className="hidden border-b border-brand-teal/10 bg-brand-mist/20 px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground md:grid md:grid-cols-[2fr_1fr_1fr_1fr_1.2fr] md:gap-4">
                <div>Usuário</div>
                <div>Perfil</div>
                <div>Cadastro</div>
                <div>Status</div>
                <div className="text-right">Ações</div>
              </div>

              {usuariosFiltrados.length === 0 ? (
                <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-teal/10 text-brand-teal">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-bold text-brand-ink">Nenhum perfil encontrado</h3>
                  <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                    Ajuste os filtros ou aguarde novas solicitações de acesso.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-brand-teal/10">
                  {usuariosFiltrados.map((managedUser) => (
                    <div
                      key={managedUser.id}
                      className="grid gap-3 px-5 py-4 md:grid-cols-[2fr_1fr_1fr_1fr_1.2fr] md:items-center md:gap-4"
                    >
                      {/* Usuário */}
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-teal/20 text-sm font-bold text-brand-teal">
                          {managedUser.name
                            .split(' ')
                            .map((part) => part[0])
                            .slice(0, 2)
                            .join('')
                            .toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate font-semibold text-brand-ink">{managedUser.name}</div>
                          <TruncatedEmail email={managedUser.email} />
                        </div>
                      </div>

                      {/* Perfil / Cadastro / Status — linha em mobile, colunas no desktop */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 md:contents">
                        <div>
                          <Badge variant={managedUser.role === 'COORDENADOR' ? 'coordinator' : 'professor'}>
                            {managedUser.role === 'COORDENADOR' ? 'Coordenador' : 'Professor'}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {managedUser.approvedAt
                            ? new Date(managedUser.approvedAt).toLocaleDateString('pt-BR')
                            : '—'}
                        </div>
                        <div>
                          <Badge variant={managedUser.status === 'APROVADO' ? 'approved' : 'pending'}>
                            {managedUser.status === 'APROVADO' ? 'Ativo' : 'Pendente'}
                          </Badge>
                        </div>
                      </div>

                      {/* Ações */}
                      <div className="flex flex-wrap gap-2 md:justify-end">
                        <Button
                          className="flex-1 sm:flex-none md:min-w-28"
                          onClick={() => setEditingUser(managedUser)}
                          variant="secondary"
                        >
                          <CheckCircle2 className="mr-2 h-4 w-4 shrink-0" />
                          Editar
                        </Button>
                        <Button
                          className="flex-1 sm:flex-none border-brand-teal/20 text-brand-teal hover:bg-brand-teal/5 md:min-w-28"
                          onClick={() => void handleToggleUserStatus(managedUser.id)}
                          variant="outline"
                        >
                          <RefreshCcw className="mr-2 h-4 w-4 shrink-0" />
                          {managedUser.status === 'APROVADO' ? 'Desativar' : 'Ativar'}
                        </Button>
                        <Button
                          className="flex-1 sm:flex-none border-rose-200 text-rose-600 hover:bg-rose-50 md:min-w-28"
                          onClick={() => void handleRemoveUser(managedUser.id)}
                          variant="outline"
                        >
                          <Trash2 className="mr-2 h-4 w-4 shrink-0" />
                          Remover
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
