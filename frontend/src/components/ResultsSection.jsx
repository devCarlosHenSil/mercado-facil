import { useStore } from '../store/useStore'
import PriceGroupCard from './PriceGroupCard'
import { TrendingDown, PackageSearch, AlertCircle } from 'lucide-react'

const fmt = v => v?.toLocaleString('pt-BR', { style:'currency', currency:'BRL' })

export default function ResultsSection() {
  const { results, searchError, searching, lastQuery } = useStore()

  if (searchError) return (
    <div className="flex flex-col items-center py-16 text-center">
      <AlertCircle size={40} className="text-red-400/50 mb-4" />
      <p className="text-white/50 text-sm">{searchError}</p>
    </div>
  )

  if (!results && !searching) return (
    <div className="flex flex-col items-center py-24 text-center">
      <div className="w-20 h-20 rounded-full bg-brand-500/10 flex items-center justify-center mb-6">
        <TrendingDown size={36} className="text-brand-400" />
      </div>
      <h2 className="font-display text-2xl font-bold mb-2">Compare precos em tempo real</h2>
      <p className="text-white/40 text-sm max-w-sm">
        Digite o produto acima e vamos buscar simultaneamente em todos os supermercados da regiao
      </p>
      <div className="mt-8 flex flex-wrap gap-2 justify-center">
        {['arroz 5kg','feijao 1kg','leite integral','frango inteiro','cerveja lata'].map(s => (
          <span key={s} className="text-xs bg-muted border border-white/10 px-3 py-1.5 rounded-full text-white/40">{s}</span>
        ))}
      </div>
    </div>
  )

  if (!results) return null

  const groups = results?.groups || []
  const total_results = results?.total_results || 0
  const elapsed_ms = results?.elapsed_ms || 0

  if (groups.length === 0) return (
    <div className="flex flex-col items-center py-16 text-center">
      <PackageSearch size={48} className="text-white/15 mb-4" />
      <p className="text-white/50">Nenhum resultado para &ldquo;{lastQuery}&rdquo;</p>
      <p className="text-white/25 text-sm mt-1">Tente termos mais simples, ex: apenas o nome do produto</p>
    </div>
  )

  const topSaving = groups.reduce((max, g) => (g.savings || 0) > (max.savings || 0) ? g : max, groups[0])

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div>
          <p className="text-white/40 text-xs">Resultados para</p>
          <p className="font-semibold text-white/90">&ldquo;{lastQuery}&rdquo;</p>
        </div>
        <div className="text-xs text-white/30">
          {total_results} produtos · {groups.length} grupos · {(elapsed_ms/1000).toFixed(1)}s
        </div>
        {topSaving?.savings > 1 && (
          <div className="ml-auto flex items-center gap-2 bg-green-900/30 border border-green-500/20 px-3 py-2 rounded-xl">
            <TrendingDown size={14} className="text-green-400" />
            <span className="text-xs text-green-400">
              Maior economia: {fmt(topSaving.savings)} em {topSaving.canonical_name}
            </span>
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {groups.map(g => <PriceGroupCard key={g.id} group={g} />)}
      </div>
    </div>
  )
}
