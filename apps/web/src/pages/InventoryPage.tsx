import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Boxes, PackagePlus, Save, Trash2 } from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';
import { api } from '../api/client';
import { PageHeader } from '../components/PageHeader';
import { useAuth } from '../contexts/useAuth';
import { OPERATIONAL_STORES, resolveOperationalStore } from '../constants/stores';
import type { InventoryItem, InventoryItemCreate } from '../types';

export function InventoryPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const defaultStore = resolveOperationalStore(user?.store_name);
  const [storeFilter, setStoreFilter] = useState(defaultStore);
  const [form, setForm] = useState<InventoryItemCreate>({
    store: defaultStore,
    product_name: '',
    quantity: 0
  });
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<number | null>(null);
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
      setDeletingItemId(null);
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    }
  });

  const totalProducts = inventory.data?.length ?? 0;
  const totalQuantity = useMemo(
    () => (inventory.data ?? []).reduce((total, item) => total + item.quantity, 0),
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
    setDeletingItemId(null);
    setEditingItemId(item.id);
    setQuantityDraft(String(item.quantity));
  }

  function requestDelete(item: InventoryItem) {
    deleteItem.reset();
    setEditingItemId(null);
    setDeletingItemId(item.id);
  }

  function submitQuantity(event: FormEvent<HTMLFormElement>, item: InventoryItem) {
    event.preventDefault();
    updateItem.mutate({ itemId: item.id, quantity: Number(quantityDraft) });
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
        <SummaryCard label="Quantidade total" value={totalQuantity} />
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
                type="number"
                value={form.quantity}
                onChange={(event) => setForm((current) => ({ ...current, quantity: Number(event.target.value) }))}
                required
              />
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
                      Atualizado em {formatInventoryTimestamp(item.updated_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <strong className="rounded-lg bg-lia-red/10 px-3 py-2 text-lg text-lia-red">
                      {item.quantity}
                    </strong>
                    <button
                      type="button"
                      aria-label={`Excluir ${item.product_name}`}
                      title="Excluir produto"
                      onClick={() => requestDelete(item)}
                      className="focus-ring inline-flex size-10 items-center justify-center rounded-lg border border-lia-red/20 text-lia-red transition hover:bg-lia-red/10"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                {editingItemId === item.id ? (
                  <form onSubmit={(event) => submitQuantity(event, item)} className="mt-3 flex flex-wrap gap-2">
                    <input
                      className="focus-ring min-w-28 rounded-lg border border-lia-red/15 bg-lia-cream px-3 py-2 text-sm"
                      min={0}
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
                  <button
                    onClick={() => startEdit(item)}
                    className="focus-ring mt-3 rounded-lg border border-lia-red/20 px-3 py-2 text-xs font-bold text-lia-burgundy"
                  >
                    Ajustar quantidade
                  </button>
                )}

                {deletingItemId === item.id ? (
                  <div className="mt-3 rounded-lg border border-lia-red/20 bg-lia-red/5 p-3">
                    <p className="text-sm font-semibold text-lia-burgundy">
                      Excluir {item.product_name} permanentemente?
                    </p>
                    {deleteItem.error ? (
                      <p className="mt-2 text-xs font-semibold text-lia-red">{deleteItem.error.message}</p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={deleteItem.isPending}
                        onClick={() => deleteItem.mutate(item.id)}
                        className="focus-ring inline-flex items-center gap-2 rounded-lg bg-lia-red px-3 py-2 text-xs font-bold text-white disabled:opacity-70"
                      >
                        <Trash2 size={15} />
                        {deleteItem.isPending ? 'Excluindo...' : 'Confirmar exclusão'}
                      </button>
                      <button
                        type="button"
                        disabled={deleteItem.isPending}
                        onClick={() => setDeletingItemId(null)}
                        className="focus-ring rounded-lg border border-lia-red/20 px-3 py-2 text-xs font-bold text-lia-burgundy disabled:opacity-70"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
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

function formatInventoryTimestamp(value: string) {
  const hasTimeZone = /(?:Z|[+-]\d{2}:\d{2})$/i.test(value);
  const utcValue = hasTimeZone ? value : `${value}Z`;

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'medium',
    timeZone: 'America/Sao_Paulo'
  }).format(new Date(utcValue));
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <article className="surface rounded-lg p-4">
      <p className="text-sm font-semibold text-lia-muted">{label}</p>
      <strong className="mt-1 block text-2xl font-black text-lia-burgundy">{value}</strong>
    </article>
  );
}
