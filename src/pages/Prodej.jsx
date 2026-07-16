import { useState, useEffect, useRef, Fragment } from 'react'
import {
  loadZasoby, addZasoba, updateZasoba, deleteZasoba,
  loadProdeje, addProdej, updateProdej, deleteProdej,
  formatCZK, PROVIZE_SAZBY,
} from '../data/store.js'
import { Plus, Trash2, Copy, ChevronDown, ChevronRight, Smartphone, Cpu, GripVertical, ArrowRight } from 'lucide-react'

// ── Měsíční seskupení prodejů ───────────────────────────
const fmtMonth = m => new Date(m + '-15T12:00:00').toLocaleDateString('cs-CZ', { month: 'long', year: 'numeric' })

// Skutečná částka za den: zadaná celková cena, jinak teoretický součet kusů × cena
function dayActual(dayItems) {
  const teor = dayItems.reduce((s, r) => s + (r.kusu || 0) * (r.cena || 0), 0)
  const celk = dayItems.find(r => r.celkova_cena != null)?.celkova_cena
  return celk ?? teor
}

function groupByMonth(sortedDates) {
  const months = {}
  sortedDates.forEach(d => { (months[d.slice(0, 7) || '—'] ??= []).push(d) })
  return Object.keys(months).sort((a, b) => b.localeCompare(a)).map(m => ({ month: m, dates: months[m] }))
}

function MonthHeaderRow({ month, total, colSpan }) {
  return (
    <tr className="border-b border-border/40 bg-white/[0.05]">
      <td colSpan={colSpan} className="px-5 py-2 whitespace-nowrap">
        <span className="text-white font-semibold text-sm capitalize">{fmtMonth(month)}</span>
        <span className="text-muted text-xs ml-3">celkem</span>
        <span className="font-mono text-success font-semibold text-sm ml-2">{formatCZK(total)}</span>
      </td>
    </tr>
  )
}

// ── Inline buňka ────────────────────────────────────────
function Cell({ value, type = 'text', step, onSave, fmt, colorFn, readOnly }) {
  const [on, setOn]     = useState(false)
  const [draft, setDraft] = useState('')
  const ref = useRef()

  function start() { if (readOnly) return; setDraft(value ?? ''); setOn(true) }
  useEffect(() => { if (on) { ref.current?.focus(); ref.current?.select() } }, [on])

  function commit() {
    setOn(false)
    let parsed
    if (type === 'number') {
      parsed = draft !== '' && draft !== null ? Number(draft) : null
    } else {
      parsed = typeof draft === 'string' ? draft.trim() || null : null
    }
    if (parsed !== (value ?? null)) onSave?.(parsed)
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
        className="w-full bg-bg border border-accent/60 rounded px-2 py-0.5 text-white text-sm outline-none min-w-0"
      />
    )
  }

  const shown = fmt ? fmt(value) : (value != null && value !== '' ? String(value) : null)
  const col   = colorFn ? colorFn(value) : readOnly ? 'text-muted' : 'text-white'
  return (
    <div
      onClick={start}
      className={`px-2 py-1 min-h-[28px] rounded text-sm whitespace-nowrap ${col} ${readOnly ? 'cursor-default' : 'cursor-text hover:bg-white/5'}`}
    >
      {shown ?? <span className="text-white/15 text-xs select-none">—</span>}
    </div>
  )
}

