import { useState, useEffect, useRef } from 'react'
import {
  loadKupony, addKupon, updateKupon, deleteKupon, formatCZK,
} from '../data/store.js'
import { Plus, Trash2, ChevronDown, ChevronRight, GripVertical } from 'lucide-react'

const KUPON_EUR = 50

// ── Inline buňka ────────────────────────────────────────
function Cell({ value, type = 'text', step, onSave, fmt, colorFn }) {
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
    if (parsed !== (value ?? null)) onSave?.(parsed)
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
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); ref.current?.blur() } if (e.key === 'Escape') setOn(false) }}
        className="w-full bg-bg border border-accent/60 rounded px-2 py-0.5 text-white text-sm outline-none min-w-0"
      />
    )
  }

  const shown = fmt ? fmt(value) : (value != null && value !== '' ? String(value) : null)
  const col   = colorFn ? colorFn(value) : 'text-white'
  return (
    <div onClick={start} className={`px-2 py-1 min-h-[28px] rounded cursor-text hover:bg-white/5 text-sm whitespace-nowrap ${col}`}>
      {shown ?? <span className="text-white/15 text-xs select-none">—</span>}
    </div>
  )
}

// ── Nákupy v kupónové skupině ────────────────────────────
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

// ── Jedna denní roletka (poukazy NEBO nákupy) ────────────
function PoukazDayGroup({ datum, typ, items, isOpen, onToggle, onSave, onDelete, onAdd, onChangeDatum, onReorder }) {
  const [editDate, setEditDate] = useState(false)
  const dateRef = useRef()
  const [dragIdx, setDragIdx] = useState(null)
  const [overIdx, setOverIdx] = useState(null)

  function handleDragStart(e, idx) { setDragIdx(idx); e.dataTransfer.effectAllowed = 'move' }
  function handleDragOver(e, idx)  { e.preventDefault(); setOverIdx(idx) }
  function handleDragEnd()         { setDragIdx(null); setOverIdx(null) }
  function handleDrop(e, idx) {
    e.preventDefault()
    if (dragIdx === null || dragIdx === idx) return
    const next = [...items]
    const [moved] = next.splice(dragIdx, 1)
    next.splice(idx, 0, moved)
    onReorder(next.map(i => i.id))
    setDragIdx(null); setOverIdx(null)
  }

  const isPoukaz  = typ === 'kupon'
  const validCount = isPoukaz ? items.filter(k => !k.nefunguje && !k.system).length : 0
  const totalEur   = isPoukaz
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
    <div className={`rounded-lg border overflow-hidden ${isPoukaz ? 'border-border' : 'border-danger/20'}`}>
      <div className={`flex items-center gap-3 px-4 py-3 ${isPoukaz ? 'bg-surface' : 'bg-red-500/[0.04]'}`}>
        <button onClick={onToggle} className="text-muted shrink-0 hover:text-white transition-colors">
          {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>

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

        {isPoukaz
          ? <span className="text-accent font-mono text-sm">{validCount} kódů</span>
          : <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-danger/10 text-danger">Nákup</span>
        }
        <span className="flex-1" />
        <span className={`font-mono text-sm font-semibold ${isPoukaz ? 'text-success' : 'text-danger'}`}>
          {isPoukaz ? '' : '− '}{fmtEur(totalEur)}
        </span>
      </div>

      {isOpen && (
        <div className="border-t border-border/40">
          {isPoukaz && items.map((k, idx) => (
            <div
              key={k.id}
              draggable
              onDragStart={e => handleDragStart(e, idx)}
              onDragOver={e => handleDragOver(e, idx)}
              onDrop={e => handleDrop(e, idx)}
              onDragEnd={handleDragEnd}
              className={`flex items-center gap-2 px-4 py-1.5 border-b border-border/10 hover:bg-white/[0.02] group ${k.nefunguje ? 'opacity-40' : ''} ${overIdx === idx && dragIdx !== idx ? 'border-t-2 border-accent/60' : ''}`}
            >
              <span className="text-muted/40 cursor-grab active:cursor-grabbing group-hover:text-muted shrink-0 transition-colors">
                <GripVertical size={12} />
              </span>
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
                onClick={() => onSave(k.id, { system: !k.system })}
                className={`text-xs px-1.5 py-0.5 rounded border font-mono transition-all shrink-0 ${
                  k.system
                    ? 'border-accent/40 text-accent bg-accent/5'
                    : 'opacity-0 group-hover:opacity-40 border-border/40 text-muted'
                }`}
                title="Přidáno přes systém"
              >
                SYS
              </button>
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

          {isPoukaz && (
            <div className="flex items-center justify-between px-4 py-2 border-b border-border/20 bg-white/[0.02]">
              <span className="text-xs text-muted">{validCount} × € {KUPON_EUR}</span>
              <span className="text-sm font-mono font-bold text-success">= {fmtEur(totalEur)}</span>
            </div>
          )}

          {!isPoukaz && <NakupKuponyTable items={items} onSave={onSave} onDelete={onDelete} />}

          <button
            onClick={() => onAdd(typ, datum)}
            className="w-full flex items-center justify-center gap-2 py-2.5 text-muted hover:text-white hover:bg-white/5 text-xs border-t border-border/20 transition-colors"
          >
            <Plus size={12} /> {isPoukaz ? 'Přidat poukaz' : 'Přidat nákup'}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Poukazy – celá sekce ─────────────────────────────────
function PoukazySection({ items, onSave, onDelete, onAdd, onChangeDatum }) {
  const today = new Date().toISOString().slice(0, 10)
  const [newGroupChoice, setNewGroupChoice] = useState(false)

  const [orderMap, setOrderMap] = useState(() => {
    try { return JSON.parse(localStorage.getItem('kupony_order') || '{}') }
    catch { return {} }
  })

  function handleReorder(ids) {
    const idSet = new Set(ids)
    const newOrder = []
    let inserted = false
    for (const item of sortedItems) {
      if (idSet.has(item.id)) {
        if (!inserted) { ids.forEach(id => newOrder.push(id)); inserted = true }
      } else {
        newOrder.push(item.id)
      }
    }
    const next = {}
    newOrder.forEach((id, i) => { next[id] = i })
    setOrderMap(next)
    localStorage.setItem('kupony_order', JSON.stringify(next))
  }

  const sortedItems = [...items].sort((a, b) => {
    const ai = orderMap[a.id] ?? 999999
    const bi = orderMap[b.id] ?? 999999
    return ai - bi
  })

  const groups = {}
  sortedItems.forEach(i => {
    const key = `${i.datum || today}__${i.typ}`
    if (!groups[key]) groups[key] = { datum: i.datum || today, typ: i.typ, items: [] }
    groups[key].items.push(i)
  })
  const sortedKeys = Object.keys(groups).sort((a, b) => {
    const [dA] = a.split('__')
    const [dB] = b.split('__')
    return dB.localeCompare(dA)
  })

  const [open, setOpen] = useState(new Set())
  function toggle(k) { setOpen(prev => { const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n }) }
  function ensureOpen(k) { setOpen(prev => new Set([...prev, k])) }

  function handleNewGroup(typ) {
    const key = `${today}__${typ}`
    onAdd(typ, today)
    ensureOpen(key)
    setNewGroupChoice(false)
  }

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="p-3 space-y-2">
        {sortedKeys.map(key => {
          const { datum, typ, items: groupItems } = groups[key]
          return (
            <PoukazDayGroup
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
              onReorder={handleReorder}
            />
          )
        })}

        {newGroupChoice ? (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border/40 bg-white/[0.02]">
            <span className="text-xs text-muted mr-1">Přidat (dnešní datum):</span>
            <button onClick={() => handleNewGroup('kupon')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-accent/40 text-accent hover:bg-accent/10 text-xs transition-colors">
              <Plus size={11} /> Poukaz
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
export default function AmazonPoukazy() {
  const [kupony, setKupony] = useState([])

  async function reload() { setKupony(await loadKupony()) }
  useEffect(() => { reload() }, [])

  async function saveKupon(id, data) {
    await updateKupon(id, data)
    if ('nefunguje' in data || 'system' in data) {
      setKupony(prev => prev.map(k => k.id === id ? { ...k, ...data } : k))
    } else {
      await reload()
    }
  }
  async function delKupon(id)            { if (!confirm('Smazat?')) return; await deleteKupon(id); await reload() }
  async function addKuponRow(typ, datum) {
    if (typ === 'kupon') await addKupon({ datum, typ: 'kupon', kod: '', nefunguje: false, poznamka: '' })
    else                 await addKupon({ datum, typ: 'nakup', nazev: '', kusu: null, castka: null, doprava: null, datumDodani: null, poznamka: '' })
    await reload()
  }
  async function changeDatum(oldDatum, typ, newDatum) {
    await Promise.all(kupony.filter(k => k.datum === oldDatum && k.typ === typ).map(k => updateKupon(k.id, { datum: newDatum })))
    await reload()
  }

  const validKupony = kupony.filter(k => k.typ === 'kupon' && !k.nefunguje && !k.system).length
  const totalNakupy = kupony.filter(k => k.typ === 'nakup').reduce((s, n) => s + (n.castka || 0) * (n.kusu || 1) + (n.doprava || 0), 0)
  const zustatekEur = validKupony * KUPON_EUR - totalNakupy
  const nefunguje   = kupony.filter(k => k.typ === 'kupon' && k.nefunguje).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Amazon poukazy</h1>
        <p className="text-muted text-sm mt-0.5">Gift card kódy a nákupy</p>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="card">
          <p className="text-xs text-muted uppercase tracking-wider mb-1">Zůstatek</p>
          <p className={`text-2xl font-bold font-mono ${zustatekEur < 0 ? 'text-danger' : 'text-success'}`}>
            € {zustatekEur.toFixed(2)}
          </p>
        </div>
        <div className="card">
          <p className="text-xs text-muted uppercase tracking-wider mb-1">Aktivní poukazy</p>
          <p className="text-2xl font-bold font-mono text-accent">{validKupony}</p>
          <p className="text-xs text-muted mt-0.5">× € {KUPON_EUR} = € {(validKupony * KUPON_EUR).toFixed(2)}</p>
        </div>
        <div className="card">
          <p className="text-xs text-muted uppercase tracking-wider mb-1">Utraceno</p>
          <p className="text-2xl font-bold font-mono text-danger">− € {totalNakupy.toFixed(2)}</p>
        </div>
        <div className="card">
          <p className="text-xs text-muted uppercase tracking-wider mb-1">Nefunguje</p>
          <p className="text-2xl font-bold font-mono text-muted">{nefunguje}</p>
        </div>
      </div>

      <PoukazySection
        items={kupony}
        onSave={saveKupon}
        onDelete={delKupon}
        onAdd={addKuponRow}
        onChangeDatum={changeDatum}
      />
    </div>
  )
}
