import { useState, useEffect, useRef } from 'react'
import {
  loadRecords, addRecord, updateRecord, deleteRecord,
  loadProdeje, formatCZK, MONTHS, currentMonthYear, PROVIZE_SAZBY, getHourlyRate,
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
function MonthGroup({ mesic, rok, records, isOpen, onToggle, onSave, onDelete, onAdd, addLabel = 'Nový záznam', isSettled }) {
  const totalH    = records.filter(r => r.typ === 'hodiny' || r.typ === 'podil_prodej').reduce((s, r) => s + (r.hodiny || 0), 0)
  const totalSum  = records.filter(r => r.typ !== 'kvartal_bonus').reduce((s, r) => s + (r.sum  || 0), 0)
  const totalPaid = records.filter(r => r.typ !== 'kvartal_bonus').reduce((s, r) => s + (r.paid || 0), 0)
  const diff      = totalSum - totalPaid

  const bonusSum  = records.filter(r => r.typ === 'kvartal_bonus').reduce((s, r) => s + (r.sum || 0), 0)

  const nevyrRecords = isSettled
    ? records.filter(r => r.typ !== 'kvartal_bonus' && !isSettled(r))
    : []
  const nevyrH   = nevyrRecords.reduce((s, r) => s + (r.hodiny || 0), 0)
  const nevyrHKc = nevyrRecords.reduce((s, r) => s + (r.hodiny || 0) * getHourlyRate(r.datum), 0)

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
      <div
        onClick={onToggle}
        className="group/header w-full flex items-center gap-2.5 px-4 py-3 hover:bg-white/5 transition-colors cursor-pointer bg-surface"
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
        {nevyrH > 0 && (
          <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-400/10 text-yellow-400 font-mono shrink-0">
            {nevyrH} h nevyrovnáno = {formatCZK(nevyrHKc)}
          </span>
        )}
        {bonusSum > 0 && (rok > 2025 || (rok === 2025 && mesic >= 6)) && (
          <span className="text-success font-mono text-sm font-semibold ml-1">+{formatCZK(bonusSum)}</span>
        )}
      </div>

      {isOpen && (
        <div className="border-t border-border/40">
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
                {records.filter(r => r.typ !== 'kvartal_bonus').map(r => {
                  const settled = isSettled ? isSettled(r) : true
                  return (
                    <tr key={r.id} className={`border-b border-border/40 group transition-colors ${settled ? 'hover:bg-white/[0.025]' : 'bg-yellow-400/[0.04] hover:bg-yellow-400/[0.07]'}`}>
                      <td className="px-1 py-0.5 pl-2 min-w-[150px]">
                        <Cell value={r.projekt} onSave={v => onSave(r.id, 'projekt', v ?? '')} />
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
                  )
                })}
              </tbody>
            </table>
          </div>
          <button
            onClick={() => onAdd(mesic, rok)}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-muted hover:text-white hover:bg-white/5 text-sm border-t border-border/40 transition-colors"
          >
            <Plus size={13} /> {addLabel} v {MONTHS[mesic - 1]}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Skupina jednoho roku ────────────────────────
function YearGroup({ rok, monthGroups, open, onToggle, onSave, onDelete, onAdd, yearOpen, onYearToggle, addLabel, isSettled }) {
  const totalH = monthGroups.flatMap(g => g.records).filter(r => r.typ === 'hodiny' || r.typ === 'podil_prodej').reduce((s, r) => s + (r.hodiny || 0), 0)

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
                addLabel={addLabel}
                isSettled={isSettled}
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
  const [prodeje, setProdeje]     = useState([])
  const [filterRok, setFilterRok] = useState('vse')
  const { mesic: curMesic, rok: curRok } = currentMonthYear()
  const curKey = `${curRok}-${String(curMesic).padStart(2, '0')}`

  const [open, setOpen]           = useState(new Set([curKey]))
  const [openYears, setOpenYears] = useState(new Set([String(curRok)]))
  const [tab, setTab]             = useState('hodiny')
  const [showNevyrProdeje, setShowNevyrProdeje] = useState(false)
  async function reload() {
    const [r, p] = await Promise.all([loadRecords(), loadProdeje()])
    setRecords(r)
    setProdeje(p)
  }
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

  async function addRow(mesic, rok, typ = 'hodiny') {
    const now  = new Date()
    const datum = rok === now.getFullYear() && mesic === now.getMonth() + 1
      ? now.toISOString().slice(0, 10)
      : `${rok}-${String(mesic).padStart(2, '0')}-01`
    const projekt = typ === 'vyrovnani' ? 'Vyrovnání' : ''
    await addRecord({ datum, projekt, aktivita: '', hodiny: null, sum: null, paid: null, difference: null, mesic, rok, typ })
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

  function buildYearMap(list) {
    const monthMap = {}
    list.forEach(r => {
      const key = `${r.rok}-${String(r.mesic).padStart(2, '0')}`
      if (!monthMap[key]) monthMap[key] = { mesic: r.mesic, rok: r.rok, records: [] }
      monthMap[key].records.push(r)
    })

    const yearMap = {}
    Object.entries(monthMap)
      .sort(([a], [b]) => b.localeCompare(a))
      .forEach(([, { mesic, rok, records: recs }]) => {
        if (!yearMap[rok]) yearMap[rok] = []
        yearMap[rok].push({ mesic, records: recs })
      })

    const years = Object.keys(yearMap).sort((a, b) => b - a)
    return { monthMap, yearMap, years }
  }

  // Poslední datum vyrovnání (latest datum_do, nebo datum jako fallback)
  const lastSettledDate = records
    .filter(r => r.typ === 'vyrovnani' && (r.datum_do || r.datum))
    .map(r => r.datum_do || r.datum)
    .sort()
    .at(-1) ?? null

  function isSettled(record) {
    if (!record.datum) return true
    if (!lastSettledDate) return false
    return record.datum <= lastSettledDate
  }

  const hodinyRecords = records.filter(r => r.typ === 'hodiny' || r.typ === 'kvartal_bonus')
  const { monthMap, yearMap, years } = buildYearMap(hodinyRecords)
  const filteredYears = filterRok === 'vse' ? years : years.filter(y => y === filterRok)

  const totalH = hodinyRecords.reduce((s, r) => s + (r.hodiny || 0), 0)
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

  const sumHodiny = records.filter(r => r.typ === 'hodiny').reduce((s, r) => s + (r.sum || 0), 0)
  const sumProdej = records.filter(r => r.typ === 'podil_prodej').reduce((s, r) => s + (r.paid || 0), 0)
  const sumBonusy = records.filter(r => r.typ === 'kvartal_bonus').reduce((s, r) => s + (r.sum || 0), 0)
  const celkemKc  = sumHodiny + sumProdej + sumBonusy

  const TABS = [
    { id: 'vyrovnani', label: 'VYROVNÁNÍ' },
    { id: 'hodiny',    label: 'HODINY' },
  ]

  // Nevyrovnané záznamy — vše po lastSettledDate
  const nevyrHodiny = records.filter(r =>
    r.typ === 'hodiny' && r.datum && (!lastSettledDate || r.datum > lastSettledDate)
  )
  const nevyrH    = nevyrHodiny.reduce((s, r) => s + (r.hodiny || 0), 0)
  const nevyrHKc  = nevyrHodiny.reduce((s, r) => s + (r.hodiny || 0) * getHourlyRate(r.datum), 0)

  const nevyrBonusy = records.filter(r =>
    r.typ === 'kvartal_bonus' && r.datum && (!lastSettledDate || r.datum > lastSettledDate)
  )
  const nevyrBonusKc = nevyrBonusy.reduce((s, r) => s + (r.sum || 0), 0)

  const nevyrProdeje = prodeje.filter(p => p.datum && (!lastSettledDate || p.datum > lastSettledDate))
    .sort((a, b) => (a.datum || '').localeCompare(b.datum || ''))

  // scale per den+kategorie: celkova_cena / sum(kusu*cena)
  // klíč je datum__kategorie – celkova_cena se ukládá zvlášť pro iPhony a zvlášť pro elektroniku
  const _dkGroups = {}
  nevyrProdeje.forEach(p => { const k = `${p.datum || ''}__${p.kategorie || ''}`; (_dkGroups[k] ??= []).push(p) })
  const nevyrDayScale = Object.fromEntries(
    Object.entries(_dkGroups).map(([k, items]) => {
      const teor = items.reduce((s, p) => s + (p.kusu || 0) * (p.cena || 0), 0)
      const skutecna = items.find(p => p.celkova_cena != null)?.celkova_cena ?? null
      return [k, skutecna != null && teor > 0 ? skutecna / teor : 1]
    })
  )

  const nevyrProvize = nevyrProdeje.reduce((s, p) => {
    const sazba = p.kategorie === 'iphone' ? (p.typ === '17' ? 0.05 : 0.10) : PROVIZE_SAZBY.elektronika
    const scale = nevyrDayScale[`${p.datum || ''}__${p.kategorie || ''}`] ?? 1
    return s + Math.round((p.kusu || 0) * (p.cena || 0) * scale * sazba)
  }, 0)
  const nevyrProdejeCelkem = Object.values(_dkGroups).reduce((total, items) => {
    const skutecna = items.find(p => p.celkova_cena != null)?.celkova_cena ?? null
    return total + (skutecna ?? items.reduce((s, p) => s + (p.kusu || 0) * (p.cena || 0), 0))
  }, 0)

  const nevyrCelkemKc = nevyrHKc + nevyrBonusKc + nevyrProvize

  const fmtLastDate = lastSettledDate
    ? new Date(lastSettledDate + 'T12:00:00').toLocaleDateString('cs-CZ', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : null

  const jeNevyr = nevyrH > 0 || nevyrBonusy.length > 0 || nevyrProdeje.length > 0

  return (
    <div className="space-y-5">
      {/* Stav vyrovnání */}
      {!jeNevyr ? (
        <div className="rounded-xl border border-success/30 bg-success/[0.05] px-5 py-4 flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-success shrink-0" />
          <span className="text-success text-sm font-medium">Vše vyrovnáno</span>
          {fmtLastDate && <span className="text-muted text-xs ml-1">do {fmtLastDate}</span>}
        </div>
      ) : (
        <div className="rounded-xl border border-yellow-400/30 bg-yellow-400/[0.05] px-5 py-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 shrink-0" />
              <span className="text-yellow-400 text-sm font-semibold">Čeká na vyrovnání</span>
            </div>
            {fmtLastDate && (
              <span className="text-xs text-muted">poslední vyrovnání: <span className="text-white/60 font-mono">{fmtLastDate}</span></span>
            )}
          </div>
          <p className="text-3xl font-bold font-mono text-yellow-400 pl-5">{formatCZK(nevyrCelkemKc)}</p>
          <div className="flex flex-wrap gap-6 pl-5 border-t border-yellow-400/10 pt-3">
            {nevyrH > 0 && (
              <div>
                <p className="text-xs text-muted uppercase tracking-wider mb-0.5">Hodiny</p>
                <p className="text-base font-semibold font-mono text-white">{formatCZK(nevyrHKc)}</p>
                <p className="text-xs text-muted mt-0.5">{nevyrH} h</p>
              </div>
            )}
            {nevyrProdeje.length > 0 && (
              <button
                onClick={() => setShowNevyrProdeje(v => !v)}
                className="text-left hover:opacity-80 transition-opacity"
              >
                <p className="text-xs text-muted uppercase tracking-wider mb-0.5">Provize z prodejů</p>
                <p className="text-base font-semibold font-mono text-white">{formatCZK(nevyrProvize)}</p>
                <p className="text-xs text-muted mt-0.5 flex items-center gap-1">
                  {nevyrProdeje.length} prodejů · {formatCZK(nevyrProdejeCelkem)}
                  {showNevyrProdeje ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                </p>
              </button>
            )}
            {nevyrBonusy.length > 0 && (
              <div>
                <p className="text-xs text-muted uppercase tracking-wider mb-0.5">Kvartální bonus</p>
                <p className="text-base font-semibold font-mono text-white">{formatCZK(nevyrBonusKc)}</p>
              </div>
            )}
          </div>
          {showNevyrProdeje && nevyrProdeje.length > 0 && (
            <div className="border-t border-yellow-400/10 pt-3 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-muted">
                    <th className="text-left pb-1.5 font-medium pr-4">Datum</th>
                    <th className="text-left pb-1.5 font-medium pr-4">Produkt</th>
                    <th className="text-left pb-1.5 font-medium pr-4">Prodejce</th>
                    <th className="text-right pb-1.5 font-medium pr-4">Ks</th>
                    <th className="text-right pb-1.5 font-medium pr-4">Cena/ks</th>
                    <th className="text-right pb-1.5 font-medium pr-4">Celkem</th>
                    <th className="text-right pb-1.5 font-medium">Provize</th>
                  </tr>
                </thead>
                <tbody>
                  {nevyrProdeje.map(p => {
                    const fmtD = p.datum ? new Date(p.datum + 'T12:00:00').toLocaleDateString('cs-CZ', { day: '2-digit', month: '2-digit' }) : '–'
                    const nazev = p.kategorie === 'iphone'
                      ? `iPhone ${p.typ || ''}${p.model ? ' ' + p.model : ''}`.trim()
                      : (p.nazev || '–')
                    const sazba = p.kategorie === 'iphone' ? (p.typ === '17' ? 0.05 : 0.10) : PROVIZE_SAZBY.elektronika
                    const scale = nevyrDayScale[`${p.datum || ''}__${p.kategorie || ''}`] ?? 1
                    const provize = Math.round((p.kusu || 0) * (p.cena || 0) * scale * sazba)
                    const celkem = (p.kusu || 0) * (p.cena || 0)
                    return (
                      <tr key={p.id} className="border-t border-white/5">
                        <td className="py-1 pr-4 text-muted font-mono">{fmtD}</td>
                        <td className="py-1 pr-4 text-white">{nazev}</td>
                        <td className="py-1 pr-4 text-white/70">{p.prodejce || <span className="text-white/20">–</span>}</td>
                        <td className="py-1 pr-4 text-right font-mono text-white">{p.kusu ?? '–'}</td>
                        <td className="py-1 pr-4 text-right font-mono text-white">{p.cena ? formatCZK(p.cena) : '–'}</td>
                        <td className="py-1 pr-4 text-right font-mono text-white">{celkem ? formatCZK(celkem) : '–'}</td>
                        <td className="py-1 text-right font-mono text-yellow-400 font-semibold">{formatCZK(provize)}</td>
                      </tr>
                    )
                  })}
                  <tr className="border-t border-yellow-400/20">
                    <td colSpan={5} className="py-1.5 text-muted font-medium">Celkem</td>
                    <td className="py-1.5 text-right font-mono text-white font-semibold">{formatCZK(nevyrProdejeCelkem)}</td>
                    <td className="py-1.5 text-right font-mono text-yellow-400 font-semibold">{formatCZK(nevyrProvize)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Celkové souhrny */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card">
          <p className="text-xs text-muted uppercase tracking-wider mb-1">Celkem hod</p>
          <p className="text-2xl font-bold font-mono text-accent">{totalH} h</p>
        </div>
        <div className="card">
          <p className="text-xs text-muted uppercase tracking-wider mb-1">Celkem kč</p>
          <p className="text-2xl font-bold font-mono text-success">{formatCZK(celkemKc)}</p>
        </div>
      </div>

      {/* Taby */}
      <div className="grid grid-cols-2 gap-3">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`py-3 rounded-xl font-semibold text-sm tracking-wider transition-all ${
              tab === t.id
                ? 'bg-accent text-bg'
                : 'bg-surface border border-border text-muted hover:text-white hover:border-white/30'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* HODINY */}
      {tab === 'hodiny' && (
        <div className="space-y-4">
          <div className="flex items-center justify-end gap-2">
            <select
              value={filterRok}
              onChange={e => setFilterRok(e.target.value)}
              className="input text-sm py-1.5 w-auto"
            >
              <option value="vse">Všechny roky</option>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <button
              onClick={toggleAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-muted hover:text-white hover:border-white/30 text-xs transition-colors"
            >
              <ChevronsUpDown size={13} />
              {allOpen ? 'Sbalit vše' : 'Rozbalit vše'}
            </button>
            <button
              onClick={() => addRow(curMesic, curRok, 'hodiny')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-bg font-medium text-xs hover:bg-accent/90 transition-colors"
            >
              <Plus size={13} /> Přidat záznam
            </button>
          </div>

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
              onAdd={(mesic, rok) => addRow(mesic, rok, 'hodiny')}
              addLabel="Nové hodiny"
              yearOpen={openYears.has(rok)}
              onYearToggle={() => toggleYear(rok)}
              isSettled={isSettled}
            />
          ))}
        </div>
      )}

      {/* VYROVNÁNÍ */}
      {tab === 'vyrovnani' && (() => {
        const vyrovnani = records.filter(r => r.typ === 'vyrovnani').sort((a, b) => (b.datum || '').localeCompare(a.datum || ''))
        const celkemVyplaceno = vyrovnani.reduce((s, r) => s + (r.paid || 0), 0)
        const fmtDate = v => v ? new Date(v + 'T12:00:00').toLocaleDateString('cs-CZ', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '–'
        const fmtCZK2 = v => v != null ? formatCZK(v) : '–'
        const colDiff2 = v => v == null ? 'text-muted' : v < 0 ? 'text-danger font-mono' : 'text-success font-mono'

        return (
          <div className="space-y-4">
            {/* Souhrn */}
            <div className="grid grid-cols-3 gap-4">
              <div className="card">
                <p className="text-xs text-muted uppercase tracking-wider mb-1">Celkem KČ</p>
                <p className="text-xl font-bold font-mono text-success">{formatCZK(celkemKc)}</p>
              </div>
              <div className="card">
                <p className="text-xs text-muted uppercase tracking-wider mb-1">Vyplaceno celkem</p>
                <p className="text-xl font-bold font-mono text-accent">{formatCZK(celkemVyplaceno)}</p>
              </div>
              <div className="card">
                <p className="text-xs text-muted uppercase tracking-wider mb-1">Zbývá doplatit</p>
                {(() => {
                  const lastZaloha = vyrovnani[0]?.difference ?? null
                  return (
                    <p className={`text-xl font-bold font-mono ${lastZaloha == null ? 'text-muted' : lastZaloha < 0 ? 'text-danger' : 'text-success'}`}>
                      {lastZaloha != null ? formatCZK(lastZaloha) : '–'}
                    </p>
                  )
                })()}
              </div>
            </div>

            {/* Tabulka výplat */}
            <div className="card p-0 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <h3 className="text-sm font-semibold text-white">Výplaty</h3>
                <button
                  onClick={() => addRow(curMesic, curRok, 'vyrovnani')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-bg font-medium text-xs hover:bg-accent/90 transition-colors"
                >
                  <Plus size={12} /> Přidat výplatu
                </button>
              </div>
              {vyrovnani.length === 0 ? (
                <p className="text-muted text-sm text-center py-8">Žádné výplaty.</p>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      {['Datum výplaty', 'Období od', 'Období do', 'Vyplaceno', 'Záloha'].map(h => (
                        <th key={h} className="text-left text-xs text-muted uppercase tracking-wider px-4 py-2.5 font-medium">{h}</th>
                      ))}
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {vyrovnani.map(r => (
                      <tr key={r.id} className="border-b border-border/40 hover:bg-white/[0.025] group">
                        <td className="px-1 py-0.5 min-w-[120px]">
                          <Cell value={r.datum} type="date" onSave={v => save(r.id, 'datum', v)} fmt={fmtDate} />
                        </td>
                        <td className="px-1 py-0.5 min-w-[120px]">
                          <Cell value={r.datum_od} type="date" onSave={v => save(r.id, 'datum_od', v)} fmt={fmtDate} />
                        </td>
                        <td className="px-1 py-0.5 min-w-[120px]">
                          <Cell value={r.datum_do} type="date" onSave={v => save(r.id, 'datum_do', v)} fmt={fmtDate} />
                        </td>
                        <td className="px-1 py-0.5 min-w-[120px]">
                          <Cell value={r.paid} type="number" step="1" onSave={v => save(r.id, 'paid', v)} fmt={fmtCZK2} colorFn={() => 'text-success font-mono'} />
                        </td>
                        <td className="px-1 py-0.5 min-w-[120px]">
                          <Cell value={r.difference} type="number" step="1" onSave={v => save(r.id, 'difference', v)} fmt={fmtCZK2} colorFn={colDiff2} />
                        </td>
                        <td className="px-2 py-2 text-right">
                          <button onClick={() => del(r.id)} className="opacity-0 group-hover:opacity-100 text-muted hover:text-danger transition-all p-1">
                            <Trash2 size={12} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )
      })()}
    </div>
  )
}