// ── Sekce s hlavičkou ───────────────────────────────────
function Section({ title, icon: Icon, color = 'text-accent', children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-5 py-4 bg-surface hover:bg-white/5 transition-colors text-left"
      >
        <Icon size={16} className={color} />
        <span className="text-white font-semibold">{title}</span>
        <span className="flex-1" />
        <span className="text-muted">{open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</span>
      </button>
      {open && <div className="border-t border-border/40">{children}</div>}
    </div>
  )
}

// ── Subsekce ────────────────────────────────────────────
function SubSection({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-border/20 last:border-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-5 py-2.5 hover:bg-white/[0.03] transition-colors text-left"
      >
        <span className="text-muted">{open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}</span>
        <span className="text-muted text-xs font-semibold uppercase tracking-wider">{title}</span>
      </button>
      {open && children}
    </div>
  )
}

// ── Zásoby (K dispozici) ────────────────────────────────
// Název · Kusů · Prodejní cena · Poznámka  (iphone i elektronika stejné)
function ZasobyTable({ kategorie, items, onUpdate, onDelete, onAdd }) {
  const fmtCZK = v => v != null ? formatCZK(v) : null
  const fmtNum = v => v != null ? String(v) : null

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border/30">
            {['Název', 'Kusů', 'Prodejní cena', 'Poznámka'].map(h => (
              <th key={h} className="text-left text-xs text-muted uppercase tracking-wider px-3 py-2 font-medium first:pl-5">{h}</th>
            ))}
            <th className="w-8 px-2" />
          </tr>
        </thead>
        <tbody>
          {items.length === 0 && (
            <tr><td colSpan={5} className="px-5 py-3 text-muted text-sm">Žádné zásoby.</td></tr>
          )}
          {items.map(r => (
            <tr key={r.id} className="border-b border-border/20 hover:bg-white/[0.025] group">
              <td className="px-1 py-0.5 pl-3 min-w-[160px]">
                <Cell value={r.nazev} onSave={v => onUpdate(r.id, { nazev: v ?? '' })} />
              </td>
              <td className="px-1 py-0.5 min-w-[60px]">
                <Cell value={r.kusu} type="number" step="1" onSave={v => onUpdate(r.id, { kusu: v })} fmt={fmtNum} />
              </td>
              <td className="px-1 py-0.5 min-w-[110px]">
                <Cell value={r.cenaProdej} type="number" step="1" onSave={v => onUpdate(r.id, { cenaProdej: v })} fmt={fmtCZK} />
              </td>
              <td className="px-1 py-0.5 min-w-[140px]">
                <Cell value={r.poznamka} onSave={v => onUpdate(r.id, { poznamka: v ?? '' })} />
              </td>
              <td className="px-2 py-0.5 text-right">
                <button onClick={() => onDelete(r.id)} className="opacity-0 group-hover:opacity-100 text-muted hover:text-danger transition-all p-1">
                  <Trash2 size={12} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button
        onClick={() => onAdd(kategorie)}
        className="w-full flex items-center gap-2 px-5 py-2.5 text-muted hover:text-white hover:bg-white/5 text-sm border-t border-border/20 transition-colors"
      >
        <Plus size={13} /> Přidat zboží
      </button>
    </div>
  )
}

// ── iPhony – zásoby (K dispozici) ──────────────────────
function IPhonyZasobyTable({ items, onUpdate, onDelete, onAdd, onTransfer }) {
  const fmtCZK = v => v != null ? formatCZK(v) : null
  const fmtNum = v => v != null ? String(v) : null
  const [selectedIds, setSelectedIds] = useState(new Set())

  const TYP_ORD   = { '16': 0, '17': 1 }
  const MODEL_ORD = { null: 0, undefined: 0, '': 0, klasický: 0, Pro: 1, 'Pro Max': 2 }
  const sorted    = [...items].sort((a, b) =>
    (TYP_ORD[a.typ] ?? 99) - (TYP_ORD[b.typ] ?? 99) ||
    (MODEL_ORD[a.model ?? null] ?? 99) - (MODEL_ORD[b.model ?? null] ?? 99) ||
    (a.velikost ?? 0) - (b.velikost ?? 0)
  )

  function toggleRow(id) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    setSelectedIds(selectedIds.size === sorted.length ? new Set() : new Set(sorted.map(r => r.id)))
  }

  async function handleTransfer() {
    if (selectedIds.size === 0) return
    await onTransfer(selectedIds)
    setSelectedIds(new Set())
  }

  const allSelected = sorted.length > 0 && selectedIds.size === sorted.length

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border/30">
            <th className="px-3 py-2 w-9">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                className="accent-accent cursor-pointer"
              />
            </th>
            {['Ks', 'Typ', 'Model', 'Velikost', 'Barva', 'Prodejní cena'].map(h => (
              <th key={h} className="text-left text-xs text-muted uppercase tracking-wider px-3 py-2 font-medium">{h}</th>
            ))}
            <th className="w-8 px-2" />
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 && (
            <tr><td colSpan={8} className="px-5 py-3 text-muted text-sm">Žádné zásoby.</td></tr>
          )}
          {sorted.map(r => (
            <tr key={r.id} className={`border-b border-border/20 hover:bg-white/[0.025] group ${selectedIds.has(r.id) ? 'bg-accent/5' : ''}`}>
              <td className="px-3 py-0.5 w-9">
                <input
                  type="checkbox"
                  checked={selectedIds.has(r.id)}
                  onChange={() => toggleRow(r.id)}
                  className="accent-accent cursor-pointer"
                />
              </td>
              <td className="px-1 py-0.5 min-w-[55px]">
                <Cell value={r.kusu} type="number" step="1" onSave={v => onUpdate(r.id, { kusu: v })} fmt={fmtNum} />
              </td>
              <td className="px-1 py-0.5 min-w-[65px]">
                <SelectCell value={r.typ} options={['16', '17']} onSave={v => onUpdate(r.id, { typ: v })} />
              </td>
              <td className="px-1 py-0.5 min-w-[110px]">
                <SelectCell
                  value={r.model && r.model !== 'klasický' ? r.model : null}
                  options={['Pro', 'Pro Max']}
                  onSave={v => onUpdate(r.id, { model: v || null })}
                />
              </td>
              <td className="px-1 py-0.5 min-w-[85px]">
                <SelectCell
                  value={r.velikost != null ? String(r.velikost) : null}
                  options={['128', '256', '512']}
                  suffix=" GB"
                  onSave={v => onUpdate(r.id, { velikost: v ? Number(v) : null })}
                />
              </td>
              <td className="px-1 py-0.5 min-w-[110px]">
                <Cell value={r.barva} onSave={v => onUpdate(r.id, { barva: v ?? '' })} />
              </td>
              <td className="px-1 py-0.5 min-w-[110px]">
                <Cell value={r.cenaProdej} type="number" step="1" onSave={v => onUpdate(r.id, { cenaProdej: v })} fmt={fmtCZK} />
              </td>
              <td className="px-2 py-0.5 text-right">
                <button onClick={() => onDelete(r.id)} className="opacity-0 group-hover:opacity-100 text-muted hover:text-danger transition-all p-1">
                  <Trash2 size={12} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-center border-t border-border/20">
        <button
          onClick={() => onAdd('iphone')}
          className="flex items-center gap-2 px-5 py-2.5 text-muted hover:text-white hover:bg-white/5 text-sm transition-colors flex-1"
        >
          <Plus size={13} /> Přidat zboží
        </button>
        {selectedIds.size > 0 && (
          <button
            onClick={handleTransfer}
            className="flex items-center gap-2 px-4 py-2.5 text-accent hover:text-white hover:bg-accent/10 text-sm transition-colors border-l border-border/20 font-medium"
          >
            <ArrowRight size={13} /> Přesunout do prodeje ({selectedIds.size})
          </button>
        )}
      </div>
    </div>
  )
}

// ── Dropdown buňka ─────────────────────────────────────
function SelectCell({ value, options, suffix = '', onSave }) {
  const [on, setOn] = useState(false)
  const ref = useRef()

  useEffect(() => { if (on) ref.current?.focus() }, [on])

  if (on) {
    return (
      <select
        ref={ref}
        value={value ?? ''}
        onChange={e => { onSave(e.target.value || null); setOn(false) }}
        onBlur={() => setOn(false)}
        className="w-full bg-bg border border-accent/60 rounded px-2 py-0.5 text-white text-sm outline-none"
      >
        <option value="">–</option>
        {options.map(o => <option key={o} value={o}>{o}{suffix}</option>)}
      </select>
    )
  }

  return (
    <div
      onClick={() => setOn(true)}
      className="px-2 py-1 min-h-[28px] rounded cursor-pointer hover:bg-white/5 text-sm text-white whitespace-nowrap"
    >
      {value != null ? `${value}${suffix}` : <span className="text-white/15 text-xs select-none">–</span>}
    </div>
  )
}

// ── iPhony – tabulka prodejů (seskupeno dle dne) ────────
function IPhonyProdejeTable({ items, onUpdate, onUpdateBatch, onDelete, onAdd, onDuplicate }) {
  const fmtDate = v => v ? new Date(v + 'T12:00:00').toLocaleDateString('cs-CZ', { day: '2-digit', month: '2-digit', year: 'numeric' }) : null
  const fmtCZK  = v => v != null ? formatCZK(v) : null
  const fmtNum  = v => v != null ? String(v) : null

  // Seskupit dle datum, sestupně; uvnitř dne řadit typ → model → velikost
  const TYP_ORD   = { '16': 0, '17': 1 }
  const MODEL_ORD = { null: 0, undefined: 0, '': 0, klasický: 0, Pro: 1, 'Pro Max': 2 }
  const sortRow   = (a, b) =>
    (TYP_ORD[a.typ] ?? 99) - (TYP_ORD[b.typ] ?? 99) ||
    (MODEL_ORD[a.model ?? null] ?? 99) - (MODEL_ORD[b.model ?? null] ?? 99) ||
    (a.velikost ?? 0) - (b.velikost ?? 0)

  const groups = {}
  items.forEach(r => { const d = r.datum || ''; if (!groups[d]) groups[d] = []; groups[d].push(r) })
  Object.values(groups).forEach(g => g.sort(sortRow))
  const sortedDates = Object.keys(groups).sort((a, b) => b.localeCompare(a))
  const byMonth = groupByMonth(sortedDates)

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border/30">
            {['Datum', 'Ks', 'Typ', 'Model', 'Velikost', 'Barva', 'Prodejní cena', 'Celkem', 'Prodejce', '', ''].map((h, i) => (
              <th key={i} className="text-left text-xs text-muted uppercase tracking-wider px-3 py-2 font-medium first:pl-5">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.length === 0 && (
            <tr><td colSpan={11} className="px-5 py-3 text-muted text-sm">Žádné prodeje.</td></tr>
          )}
          {byMonth.map(({ month, dates }) => (
            <Fragment key={month}>
              <MonthHeaderRow month={month} colSpan={11}
                total={dates.reduce((s, d) => s + dayActual(groups[d]), 0)} />
              {dates.map(datum => {
            const dayItems = groups[datum]
            const teorTotal = dayItems.reduce((s, r) => s + (r.kusu || 0) * (r.cena || 0), 0)
            const celkovaCena = dayItems.find(r => r.celkova_cena != null)?.celkova_cena ?? null
            const slevaKc  = celkovaCena != null && teorTotal > 0 ? teorTotal - celkovaCena : null
            const slevaPct = slevaKc != null && teorTotal > 0 ? slevaKc / teorTotal * 100 : null

            return (
              <Fragment key={datum}>
                {dayItems.map(r => (
                  <tr key={r.id} className="border-b border-border/10 hover:bg-white/[0.025] group">
                    <td className="px-1 py-0.5 pl-8 min-w-[110px]">
                      <Cell value={r.datum} type="date" onSave={v => onUpdate(r.id, { datum: v })} fmt={fmtDate} />
                    </td>
                    <td className="px-1 py-0.5 min-w-[55px]">
                      <Cell value={r.kusu} type="number" step="1" onSave={v => onUpdate(r.id, { kusu: v })} fmt={fmtNum} />
                    </td>
                    <td className="px-1 py-0.5 min-w-[65px]">
                      <SelectCell value={r.typ} options={['16', '17']} onSave={v => onUpdate(r.id, { typ: v })} />
                    </td>
                    <td className="px-1 py-0.5 min-w-[110px]">
                      <SelectCell
                        value={r.model && r.model !== 'klasický' ? r.model : null}
                        options={['Pro', 'Pro Max']}
                        onSave={v => onUpdate(r.id, { model: v || null })}
                      />
                    </td>
                    <td className="px-1 py-0.5 min-w-[85px]">
                      <SelectCell
                        value={r.velikost != null ? String(r.velikost) : null}
                        options={['128', '256', '512']}
                        suffix=" GB"
                        onSave={v => onUpdate(r.id, { velikost: v ? Number(v) : null })}
                      />
                    </td>
                    <td className="px-1 py-0.5 min-w-[110px]">
                      <Cell value={r.barva} onSave={v => onUpdate(r.id, { barva: v ?? '' })} />
                    </td>
                    <td className="px-1 py-0.5 min-w-[110px]">
                      <Cell value={r.cena} type="number" step="1" onSave={v => onUpdate(r.id, { cena: v })} fmt={fmtCZK} />
                    </td>
                    <td className="px-1 py-0.5 min-w-[110px]">
                      <Cell value={(r.kusu || 0) * (r.cena || 0) || null} fmt={fmtCZK} readOnly />
                    </td>
                    <td className="px-1 py-0.5 min-w-[100px]">
                      <SelectCell value={r.prodejce} options={['Tomáš']} onSave={v => onUpdate(r.id, { prodejce: v })} />
                    </td>
                    <td className="px-1 py-0.5 text-right">
                      <button onClick={() => onDuplicate(r)} className="opacity-0 group-hover:opacity-100 text-muted hover:text-accent transition-all p-1" title="Duplikovat">
                        <Copy size={12} />
                      </button>
                    </td>
                    <td className="px-2 py-0.5 text-right">
                      <button onClick={() => onDelete(r.id)} className="opacity-0 group-hover:opacity-100 text-muted hover:text-danger transition-all p-1" title="Smazat">
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                ))}

                {/* Souhrnný řádek za den */}
                <tr className="border-b border-border/30 bg-white/[0.025]">
                  <td colSpan={6} className="pl-10 pr-5 py-2 text-xs text-muted font-medium">
                    {fmtDate(datum)} · součet
                  </td>
                  <td className="px-3 py-2 font-mono text-sm text-white font-semibold whitespace-nowrap">
                    {formatCZK(teorTotal)}
                  </td>
                  <td className="px-1 py-1 min-w-[130px]">
                    <Cell
                      value={celkovaCena}
                      type="number"
                      step="1"
                      onSave={v => onUpdateBatch(dayItems.map(r => r.id), { celkova_cena: v })}
                      fmt={fmtCZK}
                      colorFn={() => 'text-success font-mono'}
                    />
                  </td>
                  <td colSpan={3} className="px-3 py-2 whitespace-nowrap">
                    {slevaPct != null && (
                      <span className="font-mono text-sm text-yellow-400 font-semibold">
                        −{slevaPct.toFixed(1)} %
                        <span className="text-muted font-normal text-xs ml-1.5">({formatCZK(slevaKc)})</span>
                      </span>
                    )}
                  </td>
                </tr>
              </Fragment>
            )
          })}
            </Fragment>
          ))}
        </tbody>
      </table>
      <button
        onClick={() => onAdd('iphone')}
        className="w-full flex items-center gap-2 px-5 py-2.5 text-muted hover:text-white hover:bg-white/5 text-sm border-t border-border/20 transition-colors"
      >
        <Plus size={13} /> Přidat prodej
      </button>
    </div>
  )
}

// ── Prodeje (Elektronika) ────────────────────────────────
function ProdejeTable({ items, onUpdate, onUpdateBatch, onDelete, onAdd }) {
  const fmtDate = v => v ? new Date(v + 'T12:00:00').toLocaleDateString('cs-CZ', { day: '2-digit', month: '2-digit', year: 'numeric' }) : null
  const fmtCZK  = v => v != null ? formatCZK(v) : null
  const fmtNum  = v => v != null ? String(v) : null

  // Seskupit dle datum DESC; uvnitř dne řadit dle cena ASC
  const groups = {}
  items.forEach(r => { const d = r.datum || ''; if (!groups[d]) groups[d] = []; groups[d].push(r) })
  Object.values(groups).forEach(g => g.sort((a, b) => (a.cena ?? 0) - (b.cena ?? 0)))
  const sortedDates = Object.keys(groups).sort((a, b) => b.localeCompare(a))
  const byMonth = groupByMonth(sortedDates)

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border/30">
            {['Datum', 'Název', 'Ks', 'Cena / ks', 'Celkem', 'Poznámka', 'Prodejce', ''].map((h, i) => (
              <th key={i} className="text-left text-xs text-muted uppercase tracking-wider px-3 py-2 font-medium first:pl-5">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.length === 0 && (
            <tr><td colSpan={8} className="px-5 py-3 text-muted text-sm">Žádné prodeje.</td></tr>
          )}
          {byMonth.map(({ month, dates }) => (
            <Fragment key={month}>
              <MonthHeaderRow month={month} colSpan={8}
                total={dates.reduce((s, d) => s + dayActual(groups[d]), 0)} />
              {dates.map(datum => {
            const dayItems    = groups[datum]
            const teorTotal   = dayItems.reduce((s, r) => s + (r.kusu || 0) * (r.cena || 0), 0)
            const celkovaCena = dayItems.find(r => r.celkova_cena != null)?.celkova_cena ?? null
            const slevaKc     = celkovaCena != null && teorTotal > 0 ? teorTotal - celkovaCena : null
            const slevaPct    = slevaKc != null && teorTotal > 0 ? slevaKc / teorTotal * 100 : null

            return (
              <Fragment key={datum}>
                {dayItems.map(r => (
                  <tr key={r.id} className="border-b border-border/10 hover:bg-white/[0.025] group">
                    <td className="px-1 py-0.5 pl-8 min-w-[110px]">
                      <Cell value={r.datum} type="date" onSave={v => onUpdate(r.id, { datum: v })} fmt={fmtDate} />
                    </td>
                    <td className="px-1 py-0.5 min-w-[160px]">
                      <Cell value={r.nazev} onSave={v => onUpdate(r.id, { nazev: v ?? '' })} />
                    </td>
                    <td className="px-1 py-0.5 min-w-[55px]">
                      <Cell value={r.kusu} type="number" step="1" onSave={v => onUpdate(r.id, { kusu: v })} fmt={fmtNum} />
                    </td>
                    <td className="px-1 py-0.5 min-w-[110px]">
                      <Cell value={r.cena} type="number" step="1" onSave={v => onUpdate(r.id, { cena: v })} fmt={fmtCZK} />
                    </td>
                    <td className="px-1 py-0.5 min-w-[110px]">
                      <Cell value={(r.kusu || 0) * (r.cena || 0) || null} fmt={fmtCZK} readOnly />
                    </td>
                    <td className="px-1 py-0.5 min-w-[140px]">
                      <Cell value={r.poznamka} onSave={v => onUpdate(r.id, { poznamka: v ?? '' })} />
                    </td>
                    <td className="px-1 py-0.5 min-w-[100px]">
                      <SelectCell value={r.prodejce} options={['Tomáš']} onSave={v => onUpdate(r.id, { prodejce: v })} />
                    </td>
                    <td className="px-2 py-0.5 text-right">
                      <button onClick={() => onDelete(r.id)} className="opacity-0 group-hover:opacity-100 text-muted hover:text-danger transition-all p-1">
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
                {/* Souhrnný řádek za den */}
                <tr className="border-b border-border/30 bg-white/[0.025]">
                  <td colSpan={3} className="pl-10 pr-5 py-2 text-xs text-muted font-medium">
                    {fmtDate(datum)} · součet
                  </td>
                  <td className="px-3 py-2 font-mono text-sm text-white font-semibold whitespace-nowrap">
                    {formatCZK(teorTotal)}
                  </td>
                  <td className="px-1 py-1 min-w-[130px]">
                    <Cell
                      value={celkovaCena}
                      type="number"
                      step="1"
                      onSave={v => onUpdateBatch(dayItems.map(r => r.id), { celkova_cena: v })}
                      fmt={fmtCZK}
                      colorFn={() => 'text-success font-mono'}
                    />
                  </td>
                  <td colSpan={3} className="px-3 py-2 whitespace-nowrap">
                    {slevaPct != null && (
                      <span className="font-mono text-sm text-yellow-400 font-semibold">
                        −{slevaPct.toFixed(1)} %
                        <span className="text-muted font-normal text-xs ml-1.5">({formatCZK(slevaKc)})</span>
                      </span>
                    )}
                  </td>
                </tr>
              </Fragment>
            )
          })}
            </Fragment>
          ))}
        </tbody>
      </table>
      <button
        onClick={() => onAdd('elektronika')}
        className="w-full flex items-center gap-2 px-5 py-2.5 text-muted hover:text-white hover:bg-white/5 text-sm border-t border-border/20 transition-colors"
      >
        <Plus size={13} /> Přidat prodej
      </button>
    </div>
  )
}

// ── Hlavní stránka ──────────────────────────────────────
export default function Prodej() {
  const [zasoby,  setZasoby]  = useState([])
  const [prodeje, setProdeje] = useState([])

  async function reload() {
    const [z, p] = await Promise.all([loadZasoby(), loadProdeje()])
    setZasoby(z)
    setProdeje(p)
  }
  useEffect(() => { reload() }, [])

  // ── Zásoby ──
  async function saveZasoba(id, data) { await updateZasoba(id, data); await reload() }
  async function delZasoba(id)  { if (!confirm('Smazat?')) return; await deleteZasoba(id); await reload() }
  async function newZasoba(kat) {
    if (kat === 'iphone') {
      await addZasoba({ kategorie: kat, kusu: null, typ: null, model: null, velikost: null, barva: '', cenaProdej: null })
    } else {
      await addZasoba({ kategorie: kat, nazev: '', kusu: null, cenaNakup: null, cenaProdej: null, poznamka: '' })
    }
    await reload()
  }

  // ── Prodeje ──
  async function saveProdej(id, data) { await updateProdej(id, data); await reload() }
  async function batchSaveProdej(ids, data) { await Promise.all(ids.map(id => updateProdej(id, data))); await reload() }
  async function delProdej(id)  { if (!confirm('Smazat?')) return; await deleteProdej(id); await reload() }
  async function dupProdej(r)   { const { id, createdAt, ...rest } = r; await addProdej(rest); await reload() }
  async function newProdej(kat) {
    const base = { datum: new Date().toISOString().slice(0, 10), kategorie: kat, kusu: null, cena: null, poznamka: '' }
    if (kat === 'iphone') {
      await addProdej({ ...base, typ: null, model: null, velikost: null, barva: '', celkova_cena: null })
    } else {
      await addProdej({ ...base, nazev: '' })
    }
    await reload()
  }

  async function transferToProdej(ids) {
    const today = new Date().toISOString().slice(0, 10)
    const toTransfer = iPhoneZasoby.filter(z => ids.has(z.id))
    await Promise.all(toTransfer.map(z =>
      addProdej({
        datum: today,
        kategorie: 'iphone',
        kusu: z.kusu,
        cena: z.cenaProdej,
        typ: z.typ,
        model: z.model,
        velikost: z.velikost,
        barva: z.barva,
        celkova_cena: null,
        poznamka: '',
      })
    ))
    await Promise.all(toTransfer.map(z => deleteZasoba(z.id)))
    await reload()
  }

  // ── Výpočty ──
  const iPhoneProdeje = prodeje.filter(p => p.kategorie === 'iphone')
  const elekProdeje   = prodeje.filter(p => p.kategorie === 'elektronika')
  const iPhoneZasoby  = zasoby.filter(z => z.kategorie === 'iphone')
  const elekZasoby    = zasoby.filter(z => z.kategorie === 'elektronika')

  const calcProvize = (list, sazba) =>
    list.reduce((s, r) => s + Math.round((r.kusu || 0) * (r.cena || 0) * sazba), 0)

  const provizeIphone = iPhoneProdeje.reduce((s, r) => {
    const sazba = r.typ === '17' ? 0.05 : 0.10
    return s + Math.round((r.kusu || 0) * (r.cena || 0) * sazba)
  }, 0)
  const provizeElek   = calcProvize(elekProdeje,   PROVIZE_SAZBY.elektronika)

  const dispIphone = iPhoneZasoby.reduce((s, z) => s + (z.kusu || 0), 0)
  const dispElek   = elekZasoby.reduce((s, z) => s + (z.kusu || 0), 0)

  // Celková tržba: po dnech, zadaná celková cena má přednost před kusy × cena
  const trzba = list => {
    const byDay = {}
    list.forEach(r => { (byDay[r.datum || ''] ??= []).push(r) })
    return Object.values(byDay).reduce((s, day) => s + dayActual(day), 0)
  }
  const trzbaIphone = trzba(iPhoneProdeje)
  const trzbaElek   = trzba(elekProdeje)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Prodej</h1>
        <p className="text-muted text-sm mt-0.5">Elektronika · iPhony</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card">
          <p className="text-xs text-muted uppercase tracking-wider mb-1">Provize iPhone</p>
          <p className="text-2xl font-bold font-mono text-accent">{formatCZK(provizeIphone)}</p>
          <p className="text-xs text-muted mt-0.5">16→10 % · 17→5 %</p>
          <p className="text-xs text-muted mt-1.5 pt-1.5 border-t border-border/30">
            Prodej celkem <span className="font-mono text-white/80 font-semibold ml-1">{formatCZK(trzbaIphone)}</span>
          </p>
        </div>
        <div className="card">
          <p className="text-xs text-muted uppercase tracking-wider mb-1">Provize elektronika</p>
          <p className="text-2xl font-bold font-mono text-info">{formatCZK(provizeElek)}</p>
          <p className="text-xs text-muted mt-0.5">sazba 10 %</p>
          <p className="text-xs text-muted mt-1.5 pt-1.5 border-t border-border/30">
            Prodej celkem <span className="font-mono text-white/80 font-semibold ml-1">{formatCZK(trzbaElek)}</span>
          </p>
        </div>
        <div className="card">
          <p className="text-xs text-muted uppercase tracking-wider mb-1">K dispozici</p>
          <p className="text-xl font-bold font-mono text-white mt-0.5">
            {dispIphone > 0 ? <span className="text-accent">{dispIphone}× iPhone</span> : null}
            {dispIphone > 0 && dispElek > 0 ? <span className="text-white/30 mx-1">·</span> : null}
            {dispElek > 0 ? <span className="text-info">{dispElek}× ks</span> : null}
            {dispIphone === 0 && dispElek === 0 ? <span className="text-muted">–</span> : null}
          </p>
        </div>
      </div>

      {/* iPhony */}
      <Section title="iPhony" icon={Smartphone} color="text-accent" defaultOpen={false}>
        <SubSection title="K dispozici">
          <IPhonyZasobyTable items={iPhoneZasoby} onUpdate={saveZasoba} onDelete={delZasoba} onAdd={newZasoba} onTransfer={transferToProdej} />
        </SubSection>
        <SubSection title="Historie prodejů">
          <IPhonyProdejeTable items={iPhoneProdeje} onUpdate={saveProdej} onUpdateBatch={batchSaveProdej} onDelete={delProdej} onAdd={newProdej} onDuplicate={dupProdej} />
        </SubSection>
      </Section>

      {/* Elektronika */}
      <Section title="Elektronika" icon={Cpu} color="text-info" defaultOpen={false}>
        <SubSection title="K dispozici">
          <ZasobyTable kategorie="elektronika" items={elekZasoby} onUpdate={saveZasoba} onDelete={delZasoba} onAdd={newZasoba} />
        </SubSection>
        <SubSection title="Historie prodejů">
          <ProdejeTable items={elekProdeje} onUpdate={saveProdej} onUpdateBatch={batchSaveProdej} onDelete={delProdej} onAdd={newProdej} />
        </SubSection>
      </Section>

    </div>
  )
}
