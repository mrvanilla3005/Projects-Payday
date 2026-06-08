import { useState, useEffect, useRef } from 'react'
import {
  loadRecords, addRecord, updateRecord, deleteRecord,
  formatCZK, PROJECTS, MONTHS, currentMonthYear,
} from '../data/store.js'
import { Plus, Trash2, ChevronDown, ChevronRight, ChevronsUpDown, Copy, Check } from 'lucide-react'

// ── Inline editovatelná buňka ───────────────────
function Cell({ value, type = 'text', step, onSave, fmt, colorFn, suggestions }) {
  const [on, setOn]     = useState(false)
  const [draft, setDraft] = useState('')
  const ref = useRef()

  function start() { setDraft(value ?? ''); setOn(true) }
  useEffect(() => { if (on) { ref.current?.focus(); ref.current?.select() } }, [on])

  function commit() {
    setOn(false)
    let parsed
    if (type === 'number') {
      parsed = draft !== '' && draft !== null ? Number(draft) : null
    } else {
      parsed = typeof draft === 'string' ? draft.trim() || null : null
    }
    if (parsed !== (value ?? null)) onSave(parsed)
  }

  function onKey(e) {
    if (e.key === 'Enter') { e.preventDefault(); ref.current?.blur() }
    if (e.key === 'Escape') { setOn(false) }
  }

  if (on) {
    return (
      <input
        ref={ref}
        type={type === 'date' ? 'date' : type === 'number' ? 'number' : 'text'}
        step={step}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={onKey}
        list={suggestions ? 'activity-datalist' : undefined}
        className="w-full bg-bg border border-accent/60 rounded px-2 py-0.5 text-white text-sm outline-none min-w-0"
      />
    )
  }

  const shown = fmt ? fmt(value) : (value != null && value !== '' ? String(value) : null)
  const col   = colorFn ? colorFn(value) : 'text-white'
  return (
    <div
      onClick={start}
      className={`px-2 py-1 min-h-[28px] rounded cursor-text hover:bg-white/5 text-sm whitespace-nowrap ${col}`}
    >
      {shown ?? <span className="text-white/15 text-xs select-none">—</span>}
    </div>
  )
}

// ── Tlačítko kopírovat souhrn měsíce ───────────
function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  function handle(e) {
    e.stopPropagation()
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }
  return (
    <button
      onClick={handle}
      title="Kopírovat souhrn"
      className="ml-1 p-1 rounded text-muted hover:text-white transition-colors opacity-0 group-hover/header:opacity-100"
    >
      {copied ? <Check size={12} className="text-success" /> : <Copy size={12} />}
    </button>
  )
}

// ── Barevná tečka stavu měsíce ─────────────────
function StatusDot({ totalSum, totalPaid }) {
  if (totalSum === 0 && totalPaid === 0)
    return <span className="w-2 h-2 rounded-full bg-white/20 inline-block" title="Bez finančních záznamů" />
  const diff = totalSum - totalPaid
  if (diff < -100)
    return <span className="w-2 h-2 rounded-full bg-red-500 inline-block" title="Dluh" />
  if (diff > 100)
    return <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" title="Přeplatek" />
  return <span className="w-2 h-2 rounded-full bg-green-500 inline-block" title="Vyrovnáno" />
}

