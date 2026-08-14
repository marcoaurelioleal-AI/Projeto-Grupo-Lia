import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Boxes, PackagePlus, Save, Trash2 } from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';
import { api } from '../api/client';
import { PageHeader } from '../components/PageHeader';
import { useAuth } from '../contexts/useAuth';
import { OPERATIONAL_STORES, resolveOperationalStore } from '../constants/stores';
import type { InventoryItem, InventoryItemCreate, InventoryUnit } from '../types';

const INVENTORY_UNITS: Array<{ value: InventoryUnit; label: string }> = [
  { value: 'un', label: 'Unidade (un)' },
  { value: 'kg', label: 'Quilograma (kg)' },
  { value: 'g', label: 'Grama (g)' },
  { value: 'L', label: 'Litro (L)' },
  { value: 'mL', label: 'Mililitro (mL)' }
];

const quantityFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 3
});

export function InventoryPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const defaultStore = resolveOperationalStore(user?.store_name);
  const [storeFilter, setStoreFilter] = useState(defaultStore);
  const [form, setForm] = useState<InventoryItemCreate>({
    store: defaultStore,
    product_name: '',
    quantity: 0,
    unit: 'un'
  });
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [quantityDraft, setQuantityDraft] = useState('');

  const inventory = useQuery({
    queryKey: ['inventory', storeFilter],
    queryFn: () => api.inventory({ store: storeFilter === 'Todas' ? undefined : storeFilter })
  });

  const createItem = useMutation({
    mutationFn: api.createInventoryItem,
    onSuccess: () => {
      setForm((current) => ({ ...current, product_name: '', quantity: 0 }));
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    }
  });

  const updateItem = useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: number; quantity: number }) =>
      api.updateInventoryItem(itemId, { quantity }),
    onSuccess: () => {
      setEditingItemId(null);
      setQuantityDraft('');
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    }
  });

  const deleteItem = useMutation({
    mutationFn: api.deleteInventoryItem,
    onSuccess: () => {
      setEditingItemId(null);
      setQuantityDraft('');
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    }
  });

  const totalProducts = inventory.data?.length ?? 0;
  const measurementUnits = useMemo(
    () => new Set((inventory.data ?? []).map((item) => item.unit)).size,
    [inventory.data]
  );

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createItem.mutate({
      ...form,
      product_name: form.product_name.trim(),
      quantity: Number(form.quantity)
    });
  }

  function startEdit(item: InventoryItem) {
    setEditingItemId(item.id);
    setQuantityDraft(String(item.quantity));
  }

  function submitQuantity(event: FormEvent<HTMLFormElement>, item: InventoryItem) {
    event.preventDefault();
    updateItem.mutate({ itemId: item.id, quantity: Number(quantityDraft) });
  }

  function confirmDeletion(item: InventoryItem) {
    const confirmed = window.confirm(
      `Excluir permanentemente o produto "${item.product_name}" do estoque? Esta ação não pode ser desfeita.`
    );
    if (confirmed) {
      deleteItem.mutate(item.id);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Controle operacional"
        title="Estoque"
        description="Cadastre produtos e acompanhe as quantidades disponíveis por loja."
      />

      <section className="grid gap-3 md:grid-cols-2">
        <SummaryCard label="Produtos cadastrados" value={totalProducts} />
        <SummaryCard label="Unidades de medida" value={measurementUnits} />
      </section>

      <section className="mt-5 grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
        <form onSubmit={submit} className="surface rounded-lg p-4">
          <div className="mb-4 flex items-center gap-2">
            <PackagePlus className="text-lia-red" size={20} />
            <h3 className="text-lg font-black text-lia-burgundy">Cadastrar produto</h3>
          </div>

          <div className="grid gap-3">
            <label className="text-sm font-bold text-lia-burgundy">
              Loja
              <select
                className="focus-ring mt-2 w-full rounded-lg border border-lia-red/15 bg-white px-3 py-3"
                value={form.store}
                onChange={(event) => setForm((current) => ({ ...current, store: event.target.value }))}
              >
                {OPERATIONAL_STORES.map((store) => (
                  <option key={store}>{store}</option>
                ))}
              </select>
            </label>

            <label className="text-sm font-bold text-lia-burgundy">
              Produto
              <input
                className="focus-ring mt-2 w-full rounded-lg border border-lia-red/15 bg-white px-3 py-3"
                value={form.product_name}
                onChange={(event) => setForm((current) => ({ ...current, product_name: event.target.value }))}
                placeholder="Ex.: queijo, farinha, embalagem"
                required
              />
            </label>

            <label className="text-sm font-bold text-lia-burgundy">
              Quantidade
              <input
                className="focus-ring mt-2 w-full rounded-lg border border-lia-red/15 bg-white px-3 py-3"
                min={0}
                step="0.001"
                type="number"
                value={form.quantity}
                onChange={(event) => setForm((current) => ({ ...current, quantity: Number(event.target.value) }))}
                required
              />
            </label>

            <label className="text-sm font-bold text-lia-burgundy">
              Unidade de medida
              <select
                className="focus-ring mt-2 w-full rounded-lg border border-lia-red/15 bg-white px-3 py-3"
                value={form.unit}
                onChange={(event) =>
                  setForm((current) => ({ ...current, unit: event.target.value as InventoryUnit }))
                }
              >
                {INVENTORY_UNITS.map((unit) => (
                  <option key={unit.value} value={unit.value}>
                    {unit.label}
                  </option>
                ))}
              </select>
            </label>

            {createItem.error ? (
              <p className="rounded-lg bg-lia-red/10 px-3 py-2 text-sm font-semibold text-lia-red">
                {createItem.error.message}
              </p>
            ) : null}

            <button
              disabled={createItem.isPending}
              className="focus-ring inline-flex items-center justify-center gap-2 rounded-lg bg-lia-red px-4 py-3 font-bold text-white disabled:opacity-70"
            >
              <Save size={18} />
              {createItem.isPending ? 'Salvando...' : 'Salvar produto'}
            </button>
          </div>
        </form>

        <div className="surface rounded-lg p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Boxes className="text-lia-red" size={20} />
              <h3 className="text-lg font-black text-lia-burgundy">Produtos em estoque</h3>
            </div>
            <select
              className="focus-ring rounded-lg border border-lia-red/15 bg-white px-3 py-2 text-sm font-semibold"
              value={storeFilter}
              onChange={(event) => setStoreFilter(event.target.value)}
            >
              <option>Todas</option>
              {OPERATIONAL_STORES.map((store) => (
                <option key={store}>{store}</option>
              ))}
            </select>
          </div>

          {inventory.isLoading ? <p className="text-sm text-lia-muted">Carregando estoque...</p> : null}
          {inventory.error ? (
            <p className="rounded-lg bg-lia-red/10 p-3 text-sm font-semibold text-lia-red">
              {inventory.error.message}
            </p>
          ) : null}

          <div className="space-y-3">
            {inventory.data?.map((item) => (
              <article key={item.id} className="rounded-lg border border-lia-red/10 bg-white p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-lia-muted">{item.store}</p>
                    <h4 className="mt-1 text-base font-black text-lia-burgundy">{item.product_name}</h4>
                    <p className="mt-1 text-xs text-lia-muted">
                      Atualizado em {new Date(item.updated_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <strong className="rounded-lg bg-lia-red/10 px-3 py-2 text-lg text-lia-red">
                    {quantityFormatter.format(item.quantity)} {item.unit}
                  </strong>
                </div>

                {editingItemId === item.id ? (
                  <form onSubmit={(event) => submitQuantity(event, item)} className="mt-3 flex flex-wrap gap-2">
                    <input
                      className="focus-ring min-w-28 rounded-lg border border-lia-red/15 bg-lia-cream px-3 py-2 text-sm"
                      min={0}
                      step="0.001"
                      type="number"
                      value={quantityDraft}
                      onChange={(event) => setQuantityDraft(event.target.value)}
                    />
                    <button
                      disabled={updateItem.isPending}
                      className="focus-ring rounded-lg bg-lia-red px-3 py-2 text-xs font-bold text-white disabled:opacity-70"
                    >
                      {updateItem.isPending ? 'Salvando...' : 'Salvar quantidade'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingItemId(null)}
                      className="focus-ring rounded-lg border border-lia-red/20 px-3 py-2 text-xs font-bold text-lia-burgundy"
                    >
                      Cancelar
                    </button>
                  </form>
                ) : (
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <button
                      onClick={() => startEdit(item)}
                      className="focus-ring rounded-lg border border-lia-red/20 px-3 py-2 text-xs font-bold text-lia-burgundy"
                    >
                      Ajustar quantidade
                    </button>
                    <button
                      type="button"
                      aria-label={`Excluir ${item.product_name}`}
                      title="Excluir produto"
                      disabled={deleteItem.isPending}
                      onClick={() => confirmDeletion(item)}
                      className="focus-ring inline-flex size-9 items-center justify-center rounded-lg border border-lia-red/25 text-lia-red hover:bg-lia-red/10 disabled:opacity-50"
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                )}

                {deleteItem.error && deleteItem.variables === item.id ? (
                  <p className="mt-3 rounded-lg bg-lia-red/10 px-3 py-2 text-sm font-semibold text-lia-red">
                    {deleteItem.error.message}
                  </p>
                ) : null}
              </article>
            ))}

            {!inventory.isLoading && !inventory.data?.length ? (
              <p className="rounded-lg bg-white p-3 text-sm text-lia-muted">Nenhum produto cadastrado ainda.</p>
            ) : null}
          </div>
        </div>
      </section>
    </>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <article className="surface rounded-lg p-4">
      <p className="text-sm font-semibold text-lia-muted">{label}</p>
      <strong className="mt-1 block text-2xl font-black text-lia-burgundy">{value}</strong>
    </article>
  );
}
