import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock3, Trash2 } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { api } from '../api/client';
import { PageHeader } from '../components/PageHeader';
import { useAuth } from '../contexts/useAuth';
import type { WasteReason } from '../types';

const reasonLabels: Record<WasteReason, string> = {
  validade: 'Validade',
  erro_preparo: 'Erro de preparo',
  queda: 'Queda',
  produto_danificado: 'Produto danificado',
  sobra: 'Sobra',
  cancelamento: 'Cancelamento',
  falha_armazenamento: 'Falha de armazenamento',
  fornecedor: 'Fornecedor',
  outro: 'Outro'
};

export function WastePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const canRegister = user?.role !== 'auditor';
  const [form, setForm] = useState({ itemId: 0, quantity: 1, reason: 'erro_preparo' as WasteReason, notes: '' });
  const inventory = useQuery({ queryKey: ['inventory', 'waste'], queryFn: () => api.inventory() });
  const waste = useQuery({ queryKey: ['waste'], queryFn: api.waste });
  const summary = useQuery({ queryKey: ['waste-summary'], queryFn: api.wasteSummary });
  const createWaste = useMutation({
    mutationFn: api.createWaste,
    onSuccess: () => {
      setForm({ itemId: 0, quantity: 1, reason: 'erro_preparo', notes: '' });
      void queryClient.invalidateQueries({ queryKey: ['inventory'] });
      void queryClient.invalidateQueries({ queryKey: ['waste'] });
      void queryClient.invalidateQueries({ queryKey: ['waste-summary'] });
    }
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createWaste.mutate({
      inventory_item_id: form.itemId,
      quantity: form.quantity,
      reason: form.reason,
      notes: form.notes.trim() || undefined
    });
  }

  return (
    <>
      <PageHeader
        eyebrow="Registro em cerca de 20 segundos"
        title="Perdas e desperdício"
        description="A perda baixa o estoque imediatamente e mantém produto, motivo, responsável, custo histórico e horário."
      />
      <section className="grid gap-3 sm:grid-cols-3">
        <Summary label="Registros" value={summary.data?.record_count ?? 0} />
        <Summary label="Quantidade perdida" value={summary.data?.total_quantity ?? 0} />
        {summary.data?.total_cost !== undefined ? <Summary label="Valor histórico" value={formatMoney(summary.data.total_cost)} /> : null}
      </section>

      <section className="mt-5 grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        {canRegister ? (
          <form onSubmit={submit} className="surface rounded-lg p-4">
            <h2 className="flex items-center gap-2 text-lg font-black text-lia-burgundy"><Trash2 size={20} /> Registrar perda</h2>
            <div className="mt-3 grid gap-3">
              <label className="text-sm font-bold text-lia-burgundy">Produto<select aria-label="Produto perdido" required value={form.itemId || ''} onChange={(e) => setForm({ ...form, itemId: Number(e.target.value) })} className="focus-ring mt-2 w-full rounded-lg border border-lia-red/15 bg-white px-3 py-3"><option value="">Selecione</option>{inventory.data?.map((item) => <option key={item.id} value={item.id}>{item.product_name} · {item.store} · saldo {item.quantity}</option>)}</select></label>
              <label className="text-sm font-bold text-lia-burgundy">Quantidade<input aria-label="Quantidade perdida" required type="number" min="0.001" step="0.001" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} className="focus-ring mt-2 w-full rounded-lg border border-lia-red/15 bg-white px-3 py-3" /></label>
              <label className="text-sm font-bold text-lia-burgundy">Motivo<select aria-label="Motivo da perda" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value as WasteReason })} className="focus-ring mt-2 w-full rounded-lg border border-lia-red/15 bg-white px-3 py-3">{Object.entries(reasonLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label className="text-sm font-bold text-lia-burgundy">Observação opcional<textarea aria-label="Observação da perda" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="focus-ring mt-2 w-full rounded-lg border border-lia-red/15 bg-white px-3 py-3" /></label>
              {createWaste.error ? <p className="rounded-lg bg-lia-red/10 p-3 text-sm font-semibold text-lia-red">{createWaste.error.message}</p> : null}
              <button disabled={createWaste.isPending} className="focus-ring rounded-lg bg-lia-red px-4 py-3 font-bold text-white disabled:opacity-60">{createWaste.isPending ? 'Registrando...' : 'Confirmar perda'}</button>
            </div>
          </form>
        ) : null}

        <div className="surface rounded-lg p-4">
          <h2 className="flex items-center gap-2 text-lg font-black text-lia-burgundy"><Clock3 size={20} /> Histórico recente</h2>
          <div className="mt-3 space-y-3">
            {waste.data?.map((record) => <article key={record.id} className="rounded-lg border border-lia-red/10 bg-white p-3"><div className="flex items-start justify-between gap-3"><div><strong className="text-lia-burgundy">{record.product_name}</strong><p className="text-sm text-lia-muted">{record.store} · {reasonLabels[record.reason]}</p></div><strong className="text-lia-red">-{record.quantity} {record.unit}</strong></div><p className="mt-2 text-xs text-lia-muted">{record.created_by} · {new Date(record.created_at).toLocaleString('pt-BR')}{record.total_cost !== undefined ? ` · ${formatMoney(record.total_cost)}` : ''}</p>{record.notes ? <p className="mt-1 text-sm">{record.notes}</p> : null}</article>)}
            {!waste.isLoading && !waste.data?.length ? <p className="text-sm text-lia-muted">Nenhuma perda registrada.</p> : null}
          </div>
        </div>
      </section>
    </>
  );
}

function formatMoney(value: number) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value); }
function Summary({ label, value }: { label: string; value: string | number }) { return <article className="surface rounded-lg p-4"><p className="text-sm font-semibold text-lia-muted">{label}</p><strong className="mt-1 block text-2xl font-black text-lia-burgundy">{value}</strong></article>; }
