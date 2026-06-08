import { useState, useEffect, useRef } from 'react'
import {
  loadKupony, addKupon, updateKupon, deleteKupon,
  loadZasoby, addZasoba, updateZasoba, deleteZasoba,
  loadProdeje, addProdej, updateProdej, deleteProdej,
  formatCZK, PROVIZE_SAZBY,
} from '../data/store.js'
import { Plus, Trash2, ChevronDown, ChevronRight, Smartphone, Cpu, Tag } from 'lucide-react'

const KUPON_EUR = 50

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

// ── Nákupy v kupónové skupině (tabulka jako iPhony) ─────
function NakupKuponyTable({ items, onSave, onDelete }) {
  const fmtEur  = v => v != null ? `€ ${Number(v).toFixed(2)}` : null
  const fmtNum  = v => v != null ? String(v) : null
  const fmtDate = v => v ? new Date(v + 'T12:00:00').toLocaleDateString('cs-CZ', { day: '2-digit', month: '2-digit', year: 'numeric' }) : null

  if (items.length === 0) return null

  return (
    <div className="border-t border-border/20 bg-red-500/[0.03]">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border/20">
            <th className="text-left text-xs text-danger/60 uppercase tracking-wider px-3 py-1.5 font-medium pl-5">Název</th>
            <th className="text-left text-xs text-danger/60 uppercase tracking-wider px-3 py-1.5 font-medium">Kusů</th>
            <th className="text-left text-xs text-danger/60 uppercase tracking-wider px-3 py-1.5 font-medium">Cena (€)</th>
            <th className="text-left text-xs text-danger/60 uppercase tracking-wider px-3 py-1.5 font-medium">Doprava (€)</th>
            <th className="text-left text-xs text-danger/60 uppercase tracking-wider px-3 py-1.5 font-medium">Datum dodání</th>
            <th className="w-8 px-2" />
          </tr>
        </thead>
        <tbody>
          {items.map(n => (
            <tr key={n.id} className="border-b border-border/10 hover:bg-white/[0.02] group">
              <td className="px-1 py-0.5 pl-3 min-w-[160px]">
                <Cell value={n.nazev} onSave={v => onSave(n.id, { nazev: v ?? '' })} />
              </td>
              <td className="px-1 py-0.5 min-w-[60px]">
                <Cell value={n.kusu} type="number" step="1" onSave={v => onSave(n.id, { kusu: v })} fmt={fmtNum} />
              </td>
              <td className="px-1 py-0.5 min-w-[100px]">
                <Cell value={n.castka} type="number" step="0.01" onSave={v => onSave(n.id, { castka: v })} fmt={fmtEur} colorFn={() => 'text-danger font-mono'} />
              </td>
              <td className="px-1 py-0.5 min-w-[100px]">
                <Cell value={n.doprava} type="number" step="0.01" onSave={v => onSave(n.id, { doprava: v })} fmt={fmtEur} colorFn={() => 'text-danger font-mono'} />
              </td>
              <td className="px-1 py-0.5 min-w-[120px]">
                <Cell value={n.datumDodani} type="date" onSave={v => onSave(n.id, { datumDodani: v })} fmt={fmtDate} />
              </td>
              <td className="px-2 py-0.5 text-right">
                <button onClick={() => onDelete(n.id)} className="opacity-0 group-hover:opacity-100 text-muted hover:text-danger transition-all p-1">
                  <Trash2 size={11} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Prodeje (Historie) ──────────────────────────────────
function ProdejeTable({ kategorie, items, onUpdate, onDelete, onAdd }) {
  const sazba = PROVIZE_SAZBY[kategorie]
  const fmtDate = v => v ? new Date(v + 'T12:00:00').toLocaleDateString('cs-CZ', { day: '2-digit', month: '2-digit', year: 'numeric' }) : null
  const fmtCZK  = v => v != null ? formatCZK(v) : null
  const fmtNum  = v => v != null ? String(v) : null

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border/30">
            {['Datum', 'Název', 'Ks', 'Cena / ks', 'Total', `Provize (${sazba * 100} %)`, 'Poznámka'].map(h => (
              <th key={h} className="text-left text-xs text-muted uppercase tracking-wider px-3 py-2 font-medium first:pl-5">{h}</th>
            ))}
            <th className="w-8 px-2" />
          </tr>
        </thead>
        <tbody>
          {items.length === 0 && (
            <tr><td colSpan={8} className="px-5 py-3 text-muted text-sm">Žádné prodeje.</td></tr>
          )}
          {items.map(r => {
            const total   = (r.kusu || 0) * (r.cena || 0)
            const provize = Math.round(total * sazba)
            return (
              <tr key={r.id} className="border-b border-border/20 hover:bg-white/[0.025] group">
                <td className="px-1 py-0.5 pl-3 min-w-[110px]">
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
                  <Cell value={total || null} fmt={fmtCZK} readOnly />
                </td>
                <td className="px-1 py-0.5 min-w-[110px]">
                  <Cell value={provize || null} fmt={fmtCZK} readOnly colorFn={() => 'text-success font-mono'} />
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
            )
          })}
        </tbody>
      </table>
      <button
        onClick={() => onAdd(kategorie)}
        className="w-full flex items-center gap-2 px-5 py-2.5 text-muted hover:text-white hover:bg-white/5 text-sm border-t border-border/20 transition-colors"
      >
        <Plus size={13} /> Přidat prodej
      </button>
    </div>
  )
}

// ── Jedna denní roletka (kupóny NEBO nákupy) ────────────
function KuponDayGroup({ datum, typ, items, isOpen, onToggle, onSave, onDelete, onAdd, onChangeDatum }) {
  const [editDate, setEditDate] = useState(false)
  const dateRef = useRef()

  const isKupon   = typ === 'kupon'
  const validCount = isKupon ? items.filter(k => !k.nefunguje).length : 0
  const totalEur   = isKupon
    ? validCount * KUPON_EUR
    : items.reduce((s, n) => s + (n.castka || 0) * (n.kusu || 1) + (n.doprava || 0), 0)

  const fmtDate = d => new Date(d + 'T12:00:00').toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric', year: 'numeric' })
  const fmtEur  = v => `€ ${Number(v).toFixed(2)}`

  useEffect(() => { if (editDate) dateRef.current?.focus() }, [editDate])

  function handleDateChange(e) {
    const val = e.target.value
    if (val && val !== datum) onChangeDatum(datum, typ, val)
    setEditDate(false)
  }

  return (
    <div className={`rounded-lg border overflow-hidden ${isKupon ? 'border-border' : 'border-danger/20'}`}>
      {/* Hlavička */}
      <div className={`flex items-center gap-3 px-4 py-3 ${isKupon ? 'bg-surface' : 'bg-red-500/[0.04]'}`}>
        <button onClick={onToggle} className="text-muted shrink-0 hover:text-white transition-colors">
          {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>

        {/* Editovatelné datum */}
        {editDate ? (
          <input
            ref={dateRef}
            type="date"
            defaultValue={datum}
            onBlur={handleDateChange}
            onKeyDown={e => { if (e.key === 'Escape') setEditDate(false); if (e.key === 'Enter') e.target.blur() }}
            className="bg-bg border border-accent/60 rounded px-2 py-0.5 text-white text-sm outline-none"
          />
        ) : (
          <button
            onClick={e => { e.stopPropagation(); setEditDate(true) }}
            className="text-white font-semibold text-sm hover:text-accent transition-colors"
            title="Klikni pro změnu datumu"
          >
            {fmtDate(datum)}
          </button>
        )}

        {isKupon
          ? <span className="text-accent font-mono text-sm">{validCount} kódů</span>
          : <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-danger/10 text-danger">Nákup</span>
        }
        <span className="flex-1" />
        <span className={`font-mono text-sm font-semibold ${isKupon ? 'text-success' : 'text-danger'}`}>
          {isKupon ? '' : '− '}{fmtEur(totalEur)}
        </span>
      </div>

      {isOpen && (
        <div className="border-t border-border/40">
          {/* Kupóny */}
          {isKupon && items.map(k => (
            <div
              key={k.id}
              className={`flex items-center gap-2 px-4 py-1.5 border-b border-border/10 hover:bg-white/[0.02] group ${k.nefunguje ? 'opacity-40' : ''}`}
            >
              <div className="flex-1 min-w-0">
                <Cell
                  value={k.kod}
                  onSave={v => onSave(k.id, { kod: v ?? '' })}
                  colorFn={() => `font-mono text-xs ${k.nefunguje ? 'line-through text-muted' : 'text-white'}`}
                />
              </div>
              <span className={`text-xs font-mono shrink-0 ${k.nefunguje ? 'text-danger' : 'text-success'}`}>
                {k.nefunguje ? 'nefunguje' : `+ ${fmtEur(KUPON_EUR)}`}
              </span>
              <button
                onClick={() => onSave(k.id, { nefunguje: !k.nefunguje })}
                className="opacity-0 group-hover:opacity-100 text-xs text-muted hover:text-white transition-all px-1.5 py-0.5 rounded border border-border/40 hover:border-white/20"
                title={k.nefunguje ? 'Označit jako funkční' : 'Označit jako nefunguje'}
              >
                {k.nefunguje ? '✓' : '✗'}
              </button>
              <button onClick={() => onDelete(k.id)} className="opacity-0 group-hover:opacity-100 text-muted hover:text-danger transition-all p-1">
                <Trash2 size={11} />
              </button>
            </div>
          ))}

          {/* Součet kupónů */}
          {isKupon && (
            <div className="flex items-center justify-between px-4 py-2 border-b border-border/20 bg-white/[0.02]">
              <span className="text-xs text-muted">{validCount} × € {KUPON_EUR}</span>
              <span className="text-sm font-mono font-bold text-success">= {fmtEur(totalEur)}</span>
            </div>
          )}

          {/* Nákupy */}
          {!isKupon && <NakupKuponyTable items={items} onSave={onSave} onDelete={onDelete} />}

          {/* Přidat */}
          <button
            onClick={() => onAdd(typ, datum)}
            className="w-full flex items-center justify-center gap-2 py-2.5 text-muted hover:text-white hover:bg-white/5 text-xs border-t border-border/20 transition-colors"
          >
            <Plus size={12} /> {isKupon ? 'Přidat kupón' : 'Přidat nákup'}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Kupony – celá sekce ─────────────────────────────────
function KuponySection({ items, onSave, onDelete, onAdd, onChangeDatum }) {
  const today = new Date().toISOString().slice(0, 10)
  const [newGroupChoice, setNewGroupChoice] = useState(false)

  // Seskupit dle datum+typ (kupóny a nákupy jsou samostatné skupiny)
  const groups = {}
  items.forEach(i => {
    const key = `${i.datum || today}__${i.typ}`
    if (!groups[key]) groups[key] = { datum: i.datum || today, typ: i.typ, items: [] }
    groups[key].items.push(i)
  })
  const sortedKeys = Object.keys(groups).sort((a, b) => {
    const [dA] = a.split('__')
    const [dB] = b.split('__')
    return dB.localeCompare(dA)
  })

  const [open, setOpen] = useState(new Set(sortedKeys.slice(0, 1)))
  function toggle(k) { setOpen(prev => { const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n }) }
  function ensureOpen(k) { setOpen(prev => new Set([...prev, k])) }

  const totalBalance = items.reduce((s, i) => {
    if (i.typ === 'kupon' && !i.nefunguje) return s + KUPON_EUR
    if (i.typ === 'nakup') return s - (i.castka || 0) * (i.kusu || 1) - (i.doprava || 0)
    return s
  }, 0)

  const validKupony = items.filter(i => i.typ === 'kupon' && !i.nefunguje).length
  const nakupy      = items.filter(i => i.typ === 'nakup')

  function handleNewGroup(typ) {
    const key = `${today}__${typ}`
    onAdd(typ, today)
    ensureOpen(key)
    setNewGroupChoice(false)
  }

  return (
    <div>
      {/* Ministatistika */}
      <div className="px-5 py-3 flex flex-wrap gap-5 border-b border-border/20 text-xs text-muted">
        <span>Kupónů: <span className="text-white font-mono">{validKupony}</span></span>
        <span>Celkem: <span className="text-accent font-mono">€ {(validKupony * KUPON_EUR).toFixed(2)}</span></span>
        <span>Nákupy: <span className="text-danger font-mono">− € {nakupy.reduce((s, n) => s + (n.castka || 0) * (n.kusu || 1) + (n.doprava || 0), 0).toFixed(2)}</span></span>
        <span>Zůstatek: <span className={`font-mono font-bold ${totalBalance < 0 ? 'text-danger' : 'text-success'}`}>€ {totalBalance.toFixed(2)}</span></span>
        <span>Nefunguje: <span className="text-danger font-mono">{items.filter(i => i.typ === 'kupon' && i.nefunguje).length}</span></span>
      </div>

      {/* Skupiny */}
      <div className="p-3 space-y-2">
        {sortedKeys.map(key => {
          const { datum, typ, items: groupItems } = groups[key]
          return (
            <KuponDayGroup
              key={key}
              datum={datum}
              typ={typ}
              items={groupItems}
              isOpen={open.has(key)}
              onToggle={() => toggle(key)}
              onSave={onSave}
              onDelete={onDelete}
              onAdd={(t, d) => { onAdd(t, d); ensureOpen(`${d}__${t}`) }}
              onChangeDatum={(oldD, t, newD) => { onChangeDatum(oldD, t, newD); ensureOpen(`${newD}__${t}`) }}
            />
          )
        })}

        {/* Nová skupina – výběr typu */}
        {newGroupChoice ? (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border/40 bg-white/[0.02]">
            <span className="text-xs text-muted mr-1">Přidat (dnešní datum):</span>
            <button onClick={() => handleNewGroup('kupon')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-accent/40 text-accent hover:bg-accent/10 text-xs transition-colors">
              <Plus size={11} /> Kupón
            </button>
            <button onClick={() => handleNewGroup('nakup')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-danger/40 text-danger hover:bg-red-500/10 text-xs transition-colors">
              <Plus size={11} /> Nákup
            </button>
            <button onClick={() => setNewGroupChoice(false)} className="ml-auto text-muted hover:text-white text-xs px-2 py-1 transition-colors">Zrušit</button>
          </div>
        ) : (
          <button onClick={() => setNewGroupChoice(true)} className="w-full flex items-center justify-center gap-2 py-2.5 text-muted hover:text-white hover:bg-white/5 text-sm rounded-lg border border-dashed border-border/40 hover:border-border transition-colors">
            <Plus size={13} /> Přidat
          </button>
        )}
      </div>
    </div>
  )
}

// ── Hlavní stránka ──────────────────────────────────────
export default function Prodej() {
  const [kupony,  setKupony]  = useState([])
  const [zasoby,  setZasoby]  = useState([])
  const [prodeje, setProdeje] = useState([])

  function reload() {
    setKupony(loadKupony())
    setZasoby(loadZasoby())
    setProdeje(loadProdeje())
  }
  useEffect(reload, [])

  // ── Kupony ──
  function saveKupon(id, data)     { updateKupon(id, data); reload() }
  function delKupon(id)            { if (!confirm('Smazat?')) return; deleteKupon(id); reload() }
  function addKuponRow(typ, datum) {
    if (typ === 'kupon') addKupon({ datum, typ: 'kupon', kod: '', nefunguje: false, poznamka: '' })
    else                 addKupon({ datum, typ: 'nakup', nazev: '', kusu: null, castka: null, doprava: null, datumDodani: null, poznamka: '' })
    reload()
  }
  function changeDatum(oldDatum, typ, newDatum) {
    kupony.filter(k => k.datum === oldDatum && k.typ === typ).forEach(k => updateKupon(k.id, { datum: newDatum }))
    reload()
  }

  // ── Zásoby ──
  function saveZasoba(id, data) { updateZasoba(id, data); reload() }
  function delZasoba(id)  { if (!confirm('Smazat?')) return; deleteZasoba(id); reload() }
  function newZasoba(kat) { addZasoba({ kategorie: kat, nazev: '', kusu: null, cenaNakup: null, cenaProdej: null, poznamka: '' }); reload() }

  // ── Prodeje ──
  function saveProdej(id, data) { updateProdej(id, data); reload() }
  function delProdej(id)  { if (!confirm('Smazat?')) return; deleteProdej(id); reload() }
  function newProdej(kat) { addProdej({ datum: new Date().toISOString().slice(0, 10), kategorie: kat, nazev: '', kusu: null, cena: null, poznamka: '' }); reload() }

  // ── Výpočty ──
  const iPhoneProdeje = prodeje.filter(p => p.kategorie === 'iphone')
  const elekProdeje   = prodeje.filter(p => p.kategorie === 'elektronika')
  const iPhoneZasoby  = zasoby.filter(z => z.kategorie === 'iphone')
  const elekZasoby    = zasoby.filter(z => z.kategorie === 'elektronika')

  const calcProvize = (list, sazba) =>
    list.reduce((s, r) => s + Math.round((r.kusu || 0) * (r.cena || 0) * sazba), 0)

  const provizeIphone = calcProvize(iPhoneProdeje, PROVIZE_SAZBY.iphone)
  const provizeElek   = calcProvize(elekProdeje,   PROVIZE_SAZBY.elektronika)

  const validKupony  = kupony.filter(k => k.typ === 'kupon' && !k.nefunguje).length
  const totalNakupy  = kupony.filter(k => k.typ === 'nakup').reduce((s, n) => s + (n.castka || 0) * (n.kusu || 1) + (n.doprava || 0), 0)
  const zustatekEur  = validKupony * KUPON_EUR - totalNakupy

  const dispIphone = iPhoneZasoby.reduce((s, z) => s + (z.kusu || 0), 0)
  const dispElek   = elekZasoby.reduce((s, z) => s + (z.kusu || 0), 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Prodej</h1>
        <p className="text-muted text-sm mt-0.5">Elektronika · iPhony · Amazon kupony</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="card">
          <p className="text-xs text-muted uppercase tracking-wider mb-1">Provize iPhone</p>
          <p className="text-2xl font-bold font-mono text-accent">{formatCZK(provizeIphone)}</p>
          <p className="text-xs text-muted mt-0.5">sazba 5 %</p>
        </div>
        <div className="card">
          <p className="text-xs text-muted uppercase tracking-wider mb-1">Provize elektronika</p>
          <p className="text-2xl font-bold font-mono text-info">{formatCZK(provizeElek)}</p>
          <p className="text-xs text-muted mt-0.5">sazba 10 %</p>
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
        <div className="card">
          <p className="text-xs text-muted uppercase tracking-wider mb-1">Kupony – zůstatek</p>
          <p className={`text-2xl font-bold font-mono ${zustatekEur < 0 ? 'text-danger' : 'text-success'}`}>
            € {zustatekEur.toFixed(2)}
          </p>
          <p className="text-xs text-muted mt-0.5">{validKupony} aktivních</p>
        </div>
      </div>

      {/* iPhony */}
      <Section title="iPhony" icon={Smartphone} color="text-accent">
        <SubSection title="K dispozici">
          <ZasobyTable kategorie="iphone" items={iPhoneZasoby} onUpdate={saveZasoba} onDelete={delZasoba} onAdd={newZasoba} />
        </SubSection>
        <SubSection title="Historie prodejů">
          <ProdejeTable kategorie="iphone" items={iPhoneProdeje} onUpdate={saveProdej} onDelete={delProdej} onAdd={newProdej} />
        </SubSection>
      </Section>

      {/* Elektronika */}
      <Section title="Elektronika" icon={Cpu} color="text-info" defaultOpen={false}>
        <SubSection title="K dispozici">
          <ZasobyTable kategorie="elektronika" items={elekZasoby} onUpdate={saveZasoba} onDelete={delZasoba} onAdd={newZasoba} />
        </SubSection>
        <SubSection title="Historie prodejů">
          <ProdejeTable kategorie="elektronika" items={elekProdeje} onUpdate={saveProdej} onDelete={delProdej} onAdd={newProdej} />
        </SubSection>
      </Section>

      {/* Amazon kupony */}
      <Section title="Amazon kupony" icon={Tag} color="text-yellow-400" defaultOpen={false}>
        <KuponySection items={kupony} onSave={saveKupon} onDelete={delKupon} onAdd={addKuponRow} onChangeDatum={changeDatum} />
      </Section>
    </div>
  )
}
