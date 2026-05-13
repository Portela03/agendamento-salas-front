import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { confirmarResetSenha } from '../services/authService';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [token, setToken] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Extrai o token da URL automaticamente ao carregar
  useEffect(() => {
    const tokenFromUrl = searchParams.get('token');
    if (tokenFromUrl) {
      setToken(tokenFromUrl);
    } else {
      setError('Token inválido ou expirado.');
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!token) {
      setError('Token não encontrado.');
      return;
    }

    if (novaSenha !== confirmarSenha) {
      setError('As senhas não conferem.');
      return;
    }

    if (novaSenha.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');
      await confirmarResetSenha(token, novaSenha);
      setSuccess('Senha alterada com sucesso. Você será redirecionado para o login em 3 segundos...');

      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 3000);
    } catch (err: any) {
      console.error('Erro ao redefinir senha:', err);

      if (err?.response?.status === 400) {
        setError(err?.response?.data?.message || 'Token inválido ou expirado.');
      } else if (err?.response?.status === 401) {
        setError('Token inválido ou expirado.');
      } else {
        setError('Erro ao redefinir a senha. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container mx-auto flex min-h-screen items-center justify-center py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Redefinir senha</CardTitle>
          <CardDescription>Digite sua nova senha abaixo.</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* Token é enviado mas não aparece para o usuário */}
            <input type="hidden" value={token} />

            <div className="space-y-2">
              <label className="text-sm font-medium">Nova senha</label>
              <Input
                type="password"
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Confirmar nova senha</label>
              <Input
                type="password"
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                placeholder="Confirme sua senha"
                required
              />
            </div>

            {success && <p className="text-sm text-emerald-600 font-medium">{success}</p>}
            {error && <p className="text-sm text-rose-600 font-medium">{error}</p>}

            <Button className="w-full" disabled={loading || !token} type="submit">
              {loading ? 'Redefinindo...' : 'Redefinir senha'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}