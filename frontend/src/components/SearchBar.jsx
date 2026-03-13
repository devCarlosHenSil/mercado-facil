import { useState } from 'react'
import { Search, X, Loader2 } from 'lucide-react'
import { useStore } from '../store/useStore'
import { searchPrices } from '../services/api'

const SUGGESTIONS = ['arroz 5kg','feijao carioca 1kg','leite integral','cafe pilao 500g',
  'frango inteiro','oleo de soja','acucar 1kg','cerveja lata','detergente','shampoo']

export default function SearchBar() {
  const { query, setQuery, setSearching, setResults, setSearchError, searching, clearResults } = useStore()
  const [showSug, setShowSug] = useState(false)

  async function doSearch(q = query) {
    const term = q.trim()
    if (!term || term.length < 2) return
    setShowSug(false)
    setSearching(true)
    clearResults()
    try {
      const data = await searchPrices(term)
      setResults(data)
    } catch (err) {
      const msg = err.code === 'ECONNABORTED'
        ? 'Tempo esgotado. Os sites podem estar lentos.'
        : err.response?.data?.error || 'Erro ao buscar. Tente novamente.'
      setSearchError(msg)
    } finally {
      setSearching(false)
    }
  }

  const filtered = SUGGESTIONS.filter(s => !query || s.includes(query.toLowerCase())).slice(0, 6)

  return (
    <div className="relative">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none z-10" />
          <input
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setShowSug(true) }}
            onKeyDown={e => { if (e.key === 'Enter') doSearch(); if (e.key === 'Escape') setShowSug(false) }}
            onFocus={() => setShowSug(true)}
            onBlur={() => setTimeout(() => setShowSug(false), 200)}
            placeholder="Buscar produto em todos os mercados... ex: arroz 5kg"
            className="input-dark w-full pl-11 pr-10 text-sm h-12"
            autoComplete="off"
          />
          {query && !searching && (
            <button onClick={() => { setQuery(''); clearResults() }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70">
              <X size={15} />
            </button>
          )}
        </div>
        <button
          onClick={() => doSearch()}
          disabled={searching || !query.trim()}
          className="btn-primary h-12 px-6 flex items-center gap-2 shrink-0 disabled:opacity-40 disabled:cursor-not-allowed">
          {searching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
          {searching ? 'Buscando...' : 'Comparar'}
        </button>
      </div>

      {/* Sugestões */}
      {showSug && !searching && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-white/10 rounded-xl overflow-hidden z-50 shadow-xl">
          {filtered.map(s => (
            <button key={s} onMouseDown={() => { setQuery(s); doSearch(s) }}
              className="w-full text-left px-4 py-2.5 text-sm text-white/60 hover:bg-muted hover:text-white/90 flex items-center gap-2">
              <Search size={12} className="text-white/25" />{s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
