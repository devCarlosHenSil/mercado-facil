import { useEffect, useRef } from 'react'
import { PackageSearch } from 'lucide-react'
import { useStore } from '../store/useStore'
import OfferCard from './OfferCard'
import SkeletonCard from './SkeletonCard'

export default function OffersGrid() {
  const { offers, loading, error, hasMore, incrementPage, total } = useStore()
  const sentinelRef = useRef(null)

  useEffect(() => {
    if (!hasMore || loading) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) incrementPage() }, { threshold: 0.1 })
    if (sentinelRef.current) obs.observe(sentinelRef.current)
    return () => obs.disconnect()
  }, [hasMore, loading])

  if (error) return <div className="text-center py-20"><p className="text-white/40">{error}</p></div>
  if (!loading && offers.length === 0) return (
    <div className="text-center py-20">
      <PackageSearch size={48} className="text-white/15 mx-auto mb-4" />
      <p className="text-white/40">Nenhuma oferta encontrada</p>
      <p className="text-white/25 text-sm mt-1">Tente outro produto ou aumente o raio</p>
    </div>
  )

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
        {offers.map((offer, i) => <OfferCard key={offer.id} offer={offer} index={i} />)}
        {loading && [...Array(8)].map((_,i) => <SkeletonCard key={`sk-${i}`} />)}
      </div>
      {hasMore && <div ref={sentinelRef} className="h-8 mt-4" />}
      {!hasMore && offers.length > 0 && (
        <p className="text-center text-xs text-white/20 mt-8 font-mono">{total} ofertas carregadas</p>
      )}
    </div>
  )
}
