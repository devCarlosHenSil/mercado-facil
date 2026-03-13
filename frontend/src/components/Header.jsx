import { MapPin, Zap, TrendingDown } from 'lucide-react'
import { useStore } from '../store/useStore'
export default function Header() {
  const { location, locationLoading } = useStore()
  return (
    <header className="glass sticky top-0 z-50 border-b border-white/5">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center">
            <TrendingDown size={16} stroke="white" />
          </div>
          <span className="font-display font-bold text-lg">Mercado<span className="gradient-text">Facil</span></span>
        </div>
        <div className="flex-1" />
        {locationLoading
          ? <span className="text-white/30 text-sm animate-pulse">Localizando...</span>
          : location
            ? <div className="flex items-center gap-1.5 text-sm">
                <MapPin size={14} className="text-brand-400" />
                <span className="text-white/60">{location.city}{location.state ? ', '+location.state : ''}</span>
                <span className="text-xs bg-brand-500/15 text-brand-400 px-2 py-0.5 rounded-full">ao vivo</span>
              </div>
            : null}
      </div>
    </header>
  )
}
