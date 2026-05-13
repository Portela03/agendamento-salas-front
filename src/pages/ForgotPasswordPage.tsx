import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { solicitarResetSenha } from '../services/authService';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      await solicitarResetSenha(email);
      setSuccess('E-mail de redefinição enviado com sucesso. Verifique a caixa de entrada, spam ou lixo eletrônico.');
    } catch (err: any) {
      console.error('Erro ao solicitar reset de senha:', err);
      
      // Captura erros específicos do back-end
      if (err?.response?.status === 404) {
        setError('E-mail não encontrado no sistema.');
      } else if (err?.response?.status === 403) {
        setError('Sua conta ainda não foi aprovada. Aguarde a aprovação do coordenador.');
      } else if (err?.response?.status === 502) {
        setError('Falha ao enviar o e-mail. Tente novamente mais tarde.');
      } else if (err?.response?.status === 400) {
        setError(err?.response?.data?.message || 'E-mail inválido.');
      } else {
        setError('Erro ao solicitar redefinição de senha. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container mx-auto flex min-h-screen items-center justify-center py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Esqueci minha senha</CardTitle>
          <CardDescription>Informe seu e-mail para receber o link de redefinição.</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-medium">E-mail</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seuemail@exemplo.com"
                required
              />
            </div>

            {success && <p className="text-sm text-emerald-600 font-medium">{success}</p>}
            {error && <p className="text-sm text-rose-600 font-medium">{error}</p>}

            <Button className="w-full" disabled={loading} type="submit">
              {loading ? 'Enviando...' : 'Enviar e-mail'}
            </Button>
          </form>

          <div className="text-center text-sm">
            <Link className="text-brand-teal hover:underline" to="/login">
              Voltar para o login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}