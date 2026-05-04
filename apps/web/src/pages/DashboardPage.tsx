import { AlertTriangle, CheckCircle2, ClipboardList, Store } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { PageHeader } from '../components/PageHeader';
import { ProgressBar } from '../components/ProgressBar';

const today = new Date().toISOString().slice(0, 10);
const stores = ['Lia Burguer', 'Lia Pizza', 'Lia Salgados'];

export function DashboardPage() {
  const { data: checklists = [], isLoading } = useQuery({
    queryKey: ['checklists', today],
    queryFn: () => api.checklists(today)
  });

  const total = checklists.reduce((sum, run) => sum + run.total, 0);
  const completed = checklists.reduce((sum, run) => sum + run.completed, 0);
  const progress = total ? Math.round((completed / total) * 100) : 0;
  const pending = total - completed;

  return (
    <>
      <PageHeader
        eyebrow="Visão geral"
        title="Painel de operação diária"
        description="Acompanhe execução, pendências e pontos de atenção do turno em um formato rápido para balcão, cozinha e delivery."
      />

      <section className="grid gap-3 sm:grid-cols-3">
        <MetricCard label="Progresso do dia" value={`${progress}%`} icon={CheckCircle2} tone="green" />
        <MetricCard label="Tarefas pendentes" value={`${pending}`} icon={ClipboardList} tone="amber" />
        <MetricCard label="Lojas ativas" value="3" icon={Store} tone="red" />
      </section>

      <section className="mt-5 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="surface rounded-lg p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-black text-lia-burgundy">Checklists de hoje</h3>
              <p className="text-sm text-lia-muted">Resumo gerado a partir da API.</p>
            </div>
            <span className="rounded-lg bg-lia-red px-3 py-1 text-sm font-bold text-white">{today}</span>
          </div>
          {isLoading ? (
            <p className="text-sm text-lia-muted">Carregando checklists...</p>
          ) : (
            <div className="space-y-3">
              {checklists.map((run) => (
                <article key={run.id} className="rounded-lg border border-lia-red/10 bg-white p-3">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div>
                      <h4 className="font-bold text-lia-burgundy">{run.title}</h4>
                      <p className="text-xs uppercase tracking-[0.14em] text-lia-muted">{run.category}</p>
                    </div>
                    <strong className="text-lia-red">{run.progress}%</strong>
                  </div>
                  <ProgressBar value={run.progress} />
                  <p className="mt-2 text-sm text-lia-muted">
                    {run.completed} de {run.total} itens concluídos.
                  </p>
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="surface rounded-lg p-4">
            <h3 className="text-lg font-black text-lia-burgundy">Lojas do grupo</h3>
            <div className="mt-3 grid gap-3">
              {stores.map((store) => (
                <div key={store} className="flex items-center justify-between rounded-lg bg-white px-3 py-3">
                  <span className="font-semibold text-lia-burgundy">{store}</span>
                  <span className="rounded-lg bg-lia-green/10 px-2 py-1 text-xs font-bold text-lia-green">Online</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-lia-amber/25 bg-lia-amber/10 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-1 text-lia-amber" />
              <div>
                <h3 className="font-black text-lia-burgundy">Alertas operacionais</h3>
                <p className="mt-1 text-sm leading-6 text-lia-muted">
                  Priorize validade, limpeza crítica, estoque de embalagens e fechamento de caixa. Estes alertas podem
                  virar regras configuráveis no painel administrativo.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
  tone
}: {
  label: string;
  value: string;
  icon: typeof CheckCircle2;
  tone: 'green' | 'amber' | 'red';
}) {
  const toneMap = {
    green: 'bg-lia-green/10 text-lia-green',
    amber: 'bg-lia-amber/10 text-lia-amber',
    red: 'bg-lia-red/10 text-lia-red'
  };
  return (
    <article className="surface rounded-lg p-4">
      <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-lg ${toneMap[tone]}`}>
        <Icon size={20} />
      </div>
      <p className="text-sm font-semibold text-lia-muted">{label}</p>
      <strong className="mt-1 block text-3xl font-black text-lia-burgundy">{value}</strong>
    </article>
  );
}
