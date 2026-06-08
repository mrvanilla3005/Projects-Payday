import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { addRecord, PROJECTS, MONTHS, RECORD_TYPES } from '../data/store.js'
import { CheckCircle } from 'lucide-react'

const EMPTY = {
  datum: new Date().toISOString().slice(0, 10),
  projekt: '',
  aktivita: '',
  hodiny: '',
  sum: '',
  paid: '',
  difference: '',
  mesic: new Date().getMonth() + 1,
  rok: new Date().getFullYear(),
  typ: 'hodiny',
  poznamka: '',
}

export default function PridatZaznam() {
  const [form, setForm] = useState(EMPTY)
  const [saved, setSaved] = useState(false)
  const navigate = useNavigate()

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

  async function handleSubmit(e) {
    e.preventDefault()
    const record = {
      ...form,
      hodiny: form.hodiny !== '' ? parseFloat(form.hodiny) : null,
      sum: form.sum !== '' ? parseFloat(form.sum) : null,
      paid: form.paid !== '' ? parseFloat(form.paid) : null,
      difference: form.difference !== '' ? parseFloat(form.difference) : null,
      mesic: parseInt(form.mesic),
      rok: parseInt(form.rok),
    }
    await addRecord(record)
    setSaved(true)
    setTimeout(() => {
      navigate('/zaznamy')
    }, 1200)
  }

  function isHodiny() { return form.typ === 'hodiny' }
  function isFinancial() { return ['podil_prodej', 'kvartal_bonus', 'vyrovnani'].includes(form.typ) }

  if (saved) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <CheckCircle size={48} className="text-success" />
        <p className="text-white text-lg font-medium">Záznam uložen!</p>
        <p className="text-muted text-sm">Přesměrovávám...</p>
      </div>
    )
  }

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Přidat záznam</h1>
        <p className="text-muted text-sm mt-1">Nová aktivita nebo vyrovnání</p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-5">
        {/* Typ */}
        <div>
          <label className="label">Typ záznamu *</label>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(RECORD_TYPES).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => set('typ', key)}
                className={`px-3 py-2 rounded-lg text-sm text-left border transition-all ${
                  form.typ === key
                    ? 'border-accent text-accent bg-accent/10'
                    : 'border-border text-muted hover:border-white/30 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Datum */}
        <div>
          <label className="label">Datum *</label>
          <input
            type="date"
            value={form.datum}
            onChange={handleDatumChange}
            required
            className="input"
          />
          <p className="text-xs text-muted mt-1">
            Měsíc a rok se vyplní automaticky: {MONTHS[form.mesic - 1]} {form.rok}
          </p>
        </div>

        {/* Projekt */}
        <div>
          <label className="label">Projekt *</label>
          <select
            value={form.projekt}
            onChange={e => set('projekt', e.target.value)}
            required
            className="input"
          >
            <option value="">Vyber projekt...</option>
            {PROJECTS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        {/* Aktivita */}
        <div>
          <label className="label">Aktivita / popis *</label>
          <input
            type="text"
            value={form.aktivita}
            onChange={e => set('aktivita', e.target.value)}
            required
            placeholder="Co bylo děláno..."
            className="input"
          />
        </div>

        {/* Hodiny */}
        {isHodiny() && (
          <div>
            <label className="label">Počet hodin *</label>
            <input
              type="number"
              step="0.5"
              min="0"
              value={form.hodiny}
              onChange={e => set('hodiny', e.target.value)}
              required={isHodiny()}
              placeholder="0.5"
              className="input"
            />
          </div>
        )}

        {/* Finanční pole */}
        {isFinancial() && (
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">SUM (CZK)</label>
              <input
                type="number"
                value={form.sum}
                onChange={e => set('sum', e.target.value)}
                placeholder="0"
                className="input"
              />
            </div>
            <div>
              <label className="label">PAID (CZK)</label>
              <input
                type="number"
                value={form.paid}
                onChange={e => set('paid', e.target.value)}
                placeholder="0"
                className="input"
              />
            </div>
            <div>
              <label className="label">Difference</label>
              <input
                type="number"
                value={form.difference}
                onChange={e => set('difference', e.target.value)}
                placeholder="0"
                className="input"
              />
            </div>
          </div>
        )}

        {/* Vyrovnání – hodiny */}
        {form.typ === 'vyrovnani' && (
          <div>
            <label className="label">Odprac. hodin (pro toto období)</label>
            <input
              type="number"
              step="0.5"
              value={form.hodiny}
              onChange={e => set('hodiny', e.target.value)}
              placeholder="0"
              className="input"
            />
          </div>
        )}

        {/* Poznámka */}
        <div>
          <label className="label">Poznámka</label>
          <input
            type="text"
            value={form.poznamka}
            onChange={e => set('poznamka', e.target.value)}
            placeholder="Volitelná poznámka..."
            className="input"
          />
        </div>

        {/* Akce */}
        <div className="flex gap-3 pt-2">
          <button type="submit" className="btn-primary flex-1">
            Uložit záznam
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn-ghost"
          >
            Zrušit
          </button>
        </div>
      </form>
    </div>
  )
}
