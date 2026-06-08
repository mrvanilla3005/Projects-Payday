import { NavLink } from 'react-router-dom'
import { Layers, BarChart2, ShoppingBag } from 'lucide-react'

const links = [
  { to: '/projekty',  label: 'Projekty',  icon: Layers },
  { to: '/vyrovnani', label: 'Vyrovnání', icon: BarChart2 },
  { to: '/prodej',    label: 'Prodej',    icon: ShoppingBag },
]

export default function Navbar() {
  return (
    <aside className="fixed left-0 top-0 h-full w-56 bg-surface border-r border-border flex flex-col z-50">
      <div className="px-6 py-5 border-b border-border">
        <span className="text-accent font-mono font-bold text-sm tracking-tight leading-tight block">PROJEKTY &amp;</span>
        <span className="text-white font-mono font-bold text-sm tracking-tight">VYROVNÁNÍ</span>
        <p className="text-muted text-xs mt-1">Tomáš – přehled práce</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                isActive
                  ? 'bg-accent/10 text-accent font-medium'
                  : 'text-muted hover:text-white hover:bg-white/5'
              }`
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-6 py-4 border-t border-border">
        <p className="text-muted text-xs">v1.0 · 2026</p>
      </div>
    </aside>
  )
}
