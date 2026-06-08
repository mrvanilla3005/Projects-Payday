import { useState, useEffect } from 'react'
import {
  loadRecords, calcSettlement, currentMonthYear,
  formatCZK, MONTHS, filterByMonth, PROJECTS
} from '../data/store.js'
import { Clock, TrendingUp, AlertCircle, CheckCircle, Layers } from 'lucide-react'

function StatCard({ label, value, sub, icon: Icon, color = 'accent' }) {
  const colors = {
    accent: 'text-accent',
    success: 'text-success',
    danger: 'text-danger',
    info: 'text-info',
  }
  return (
    <div className="card flex items-start gap-4">
      <div className={`p-2 rounded-lg bg-white/5 ${colors[color]}`}>
        <Icon size={18} />
      </div>
      <div>
        <p className="text-muted text-xs uppercase tracking-wider mb-1">{label}</p>
        <p className={`text-2xl font-bold font-mono ${colors[color]}`}>{value}</p>
        {sub && <p className="text-muted text-xs mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [records, setRecords] = useState([])
  const { mesic, rok } = currentMonthYear()

  useEffect(() => {
    loadRecords().then(setRecords)
  }, [])

  const settlement = calcSettlement(records, mesic, rok)
  const monthRecords = filterByMonth(records, mesic, rok)

  // Hodiny per projekt v aktuálním měsíci
  const hoursByProject = PROJECTS.map(p => ({
    projekt: p,
    hodiny: monthRecords
      .filter(r => r.projekt === p && r.typ === 'hodiny')
      .reduce((s, r) => s + (r.hodiny || 0), 0),
  })).filter(p => p.hodiny > 0)

  // Poslední 5 záznamů
  const recent = records.slice(0, 5)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-muted text-sm mt-1">
          {MONTHS[mesic - 1]} {rok} · aktuální přehled
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Odprac. hodiny"
          value={`${settlement.totalHours} h`}
          icon={Clock}
          color="accent"
        />
        <StatCard
          label="Celkem k fakturaci"
          value={formatCZK(settlement.sum)}
          icon={TrendingUp}
          color="info"
        />
        <StatCard
          label="Nevyplaceno"
          value={formatCZK(Math.abs(settlement.difference))}
          sub={settlement.difference < 0 ? 'dluh' : 'přeplatek'}
          icon={AlertCircle}
          color={settlement.difference < 0 ? 'danger' : 'success'}
        />
        <StatCard
          label="Kv. bonus"
          value={settlement.bonus > 0 ? formatCZK(settlement.bonus) : '–'}
          icon={CheckCircle}
          color="success"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Hodiny per projekt */}
        <div className="card">
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Layers size={14} className="text-accent" />
            Hodiny dle projektu – {MONTHS[mesic - 1]}
          </h2>
          {hoursByProject.length === 0 ? (
            <p className="text-muted text-sm">Žádné záznamy pro tento měsíc.</p>
          ) : (
            <div className="space-y-3">
              {hoursByProject.map(({ projekt, hodiny }) => {
                const max = Math.max(...hoursByProject.map(p => p.hodiny))
                const pct = Math.round((hodiny / max) * 100)
                return (
                  <div key={projekt}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-white">{projekt}</span>
                      <span className="text-muted font-mono">{hodiny} h</span>
                    </div>
                    <div className="h-1.5 bg-bg rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Poslední záznamy */}
        <div className="card">
          <h2 className="text-sm font-semibold text-white mb-4">Poslední záznamy</h2>
          {recent.length === 0 ? (
            <p className="text-muted text-sm">Žádné záznamy.</p>
          ) : (
            <div className="space-y-2">
              {recent.map(r => (
                <div
                  key={r.id}
                  className="flex items-center justify-between py-2 border-b border-border last:border-0"
                >
                  <div>
                    <p className="text-sm text-white">{r.aktivita || '–'}</p>
                    <p className="text-xs text-muted">{r.projekt} · {MONTHS[(r.mesic || 1) - 1]} {r.rok}</p>
                  </div>
                  <div className="text-right">
                    {r.hodiny && (
                      <span className="text-xs font-mono text-accent">{r.hodiny} h</span>
                    )}
                    {r.sum && (
                      <span className="text-xs font-mono text-success block">{formatCZK(r.sum)}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
