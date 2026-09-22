export default function ResultSkeleton({ stage }: { stage: string | null }) {
  const bar = (w: string) => <div className={`h-3 rounded-badge bg-line ${w}`} />;
  return (
    <section aria-busy="true" aria-live="polite" className="relative overflow-hidden rounded-panel border border-line bg-elev shadow-panel shimmer">
      <div className="p-6 border-b border-line space-y-4">
        <div className="flex items-center gap-4">
          <div className="h-7 w-32 rounded-badge bg-line" />
          <div className="h-4 w-24 rounded-badge bg-line" />
        </div>
        {bar("w-full")}{bar("w-4/5")}
        {stage && <p className="text-sm text-ink-2 pt-1">{stage}<span className="soft-pulse">…</span></p>}
      </div>
      <div className="grid md:grid-cols-12">
        <div className="md:col-span-7 p-6 space-y-3 border-b md:border-b-0 md:border-r border-line">
          {bar("w-24")}{bar("w-full")}{bar("w-11/12")}{bar("w-3/4")}
          <div className="pt-3" />{bar("w-28")}{bar("w-full")}{bar("w-2/3")}
        </div>
        <div className="md:col-span-5 p-6 space-y-3">
          {bar("w-20")}{bar("w-5/6")}{bar("w-3/4")}{bar("w-4/5")}
          <div className="pt-3" />{bar("w-20")}{bar("w-full")}{bar("w-5/6")}
        </div>
      </div>
    </section>
  );
}
