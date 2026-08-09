import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, ClipboardCheck, History, PackagePlus } from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';
import { api } from '../api/client';
import { PageHeader } from '../components/PageHeader';
import { useAuth } from '../contexts/useAuth';
import type { InventoryItem, InventoryMovementCreate } from '../types';

const managementRoles = new Set(['admin', 'lideranca', 'gerente']);
const globalRoles = new Set(['admin', 'lideranca', 'auditor']);

export function InventoryPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const canManage = managementRoles.has(user?.role ?? '');
  const canMove = user?.role !== 'auditor';
  const hasGlobalScope = globalRoles.has(user?.role ?? '');
  const [storeId, setStoreId] = useState<number | undefined>(user?.store_id ?? undefined);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [movement, setMovement] = useState<InventoryMovementCreate>({
    movement_type: 'entrada',
    quantity: 1,
    reason: ''
  });
  const [countedQuantity, setCountedQuantity] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('Contagem física');
  const [catalog, setCatalog] = useState<{ id: number | null; name: string; unit: string }>({ id: null, name: '', unit: 'unidade' });
  const [balance, setBalance] = useState({ productId: 0, quantity: 0, unitCost: 0 });
  const [costDraft, setCostDraft] = useState('');
  const [costReason, setCostReason] = useState('Custo validado pela liderança');

  const stores = useQuery({ queryKey: ['inventory-units'], queryFn: api.inventoryUnits });
  const products = useQuery({ queryKey: ['inventory-products'], queryFn: api.products });
  const inventory = useQuery({
    queryKey: ['inventory', storeId],
    queryFn: () => api.inventory({ storeId })
  });
  const history = useQuery({
    queryKey: ['inventory-history', selectedItem?.id],
    queryFn: () => api.inventoryMovements(selectedItem!.id),
    enabled: Boolean(selectedItem && user?.role !== 'operacao')
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['inventory'] });
    void queryClient.invalidateQueries({ queryKey: ['inventory-history'] });
  };
  const createMovement = useMutation({
    mutationFn: ({ itemId, payload }: { itemId: number; payload: InventoryMovementCreate }) =>
      api.createInventoryMovement(itemId, payload),
    onSuccess: () => {
      setMovement({ movement_type: 'entrada', quantity: 1, reason: '' });
      refresh();
    }
  });
  const adjust = useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: number; quantity: number }) =>
      api.adjustInventory(itemId, { counted_quantity: quantity, reason: adjustmentReason }),
    onSuccess: () => {
      setCountedQuantity('');
      refresh();
    }
  });
  const createProduct = useMutation({
    mutationFn: api.createProduct,
    onSuccess: (product) => {
      setCatalog({ id: null, name: '', unit: 'unidade' });
      setBalance((current) => ({ ...current, productId: product.id }));
      void queryClient.invalidateQueries({ queryKey: ['inventory-products'] });
    }
  });
  const updateProduct = useMutation({
    mutationFn: ({ productId, name, unit }: { productId: number; name: string; unit: string }) =>
      api.updateProduct(productId, { name, unit }),
    onSuccess: () => {
      setCatalog({ id: null, name: '', unit: 'unidade' });
      void queryClient.invalidateQueries({ queryKey: ['inventory-products'] });
      refresh();
    }
  });
  const createBalance = useMutation({
    mutationFn: api.createInventoryBalance,
    onSuccess: refresh
  });
  const updateCost = useMutation({
    mutationFn: ({ itemId, unitCost }: { itemId: number; unitCost: number }) =>
      api.updateInventoryCost(itemId, unitCost, costReason),
    onSuccess: () => {
      setCostDraft('');
      refresh();
    }
  });

  const totalQuantity = useMemo(
    () => (inventory.data ?? []).reduce((total, item) => total + item.quantity, 0),
    [inventory.data]
  );
  const activeStores = (stores.data ?? []).filter((store) => store.active);
  const effectiveStoreId = hasGlobalScope ? storeId : user?.store_id ?? undefined;

  function submitMovement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selectedItem) createMovement.mutate({ itemId: selectedItem.id, payload: movement });
  }

  return (
    <>
      <PageHeader
        eyebrow="Operação rastreável"
        title="Estoque"
        description="Toda alteração gera uma movimentação com responsável, motivo, data e saldo resultante."
      />

      {hasGlobalScope ? (
        <label className="mb-4 block max-w-sm text-sm font-bold text-lia-burgundy">
          Unidade consultada
          <select
            aria-label="Unidade consultada"
            className="focus-ring mt-2 w-full rounded-lg border border-lia-red/15 bg-white px-3 py-3"
            value={storeId ?? ''}
            onChange={(event) => setStoreId(event.target.value ? Number(event.target.value) : undefined)}
          >
            <option value="">Todas as unidades</option>
            {activeStores.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}
          </select>
        </label>
      ) : (
        <p className="mb-4 rounded-lg bg-white px-4 py-3 text-sm font-semibold text-lia-burgundy">
          Unidade da conta: {user?.store_name ?? 'não vinculada'}
        </p>
      )}

      <section className="grid gap-3 sm:grid-cols-2">
        <SummaryCard label="Produtos com saldo" value={inventory.data?.length ?? 0} />
        <SummaryCard label="Quantidade total" value={formatQuantity(totalQuantity)} />
      </section>

      {canManage ? (
        <section className="mt-5 grid gap-4 lg:grid-cols-2">
          <form
            className="surface rounded-lg p-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (catalog.id) updateProduct.mutate({ productId: catalog.id, name: catalog.name.trim(), unit: catalog.unit.trim() });
              else createProduct.mutate({ name: catalog.name.trim(), unit: catalog.unit.trim() });
            }}
          >
            <h2 className="flex items-center gap-2 text-lg font-black text-lia-burgundy"><PackagePlus size={20} /> Catálogo global</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <input aria-label="Nome do produto" required placeholder="Nome do produto" value={catalog.name} onChange={(e) => setCatalog({ ...catalog, name: e.target.value })} className="focus-ring rounded-lg border border-lia-red/15 px-3 py-3" />
              <input aria-label="Unidade de medida" required placeholder="kg, unidade, litro" value={catalog.unit} onChange={(e) => setCatalog({ ...catalog, unit: e.target.value })} className="focus-ring rounded-lg border border-lia-red/15 px-3 py-3" />
            </div>
            <MutationButton pending={createProduct.isPending || updateProduct.isPending} label={catalog.id ? 'Salvar produto' : 'Adicionar ao catálogo'} />
            <MutationError error={createProduct.error ?? updateProduct.error} />
            <div className="mt-3 flex flex-wrap gap-2">{products.data?.map((product) => <button key={product.id} type="button" onClick={() => setCatalog({ id: product.id, name: product.name, unit: product.unit })} className="focus-ring rounded-lg border border-lia-red/15 bg-white px-2 py-1 text-xs font-semibold">{product.name} · {product.unit}</button>)}</div>
          </form>

          <form
            className="surface rounded-lg p-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (effectiveStoreId && balance.productId) createBalance.mutate({ store_id: effectiveStoreId, product_id: balance.productId, quantity: balance.quantity, unit_cost: balance.unitCost });
            }}
          >
            <h2 className="flex items-center gap-2 text-lg font-black text-lia-burgundy"><ClipboardCheck size={20} /> Saldo inicial</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {hasGlobalScope ? <select aria-label="Unidade do saldo" required value={effectiveStoreId ?? ''} onChange={(e) => setStoreId(Number(e.target.value))} className="focus-ring rounded-lg border border-lia-red/15 px-3 py-3"><option value="">Unidade</option>{activeStores.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}</select> : null}
              <select aria-label="Produto do saldo" required value={balance.productId || ''} onChange={(e) => setBalance({ ...balance, productId: Number(e.target.value) })} className="focus-ring rounded-lg border border-lia-red/15 px-3 py-3"><option value="">Produto</option>{products.data?.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select>
              <input aria-label="Quantidade inicial" min="0" step="0.001" type="number" value={balance.quantity} onChange={(e) => setBalance({ ...balance, quantity: Number(e.target.value) })} className="focus-ring rounded-lg border border-lia-red/15 px-3 py-3" />
              <input aria-label="Custo unitário" min="0" step="0.0001" type="number" value={balance.unitCost} onChange={(e) => setBalance({ ...balance, unitCost: Number(e.target.value) })} className="focus-ring rounded-lg border border-lia-red/15 px-3 py-3" />
            </div>
            <MutationButton pending={createBalance.isPending} label="Criar saldo rastreável" />
            <MutationError error={createBalance.error} />
          </form>
        </section>
      ) : null}

      <section className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="surface rounded-lg p-4">
          <h2 className="text-lg font-black text-lia-burgundy">Saldos disponíveis</h2>
          {inventory.isLoading ? <p className="mt-3 text-sm text-lia-muted">Carregando...</p> : null}
          <div className="mt-3 space-y-3">
            {inventory.data?.map((item) => (
              <button key={item.id} onClick={() => setSelectedItem(item)} className={`focus-ring flex w-full items-center justify-between rounded-lg border p-3 text-left ${selectedItem?.id === item.id ? 'border-lia-red bg-lia-red/5' : 'border-lia-red/10 bg-white'}`}>
                <span><strong className="block text-lia-burgundy">{item.product_name}</strong><small className="text-lia-muted">{item.store}{item.unit_cost !== undefined ? ` · R$ ${item.unit_cost.toFixed(4)}/${item.unit}` : ''}</small></span>
                <strong className="text-lg text-lia-red">{formatQuantity(item.quantity)} {item.unit}</strong>
              </button>
            ))}
            {!inventory.isLoading && !inventory.data?.length ? <p className="text-sm text-lia-muted">Nenhum saldo cadastrado nesta unidade.</p> : null}
          </div>
        </div>

        <div className="surface rounded-lg p-4">
          <h2 className="text-lg font-black text-lia-burgundy">{selectedItem ? selectedItem.product_name : 'Selecione um produto'}</h2>
          {selectedItem && canMove ? (
            <form onSubmit={submitMovement} className="mt-3 grid gap-3">
              <select aria-label="Tipo de movimentação" value={movement.movement_type} onChange={(e) => setMovement({ ...movement, movement_type: e.target.value as InventoryMovementCreate['movement_type'] })} className="focus-ring rounded-lg border border-lia-red/15 px-3 py-3">
                <option value="entrada">Entrada</option><option value="producao">Produção</option><option value="saida">Consumo / saída</option>
              </select>
              <input aria-label="Quantidade movimentada" required min="0.001" step="0.001" type="number" value={movement.quantity} onChange={(e) => setMovement({ ...movement, quantity: Number(e.target.value) })} className="focus-ring rounded-lg border border-lia-red/15 px-3 py-3" />
              <input aria-label="Motivo da movimentação" required placeholder="Motivo" value={movement.reason} onChange={(e) => setMovement({ ...movement, reason: e.target.value })} className="focus-ring rounded-lg border border-lia-red/15 px-3 py-3" />
              <MutationButton pending={createMovement.isPending} label={movement.movement_type === 'saida' ? 'Registrar saída' : 'Registrar entrada'} icon={movement.movement_type === 'saida' ? ArrowDown : ArrowUp} />
              <MutationError error={createMovement.error} />
            </form>
          ) : null}

          {selectedItem && canManage ? (
            <form onSubmit={(event) => { event.preventDefault(); adjust.mutate({ itemId: selectedItem.id, quantity: Number(countedQuantity) }); }} className="mt-5 border-t border-lia-red/10 pt-4">
              <h3 className="font-bold text-lia-burgundy">Correção por contagem</h3>
              <div className="mt-2 grid gap-2"><input aria-label="Quantidade contada" required min="0" step="0.001" type="number" value={countedQuantity} onChange={(e) => setCountedQuantity(e.target.value)} className="focus-ring rounded-lg border border-lia-red/15 px-3 py-3" /><input aria-label="Motivo da correção" required value={adjustmentReason} onChange={(e) => setAdjustmentReason(e.target.value)} className="focus-ring rounded-lg border border-lia-red/15 px-3 py-3" /></div>
              <MutationButton pending={adjust.isPending} label="Confirmar contagem" />
              <MutationError error={adjust.error} />
            </form>
          ) : null}

          {selectedItem && canManage ? (
            <form onSubmit={(event) => { event.preventDefault(); updateCost.mutate({ itemId: selectedItem.id, unitCost: Number(costDraft) }); }} className="mt-5 border-t border-lia-red/10 pt-4">
              <h3 className="font-bold text-lia-burgundy">Custo médio aprovado</h3>
              <div className="mt-2 grid gap-2"><input aria-label="Novo custo unitário" required min="0" step="0.0001" type="number" value={costDraft} onChange={(e) => setCostDraft(e.target.value)} className="focus-ring rounded-lg border border-lia-red/15 px-3 py-3" /><input aria-label="Motivo da atualização do custo" required value={costReason} onChange={(e) => setCostReason(e.target.value)} className="focus-ring rounded-lg border border-lia-red/15 px-3 py-3" /></div>
              <MutationButton pending={updateCost.isPending} label="Atualizar custo" />
              <MutationError error={updateCost.error} />
            </form>
          ) : null}

          {selectedItem && user?.role !== 'operacao' ? (
            <div className="mt-5 border-t border-lia-red/10 pt-4"><h3 className="flex items-center gap-2 font-bold text-lia-burgundy"><History size={17} /> Histórico</h3><div className="mt-2 max-h-64 space-y-2 overflow-auto">{history.data?.map((entry) => <article key={entry.id} className="rounded-lg bg-white p-2 text-xs"><strong>{entry.movement_type.replaceAll('_', ' ')}</strong><span className="ml-2">{entry.quantity_delta > 0 ? '+' : ''}{formatQuantity(entry.quantity_delta)} → {formatQuantity(entry.quantity_after)}</span><p className="text-lia-muted">{entry.reason} · {entry.created_by}</p></article>)}</div></div>
          ) : null}
        </div>
      </section>
    </>
  );
}

function formatQuantity(value: number) { return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 }).format(value); }
function SummaryCard({ label, value }: { label: string; value: string | number }) { return <article className="surface rounded-lg p-4"><p className="text-sm font-semibold text-lia-muted">{label}</p><strong className="mt-1 block text-2xl font-black text-lia-burgundy">{value}</strong></article>; }
function MutationError({ error }: { error: Error | null }) { return error ? <p className="mt-3 rounded-lg bg-lia-red/10 px-3 py-2 text-sm font-semibold text-lia-red">{error.message}</p> : null; }
function MutationButton({ pending, label, icon: Icon }: { pending: boolean; label: string; icon?: typeof ArrowUp }) { return <button disabled={pending} className="focus-ring mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-lia-red px-4 py-3 font-bold text-white disabled:opacity-60">{Icon ? <Icon size={18} /> : null}{pending ? 'Salvando...' : label}</button>; }
