import { useStore } from '../store/useStore'

const SORTS = [
  { id: 'relevance', label: 'Relevância' },
  { id: 'price',     label: 'Menor preço' },
  { id: 'discount',  label: 'Maior desconto' },
  { id: 'distance',  label: 'Mais próximo' },
]

export default function SortRadiusBar() {
  const { sortBy, setSortBy, radius, setRadius } = useStore()
  return (
    <div className="flex flex-wrap items-center gap-3">
      <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
        className="bg-muted border border-white/10 text-white/70 text-sm rounded-lg px-2 py-1.5 focus:outline-none">
        {SORTS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
      </select>
      <div className="flex gap-1">
        {[3,5,10,20,50].map(r => (
          <button key={r} onClick={() => setRadius(r)}
            className={`text-xs px-2 py-1 rounded-lg font-mono transition-all
              ${radius === r ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30' : 'text-white/40 hover:text-white/70 border border-transparent'}`}>
            {r}km
          </button>
        ))}
      </div>
    </div>
  )
}
