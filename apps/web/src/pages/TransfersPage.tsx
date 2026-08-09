import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, CheckCircle2, Truck } from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';
import { api } from '../api/client';
import { PageHeader } from '../components/PageHeader';
import { useAuth } from '../contexts/useAuth';
import type { InventoryTransfer } from '../types';

const globalRoles = new Set(['admin', 'lideranca']);

export function TransfersPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const hasGlobalScope = globalRoles.has(user?.role ?? '');
  const canMove = user?.role !== 'auditor';
  const stores = useQuery({ queryKey: ['inventory-units'], queryFn: api.inventoryUnits });
  const inventory = useQuery({ queryKey: ['inventory', 'transfers'], queryFn: () => api.inventory() });
  const transfers = useQuery({ queryKey: ['transfers'], queryFn: api.transfers });
  const [form, setForm] = useState({ sourceStoreId: user?.store_id ?? 0, destinationStoreId: 0, productId: 0, quantity: 1, notes: '' });
  const [receipt, setReceipt] = useState<InventoryTransfer | null>(null);
  const [received, setReceived] = useState<Record<number, number>>({});
  const [discrepancyNote, setDiscrepancyNote] = useState('');
  const activeStores = (stores.data ?? []).filter((store) => store.active);
  const sourceStoreId = hasGlobalScope ? form.sourceStoreId : user?.store_id ?? 0;
  const sourceItems = useMemo(() => (inventory.data ?? []).filter((item) => item.store_id === sourceStoreId), [inventory.data, sourceStoreId]);
  const pendingForAccount = (transfers.data ?? []).filter((transfer) => transfer.status === 'enviada' && (hasGlobalScope || transfer.destination_store_id === user?.store_id));

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['transfers'] });
    void queryClient.invalidateQueries({ queryKey: ['inventory'] });
  };
  const send = useMutation({
    mutationFn: api.createTransfer,
    onSuccess: () => { setForm((current) => ({ ...current, destinationStoreId: 0, productId: 0, quantity: 1, notes: '' })); refresh(); }
  });
  const receive = useMutation({
    mutationFn: ({ transferId, items }: { transferId: number; items: Array<{ transfer_item_id: number; quantity_received: number }> }) => api.receiveTransfer(transferId, { items, discrepancy_note: discrepancyNote.trim() || undefined }),
    onSuccess: () => { setReceipt(null); setReceived({}); setDiscrepancyNote(''); refresh(); }
  });

  function submitSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    send.mutate({ source_store_id: sourceStoreId, destination_store_id: form.destinationStoreId, items: [{ product_id: form.productId, quantity: form.quantity }], notes: form.notes.trim() || undefined });
  }

  function startReceipt(transfer: InventoryTransfer) {
    setReceipt(transfer);
    setReceived(Object.fromEntries(transfer.items.map((item) => [item.id, item.quantity_sent])));
    setDiscrepancyNote('');
  }

  return (
    <>
      <PageHeader eyebrow="Envio e recebimento separados" title="Transferências" description="A origem registra o envio; o destino confere e confirma. Diferenças exigem justificativa e ficam rastreáveis." />
      <section className="grid gap-3 sm:grid-cols-3"><Summary label="Pendentes de recebimento" value={pendingForAccount.length} /><Summary label="Recebidas" value={(transfers.data ?? []).filter((item) => item.status === 'recebida').length} /><Summary label="Com divergência" value={(transfers.data ?? []).filter((item) => item.status === 'divergente').length} /></section>

      <section className="mt-5 grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
        {canMove ? <form onSubmit={submitSend} className="surface rounded-lg p-4"><h2 className="flex items-center gap-2 text-lg font-black text-lia-burgundy"><Truck size={20} /> Registrar envio</h2><div className="mt-3 grid gap-3">
          {hasGlobalScope ? <select aria-label="Unidade de origem" required value={sourceStoreId || ''} onChange={(e) => setForm({ ...form, sourceStoreId: Number(e.target.value), productId: 0 })} className="focus-ring rounded-lg border border-lia-red/15 bg-white px-3 py-3"><option value="">Origem</option>{activeStores.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}</select> : <p className="rounded-lg bg-white p-3 text-sm font-semibold">Origem: {user?.store_name}</p>}
          <select aria-label="Unidade de destino" required value={form.destinationStoreId || ''} onChange={(e) => setForm({ ...form, destinationStoreId: Number(e.target.value) })} className="focus-ring rounded-lg border border-lia-red/15 bg-white px-3 py-3"><option value="">Destino</option>{activeStores.filter((store) => store.id !== sourceStoreId).map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}</select>
          <select aria-label="Produto transferido" required value={form.productId || ''} onChange={(e) => setForm({ ...form, productId: Number(e.target.value) })} className="focus-ring rounded-lg border border-lia-red/15 bg-white px-3 py-3"><option value="">Produto</option>{sourceItems.map((item) => <option key={item.product_id} value={item.product_id}>{item.product_name} · saldo {item.quantity}</option>)}</select>
          <input aria-label="Quantidade enviada" required min="0.001" step="0.001" type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} className="focus-ring rounded-lg border border-lia-red/15 bg-white px-3 py-3" />
          <input aria-label="Observação do envio" placeholder="Observação opcional" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="focus-ring rounded-lg border border-lia-red/15 bg-white px-3 py-3" />
          {send.error ? <p className="rounded-lg bg-lia-red/10 p-3 text-sm font-semibold text-lia-red">{send.error.message}</p> : null}<button disabled={send.isPending} className="focus-ring flex items-center justify-center gap-2 rounded-lg bg-lia-red px-4 py-3 font-bold text-white disabled:opacity-60">Enviar <ArrowRight size={18} /></button>
        </div></form> : null}

        <div className="surface rounded-lg p-4"><h2 className="text-lg font-black text-lia-burgundy">Histórico e pendências</h2><div className="mt-3 space-y-3">{transfers.data?.map((transfer) => <article key={transfer.id} className="rounded-lg border border-lia-red/10 bg-white p-3"><div className="flex flex-wrap items-start justify-between gap-2"><div><strong>#{transfer.id} · {transfer.source_store} → {transfer.destination_store}</strong><p className="text-sm text-lia-muted">{transfer.items.map((item) => `${item.product_name}: ${item.quantity_sent} ${item.unit}`).join(', ')}</p></div><Status status={transfer.status} /></div><p className="mt-2 text-xs text-lia-muted">Enviado por {transfer.sent_by} em {new Date(transfer.sent_at).toLocaleString('pt-BR')}</p>{transfer.discrepancy_note ? <p className="mt-2 rounded-lg bg-amber-50 p-2 text-sm text-amber-900">Divergência: {transfer.discrepancy_note}</p> : null}{canMove && transfer.status === 'enviada' && (hasGlobalScope || transfer.destination_store_id === user?.store_id) ? <button onClick={() => startReceipt(transfer)} className="focus-ring mt-3 rounded-lg bg-lia-burgundy px-3 py-2 text-sm font-bold text-white">Conferir recebimento</button> : null}</article>)}</div></div>
      </section>

      {receipt ? <div className="fixed inset-0 z-50 flex items-end bg-black/40 p-3 sm:items-center sm:justify-center"><form onSubmit={(event) => { event.preventDefault(); receive.mutate({ transferId: receipt.id, items: receipt.items.map((item) => ({ transfer_item_id: item.id, quantity_received: received[item.id] ?? 0 })) }); }} className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-lg bg-lia-cream p-5"><h2 className="text-xl font-black text-lia-burgundy">Conferir transferência #{receipt.id}</h2><p className="mt-1 text-sm text-lia-muted">Informe a quantidade realmente recebida.</p><div className="mt-4 space-y-3">{receipt.items.map((item) => <label key={item.id} className="block text-sm font-bold">{item.product_name} · enviado {item.quantity_sent}<input aria-label={`Quantidade recebida de ${item.product_name}`} required min="0" step="0.001" type="number" value={received[item.id] ?? 0} onChange={(e) => setReceived({ ...received, [item.id]: Number(e.target.value) })} className="focus-ring mt-2 w-full rounded-lg border border-lia-red/15 bg-white px-3 py-3" /></label>)}</div><label className="mt-3 block text-sm font-bold">Justificativa da divergência<textarea aria-label="Justificativa da divergência" value={discrepancyNote} onChange={(e) => setDiscrepancyNote(e.target.value)} className="focus-ring mt-2 w-full rounded-lg border border-lia-red/15 bg-white px-3 py-3" /></label>{receive.error ? <p className="mt-3 rounded-lg bg-lia-red/10 p-3 text-sm font-semibold text-lia-red">{receive.error.message}</p> : null}<div className="mt-4 grid grid-cols-2 gap-2"><button type="button" onClick={() => setReceipt(null)} className="focus-ring rounded-lg border border-lia-red/20 px-4 py-3 font-bold">Cancelar</button><button disabled={receive.isPending} className="focus-ring flex items-center justify-center gap-2 rounded-lg bg-lia-red px-4 py-3 font-bold text-white"><CheckCircle2 size={18} /> Confirmar</button></div></form></div> : null}
    </>
  );
}

function Summary({ label, value }: { label: string; value: number }) { return <article className="surface rounded-lg p-4"><p className="text-sm font-semibold text-lia-muted">{label}</p><strong className="mt-1 block text-2xl font-black text-lia-burgundy">{value}</strong></article>; }
function Status({ status }: { status: InventoryTransfer['status'] }) { const label = status === 'enviada' ? 'Pendente' : status === 'recebida' ? 'Recebida' : 'Divergente'; return <span className={`rounded-lg px-2 py-1 text-xs font-bold ${status === 'divergente' ? 'bg-amber-100 text-amber-900' : status === 'recebida' ? 'bg-lia-green/10 text-lia-green' : 'bg-lia-red/10 text-lia-red'}`}>{label}</span>; }
