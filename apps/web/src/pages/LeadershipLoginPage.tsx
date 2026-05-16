import { Lock, LogIn } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { api, getLeadershipToken, setLeadershipToken } from '../api/client';

export function LeadershipLoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('lideranca');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (getLeadershipToken()) {
    return <Navigate to="/lideranca" replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await api.leadershipLogin(username, password);
      setLeadershipToken(response.access_token);
      navigate('/lideranca', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nao foi possivel entrar.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen bg-lia-beige md:grid-cols-[1fr_0.9fr]">
      <section className="flex min-h-[38vh] flex-col justify-between bg-lia-burgundy px-6 py-8 text-white md:min-h-screen md:px-10">
        <div className="flex items-center gap-3">
          <img src="/logos/logo_burger.png" alt="Grupo Lia" className="h-12 w-12 rounded-lg object-cover" />
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-lia-beige">Central LIA</p>
            <h1 className="text-2xl font-black">Area da lideranca</h1>
          </div>
        </div>

        <div className="my-8 max-w-xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-lia-beige/80">Acesso reservado</p>
          <h2 className="mt-3 text-4xl font-black leading-tight md:text-5xl">
            Registros internos de equipe em um lugar controlado.
          </h2>
          <p className="mt-4 text-base leading-7 text-lia-cream/85">
            Cadastre funcionarios e registre feedbacks, advertencias, suspensoes e desligamentos com historico
            organizado para acompanhamento da gestao.
          </p>
        </div>

        <Link to="/login" className="text-sm font-bold text-lia-cream underline underline-offset-4">
          Voltar ao acesso operacional
        </Link>
      </section>

      <section className="flex items-center justify-center px-5 py-8">
        <form onSubmit={handleSubmit} className="surface w-full max-w-md rounded-lg p-5 md:p-7">
          <div className="mb-6">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-lia-red text-white">
              <Lock />
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-lia-red">Lideranca</p>
            <h2 className="mt-1 text-2xl font-black text-lia-burgundy">Entrar na area reservada</h2>
          </div>

          <label className="block text-sm font-semibold text-lia-burgundy">
            Usuario
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="focus-ring mt-2 w-full rounded-lg border border-lia-red/15 bg-white px-3 py-3"
              autoComplete="username"
            />
          </label>

          <label className="mt-4 block text-sm font-semibold text-lia-burgundy">
            Senha
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="focus-ring mt-2 w-full rounded-lg border border-lia-red/15 bg-white px-3 py-3"
              type="password"
              autoComplete="current-password"
            />
          </label>

          {error ? <p className="mt-4 rounded-lg bg-lia-red/10 px-3 py-2 text-sm text-lia-red">{error}</p> : null}

          <button
            disabled={loading}
            className="focus-ring mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-lia-red px-4 py-3 font-bold text-white transition hover:bg-lia-wine disabled:cursor-not-allowed disabled:opacity-70"
          >
            <LogIn size={18} />
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </section>
    </main>
  );
}
