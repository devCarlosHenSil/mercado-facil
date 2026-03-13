export default function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-white/5 bg-card overflow-hidden">
      <div className="aspect-[4/3] shimmer" />
      <div className="p-3.5 space-y-2.5">
        <div className="h-3 w-16 shimmer rounded" />
        <div className="h-4 w-full shimmer rounded" />
        <div className="h-6 w-24 shimmer rounded mt-3" />
        <div className="h-px w-full bg-white/5 mt-3" />
        <div className="flex gap-2"><div className="w-5 h-5 shimmer rounded" /><div className="h-3 flex-1 shimmer rounded" /></div>
      </div>
    </div>
  )
}
