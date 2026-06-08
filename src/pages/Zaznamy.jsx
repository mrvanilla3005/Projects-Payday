import { useState, useEffect } from 'react'
import {
  loadRecords, deleteRecord, updateRecord, formatCZK, formatDate,
  PROJECTS, MONTHS, RECORD_TYPES
} from '../data/store.js'
import { Trash2, Search, Filter, Pencil, X, Check } from 'lucide-react'

const TYPE_COLORS = {
  hodiny: 'bg-info/10 text-info',
  podil_prodej: 'bg-success/10 text-success',
  kvartal_bonus: 'bg-accent/10 text-accent',
  vyrovnani: 'bg-danger/10 text-danger',
}

function EditModal({ record, onSave, onClose }) {
  const [form, setForm] = useState({ ...record })

  function set(key, value) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function handleDatumChange(e) {
    const d = new Date(e.target.value)
    set('datum', e.target.value)
    if (!isNaN(d)) {
      set('mesic', d.getMonth() + 1)
      set('rok', d.getFullYear())
    }
  }

  function handleSubmit(e) {
    e.preventDefault()
    onSave(record.id, {
      ...form,
      hodiny: form.hodiny !== '' && form.hodiny != null ? parseFloat(form.hodiny) : null,
      sum: form.sum !== '' && form.sum != null ? parseFloat(form.sum) : null,
      paid: form.paid !== '' && form.paid != null ? parseFloat(form.paid) : null,
      difference: form.difference !== '' && form.difference != null ? parseFloat(form.difference) : null,
      mesic: parseInt(form.mesic),
      rok: parseInt(form.rok),
    })
  }

  const isHodiny = form.typ === 'hodiny'
  const isFinancial = ['podil_prodej', 'kvartal_bonus', 'vyrovnani'].includes(form.typ)

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface border border-border rounded-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-semibold text-white text-sm">Upravit záznam</h2>
          <button onClick={onClose} className="text-muted hover:text-white transition-colors"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Datum</label>
              <input type="date" value={form.datum || ''} onChange={handleDatumChange} className="input" />
            </div>
            <div>
              <label className="label">Projekt</label>
              <select value={form.projekt} onChange={e => set('projekt', e.target.value)} className="input">
                {PROJECTS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Aktivita</label>
            <input type="text" value={form.aktivita || ''} onChange={e => set('aktivita', e.target.value)} className="input" />
          </div>

          <div>
            <label className="label">Typ</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(RECORD_TYPES).map(([key, label]) => (
                <button
                  key={key} type="button" onClick={() => set('typ', key)}
                  className={`px-3 py-1.5 rounded-lg text-xs text-left border transition-all ${
                    form.typ === key ? 'border-accent text-accent bg-accent/10' : 'border-border text-muted hover:border-white/30 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {(isHodiny || form.typ === 'vyrovnani') && (
            <div>
              <label className="label">Hodiny</label>
              <input type="number" step="0.5" value={form.hodiny ?? ''} onChange={e => set('hodiny', e.target.value)} className="input" />
            </div>
          )}

          {isFinancial && (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="label">SUM (CZK)</label>
                <input type="number" value={form.sum ?? ''} onChange={e => set('sum', e.target.value)} className="input" />
              </div>
              <div>
                <label className="label">PAID (CZK)</label>
                <input type="number" value={form.paid ?? ''} onChange={e => set('paid', e.target.value)} className="input" />
              </div>
              <div>
                <label className="label">Difference</label>
                <input type="number" value={form.difference ?? ''} onChange={e => set('difference', e.target.value)} className="input" />
              </div>
            </div>
          )}

          <div>
            <label className="label">Poznámka</label>
            <input type="text" value={form.poznamka || ''} onChange={e => set('poznamka', e.target.value)} className="input" />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="submit" className="btn-primary flex-1 flex items-center justify-center gap-2">
              <Check size={14} /> Uložit
            </button>
            <button type="button" onClick={onClose} className="btn-ghost">Zrušit</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Zaznamy() {
  const [records, setRecords] = useState([])
  const [search, setSearch] = useState('')
  const [filterProjekt, setFilterProjekt] = useState('')
  const [filterMesic, setFilterMesic] = useState('')
  const [filterRok, setFilterRok] = useState('')
  const [filterTyp, setFilterTyp] = useState('')
  const [editRecord, setEditRecord] = useState(null)

  useEffect(() => {
    loadRecords().then(setRecords)
  }, [])

  async function handleDelete(id) {
    if (!confirm('Opravdu smazat tento záznam?')) return
    await deleteRecord(id)
    setRecords(await loadRecords())
  }

  async function handleSaveEdit(id, data) {
    await updateRecord(id, data)
    setRecords(await loadRecords())
    setEditRecord(null)
  }

  const years = [...new Set(records.map(r => r.rok))].sort((a, b) => b - a)

  const filtered = records.filter(r => {
    if (filterProjekt && r.projekt !== filterProjekt) return false
    if (filterMesic && r.mesic !== parseInt(filterMesic)) return false
    if (filterRok && r.rok !== parseInt(filterRok)) return false
    if (filterTyp && r.typ !== filterTyp) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        (r.aktivita || '').toLowerCase().includes(q) ||
        (r.projekt || '').toLowerCase().includes(q) ||
        (r.poznamka || '').toLowerCase().includes(q)
      )
    }
    return true
  })

  return (
    <div className="space-y-6">
      {editRecord && (
        <EditModal
          record={editRecord}
          onSave={handleSaveEdit}
          onClose={() => setEditRecord(null)}
        />
      )}

      <div>
        <h1 className="text-2xl font-bold text-white">Záznamy</h1>
        <p className="text-muted text-sm mt-1">{filtered.length} záznamů</p>
      </div>

      {/* Filtry */}
      <div className="card space-y-3">
        <div className="flex items-center gap-2 text-accent text-sm font-medium">
          <Filter size={14} />
          Filtry
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {/* Vyhledávání */}
          <div className="relative md:col-span-2">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Hledat..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input pl-8"
            />
          </div>

          <select
            value={filterProjekt}
            onChange={e => setFilterProjekt(e.target.value)}
            className="input"
          >
            <option value="">Všechny projekty</option>
            {PROJECTS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>

          <select
            value={filterMesic}
            onChange={e => setFilterMesic(e.target.value)}
            className="input"
          >
            <option value="">Všechny měsíce</option>
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>

          <select
            value={filterRok}
            onChange={e => setFilterRok(e.target.value)}
            className="input"
          >
            <option value="">Všechny roky</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="flex gap-2 flex-wrap">
          {Object.entries(RECORD_TYPES).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilterTyp(filterTyp === key ? '' : key)}
              className={`badge cursor-pointer transition-colors ${
                filterTyp === key
                  ? TYPE_COLORS[key]
                  : 'bg-border text-muted hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabulka */}
      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              {['Datum', 'Projekt', 'Aktivita', 'Typ', 'Hodiny', 'SUM', 'PAID', 'Difference', ''].map(h => (
                <th key={h} className="text-left text-xs text-muted uppercase tracking-wider px-4 py-3 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="text-center text-muted py-10">
                  Žádné záznamy neodpovídají filtru.
                </td>
              </tr>
            )}
            {filtered.map(r => (
              <tr
                key={r.id}
                className="border-b border-border/50 hover:bg-white/2 transition-colors"
              >
                <td className="px-4 py-3 font-mono text-xs text-muted whitespace-nowrap">
                  {formatDate(r.datum)}
                </td>
                <td className="px-4 py-3 text-white font-medium whitespace-nowrap">
                  {r.projekt}
                </td>
                <td className="px-4 py-3 text-white">
                  {r.aktivita || '–'}
                  {r.poznamka && (
                    <span className="block text-xs text-muted">{r.poznamka}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`badge ${TYPE_COLORS[r.typ] || 'bg-border text-muted'}`}>
                    {RECORD_TYPES[r.typ] || r.typ}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-accent text-right">
                  {r.hodiny ? `${r.hodiny} h` : '–'}
                </td>
                <td className="px-4 py-3 font-mono text-right whitespace-nowrap">
                  {r.sum != null ? (
                    <span className={r.sum >= 0 ? 'text-success' : 'text-danger'}>
                      {formatCZK(r.sum)}
                    </span>
                  ) : '–'}
                </td>
                <td className="px-4 py-3 font-mono text-right whitespace-nowrap">
                  {r.paid != null ? (
                    <span className={r.paid >= 0 ? 'text-success' : 'text-danger'}>
                      {formatCZK(r.paid)}
                    </span>
                  ) : '–'}
                </td>
                <td className="px-4 py-3 font-mono text-right whitespace-nowrap">
                  {r.difference != null ? (
                    <span className={r.difference >= 0 ? 'text-success' : 'text-danger'}>
                      {formatCZK(r.difference)}
                    </span>
                  ) : '–'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditRecord(r)}
                      className="text-muted hover:text-accent transition-colors"
                      title="Upravit"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => handleDelete(r.id)}
                      className="text-muted hover:text-danger transition-colors"
                      title="Smazat"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>

          {/* Součty */}
          {filtered.length > 0 && (
            <tfoot>
              <tr className="border-t border-border bg-surface">
                <td colSpan={4} className="px-4 py-3 text-xs text-muted uppercase tracking-wider">
                  Součet ({filtered.length} záznamů)
                </td>
                <td className="px-4 py-3 font-mono text-accent text-right font-bold">
                  {filtered.reduce((s, r) => s + (r.hodiny || 0), 0)} h
                </td>
                <td className="px-4 py-3 font-mono text-right font-bold">
                  {formatCZK(filtered.reduce((s, r) => s + (r.sum || 0), 0))}
                </td>
                <td className="px-4 py-3 font-mono text-right font-bold">
                  {formatCZK(filtered.reduce((s, r) => s + (r.paid || 0), 0))}
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}
