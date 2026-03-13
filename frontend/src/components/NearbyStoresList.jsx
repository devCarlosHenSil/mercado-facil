import { MapPin, ShoppingBag, ExternalLink } from 'lucide-react'
import { useStore } from '../store/useStore'

const TYPE_ICONS = { supermercado:'í¿ª', hipermercado:'í¿¬', atacado:'í³¦', marketplace:'í²»', delivery:'í»µ', agregador:'í³‹' }

export default function NearbyStoresList() {
  const { nearbyStores, storesLoading } = useStore()
  if (storesLoading) return <div className="space-y-2">{[...Array(4)].map((_,i) => <div key={i} className="h-16 shimmer rounded-xl" />)}</div>
  if (!nearbyStores.length) return null
  return (
    <div>
      <h3 className="font-display font-semibold text-xs text-white/40 uppercase tracking-widest mb-3">Lojas prÃ³ximas</h3>
      <div className="space-y-2">
        {nearbyStores.map((ns) => (
          <a key={ns.store.id} href={ns.store.website} target="_blank" rel="noopener noreferrer"
            className="group flex items-center gap-3 p-2.5 rounded-xl border border-white/5 bg-card/50 hover:bg-card hover:border-white/10 transition-all">
            <span className="text-xl shrink-0">{TYPE_ICONS[ns.store.type] || 'í¿ª'}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white/80 truncate group-hover:text-white">{ns.store.name}</p>
              <div className="flex items-center gap-2 text-xs text-white/30 mt-0.5">
                {!ns.store.is_online && ns.distance_km > 0 && <span className="flex items-center gap-0.5"><MapPin size={9}/>{ns.distance_km}km</span>}
                <span className="flex items-center gap-0.5"><ShoppingBag size={9}/>{ns.offers_count} ofertas</span>
              </div>
            </div>
            <ExternalLink size={12} className="text-white/20 group-hover:text-brand-400 shrink-0" />
          </a>
        ))}
      </div>
    </div>
  )
}
