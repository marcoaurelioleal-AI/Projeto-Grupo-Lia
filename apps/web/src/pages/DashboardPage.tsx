import { AlertTriangle, Camera, CheckCircle2, ClipboardList, Store } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { EvidenceThumbnail } from '../components/EvidenceUpload';
import { PageHeader } from '../components/PageHeader';
import { ProgressBar } from '../components/ProgressBar';
import { useAuth } from '../contexts/useAuth';
import type { ChecklistRun, ExecutiveDashboard, ReportSummary } from '../types';

const today = new Date().toISOString().slice(0, 10);
const executiveRoles = new Set(['admin', 'lideranca', 'gerente', 'auditor']);

export function DashboardPage() {
  const { user } = useAuth();
  const canViewExecutive = Boolean(user?.role && executiveRoles.has(user.role));

  const executive = useQuery({
    queryKey: ['executive-dashboard'],
    queryFn: api.executiveDashboard,
    enabled: canViewExecutive
  });

  const checklists = useQuery({
    queryKey: ['checklists', today],
    queryFn: () => api.checklists(today),
    enabled: !canViewExecutive
  });

  if (canViewExecutive) {
    return <ExecutiveDashboardView data={executive.data} loading={executive.isLoading} error={executive.error} />;
  }

  return <OperationalDashboard checklists={checklists.data ?? []} loading={checklists.isLoading} error={checklists.error} />;
}

