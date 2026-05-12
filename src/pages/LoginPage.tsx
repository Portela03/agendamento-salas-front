import { type FormEvent, type ReactNode, useState } from 'react';
import { ArrowRight, Eye, EyeOff, KeyRound, ShieldCheck, UserPlus2 } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { useAuth } from '../hooks/useAuth';
import { type UserRole, userService } from '../services/userService';

export function LoginPage() {
  const { signIn, isLoading } = useAuth();

  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('PROFESSOR');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);


  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setSuccess('');
    setIsSubmitting(true);

    try {
      if (isRegisterMode) {
        await userService.register({ name, email, password, role });
        setSuccess(`Solicitação enviada para perfil de ${role === 'COORDENADOR' ? 'coordenador' : 'usuário professor'}. O coordenador responsável precisa aprovar seu acesso antes do primeiro login.`);
        setIsRegisterMode(false);
        setName('');
        setPassword('');
        setRole('PROFESSOR');
        return;
      }

      await signIn({ email, password });
    } catch (err: unknown) {
      if (
        err &&
        typeof err === 'object' &&
        'response' in err &&
        err.response &&
        typeof err.response === 'object' &&
        'data' in err.response &&
        err.response.data &&
        typeof err.response.data === 'object' &&
        'message' in err.response.data
      ) {
        setError(String(err.response.data.message));
        return;
      }

      setError(
        isRegisterMode
          ? 'Não foi possível enviar a solicitação agora. Tente novamente.'
          : 'Não foi possível entrar agora. Tente novamente.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const isBusy = isLoading || isSubmitting;


  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 bg-hero-grid bg-[size:26px_26px] opacity-40" />
      <div className="container relative flex min-h-screen items-center py-10">
        <div className="grid w-full gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:grid-rows-[auto_auto]">
          {/* 1 — Intro: mobile primeiro, desktop coluna esquerda linha 1 */}
          <section className="animate-fade-up space-y-8 lg:col-start-1 lg:row-start-1">
            <Badge className="w-fit border border-brand-teal/10 bg-white/70 px-4 py-2 text-brand-teal shadow-soft" variant="default">
              Fatec Zona Leste • Reserva de Salas
            </Badge>

            <div className="max-w-2xl space-y-5">
              <h1 className="font-serif text-5xl leading-tight text-balance text-brand-ink md:text-6xl">
                Um acesso organizado, seguro e com aprovação institucional.
              </h1>
              <p className="max-w-xl text-lg leading-8 text-muted-foreground">
                Professores e coordenadores solicitam acesso de forma simples. A aprovação continua centralizada,
                mantendo o sistema consistente e pronto para a rotina acadêmica.
              </p>
            </div>
          </section>

          {/* 2 — Card de login: mobile segundo (logo abaixo do título), desktop coluna direita abrangendo as 2 linhas */}
          <Card className="animate-fade-up border-brand-teal/10 bg-white/80 lg:col-start-2 lg:row-start-1 lg:row-span-2">
            <CardHeader className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <Badge variant={isRegisterMode ? 'pending' : 'default'}>
                  {isRegisterMode ? 'Solicitação de acesso' : 'Acesso institucional'}
                </Badge>
                <span className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                  {isRegisterMode ? 'Novo usuário' : 'Login'}
                </span>
              </div>
              <CardTitle className="text-3xl text-brand-ink">
                {isRegisterMode ? 'Peça sua aprovação' : 'Entre na plataforma'}
              </CardTitle>
              <CardDescription className="text-base">
                {isRegisterMode
                  ? 'Seu cadastro será analisado por um coordenador antes da liberação.'
                  : 'Acesse seu painel com as credenciais já aprovadas pelo coordenador.'}
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form className="space-y-5" onSubmit={handleSubmit}>
                {isRegisterMode && (
                  <>
                    <Field htmlFor="name" label="Nome completo">
                      <Input
                        id="name"
                        placeholder="Digite seu nome"
                        required
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                      />
                    </Field>

                    <Field htmlFor="role" label="Perfil solicitado">
                      <Select
                        id="role"
                        value={role}
                        onChange={(event) => setRole(event.target.value as UserRole)}
                      >
                        <option value="PROFESSOR">Usuário professor</option>
                        <option value="COORDENADOR">Coordenador</option>
                      </Select>
                    </Field>
                  </>
                )}

                <Field htmlFor="email" label="E-mail">
                  <Input
                    id="email"
                    autoComplete="email"
                    placeholder="nome@fatec.sp.gov.br"
                    required
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </Field>

                <Field htmlFor="password" label="Senha">
                  <div className="relative">
                    <Input
                      id="password"
                      autoComplete={isRegisterMode ? 'new-password' : 'current-password'}
                      placeholder="Digite sua senha"
                      required
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="pr-11"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-brand-ink transition-colors"
                      onClick={() => setShowPassword((v) => !v)}
                      tabIndex={-1}
                      aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </Field>

                {error && (
                  <div className="rounded-2xl border border-brand-wine/20 bg-brand-wine/5 px-4 py-3 text-sm text-brand-wine">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="rounded-2xl border border-brand-teal/20 bg-brand-teal/5 px-4 py-3 text-sm text-brand-teal">
                    {success}
                  </div>
                )}

                <div className="space-y-3 pt-2">
                  <Button
                    className="group w-full transition-all duration-200 active:scale-[0.98]"
                    disabled={isBusy}
                    size="lg"
                    type="submit"
                  >
                    {isBusy ? (
                      <>
                        <svg
                          className="mr-2 h-4 w-4 animate-spin"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        {isRegisterMode ? 'Enviando...' : 'Entrando...'}
                      </>
                    ) : (
                      <>
                        {isRegisterMode ? 'Enviar solicitação' : 'Entrar agora'}
                        <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                      </>
                    )}
                  </Button>

                  <Button
                    className="w-full"
                    onClick={() => {
                      setIsRegisterMode((current) => !current);
                      setError('');
                      setSuccess('');
                      setRole('PROFESSOR');
                    }}
                    type="button"
                    variant="outline"
                  >
                    {isRegisterMode ? 'Voltar para o login' : 'Solicitar novo cadastro'}
                  </Button>
                </div>
              </form>

              
            </CardContent>
          </Card>

          {/* 3 — Feature cards: mobile terceiro, desktop coluna esquerda linha 2 */}
          <div className="animate-fade-up grid gap-4 md:grid-cols-3 lg:col-start-1 lg:row-start-2 lg:self-end">
            <FeatureCard
              description="Solicitação rápida para professores e coordenadores sem abrir mão da triagem institucional."
              icon={<UserPlus2 className="h-5 w-5" />}
              title="Cadastro guiado"
            />
            <FeatureCard
              description="Somente o coordenador libera o acesso final, com controle real do fluxo."
              icon={<ShieldCheck className="h-5 w-5" />}
              title="Aprovação humana"
            />
            <FeatureCard
              description="Autenticação centralizada com status do usuário respeitado antes do login."
              icon={<KeyRound className="h-5 w-5" />}
              title="Entrada segura"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ children, htmlFor, label }: { children: ReactNode; htmlFor: string; label: string }) {
  return (
    <label className="block space-y-2" htmlFor={htmlFor}>
      <span className="text-sm font-semibold text-brand-ink">{label}</span>
      {children}
    </label>
  );
}

function FeatureCard({ description, icon, title }: { description: string; icon: ReactNode; title: string }) {
  return (
    <div className="rounded-[24px] border border-white/60 bg-white/70 p-5 shadow-soft backdrop-blur-sm">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-teal text-white">{icon}</div>
      <h2 className="text-lg font-bold text-brand-ink">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}
