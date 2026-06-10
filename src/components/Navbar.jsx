import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Layers, BarChart2, Clock, ShoppingBag, ChevronDown, ChevronRight, PanelLeftClose, PanelLeftOpen } from 'lucide-react'

export default function Navbar({ isOpen, onToggle }) {
  const [vyrovnaniOpen, setVyrovnaniOpen] = useState(true)
  const location = useLocation()
  const inVyrovnani = location.pathname === '/vyrovnani' || location.pathname === '/prodej'

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
      isActive
        ? 'bg-accent/10 text-accent font-medium'
        : 'text-muted hover:text-white hover:bg-white/5'
    }`

  const subLinkClass = ({ isActive }) =>
    `flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm transition-all ${
      isActive
        ? 'bg-accent/10 text-accent font-medium'
        : 'text-muted hover:text-white hover:bg-white/5'
    }`

  return (
    <>
      {/* Toggle tlačítko — vždy viditelné */}
      <button
        onClick={onToggle}
        title={isOpen ? 'Skrýt lištu' : 'Zobrazit lištu'}
        className={`fixed top-4 z-50 p-1.5 bg-surface border border-border rounded-lg text-muted hover:text-white transition-all duration-200 ${
          isOpen ? 'left-[200px]' : 'left-3'
        }`}
      >
        {isOpen ? <PanelLeftClose size={14} /> : <PanelLeftOpen size={14} />}
      </button>

      {/* Samotná lišta */}
      {isOpen && (
        <aside className="fixed left-0 top-0 h-full w-56 bg-surface border-r border-border flex flex-col z-40 transition-all duration-200">
          {/* Logo */}
          <div className="px-6 py-5 border-b border-border">
            <span className="text-accent font-mono font-bold text-sm tracking-tight leading-tight block">PROJEKTY &amp;</span>
            <span className="text-white font-mono font-bold text-sm tracking-tight">VYROVNÁNÍ</span>
            <p className="text-muted text-xs mt-1">Tomáš – přehled práce</p>
          </div>

          <nav className="flex-1 px-3 py-4 space-y-0.5">
            {/* Projekty */}
            <NavLink to="/projekty" className={linkClass}>
              <Layers size={16} />
              Projekty
            </NavLink>

            {/* Vyrovnání sekce */}
            <div>
              <button
                onClick={() => setVyrovnaniOpen(o => !o)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                  inVyrovnani ? 'text-white font-medium' : 'text-muted hover:text-white hover:bg-white/5'
                }`}
              >
                <BarChart2 size={16} />
                <span className="flex-1 text-left">Vyrovnání</span>
                {vyrovnaniOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
              </button>

              {vyrovnaniOpen && (
                <div className="ml-3 mt-0.5 space-y-0.5 border-l border-border/40 pl-3">
                  <NavLink to="/vyrovnani" className={subLinkClass}>
                    <Clock size={14} />
                    Hodiny
                  </NavLink>
                  <NavLink to="/prodej" className={subLinkClass}>
                    <ShoppingBag size={14} />
                    Prodej
                  </NavLink>
                </div>
              )}
            </div>
          </nav>

          <div className="px-6 py-4 border-t border-border">
            <p className="text-muted text-xs">v1.0 · 2026</p>
          </div>
        </aside>
      )}
    </>
  )
}
