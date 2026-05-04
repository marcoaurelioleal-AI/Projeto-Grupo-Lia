import { Lock, LogIn } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';

const logos = [
  { src: '/logos/logo_burger.png', label: 'Lia Burguer' },
  { src: '/logos/logo_pizza.png', label: 'Lia Pizza' },
  { src: '/logos/logo_salgados.png', label: 'Lia Salgados' }
];

export function LoginPage() {
  const { login, user } = useAuth();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(username, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível entrar.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen bg-lia-beige md:grid-cols-[1.05fr_0.95fr]">
      <section className="flex min-h-[42vh] flex-col justify-between bg-lia-burgundy px-6 py-8 text-white md:min-h-screen md:px-10">
        <div className="flex items-center gap-3">
          <img src="/logos/logo_burger.png" alt="Grupo Lia" className="h-12 w-12 rounded-lg object-cover" />
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-lia-beige">Central LIA</p>
            <h1 className="text-2xl font-black">Grupo Empresarial Lia</h1>
          </div>
        </div>

        <div className="my-8 max-w-xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-lia-beige/80">Central de operação</p>
          <h2 className="mt-3 text-4xl font-black leading-tight md:text-5xl">
            Seu turno mais organizado, do pedido ao fechamento.
          </h2>
          <p className="mt-4 text-base leading-7 text-lia-cream/85">
            Acesse checklists, padrões de preparo, manuais das lojas e o Assistente LIA para manter a operação rápida,
            segura e no padrão do Grupo Lia.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {logos.map((logo) => (
            <div key={logo.label} className="rounded-lg border border-white/15 bg-white/10 p-3">
              <img src={logo.src} alt={logo.label} className="h-16 w-full rounded-lg object-cover" />
              <p className="mt-2 text-center text-xs font-semibold">{logo.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="flex items-center justify-center px-5 py-8">
        <form onSubmit={handleSubmit} className="surface w-full max-w-md rounded-lg p-5 md:p-7">
          <div className="mb-6">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-lia-red text-white">
              <Lock />
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-lia-red">Acesso interno</p>
            <h2 className="mt-1 text-2xl font-black text-lia-burgundy">Entrar na Central LIA</h2>
          </div>

          <label className="block text-sm font-semibold text-lia-burgundy">
            Usuário
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