// ── Skupina jednoho měsíce ──────────────────────
function MonthGroup({ mesic, rok, records, isOpen, onToggle, onSave, onDelete, onAdd }) {
  const totalH    = records.reduce((s, r) => s + (r.hodiny || 0), 0)
  const totalSum  = records.reduce((s, r) => s + (r.sum  || 0), 0)
  const totalPaid = records.reduce((s, r) => s + (r.paid || 0), 0)
  const diff      = totalSum - totalPaid

  const copyText = [
    `${MONTHS[mesic - 1]} ${rok}:`,
    totalH > 0 ? `${totalH} h` : null,
    totalSum > 0 ? `SUM ${formatCZK(totalSum)}` : null,
    totalPaid > 0 ? `PAID ${formatCZK(totalPaid)}` : null,
    (totalSum > 0 || totalPaid > 0) ? `Diff ${formatCZK(diff)}` : null,
  ].filter(Boolean).join(' · ')

  const fmtDate = v => v ? new Date(v + 'T12:00:00').toLocaleDateString('cs-CZ', { day: '2-digit', month: '2-digit', year: 'numeric' }) : null
  const fmtCZK  = v => v != null ? formatCZK(v) : null
  const fmtNum  = v => v != null ? String(v) : null
  const colDiff = v => v == null ? '' : v < 0 ? 'text-danger font-mono' : 'text-success font-mono'
  const colPaid = () => 'text-success font-mono'

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <button
        onClick={onToggle}
        className="group/header w-full flex items-center gap-2.5 px-4 py-3 hover:bg-white/5 transition-colors text-left bg-surface"
      >
        <span className="text-muted shrink-0">
          {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
        <StatusDot totalSum={totalSum} totalPaid={totalPaid} />
        <span className="text-white font-semibold text-sm">{MONTHS[mesic - 1]}</span>
        {totalH > 0 && (
          <span className="text-accent font-mono text-sm font-bold">{totalH} h</span>
        )}
        <CopyButton text={copyText} />
        <span className="flex-1" />
        <span className="text-muted text-xs">{records.length} zázn.</span>
      </button>

      {isOpen && (
        <div className="border-t border-border/40">
          <datalist id="activity-datalist">
            {PROJECTS.map(p => <option key={p} value={p} />)}
          </datalist>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  {['Activity', 'Info', 'Day', 'Hours', 'PAID', 'Difference'].map(col => (
                    <th key={col} className="text-left text-xs text-muted uppercase tracking-wider px-3 py-2 font-medium first:pl-4">
                      {col}
                    </th>
                  ))}
                  <th className="w-8 px-2" />
                </tr>
              </thead>
              <tbody>
                {records.map(r => (
                  <tr key={r.id} className="border-b border-border/40 hover:bg-white/[0.025] group">
                    <td className="px-1 py-0.5 pl-2 min-w-[150px]">
                      <Cell value={r.projekt} onSave={v => onSave(r.id, 'projekt', v ?? '')} suggestions />
                    </td>
                    <td className="px-1 py-0.5 min-w-[160px]">
                      <Cell value={r.aktivita} onSave={v => onSave(r.id, 'aktivita', v ?? '')} />
                    </td>
                    <td className="px-1 py-0.5 min-w-[110px]">
                      <Cell value={r.datum} type="date" onSave={v => onSave(r.id, 'datum', v)} fmt={fmtDate} />
                    </td>
                    <td className="px-1 py-0.5 min-w-[70px]">
                      <Cell value={r.hodiny} type="number" step="0.5" onSave={v => onSave(r.id, 'hodiny', v)} fmt={fmtNum} />
                    </td>
                    <td className="px-1 py-0.5 min-w-[110px]">
                      <Cell value={r.paid} type="number" step="1" onSave={v => onSave(r.id, 'paid', v)} fmt={fmtCZK} colorFn={colPaid} />
                    </td>
                    <td className="px-1 py-0.5 min-w-[110px]">
                      <Cell value={r.difference} type="number" step="1" onSave={v => onSave(r.id, 'difference', v)} fmt={fmtCZK} colorFn={colDiff} />
                    </td>
                    <td className="px-2 py-0.5 text-right">
                      <button
                        onClick={() => onDelete(r.id)}
                        className="opacity-0 group-hover:opacity-100 text-muted hover:text-danger transition-all p-1"
                      >
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            onClick={() => onAdd(mesic, rok)}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-muted hover:text-white hover:bg-white/5 text-sm border-t border-border/40 transition-colors"
          >
            <Plus size={13} /> Nový záznam v {MONTHS[mesic - 1]}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Skupina jednoho roku ────────────────────────
function YearGroup({ rok, monthGroups, open, onToggle, onSave, onDelete, onAdd, yearOpen, onYearToggle }) {
  const totalH = monthGroups.flatMap(g => g.records).reduce((s, r) => s + (r.hodiny || 0), 0)

  return (
    <div className="space-y-1.5">
      <button
        onClick={onYearToggle}
        className="w-full flex items-center gap-2 px-2 py-1.5 text-left hover:bg-white/5 rounded-lg transition-colors"
      >
        <span className="text-muted">
          {yearOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </span>
        <span className="text-muted font-semibold text-xs uppercase tracking-widest">{rok}</span>
        <span className="text-muted font-mono text-xs">{totalH} h celkem</span>
      </button>

      {yearOpen && (
        <div className="space-y-1.5 pl-3">
          {monthGroups.map(({ mesic, records }) => {
            const key = `${rok}-${String(mesic).padStart(2, '0')}`
            return (
              <MonthGroup
                key={key}
                mesic={mesic}
                rok={rok}
                records={records}
                isOpen={open.has(key)}
                onToggle={() => onToggle(key)}
                onSave={onSave}
                onDelete={onDelete}
                onAdd={onAdd}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Hlavní stránka ──────────────────────────────
export default function Vyrovnani() {
  const [records, setRecords]     = useState([])
  const [filterRok, setFilterRok] = useState('vse')
  const { mesic: curMesic, rok: curRok } = currentMonthYear()
  const curKey = `${curRok}-${String(curMesic).padStart(2, '0')}`

  const [open, setOpen]           = useState(new Set([curKey]))
  const [openYears, setOpenYears] = useState(new Set([String(curRok)]))

  async function reload() { setRecords(await loadRecords()) }
  useEffect(() => { reload() }, [])

  async function save(id, field, val) {
    const extra = {}
    if (field === 'datum' && val) {
      const d = new Date(val + 'T12:00:00')
      if (!isNaN(d)) { extra.mesic = d.getMonth() + 1; extra.rok = d.getFullYear() }
    }
    await updateRecord(id, { [field]: val, ...extra })
    await reload()
  }

  async function addRow(mesic, rok) {
    const now  = new Date()
    const datum = rok === now.getFullYear() && mesic === now.getMonth() + 1
      ? now.toISOString().slice(0, 10)
      : `${rok}-${String(mesic).padStart(2, '0')}-01`
    await addRecord({ datum, projekt: '', aktivita: '', hodiny: null, sum: null, paid: null, difference: null, mesic, rok, typ: 'hodiny' })
    await reload()
  }

  async function del(id) {
    if (!confirm('Smazat záznam?')) return
    await deleteRecord(id)
    await reload()
  }

  function toggleMonth(key) {
    setOpen(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n })
  }

  function toggleYear(rok) {
    setOpenYears(prev => { const n = new Set(prev); n.has(String(rok)) ? n.delete(String(rok)) : n.add(String(rok)); return n })
  }

  // Seskupit záznamy dle rok+mesic
  const monthMap = {}
  records.forEach(r => {
    const key = `${r.rok}-${String(r.mesic).padStart(2, '0')}`
    if (!monthMap[key]) monthMap[key] = { mesic: r.mesic, rok: r.rok, records: [] }
    monthMap[key].records.push(r)
  })

  // Seskupit měsíce dle roku
  const yearMap = {}
  Object.entries(monthMap)
    .sort(([a], [b]) => b.localeCompare(a))
    .forEach(([, { mesic, rok, records: recs }]) => {
      if (!yearMap[rok]) yearMap[rok] = []
      yearMap[rok].push({ mesic, records: recs })
    })

  const years = Object.keys(yearMap).sort((a, b) => b - a)
  const filteredYears = filterRok === 'vse' ? years : years.filter(y => y === filterRok)

  const totalH    = records.reduce((s, r) => s + (r.hodiny || 0), 0)
  const totalPaid = records.reduce((s, r) => s + (r.paid || 0), 0)

  const allKeys = Object.keys(monthMap)
  const allOpen = allKeys.every(k => open.has(k))
  function toggleAll() {
    if (allOpen) {
      setOpen(new Set())
      setOpenYears(new Set())
    } else {
      setOpen(new Set(allKeys))
      setOpenYears(new Set(years))
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">Vyrovnání</h1>
          <p className="text-muted text-sm mt-0.5">{years.length} roků · {Object.keys(monthMap).length} měsíců · {records.length} záznamů</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Filtr roku */}
          <select
            value={filterRok}
            onChange={e => setFilterRok(e.target.value)}
            className="input text-sm py-1.5 w-auto"
          >
            <option value="vse">Všechny roky</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          {/* Rozbalit/sbalit vše */}
          <button
            onClick={toggleAll}
            title={allOpen ? 'Sbalit vše' : 'Rozbalit vše'}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-muted hover:text-white hover:border-white/30 text-xs transition-colors"
          >
            <ChevronsUpDown size={13} />
            {allOpen ? 'Sbalit vše' : 'Rozbalit vše'}
          </button>
        </div>
      </div>

      {/* Celkové souhrny */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card">
          <p className="text-xs text-muted uppercase tracking-wider mb-1">Celkem hodin</p>
          <p className="text-2xl font-bold font-mono text-accent">{totalH} h</p>
        </div>
        <div className="card">
          <p className="text-xs text-muted uppercase tracking-wider mb-1">PAID celkem</p>
          <p className="text-2xl font-bold font-mono text-success">{formatCZK(totalPaid)}</p>
        </div>
      </div>

      {/* Roky → Měsíce → Záznamy */}
      <div className="space-y-4">
        {filteredYears.length === 0 && (
          <p className="text-muted text-sm text-center py-8">Žádné záznamy.</p>
        )}
        {filteredYears.map(rok => (
          <YearGroup
            key={rok}
            rok={Number(rok)}
            monthGroups={yearMap[rok]}
            open={open}
            onToggle={toggleMonth}
            onSave={save}
            onDelete={del}
            onAdd={addRow}
            yearOpen={openYears.has(rok)}
            onYearToggle={() => toggleYear(rok)}
          />
        ))}
      </div>
    </div>
  )
}
