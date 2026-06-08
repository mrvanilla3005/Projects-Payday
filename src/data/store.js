// ─────────────────────────────────────────────
//  PROJEKTY & VYROVNÁNÍ – datová vrstva
//  records → Supabase | zbytek → localStorage
// ─────────────────────────────────────────────

import { supabase } from '../lib/supabase.js'
import { seedKupony, seedProdeje, seedZasoby } from './seedProdej.js'

// Návrhy aktivit (volné zadání)
export const PROJECTS = [
  'Centropolis',
  'iPhony',
  'Markeplace + Bazar',
  'HAKL',
  'Hyrox Katowice',
  'Katowice',
  'Komunikace',
  'Email + zahrada',
  'Byt Centropolis',
  'Administrativa',
  'Vyrovnání',
  'Ostatní',
]

// Typy záznamů
export const RECORD_TYPES = {
  hodiny: 'Odpracované hodiny',
  podil_prodej: 'Podíl z prodeje',
  kvartal_bonus: 'Kvartální bonus',
  vyrovnani: 'Vyrovnání',
}

// Měsíce
export const MONTHS = [
  'Leden', 'Únor', 'Březen', 'Duben', 'Květen', 'Červen',
  'Červenec', 'Srpen', 'Září', 'Říjen', 'Listopad', 'Prosinec',
]

// ── CRUD – Supabase tabulka "records" ─────────

export async function loadRecords() {
  const { data, error } = await supabase
    .from('records')
    .select('*')
    .order('datum', { ascending: false })
  if (error) { console.error('loadRecords:', error); return [] }
  return data
}

export async function addRecord(record) {
  const newRecord = {
    ...record,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  }
  const { data, error } = await supabase
    .from('records')
    .insert(newRecord)
    .select()
    .single()
  if (error) { console.error('addRecord:', error); return null }
  return data
}

