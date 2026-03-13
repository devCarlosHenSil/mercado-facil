import { useStore } from '../store/useStore'
import { ShoppingCart, Wheat, Leaf, Beef, Milk, Croissant, Snowflake, Wine, Sparkles, Heart } from 'lucide-react'

const CATS = [
  { id:'todos',      name:'Todos',      Icon: ShoppingCart, color:'#f97316' },
  { id:'mercearia',  name:'Mercearia',  Icon: Wheat,        color:'#f59e0b' },
  { id:'hortifruti', name:'Hortifruti', Icon: Leaf,         color:'#22c55e' },
  { id:'acougue',    name:'Acougue',    Icon: Beef,         color:'#ef4444' },
  { id:'laticinios', name:'Laticinios', Icon: Milk,         color:'#eab308' },
  { id:'padaria',    name:'Padaria',    Icon: Croissant,    color:'#a16207' },
  { id:'frios',      name:'Frios',      Icon: Snowflake,    color:'#06b6d4' },
  { id:'bebidas',    name:'Bebidas',    Icon: Wine,         color:'#a855f7' },
  { id:'limpeza',    name:'Limpeza',    Icon: Sparkles,     color:'#64748b' },
  { id:'higiene',    name:'Higiene',    Icon: Heart,        color:'#ec4899' },
]

export default function CategoryFilter() {
  const { category, setCategory } = useStore()
  return (
    <div className="overflow-x-auto -mx-4 px-4">
      <div className="flex gap-2 pb-1 min-w-max">
        {CATS.map((c) => {
          const active = category === c.id
          return (
            <button key={c.id} onClick={() => setCategory(c.id)}
              style={active ? { background: c.color, borderColor: c.color } : {}}
              className={'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium border transition-all whitespace-nowrap '
                + (active ? 'text-white shadow-lg' : 'bg-card border-white/10 text-white/50 hover:text-white/80 hover:border-white/20')}>
              <c.Icon size={14} style={active ? { color: 'white' } : { color: c.color }} />
              <span>{c.name}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
