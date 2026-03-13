import { useStore } from '../store/useStore'

const CATS = [
  { id: 'todos',      name: 'Todos',      icon: 'Ìªí' },
  { id: 'mercearia',  name: 'Mercearia',  icon: 'Ìºæ' },
  { id: 'hortifruti', name: 'Hortifruti', icon: 'Ìµ¶' },
  { id: 'a√ßougue',    name: 'A√ßougue',    icon: 'Ìµ©' },
  { id: 'latic√≠nios', name: 'Latic√≠nios', icon: 'Ì∑Ä' },
  { id: 'padaria',    name: 'Padaria',    icon: 'ÌΩû' },
  { id: 'bebidas',    name: 'Bebidas',    icon: 'Ìµ§' },
  { id: 'limpeza',    name: 'Limpeza',    icon: 'Ì∑π' },
  { id: 'higiene',    name: 'Higiene',    icon: 'Ì∑¥' },
]

export default function CategoryFilter() {
  const { category, setCategory } = useStore()
  return (
    <div className="overflow-x-auto -mx-4 px-4">
      <div className="flex gap-2 pb-1 min-w-max">
        {CATS.map((c) => (
          <button key={c.id} onClick={() => setCategory(c.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium border transition-all whitespace-nowrap
              ${category === c.id
                ? 'bg-brand-500 border-brand-500 text-white shadow-lg shadow-brand-500/25'
                : 'bg-card border-white/10 text-white/50 hover:text-white/80 hover:border-white/20'}`}>
            <span>{c.icon}</span><span>{c.name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
