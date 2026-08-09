export const OPERATIONAL_STORES = ['Lia Burger', 'Lia Pizzas', 'Lia Salgados', 'Fábrica Lia'] as const;
export const DEFAULT_OPERATIONAL_STORE = OPERATIONAL_STORES[0];

const LEGACY_GROUP_STORE = 'Grupo Lia';
const LEGACY_PIZZA_STORE = 'Lia Pizza';

export function resolveOperationalStore(store: string | null | undefined): string {
  if (!store || store === LEGACY_GROUP_STORE) return DEFAULT_OPERATIONAL_STORE;
  if (store === LEGACY_PIZZA_STORE) return 'Lia Pizzas';
  return store;
}
