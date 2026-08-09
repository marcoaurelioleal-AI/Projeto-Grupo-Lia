import { describe, expect, it } from 'vitest';

import { DEFAULT_OPERATIONAL_STORE, OPERATIONAL_STORES, resolveOperationalStore } from './stores';

describe('operational stores', () => {
  it('contains the three stores and the factory as operational units', () => {
    expect(OPERATIONAL_STORES).toEqual(['Lia Burger', 'Lia Pizzas', 'Lia Salgados', 'Fábrica Lia']);
    expect(OPERATIONAL_STORES).not.toContain('Grupo Lia');
  });

  it('replaces the legacy group value with a physical store', () => {
    expect(resolveOperationalStore('Grupo Lia')).toBe(DEFAULT_OPERATIONAL_STORE);
    expect(resolveOperationalStore(null)).toBe(DEFAULT_OPERATIONAL_STORE);
    expect(resolveOperationalStore('Lia Salgados')).toBe('Lia Salgados');
  });
});
