export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-lia-beige">
      <div className="h-full rounded-full bg-lia-red transition-all" style={{ width: `${value}%` }} />
    </div>
  );
}