export async function updateRecord(id, patch) {
  const { data, error } = await supabase
    .from('records')
    .update({ ...patch, updatedAt: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) { console.error('updateRecord:', error); return null }
  return data
}

export async function deleteRecord(id) {
  const { error } = await supabase.from('records').delete().eq('id', id)
  if (error) console.error('deleteRecord:', error)
}

// ── FILTRY ────────────────────────────────────

export function filterByMonth(records, mesic, rok) {
  return records.filter(r => r.mesic === mesic && r.rok === rok)
}

export function filterByProject(records, projekt) {
  return records.filter(r => r.projekt === projekt)
}

export function filterByType(records, typ) {
  return records.filter(r => r.typ === typ)
}

// ── VÝPOČTY ───────────────────────────────────

export function calcSettlement(records, mesic, rok) {
  const mesicni = filterByMonth(records, mesic, rok)

  const totalHours = mesicni
    .filter(r => r.typ === 'hodiny')
    .reduce((sum, r) => sum + (r.hodiny || 0), 0)

  const sum = mesicni.reduce((s, r) => s + (r.sum || 0), 0)
  const paid = mesicni.reduce((s, r) => s + (r.paid || 0), 0)
  const difference = sum - paid

  const bonus = mesicni
    .filter(r => r.typ === 'kvartal_bonus')
    .reduce((s, r) => s + (r.sum || 0), 0)

  return { totalHours, sum, paid, difference, bonus }
}

export function calcAllSettlements(records) {
  // Seskupí záznamy dle rok+mesic
  const groups = {}
  records.forEach(r => {
    const key = `${r.rok}-${String(r.mesic).padStart(2, '0')}`
    if (!groups[key]) groups[key] = { rok: r.rok, mesic: r.mesic, records: [] }
    groups[key].records.push(r)
  })

  return Object.values(groups)
    .sort((a, b) => {
      if (b.rok !== a.rok) return b.rok - a.rok
      return b.mesic - a.mesic
    })
    .map(g => ({
      ...g,
      ...calcSettlement(records, g.mesic, g.rok),
    }))
}

// ── HELPERS ───────────────────────────────────

export function formatCZK(amount) {
  if (amount === undefined || amount === null || amount === '') return '–'
  return new Intl.NumberFormat('cs-CZ', {
    style: 'currency',
    currency: 'CZK',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(dateStr) {
  if (!dateStr) return '–'
  const d = new Date(dateStr)
  return d.toLocaleDateString('cs-CZ', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function currentMonthYear() {
  const now = new Date()
  return { mesic: now.getMonth() + 1, rok: now.getFullYear() }
}

// ── PRODEJ – kupony, zásoby, prodeje ──────────

const KUPONY_KEY  = 'kupony_v2'
const ZASOBY_KEY2 = 'zasoby_prodej_v1'
const PRODEJE_KEY = 'prodeje_v1'

function _crud(key, seed) {
  return {
    load() {
      try {
        const raw = localStorage.getItem(key)
        if (!raw) { localStorage.setItem(key, JSON.stringify(seed)); return seed }
        return JSON.parse(raw)
      } catch { return [] }
    },
    save(list) { localStorage.setItem(key, JSON.stringify(list)) },
    add(data) {
      const list = this.load()
      const item = { ...data, id: data.id || crypto.randomUUID(), createdAt: new Date().toISOString() }
      list.unshift(item)
      this.save(list)
      return item
    },
    update(id, data) {
      const list = this.load()
      const idx  = list.findIndex(x => x.id === id)
      if (idx === -1) return null
      list[idx] = { ...list[idx], ...data, updatedAt: new Date().toISOString() }
      this.save(list)
      return list[idx]
    },
    remove(id) { this.save(this.load().filter(x => x.id !== id)) },
  }
}

const kuponyStore  = _crud(KUPONY_KEY,  seedKupony)
const zasobyStore  = _crud(ZASOBY_KEY2, seedZasoby)
const prodejeStore = _crud(PRODEJE_KEY, seedProdeje)

export function patchKupony(newItems) {
  const list = kuponyStore.load()
  const ids  = new Set(list.map(k => k.id))
  const toAdd = newItems.filter(k => !ids.has(k.id))
  if (toAdd.length === 0) return 0
  kuponyStore.save([...list, ...toAdd])
  return toAdd.length
}

export const loadKupony    = () => kuponyStore.load()
export const saveKupony    = l  => kuponyStore.save(l)
export const addKupon      = d  => kuponyStore.add(d)
export const updateKupon   = (id, d) => kuponyStore.update(id, d)
export const deleteKupon   = id => kuponyStore.remove(id)

export const loadZasoby    = () => zasobyStore.load()
export const addZasoba     = d  => zasobyStore.add(d)
export const updateZasoba  = (id, d) => zasobyStore.update(id, d)
export const deleteZasoba  = id => zasobyStore.remove(id)

export const loadProdeje   = () => prodejeStore.load()
export const addProdej     = d  => prodejeStore.add(d)
export const updateProdej  = (id, d) => prodejeStore.update(id, d)
export const deleteProdej  = id => prodejeStore.remove(id)

export const PROVIZE_SAZBY = { iphone: 0.05, elektronika: 0.10 }

// ── PROJEKTY & ÚKOLY ──────────────────────────

const PROJECTS_KEY = 'projekty'
const TASKS_KEY = 'ukoly'

export const PROJECT_STATUSES = ['Nezahájeno', 'Probíhá', 'Hotovo']

export const STATUS_COLORS = {
  Nezahájeno: 'bg-muted/10 text-muted',
  Probíhá:    'bg-accent/10 text-accent',
  Hotovo:     'bg-success/10 text-success',
}

export function loadProjects() {
  try { return JSON.parse(localStorage.getItem(PROJECTS_KEY) || '[]') }
  catch { return [] }
}

function _saveProjects(list) {
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(list))
}

export function addProject(data) {
  const list = loadProjects()
  const item = { ...data, id: crypto.randomUUID(), createdAt: new Date().toISOString() }
  list.unshift(item)
  _saveProjects(list)
  return item
}

export function updateProject(id, data) {
  const list = loadProjects()
  const idx = list.findIndex(p => p.id === id)
  if (idx === -1) return null
  list[idx] = { ...list[idx], ...data }
  _saveProjects(list)
  return list[idx]
}

export function deleteProject(id) {
  _saveProjects(loadProjects().filter(p => p.id !== id))
  _saveTasks(loadTasks().filter(t => t.projektId !== id))
}

export function loadTasks() {
  try { return JSON.parse(localStorage.getItem(TASKS_KEY) || '[]') }
  catch { return [] }
}

function _saveTasks(list) {
  localStorage.setItem(TASKS_KEY, JSON.stringify(list))
}

export function addTask(data) {
  const list = loadTasks()
  const item = { ...data, id: crypto.randomUUID(), createdAt: new Date().toISOString() }
  list.push(item)
  _saveTasks(list)
  return item
}

export function updateTask(id, data) {
  const list = loadTasks()
  const idx = list.findIndex(t => t.id === id)
  if (idx === -1) return null
  list[idx] = { ...list[idx], ...data }
  _saveTasks(list)
  return list[idx]
}

export function deleteTask(id) {
  _saveTasks(loadTasks().filter(t => t.id !== id))
}
