// ─────────────────────────────────────────────
//  PROJEKTY & VYROVNÁNÍ – datová vrstva
//  records → Supabase | zbytek → localStorage
// ─────────────────────────────────────────────

import { supabase } from '../lib/supabase.js'
import { seedData } from './seed.js'
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

// ── Seed – nahraje data pokud je tabulka prázdná ──

let _seeded = false
export async function insertSeedData() {
  if (_seeded) return
  const { count, error } = await supabase
    .from('records')
    .select('*', { count: 'exact', head: true })
  if (error) { console.error('insertSeedData count:', error); return }
  if (count === 0) {
    const { error: insErr } = await supabase.from('records').insert(seedData)
    if (insErr) console.error('insertSeedData insert:', insErr)
  }
  _seeded = true
}

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
    .update(patch)
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

// ── PRODEJ – Supabase tabulky ──────────────────

function _sb(table) {
  return {
    async load() {
      const { data, error } = await supabase.from(table).select('*')
      if (error) { console.error(`load ${table}:`, error); return [] }
      return data
    },
    async add(item) {
      const row = { ...item, id: item.id || crypto.randomUUID(), createdAt: new Date().toISOString() }
      const { data, error } = await supabase.from(table).insert(row).select().single()
      if (error) { console.error(`add ${table}:`, error); return null }
      return data
    },
    async update(id, patch) {
      const { data, error } = await supabase.from(table).update(patch).eq('id', id).select().single()
      if (error) { console.error(`update ${table}:`, error); return null }
      return data
    },
    async remove(id) {
      const { error } = await supabase.from(table).delete().eq('id', id)
      if (error) console.error(`remove ${table}:`, error)
    },
  }
}

const kuponyStore  = _sb('kupony')
const zasobyStore  = _sb('zasoby')
const prodejeStore = _sb('prodeje')

export async function patchKupony(newItems) {
  const { data, error } = await supabase.from('kupony').select('id')
  if (error) { console.error('patchKupony:', error); return 0 }
  const ids   = new Set(data.map(k => k.id))
  const toAdd = newItems.filter(k => !ids.has(k.id))
  if (toAdd.length === 0) return 0
  const { error: insErr } = await supabase.from('kupony').insert(toAdd)
  if (insErr) console.error('patchKupony insert:', insErr)
  return toAdd.length
}

export const loadKupony   = ()       => kuponyStore.load()
export const addKupon     = d        => kuponyStore.add(d)
export const updateKupon  = (id, d)  => kuponyStore.update(id, d)
export const deleteKupon  = id       => kuponyStore.remove(id)

export const loadZasoby   = ()       => zasobyStore.load()
export const addZasoba    = d        => zasobyStore.add(d)
export const updateZasoba = (id, d)  => zasobyStore.update(id, d)
export const deleteZasoba = id       => zasobyStore.remove(id)

export const loadProdeje  = ()       => prodejeStore.load()
export const addProdej    = d        => prodejeStore.add(d)
export const updateProdej = (id, d)  => prodejeStore.update(id, d)
export const deleteProdej = id       => prodejeStore.remove(id)

export const PROVIZE_SAZBY = { iphone: 0.05, elektronika: 0.10 }

// Hodinová sazba dle data záznamu
// Konec března + duben 2025 = 300, květen 2025 = 350, červen 2025+ = 400
export function getHourlyRate(datum) {
  if (!datum) return 400
  if (datum < '2025-05-01') return 300
  if (datum < '2025-06-01') return 350
  return 400
}

// ── DNA Records ───────────────────────────────────
export const DNA_TOPICS = [
  { id: 'byt',     label: 'Centropolis', sub: '', dot: 'bg-yellow-400' },
  { id: 'dum',     label: 'Těchov',      sub: '', dot: 'bg-green-400'  },
  { id: 'fg',      label: 'FG',          sub: '', dot: 'bg-purple-400' },
  { id: 'ig',      label: 'IG',          sub: 'Instagram', dot: 'bg-pink-400' },
  { id: 'email',   label: 'Email',       sub: '', dot: 'bg-orange-400' },
  { id: 'ostatni', label: 'Ostatní',     sub: '', dot: 'bg-white/30'   },
]

const thoughtsStore = _sb('thoughts')
export const loadThoughts   = ()       => thoughtsStore.load()
export const addThought     = d        => thoughtsStore.add(d)
export const updateThought  = (id, d)  => thoughtsStore.update(id, d)
export const deleteThought  = id       => thoughtsStore.remove(id)

const summariesStore = _sb('summaries')
export const loadSummaries  = ()       => summariesStore.load()
export const addSummary     = d        => summariesStore.add(d)

// ── Activity log ──────────────────────────────
export async function loadActivity() {
  const { data, error } = await supabase
    .from('activity_log')
    .select('*')
    .order('createdAt', { ascending: false })
    .limit(300)
  if (error) { console.error('loadActivity:', error); return [] }
  return data
}
export const addActivity = d => _sb('activity_log').add(d)

// ── Storage: Přílohy ──────────────────────────

const BUCKET = 'attachments'

export async function uploadAttachment(storagePath, file) {
  const { error } = await supabase.storage.from(BUCKET).upload(storagePath, file)
  if (error) { console.error('uploadAttachment:', error); return null }
  return storagePath
}

export function getAttachmentUrl(storagePath) {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)
  return data.publicUrl
}

export async function deleteAttachment(storagePath) {
  const { error } = await supabase.storage.from(BUCKET).remove([storagePath])
  if (error) console.error('deleteAttachment:', error)
}

// ── PROJEKTY & ÚKOLY (Supabase) ───────────────

const projectsDb = _sb('projects')
const tasksDb    = _sb('tasks')

export const loadProjects  = ()       => projectsDb.load()
export const addProject    = d        => projectsDb.add(d)
export const updateProject = (id, d)  => projectsDb.update(id, d)
export const deleteProject = id       => projectsDb.remove(id)

export const loadTasks     = ()       => tasksDb.load()
export const addTask       = d        => tasksDb.add(d)
export const updateTask    = (id, d)  => tasksDb.update(id, d)
export const deleteTask    = id       => tasksDb.remove(id)
