import { NavLink } from 'react-router-dom'
import { Layers, BarChart2, ShoppingBag, List, Plus, PanelLeftClose, PanelLeftOpen, LogOut, Tag, Brain } from 'lucide-react'
import { useAuth } from '../lib/auth.jsx'

const links = [
  { to: '/projekty',  label: 'Projekty',   icon: Layers },
  { to: '/vyrovnani', label: 'Vyrovnání',  icon: BarChart2 },
  { to: '/prodej',          label: 'Prodej',          icon: ShoppingBag },
  { to: '/amazon-poukazy', label: 'Amazon poukazy',  icon: Tag },
  { to: '/myslenky',       label: 'Myšlenky',        icon: Brain },
  { to: '/zaznamy',        label: 'Záznamy',         icon: List },
  { to: '/pridat',   label: 'Přidat',     icon: Plus },
]

export default function Navbar({ isOpen, onToggle }) {
  const { signOut } = useAuth()

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
      isActive ? 'bg-accent/10 text-accent font-medium' : 'text-muted hover:text-white hover:bg-white/5'
    }`

  return (
    <>
      <button
        onClick={onToggle}
        title={isOpen ? 'Skrýt lištu' : 'Zobrazit lištu'}
        className={`fixed top-4 z-50 p-1.5 bg-surface border border-border rounded-lg text-muted hover:text-white transition-all duration-200 ${
          isOpen ? 'left-[200px]' : 'left-3'
        }`}
      >
        {isOpen ? <PanelLeftClose size={14} /> : <PanelLeftOpen size={14} />}
      </button>

      {isOpen && (
        <aside className="fixed left-0 top-0 h-full w-56 bg-surface border-r border-border flex flex-col z-40">
          <div className="px-6 py-5 border-b border-border">
            <span className="text-accent font-mono font-bold text-sm tracking-tight leading-tight block">PROJEKTY &amp;</span>
            <span className="text-white font-mono font-bold text-sm tracking-tight">VYROVNÁNÍ</span>
            <p className="text-muted text-xs mt-1">Tomáš – přehled práce</p>
          </div>

          <nav className="flex-1 px-3 py-4 space-y-1">
            {links.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} className={linkClass}>
                <Icon size={16} />
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="px-3 py-3 border-t border-border">
            <button
              onClick={signOut}
              className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-muted hover:text-white hover:bg-white/5 transition-all"
            >
              <LogOut size={14} />
              Odhlásit se
            </button>
          </div>
        </aside>
      )}
    </>
  )
}
