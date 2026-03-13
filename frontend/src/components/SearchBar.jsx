import { Search, X } from 'lucide-react'
import { useStore } from '../store/useStore'

export default function SearchBar() {
  const { query, setQuery, total, queryTime, loading } = useStore()
  return (
    <div>
      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
        <input type="text" value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar produtos... arroz, frango, leite..."
          className="input-dark w-full pl-11 pr-10 text-sm" autoComplete="off" />
        {query && (
          <button onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70">
            <X size={15} />
          </button>
        )}
      </div>
      {!loading && total > 0 && (
        <div className="mt-2 flex items-center gap-2 text-xs text-white/30">
          <span className="text-white/50 font-semibold">{total.toLocaleString('pt-BR')}</span>
          <span>ofertas encontradas</span>
          <span className="text-white/20">·</span>
          <span>{queryTime?.toFixed(1)}ms</span>
        </div>
      )}
    </div>
  )
}
