import { useQuery } from '@tanstack/react-query';
import { Flame, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { api } from '../api/client';
import { PageHeader } from '../components/PageHeader';

export function ManualsPage() {
  const [unit, setUnit] = useState('Todas');
  const [search, setSearch] = useState('');
  const { data: manuals = [], isLoading } = useQuery({ queryKey: ['manuals'], queryFn: api.manuals });

  const filtered = useMemo(
    () =>
      manuals.filter((manual) => {
        const matchesUnit = unit === 'Todas' || manual.unit === unit;
        const haystack = `${manual.unit} ${manual.title} ${manual.critical_point} ${manual.tip}`.toLowerCase();
        return matchesUnit && haystack.includes(search.toLowerCase());
      }),
    [manuals, search, unit]
  );

  return (
    <>
      <PageHeader
        eyebrow="Base técnica"
        title="Manuais operacionais"
        description="Procedimentos padronizados para reduzir erro, acelerar treinamento e manter consistência entre as lojas."
      />

      <section className="surface mb-5 grid gap-3 rounded-lg p-4 md:grid-cols-[220px_1fr]">
        <select
          value={unit}
          onChange={(event) => setUnit(event.target.value)}
          className="focus-ring rounded-lg border border-lia-red/15 bg-white px-3 py-3 font-semibold text-lia-burgundy"
        >
          <option>Todas</option>
          {manuals.map((manual) => (
            <option key={manual.id}>{manual.unit}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 rounded-lg border border-lia-red/15 bg-white px-3 py-2">
          <Search size={18} className="text-lia-red" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar temperatura, preparo, validade..."
            className="w-full bg-transparent outline-none"
          />
        </label>
      </section>

      {isLoading ? <p className="text-lia-muted">Carregando manuais...</p> : null}

      <section className="grid gap-4 lg:grid-cols-3">
        {filtered.map((manual) => (
          <article key={manual.id} className="surface rounded-lg p-4">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-lia-red">{manual.unit}</p>
                <h3 className="mt-1 text-xl font-black text-lia-burgundy">{manual.title}</h3>
              </div>
              <div className="rounded-lg bg-lia-red/10 p-2 text-lia-red">
                <Flame size={20} />
              </div>
            </div>

            <div className="grid gap-2 text-sm">
              <Info label="Temperatura" value={manual.temperature} />
              <Info label="Tempo padrão" value={manual.time_standard} />
              <Info label="Ponto crítico" value={manual.critical_point} />
            </div>

            <div className="mt-4 space-y-4">
              {manual.sections.map((section) => (
                <div key={section.id}>
                  <h4 className="font-bold text-lia-burgundy">{section.title}</h4>
                  <ul className="mt-2 space-y-2 text-sm leading-6 text-lia-muted">
                    {section.steps.map((step) => (
                      <li key={step.id} className="rounded-lg bg-white px-3 py-2">
                        {step.text}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <p className="mt-4 rounded-lg bg-lia-green/10 p-3 text-sm font-semibold leading-6 text-lia-green">
              {manual.tip}
            </p>
          </article>
        ))}
      </section>
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white px-3 py-2">
      <span className="block text-xs font-bold uppercase tracking-[0.12em] text-lia-muted">{label}</span>
      <strong className="text-lia-burgundy">{value}</strong>
    </div>
  );
}
