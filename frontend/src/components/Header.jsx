import { MapPin, Menu, X, Zap } from 'lucide-react'
import { useStore } from '../store/useStore'

export default function Header() {
  const { location, locationLoading, sidebarOpen, setSidebarOpen } = useStore()
  return (
    <header className="glass sticky top-0 z-50 border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center">
            <Zap size={16} fill="white" stroke="white" />
          </div>
          <span className="font-display font-bold text-lg tracking-tight">
            Mercado<span className="gradient-text">Fácil</span>
          </span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          {locationLoading ? (
            <span className="text-white/40 text-sm animate-pulse">Obtendo localização...</span>
          ) : location ? (
            <div className="flex items-center gap-1.5 text-sm">
              <MapPin size={14} className="text-brand-400" />
              <span className="text-white/70">{location.city}{location.state ? `, ${location.state}` : ''}</span>
              <span className="text-xs bg-brand-500/15 text-brand-400 px-2 py-0.5 rounded-full font-mono">ao vivo</span>
            </div>
          ) : (
            <span className="text-white/30 text-xs">��� Localização não disponível</span>
          )}
        </div>
        <button onClick={() => setSidebarOpen(!sidebarOpen)}
          className="lg:hidden w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-white/60 hover:text-white">
          {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>
    </header>
  )
}
