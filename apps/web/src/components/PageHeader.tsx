export function PageHeader({
  eyebrow,
  title,
  description
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-5">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-lia-red">{eyebrow}</p>
      <h2 className="mt-1 text-2xl font-black text-lia-burgundy md:text-3xl">{title}</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-lia-muted md:text-base">{description}</p>
    </div>
  );
}
