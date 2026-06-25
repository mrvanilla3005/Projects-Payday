import { useState, useEffect, useRef } from 'react'
import { Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import {
  loadDna, addDna, updateDna, deleteDna,
  DNA_TOPICS, DNA_DTA, DNA_STATUS,
} from '../data/store.js'

// ── Inline editovatelná buňka ──
function Cell({ value, type = 'text', onSave, fmt, colorFn }) {
  const [on, setOn]     = useState(false)
  const [draft, setDraft] = useState('')
  const ref = useRef()

  function start() { setDraft(value ?? ''); setOn(true) }
  useEffect(() => { if (on) { ref.current?.focus(); ref.current?.select() } }, [on])

  function commit() {
    setOn(false)
    const parsed = draft.trim() || null
    if (parsed !== (value ?? null)) onSave(parsed)
  }

  if (on) return (
    <input
      ref={ref}
      type={type === 'date' ? 'date' : 'text'}
      value={draft}
      onChange={e => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={e => { if (e.key === 'Enter') ref.current?.blur(); if (e.key === 'Escape') setOn(false) }}
      className="w-full bg-bg border border-accent/60 rounded px-2 py-0.5 text-white text-sm outline-none"
    />
  )

  const shown = fmt ? fmt(value) : (value != null && value !== '' ? String(value) : null)
  const col   = colorFn ? colorFn(value) : 'text-white'
  return (
    <div onClick={start} className={`px-2 py-1 min-h-[28px] rounded cursor-text hover:bg-white/5 text-sm whitespace-nowrap ${col}`}>
      {shown ?? <span className="text-white/15 text-xs select-none">—</span>}
    </div>
  )
}

// ── DTA výběr ──
function DtaSelect({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef()

  useEffect(() => {
    if (!open) return
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const current = DNA_DTA.find(d => d.id === value)
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className={`text-xs px-2 py-0.5 rounded border font-medium whitespace-nowrap ${current?.color || 'text-muted border-border/40'}`}
      >
        {current?.label || '—'}
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 bg-surface border border-border rounded-lg shadow-xl z-50 w-28 overflow-hidden">
          {DNA_DTA.map(d => (
            <button
              key={d.id}
              onClick={() => { onChange(d.id); setOpen(false) }}
              className="w-full flex items-center px-2 py-1.5 hover:bg-white/5 transition-colors"
            >
              <span className={`text-xs px-1.5 py-0.5 rounded border ${d.color}`}>{d.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Status badge (kliknutím přepíná) ──
const STATUS_STYLE = {
  'Not started': 'text-muted border-border/40',
  'In progress': 'text-yellow-400 border-yellow-400/40',
  'Done':        'text-success border-success/40',
}

function StatusBadge({ value, onChange }) {
  function cycle() {
    const idx = DNA_STATUS.indexOf(value ?? 'Not started')
    onChange(DNA_STATUS[(idx + 1) % DNA_STATUS.length])
  }
  return (
    <button
      onClick={cycle}
      className={`text-xs px-2 py-0.5 rounded border font-medium whitespace-nowrap transition-colors ${STATUS_STYLE[value] || STATUS_STYLE['Not started']}`}
    >
      {value || 'Not started'}
    </button>
  )
}

// ── Skupina jednoho tématu ──
function TopicGroup({ topic, records, isOpen, onToggle, onSave, onDelete, onAdd }) {
  const done    = records.filter(r => r.status === 'Done').length
  const fmtDate = v => v ? new Date(v + 'T12:00:00').toLocaleDateString('cs-CZ', { day: '2-digit', month: '2-digit' }) : null

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      {/* Hlavička */}
      <div
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 bg-surface hover:bg-white/5 cursor-pointer transition-colors"
      >
        <span className="text-muted shrink-0">{isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</span>
        <span className={`w-2 h-2 rounded-full shrink-0 ${topic.dot}`} />
        <span className="text-white font-semibold text-sm">{topic.label}</span>
        {topic.sub && <span className="text-muted text-xs">({topic.sub})</span>}
        <span className="flex-1" />
        <span className="text-xs text-muted font-mono shrink-0">{done}/{records.length}</span>
      </div>

      {isOpen && (
        <div className="border-t border-border/40">

          {/* Desktop: tabulka */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  {['Datum', 'DTA', 'Subtopic', 'Content / Result', 'Status'].map(h => (
                    <th key={h} className="text-left text-xs text-muted uppercase tracking-wider px-3 py-2 font-medium first:pl-4">{h}</th>
                  ))}
                  <th className="w-8 px-2" />
                </tr>
              </thead>
              <tbody>
                {records.map(r => (
                  <tr key={r.id} className="border-b border-border/40 hover:bg-white/[0.025] group">
                    <td className="px-1 py-0.5 pl-2 min-w-[90px]">
                      <Cell value={r.datum} type="date" onSave={v => onSave(r.id, { datum: v })} fmt={fmtDate} colorFn={() => 'text-muted'} />
                    </td>
                    <td className="px-2 py-1 min-w-[90px]">
                      <DtaSelect value={r.dta} onChange={v => onSave(r.id, { dta: v })} />
                    </td>
                    <td className="px-1 py-0.5 min-w-[180px]">
                      <Cell value={r.subtopic} onSave={v => onSave(r.id, { subtopic: v ?? '' })} />
                    </td>
                    <td className="px-1 py-0.5 min-w-[260px] max-w-[340px]">
                      <Cell value={r.content} onSave={v => onSave(r.id, { content: v ?? '' })} colorFn={() => 'text-muted text-xs'} />
                    </td>
                    <td className="px-2 py-1 min-w-[105px]">
                      <StatusBadge value={r.status} onChange={v => onSave(r.id, { status: v })} />
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
          </div>

          {/* Mobil: karty */}
          <div className="md:hidden divide-y divide-border/20">
            {records.map(r => (
              <div key={r.id} className="px-4 py-3 space-y-2">
                <div className="flex items-center gap-2">
                  <DtaSelect value={r.dta} onChange={v => onSave(r.id, { dta: v })} />
                  <span className="text-xs text-muted font-mono">{fmtDate(r.datum) || '—'}</span>
                  <span className="flex-1" />
                  <StatusBadge value={r.status} onChange={v => onSave(r.id, { status: v })} />
                  <button onClick={() => onDelete(r.id)} className="text-muted hover:text-danger transition-colors p-1">
                    <Trash2 size={13} />
                  </button>
                </div>
                <Cell value={r.subtopic} onSave={v => onSave(r.id, { subtopic: v ?? '' })} />
                <Cell value={r.content} onSave={v => onSave(r.id, { content: v ?? '' })} colorFn={() => 'text-muted text-xs'} />
              </div>
            ))}
          </div>

          <button
            onClick={() => onAdd(topic.id)}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-muted hover:text-white hover:bg-white/5 text-xs border-t border-border/20 transition-colors"
          >
            <Plus size={12} /> Přidat do {topic.label}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Hlavní stránka ──
export default function Projekty() {
  const [records, setRecords] = useState([])
  const [tab, setTab]         = useState('aktivity')
  const [open, setOpen]       = useState(new Set())

  async function reload() {
    const data = await loadDna()
    setRecords(data.sort((a, b) => (b.datum || '').localeCompare(a.datum || '')))
  }
  useEffect(() => { reload() }, [])

  async function save(id, patch) {
    await updateDna(id, patch)
    await reload()
  }

  async function del(id) {
    if (!confirm('Smazat záznam?')) return
    await deleteDna(id)
    await reload()
  }

  async function add(topicId) {
    const today = new Date().toISOString().slice(0, 10)
    await addDna({ topic: topicId, dta: 'Do', subtopic: '', content: '', status: 'Not started', datum: today })
    await reload()
    setOpen(prev => new Set([...prev, topicId]))
  }

  function toggleTopic(id) {
    setOpen(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  const filtered =
    tab === 'projekty'    ? records.filter(r => r.dta === 'PROJECT') :
    tab === 'nedokonceno' ? records.filter(r => r.status !== 'Done') :
    records

  const grouped = {}
  filtered.forEach(r => {
    const t = r.topic || 'ostatni'
    if (!grouped[t]) grouped[t] = []
    grouped[t].push(r)
  })

  const visibleTopics = DNA_TOPICS.filter(t => grouped[t.id]?.length > 0)

  const totalAll     = records.length
  const totalDone    = records.filter(r => r.status === 'Done').length
  const totalPending = records.filter(r => r.status !== 'Done').length

  const TABS = [
    { id: 'aktivity',    label: 'AKTIVITY',    count: totalAll },
    { id: 'projekty',    label: 'PROJEKTY',    count: records.filter(r => r.dta === 'PROJECT').length },
    { id: 'nedokonceno', label: 'NEDOKONČENO', count: totalPending },
  ]

  return (
    <div className="space-y-5">
      {/* Souhrn */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card">
          <p className="text-xs text-muted uppercase tracking-wider mb-1">Celkem záznamů</p>
          <p className="text-2xl font-bold font-mono text-white">{totalAll}</p>
        </div>
        <div className="card">
          <p className="text-xs text-muted uppercase tracking-wider mb-1">Hotovo</p>
          <p className="text-2xl font-bold font-mono text-success">{totalDone}</p>
        </div>
        <div className="card">
          <p className="text-xs text-muted uppercase tracking-wider mb-1">Nedokončeno</p>
          <p className="text-2xl font-bold font-mono text-yellow-400">{totalPending}</p>
        </div>
      </div>

      {/* Taby */}
      <div className="grid grid-cols-3 gap-3">
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
            <span className={`font-mono font-normal text-xs ml-1.5 ${tab === t.id ? 'text-bg/60' : 'text-muted'}`}>
              ({t.count})
            </span>
          </button>
        ))}
      </div>

      {/* Skupiny dle tématu */}
      <div className="space-y-2">
        {visibleTopics.length === 0 ? (
          <div className="card text-center py-10">
            <p className="text-muted text-sm">Žádné záznamy. Přidej první kliknutím níže.</p>
          </div>
        ) : (
          visibleTopics.map(topic => (
            <TopicGroup
              key={topic.id}
              topic={topic}
              records={grouped[topic.id]}
              isOpen={open.has(topic.id)}
              onToggle={() => toggleTopic(topic.id)}
              onSave={save}
              onDelete={del}
              onAdd={add}
            />
          ))
        )}

        {/* Rychlé přidání */}
        <div className="flex flex-wrap gap-2 pt-1">
          {DNA_TOPICS.map(topic => (
            <button
              key={topic.id}
              onClick={() => add(topic.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/40 text-muted hover:text-white hover:border-white/20 text-xs transition-colors"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${topic.dot}`} />
              {topic.label}
              <Plus size={10} />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