function ExecutiveDashboardView({
  data,
  loading,
  error
}: {
  data: ExecutiveDashboard | undefined;
  loading: boolean;
  error: Error | null;
}) {
  const summary7 = data?.summary_7d;
  const summary30 = data?.summary_30d;

  return (
    <>
      <PageHeader
        eyebrow="Visao executiva"
        title="Operação em poucos segundos"
        description="Pendências por loja, evidências recentes e comparativo de 7/30 dias para gestão."
      />

      {loading ? <p className="text-sm text-lia-muted">Carregando dashboard executivo...</p> : null}
      {error ? <p className="rounded-lg bg-lia-red/10 p-3 text-sm text-lia-red">{error.message}</p> : null}

      {data ? (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <ExecutiveMetric
              label="Conclusao 7 dias"
              value={`${summary7?.completion_percent ?? 0}%`}
              icon={CheckCircle2}
              tone="green"
            />
            <ExecutiveMetric
              label="Pendencias 30 dias"
              value={summary30?.pending_tasks ?? 0}
              icon={ClipboardList}
              tone="amber"
            />
            <ExecutiveMetric label="Evidências recentes" value={data.recent_evidences.length} icon={Camera} tone="burgundy" />
          </section>

          <section className="mt-5 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="surface rounded-lg p-4">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-black text-lia-burgundy">Lojas com mais pendências</h3>
                  <p className="text-sm text-lia-muted">Base de hoje, {new Date(data.today).toLocaleDateString('pt-BR')}.</p>
                </div>
                <span className="rounded-lg bg-lia-red px-3 py-1 text-sm font-bold text-white">{data.visible_stores.length} loja(s)</span>
              </div>
              <div className="space-y-3">
                {data.store_rankings.map((store) => (
                  <article key={store.store} className="rounded-lg border border-lia-red/10 bg-white p-3">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <h4 className="truncate font-black text-lia-burgundy">{store.store}</h4>
                        <p className="text-sm text-lia-muted">
                          {store.completed_items} de {store.total_items} itens concluidos
                        </p>
                      </div>
                      <strong className={store.pending_tasks > 0 ? 'text-lia-red' : 'text-lia-green'}>
                        {store.pending_tasks} pend.
                      </strong>
                    </div>
                    <ProgressBar value={store.completion_percent} />
                  </article>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <SummaryPanel title="Ultimos 7 dias" summary={summary7} />
              <SummaryPanel title="Ultimos 30 dias" summary={summary30} />
            </div>
          </section>

          <section className="mt-5">
            <div className="surface rounded-lg p-4">
              <div className="mb-4 flex items-center gap-2">
                <Camera className="text-lia-red" size={20} />
                <h3 className="text-lg font-black text-lia-burgundy">Evidências recentes</h3>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {data.recent_evidences.map((evidence) => (
                  <article key={evidence.id} className="rounded-lg border border-lia-red/10 bg-white p-3">
                    <div className="flex gap-3">
                      <EvidenceThumbnail evidence={evidence} />
                      <div className="min-w-0 text-sm">
                        <p className="truncate font-black text-lia-burgundy">{evidence.store ?? 'Loja não informada'}</p>
                        <p className="truncate font-semibold text-lia-ink">{evidence.checklist_title ?? 'Checklist'}</p>
                        <p className="mt-1 text-xs text-lia-muted">
                          {new Date(evidence.created_at).toLocaleString('pt-BR')} por {evidence.uploaded_by ?? 'usuário'}
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
                {!data.recent_evidences.length ? (
                  <p className="rounded-lg bg-white p-3 text-sm text-lia-muted">Nenhuma evidencia enviada ainda.</p>
                ) : null}
              </div>
            </div>
          </section>
        </>
      ) : null}
    </>
  );
}

function OperationalDashboard({
  checklists,
  loading,
  error
}: {
  checklists: ChecklistRun[];
  loading: boolean;
  error: Error | null;
}) {
  const total = checklists.reduce((sum, run) => sum + run.total, 0);
  const completed = checklists.reduce((sum, run) => sum + run.completed, 0);
  const progress = total ? Math.round((completed / total) * 100) : 0;
  const pending = total - completed;

  return (
    <>
      <PageHeader
        eyebrow="Visao geral"
        title="Painel de operacao diaria"
        description="Acompanhe execução, pendências e pontos de atenção do turno em um formato rápido para balcão, cozinha e delivery."
      />

      <section className="grid gap-3 sm:grid-cols-3">
        <ExecutiveMetric label="Progresso do dia" value={`${progress}%`} icon={CheckCircle2} tone="green" />
        <ExecutiveMetric label="Tarefas pendentes" value={pending} icon={ClipboardList} tone="amber" />
        <ExecutiveMetric label="Checklists" value={checklists.length} icon={Store} tone="red" />
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
          {loading ? <p className="text-sm text-lia-muted">Carregando checklists...</p> : null}
          {error ? <p className="rounded-lg bg-lia-red/10 p-3 text-sm text-lia-red">{error.message}</p> : null}
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
                  {run.completed} de {run.total} itens concluidos.
                </p>
              </article>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-lia-amber/25 bg-lia-amber/10 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-1 text-lia-amber" />
            <div>
              <h3 className="font-black text-lia-burgundy">Alertas operacionais</h3>
              <p className="mt-1 text-sm leading-6 text-lia-muted">
                Priorize validade, limpeza critica, estoque de embalagens e fechamento de caixa no turno atual.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function ExecutiveMetric({
  label,
  value,
  icon: Icon,
  tone
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone: 'green' | 'amber' | 'red' | 'burgundy';
}) {
  const toneMap = {
    green: 'bg-lia-green/10 text-lia-green',
    amber: 'bg-lia-amber/10 text-lia-amber',
    red: 'bg-lia-red/10 text-lia-red',
    burgundy: 'bg-lia-burgundy text-white'
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

function SummaryPanel({ title, summary }: { title: string; summary: ReportSummary | undefined }) {
  return (
    <article className="surface rounded-lg p-4">
      <h3 className="text-lg font-black text-lia-burgundy">{title}</h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <SummaryItem label="Conclusao" value={`${summary?.completion_percent ?? 0}%`} />
        <SummaryItem label="Pendencias" value={summary?.pending_tasks ?? 0} />
        <SummaryItem label="Evidências" value={summary?.evidences_uploaded ?? 0} />
      </div>
    </article>
  );
}

function SummaryItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-white px-3 py-2">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-lia-muted">{label}</p>
      <strong className="text-xl font-black text-lia-burgundy">{value}</strong>
    </div>
  );
}
