import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Camera, Download, FileSearch, History, ShieldCheck } from 'lucide-react';
import { useMemo, useState } from 'react';
import { api } from '../api/client';
import { EvidenceThumbnail } from '../components/EvidenceUpload';
import { PageHeader } from '../components/PageHeader';
import type { AuditLog, ChecklistEvidence } from '../types';

function toDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

function daysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return toDateInput(date);
}

const today = toDateInput(new Date());

export function AuditPage() {
  const [startDate, setStartDate] = useState(daysAgo(29));
  const [endDate, setEndDate] = useState(today);
  const [store, setStore] = useState('');
  const [checklistTitle, setChecklistTitle] = useState('');
  const [uploadedBy, setUploadedBy] = useState('');
  const queryClient = useQueryClient();

  const filters = useMemo(
    () => ({
      store: store || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      checklistTitle: checklistTitle || undefined,
      uploadedBy: uploadedBy || undefined
    }),
    [checklistTitle, endDate, startDate, store, uploadedBy]
  );

  const options = useQuery({
    queryKey: ['audit-filter-options'],
    queryFn: api.evidenceAuditFilterOptions
  });

  const evidences = useQuery({
    queryKey: ['audit-evidences', filters],
    queryFn: () => api.evidenceAudit(filters)
  });

  const logs = useQuery({
    queryKey: ['audit-logs', store],
    queryFn: () => api.auditLogs({ entityType: 'evidences', store: store || undefined, limit: 12 })
  });

  const exportReport = useMutation({
    mutationFn: () => api.evidenceAuditExport(filters),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `auditoria-evidências-${startDate || 'inicio'}-${endDate || 'fim'}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    }
  });

  const rows = evidences.data ?? [];
  const uniqueStores = new Set(rows.map((item) => item.store).filter(Boolean));
  const uniqueUsers = new Set(rows.map((item) => item.uploaded_by).filter(Boolean));
  const imageCount = rows.filter((item) => item.content_type.startsWith('image/')).length;

  return (
    <>
      <PageHeader
        eyebrow="Auditoria"
        title="Evidências dos checklists"
        description="Revise fotos, responsáveis, lojas e trilha de acesso das evidências operacionais."
      />

      <section className="surface mb-5 grid gap-3 rounded-lg p-4 xl:grid-cols-[1fr_1fr_1fr_1fr_auto] xl:items-end">
        <label className="text-sm font-bold text-lia-burgundy">
          Loja
          <select
            className="focus-ring mt-2 w-full rounded-lg border border-lia-red/15 bg-white px-3 py-3"
            value={store}
            onChange={(event) => setStore(event.target.value)}
          >
            <option value="">Todas</option>
            {options.data?.stores.map((storeName) => (
              <option key={storeName} value={storeName}>
                {storeName}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm font-bold text-lia-burgundy">
          Inicio
          <input
            className="focus-ring mt-2 w-full rounded-lg border border-lia-red/15 bg-white px-3 py-3"
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
          />
        </label>

        <label className="text-sm font-bold text-lia-burgundy">
          Fim
          <input
            className="focus-ring mt-2 w-full rounded-lg border border-lia-red/15 bg-white px-3 py-3"
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
          />
        </label>

        <label className="text-sm font-bold text-lia-burgundy">
          Checklist
          <select
            className="focus-ring mt-2 w-full rounded-lg border border-lia-red/15 bg-white px-3 py-3"
            value={checklistTitle}
            onChange={(event) => setChecklistTitle(event.target.value)}
          >
            <option value="">Todos</option>
            {options.data?.checklists.map((title) => (
              <option key={title} value={title}>
                {title}
              </option>
            ))}
          </select>
        </label>

        <div className="grid gap-2 sm:grid-cols-[1fr_auto] xl:grid-cols-1">
          <label className="text-sm font-bold text-lia-burgundy">
            Usuário
            <select
              className="focus-ring mt-2 w-full rounded-lg border border-lia-red/15 bg-white px-3 py-3"
              value={uploadedBy}
              onChange={(event) => setUploadedBy(event.target.value)}
            >
              <option value="">Todos</option>
              {options.data?.users.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => exportReport.mutate()}
            disabled={exportReport.isPending || !rows.length}
            className="focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-lia-burgundy px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
          >
            <Download size={17} />
            {exportReport.isPending ? 'Exportando...' : 'Exportar'}
          </button>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AuditMetric label="Evidências" value={rows.length} icon={Camera} />
        <AuditMetric label="Fotos" value={imageCount} icon={FileSearch} />
        <AuditMetric label="Lojas" value={uniqueStores.size} icon={ShieldCheck} />
        <AuditMetric label="Usuários" value={uniqueUsers.size} icon={History} />
      </section>

      {evidences.error ? <p className="mt-4 rounded-lg bg-lia-red/10 p-3 text-sm text-lia-red">{evidences.error.message}</p> : null}
      {exportReport.error ? (
        <p className="mt-4 rounded-lg bg-lia-red/10 p-3 text-sm text-lia-red">{exportReport.error.message}</p>
      ) : null}

      <section className="mt-5 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="surface rounded-lg p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-black text-lia-burgundy">Revisao de execução</h3>
              <p className="text-sm text-lia-muted">{rows.length} registro(s) no periodo selecionado.</p>
            </div>
            <span className="rounded-lg bg-lia-red/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-lia-red">
              Evidências
            </span>
          </div>

          {evidences.isLoading ? <p className="text-sm text-lia-muted">Carregando evidências...</p> : null}
          {!evidences.isLoading && !rows.length ? (
            <p className="rounded-lg bg-white p-3 text-sm text-lia-muted">Nenhuma evidencia encontrada.</p>
          ) : null}

          <div className="grid gap-3 lg:grid-cols-2">
            {rows.map((evidence) => (
              <EvidenceAuditRow key={evidence.id} evidence={evidence} />
            ))}
          </div>
        </div>

        <div className="surface rounded-lg p-4">
          <div className="mb-4 flex items-center gap-2">
            <History className="text-lia-red" size={20} />
            <h3 className="text-lg font-black text-lia-burgundy">Acoes registradas</h3>
          </div>
          {logs.isLoading ? <p className="text-sm text-lia-muted">Carregando trilha de auditoria...</p> : null}
          <div className="space-y-3">
            {(logs.data ?? []).map((log) => (
              <AuditLogRow key={log.id} log={log} />
            ))}
            {!logs.isLoading && !logs.data?.length ? (
              <p className="rounded-lg bg-white p-3 text-sm text-lia-muted">Nenhuma acao registrada ainda.</p>
            ) : null}
          </div>
        </div>
      </section>
    </>
  );
}

function AuditMetric({
  label,
  value,
  icon: Icon
}: {
  label: string;
  value: number;
  icon: typeof Camera;
}) {
  return (
    <article className="surface rounded-lg p-4">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-lia-red/10 text-lia-red">
        <Icon size={20} />
      </div>
      <p className="text-sm font-semibold text-lia-muted">{label}</p>
      <strong className="mt-1 block text-3xl font-black text-lia-burgundy">{value}</strong>
    </article>
  );
}

function EvidenceAuditRow({ evidence }: { evidence: ChecklistEvidence }) {
  return (
    <article className="rounded-lg border border-lia-red/10 bg-white p-3">
      <div className="flex gap-3">
        <EvidenceThumbnail evidence={evidence} />
        <div className="min-w-0 text-sm">
          <p className="font-black text-lia-burgundy">{evidence.store ?? 'Grupo Lia'}</p>
          <p className="truncate font-semibold text-lia-ink">{evidence.checklist_title ?? 'Checklist'}</p>
          <p className="line-clamp-2 text-xs leading-5 text-lia-muted">{evidence.item_text ?? evidence.original_filename}</p>
        </div>
      </div>
      <dl className="mt-3 grid gap-2 text-xs text-lia-muted">
        <div className="flex items-center justify-between gap-3 rounded-lg bg-lia-cream px-3 py-2">
          <dt className="font-bold text-lia-burgundy">Usuário</dt>
          <dd className="truncate">{evidence.uploaded_by ?? 'usuário'}</dd>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-lg bg-lia-cream px-3 py-2">
          <dt className="font-bold text-lia-burgundy">Data</dt>
          <dd>{new Date(evidence.created_at).toLocaleString('pt-BR')}</dd>
        </div>
      </dl>
    </article>
  );
}

function AuditLogRow({ log }: { log: AuditLog }) {
  return (
    <article className="rounded-lg bg-white p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-black text-lia-burgundy">{formatAction(log.action)}</p>
        <span className="rounded-lg bg-lia-green/10 px-2 py-1 text-xs font-bold text-lia-green">{log.status}</span>
      </div>
      <p className="mt-2 text-xs text-lia-muted">
        {new Date(log.created_at).toLocaleString('pt-BR')} por {log.actor_username ?? 'sistema'}
      </p>
      {log.store ? <p className="mt-1 text-xs font-semibold text-lia-muted">{log.store}</p> : null}
    </article>
  );
}

function formatAction(action: string) {
  const labels: Record<string, string> = {
    evidence_audit_list: 'Filtro aplicado',
    evidence_audit_export: 'Relatorio exportado',
    evidence_file_view: 'Arquivo visualizado'
  };
  return labels[action] ?? action;
}
