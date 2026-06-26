import { useState, useEffect, useRef } from 'react'
import { Plus, Trash2, ChevronDown, ChevronRight, Check, ArrowUpRight } from 'lucide-react'
import {
  loadProjects, addProject, updateProject, deleteProject,
  loadTasks, addTask, updateTask, deleteTask,
  loadThoughts, deleteThought,
  DNA_TOPICS,
} from '../data/store.js'
import AttachmentPanel from '../components/AttachmentPanel.jsx'

// ─────────────────────────────────────────────
// Inline text cell
// ─────────────────────────────────────────────

function Cell({ value, onSave, placeholder = '—', bold = false }) {
  const [on, setOn]       = useState(false)
  const [draft, setDraft] = useState('')
  const ref = useRef()

  useEffect(() => { if (on) { ref.current?.focus(); ref.current?.select() } }, [on])

  function commit() {
    setOn(false)
    const v = draft.trim() || null
    if (v !== (value ?? null)) onSave(v)
  }

  if (on) return (
    <input
      ref={ref}
      value={draft}
      onChange={e => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={e => { if (e.key === 'Enter') ref.current?.blur(); if (e.key === 'Escape') setOn(false) }}
      className="bg-bg border border-accent/60 rounded px-2 py-0.5 text-white text-sm outline-none flex-1 min-w-[100px]"
    />
  )

  return (
    <span
      onClick={() => { setDraft(value ?? ''); setOn(true) }}
      className={`cursor-text hover:bg-white/5 rounded px-1 py-0.5 text-sm ${bold ? 'font-semibold' : ''} ${value ? 'text-white' : 'text-white/20'}`}
    >
      {value || placeholder}
    </span>
  )
}

// ─────────────────────────────────────────────
// Badges
// ─────────────────────────────────────────────

const DTA_CYCLE = ['Do', 'Tell', 'Ask']
const DTA_COLOR = {
  Do:   'bg-red-500/15 text-red-400 border-red-500/30',
  Tell: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  Ask:  'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
}
function DtaBadge({ value, onChange }) {
  return (
    <button type="button"
      onClick={() => onChange(DTA_CYCLE[(DTA_CYCLE.indexOf(value ?? 'Do') + 1) % DTA_CYCLE.length])}
      className={`text-xs px-2 py-0.5 rounded border font-medium whitespace-nowrap shrink-0 transition-colors ${DTA_COLOR[value] || DTA_COLOR.Do}`}
    >
      {value || 'Do'}
    </button>
  )
}

const TS = ['Not started', 'In progress', 'Done']
const TS_C = { 'Not started': 'text-muted border-border/40', 'In progress': 'text-yellow-400 border-yellow-400/40', 'Done': 'text-success border-success/40' }
function TaskStatus({ value, onChange }) {
  return (
    <button type="button"
      onClick={() => onChange(TS[(TS.indexOf(value ?? 'Not started') + 1) % TS.length])}
      className={`text-xs px-2 py-0.5 rounded border font-medium whitespace-nowrap shrink-0 transition-colors ${TS_C[value] || TS_C['Not started']}`}
    >
      {value || 'Not started'}
    </button>
  )
}

const PS = ['active', 'paused', 'done']
const PS_L = { active: 'Aktivní', paused: 'Pauza', done: 'Hotovo' }
const PS_C = { active: 'text-accent border-accent/40', paused: 'text-yellow-400 border-yellow-400/40', done: 'text-success border-success/40' }
function ProjectStatus({ value, onChange }) {
  return (
    <button type="button"
      onClick={() => onChange(PS[(PS.indexOf(value ?? 'active') + 1) % PS.length])}
      className={`text-xs px-2 py-0.5 rounded border font-medium whitespace-nowrap shrink-0 transition-colors ${PS_C[value] || PS_C.active}`}
    >
      {PS_L[value] || 'Aktivní'}
    </button>
  )
}

// ─────────────────────────────────────────────
// Checklist
// ─────────────────────────────────────────────

function Checklist({ items, taskId, onChange }) {
  const [newText, setNewText] = useState('')
  const ref = useRef()

  function toggle(id)  { onChange(items.map(it => it.id === id ? { ...it, done: !it.done } : it)) }
  function remove(id)  { onChange(items.filter(it => it.id !== id)) }

  function submit(e) {
    e.preventDefault()
    const text = newText.trim()
    if (!text) return
    onChange([...items, { id: crypto.randomUUID(), text, done: false, attachments: [] }])
    setNewText('')
    ref.current?.focus()
  }

  return (
    <div className="pl-10 pr-3 pt-2 pb-2 space-y-1.5 border-t border-border/20 bg-white/[0.01]">
      {items.map(it => (
        <div key={it.id} className="flex items-center gap-2 group">
          <button type="button" onClick={() => toggle(it.id)}
            className={`w-4 h-4 rounded border shrink-0 flex items-center justify-center transition-colors ${it.done ? 'bg-success/80 border-success/60' : 'border-border/60 hover:border-white/40'}`}
          >
            {it.done && <Check size={9} className="text-bg" />}
          </button>
          <span className={`flex-1 text-sm ${it.done ? 'line-through text-white/30' : 'text-white/80'}`}>{it.text}</span>
          <AttachmentPanel
            attachments={it.attachments || []}
            storagePath={`task/${taskId}/cl/${it.id}`}
            onSave={atts => onChange(items.map(i => i.id === it.id ? { ...i, attachments: atts } : i))}
          />
          <button type="button" onClick={() => remove(it.id)}
            className="opacity-0 group-hover:opacity-100 text-muted hover:text-danger transition-all p-0.5 shrink-0"
          >
            <Trash2 size={10} />
          </button>
        </div>
      ))}
      <form onSubmit={submit} className="flex items-center gap-2 mt-0.5">
        <div className="w-4 h-4 rounded border border-border/30 shrink-0" />
        <input ref={ref} value={newText} onChange={e => setNewText(e.target.value)}
          placeholder="+ nová položka…"
          className="flex-1 bg-transparent text-sm text-muted placeholder:text-white/15 outline-none focus:text-white/80"
        />
      </form>
    </div>
  )
}

// ─────────────────────────────────────────────
// Task row
// ─────────────────────────────────────────────

function TaskRow({ task, onSave, onDelete }) {
  const [open, setOpen] = useState(false)
  const cl   = task.checklist ?? []
  const done = cl.filter(i => i.done).length

  return (
    <div className="border-b border-border/20 last:border-0">
      <div className="flex items-start gap-2 px-3 py-2.5 group hover:bg-white/[0.02]">
        <button type="button" onClick={() => setOpen(o => !o)} className="text-muted hover:text-white transition-colors shrink-0 mt-0.5">
          {open ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
        </button>
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2">
            <DtaBadge value={task.dta} onChange={v => onSave(task.id, { dta: v })} />
            <div className="flex-1 min-w-0">
              <Cell value={task.title} onSave={v => onSave(task.id, { title: v ?? task.title })} placeholder="Název úkolu…" />
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <TaskStatus value={task.status} onChange={v => onSave(task.id, { status: v })} />
            <div className="hidden sm:flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} type="button"
                  onClick={() => onSave(task.id, { priority: task.priority === n ? null : n })}
                  className={`w-4 h-4 text-[9px] transition-colors ${(task.priority ?? 0) >= n ? 'text-accent' : 'text-white/15 hover:text-white/30'}`}
                >●</button>
              ))}
            </div>
            {cl.length > 0 && <span className="text-xs text-muted font-mono">{done}/{cl.length}</span>}
            <AttachmentPanel
              attachments={task.attachments || []}
              storagePath={`task/${task.id}`}
              onSave={atts => onSave(task.id, { attachments: atts })}
            />
            <button type="button" onClick={() => onDelete(task.id)}
              className="text-muted hover:text-danger transition-colors p-0.5 sm:opacity-0 sm:group-hover:opacity-100"
            >
              <Trash2 size={11} />
            </button>
          </div>
        </div>
      </div>
      {open && (
        <Checklist
          items={cl}
          taskId={task.id}
          onChange={items => onSave(task.id, { checklist: items })}
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// Thoughts section (myšlenky v oblasti)
// ─────────────────────────────────────────────

function ThoughtsSection({ thoughts, projects, onPromote }) {
  const [picked, setPicked] = useState({})
  const fmtDate = d => d ? new Date(d + 'T12:00').toLocaleDateString('cs-CZ', { day: '2-digit', month: '2-digit' }) : ''

  return (
    <div className="rounded-lg border border-yellow-400/25 bg-yellow-400/[0.03] overflow-hidden">
      <div className="px-4 py-2 border-b border-yellow-400/15">
        <span className="text-xs text-yellow-400/70 font-medium tracking-wide uppercase">💡 Myšlenky</span>
      </div>
      <div className="divide-y divide-border/20">
        {thoughts.map(t => {
          const projectId = picked[t.id] || (projects.length === 1 ? projects[0].id : '')
          const canPromote = !!projectId
          return (
            <div key={t.id} className="flex items-center gap-3 px-4 py-2.5 group hover:bg-white/[0.02]">
              <p className="flex-1 text-sm text-white/75 min-w-0 leading-relaxed">{t.text}</p>
              <span className="text-xs text-muted font-mono shrink-0">{fmtDate(t.datum)}</span>
              {projects.length > 1 && (
                <select
                  value={picked[t.id] || ''}
                  onChange={e => setPicked(prev => ({ ...prev, [t.id]: e.target.value }))}
                  className="input text-xs py-0.5 px-2 shrink-0 max-w-[130px]"
                >
                  <option value="">– projekt –</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              )}
              {projects.length === 1 && (
                <span className="text-xs text-muted/50 shrink-0 hidden sm:block truncate max-w-[100px]">{projects[0].name}</span>
              )}
              <button
                type="button"
                onClick={() => canPromote && onPromote(t, projectId)}
                disabled={!canPromote}
                title={canPromote ? 'Přidat jako úkol' : 'Vyber projekt'}
                className="flex items-center gap-1 text-xs text-muted hover:text-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0 px-1 py-0.5 rounded hover:bg-accent/10"
              >
                <ArrowUpRight size={13} /> Úkol
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Project card
// ─────────────────────────────────────────────

function ProjectCard({ project, tasks, isOpen, onToggle, onSaveProj, onDeleteProj, onSaveTask, onDeleteTask, onAddTask }) {
  const total = tasks.length
  const done  = tasks.filter(t => t.status === 'Done').length
  const area  = DNA_TOPICS.find(d => d.id === project.topic)

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="flex items-start gap-2 px-4 py-3 bg-surface hover:bg-white/[0.03] transition-colors group">
        <button type="button" onClick={onToggle} className="text-muted hover:text-white transition-colors shrink-0 mt-0.5">
          {isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </button>
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2">
            {area && <span className={`w-2 h-2 rounded-full shrink-0 ${area.dot}`} />}
            <div className="flex-1 min-w-0">
              <Cell value={project.name} onSave={v => onSaveProj(project.id, { name: v ?? project.name })} placeholder="Název projektu…" bold />
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <ProjectStatus value={project.status} onChange={v => onSaveProj(project.id, { status: v })} />
            <span className="text-xs text-muted font-mono">{done}/{total}</span>
            <AttachmentPanel
              attachments={project.attachments || []}
              storagePath={`proj/${project.id}`}
              onSave={atts => onSaveProj(project.id, { attachments: atts })}
            />
            <button type="button" onClick={() => onDeleteProj(project.id)}
              className="text-muted hover:text-danger transition-colors sm:opacity-0 sm:group-hover:opacity-100"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="border-t border-border/40">
          {tasks.length === 0 && <p className="text-xs text-muted px-5 py-3">Žádné úkoly.</p>}
          {tasks.map(t => (
            <TaskRow key={t.id} task={t} onSave={onSaveTask} onDelete={onDeleteTask} />
          ))}
          <button type="button" onClick={() => onAddTask(project.id)}
            className="w-full flex items-center gap-2 px-5 py-2 text-muted hover:text-white hover:bg-white/5 text-xs border-t border-border/20 transition-colors"
          >
            <Plus size={11} /> Přidat úkol
          </button>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────

export default function Projekty() {
  const [projects, setProjects]         = useState([])
  const [tasks, setTasks]               = useState([])
  const [thoughts, setThoughts]         = useState([])
  const [openProjects, setOpenProjects]       = useState(new Set())
  const [openThoughtTopics, setOpenThoughts]  = useState(new Set())
  const [filterArea, setFilterArea]           = useState('all')
  const [filterStatus, setFilterStatus]       = useState('active')

  async function reload() {
    const [projs, allTasks] = await Promise.all([loadProjects(), loadTasks()])
    setProjects(projs.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || '')))
    setTasks(allTasks)
    loadThoughts().then(th => setThoughts(th ?? [])).catch(() => {})
  }
  useEffect(() => { reload() }, [])

  async function saveProj(id, patch) { await updateProject(id, patch); await reload() }

  async function delProj(id) {
    if (!confirm('Smazat projekt i všechny úkoly?')) return
    await Promise.all(tasks.filter(t => t.project_id === id).map(t => deleteTask(t.id)))
    await deleteProject(id)
    await reload()
  }

  async function addNewProject(topicId) {
    const p = await addProject({ topic: topicId, name: 'Nový projekt', status: 'active', attachments: [] })
    if (p) { await reload(); setOpenProjects(prev => new Set([...prev, p.id])) }
  }

  async function saveTask(id, patch) { await updateTask(id, patch); await reload() }
  async function delTask(id)         { await deleteTask(id); await reload() }

  async function addNewTask(projectId) {
    await addTask({ project_id: projectId, title: 'Nový úkol', dta: 'Do', status: 'Not started', checklist: [], attachments: [] })
    await reload()
  }

  async function promoteToTask(thought, projectId) {
    await Promise.all([
      addTask({ project_id: projectId, title: thought.text, dta: 'Do', status: 'Not started', checklist: [], attachments: [] }),
      deleteThought(thought.id),
    ])
    setOpenProjects(prev => new Set([...prev, projectId]))
    await reload()
  }

  function toggleProject(id) {
    setOpenProjects(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  function toggleThoughts(topicId) {
    setOpenThoughts(prev => { const n = new Set(prev); n.has(topicId) ? n.delete(topicId) : n.add(topicId); return n })
  }

  // ── Výpočty ──
  const tasksByProject = {}
  tasks.forEach(t => { (tasksByProject[t.project_id] ??= []).push(t) })

  const thoughtsByTopic = {}
  ;(thoughts ?? []).forEach(th => {
    const key = th.projekt && DNA_TOPICS.find(d => d.id === th.projekt) ? th.projekt : 'ostatni'
    ;(thoughtsByTopic[key] ??= []).push(th)
  })

  const filtered = projects
    .filter(p => filterArea === 'all' || p.topic === filterArea)
    .filter(p => filterStatus === 'all' || (filterStatus === 'active' ? p.status !== 'done' : p.status === 'done'))

  const byTopic = {}
  filtered.forEach(p => { (byTopic[p.topic || 'ostatni'] ??= []).push(p) })

  const visibleAreas = filterArea === 'all'
    ? DNA_TOPICS.filter(t => byTopic[t.id]?.length > 0)
    : DNA_TOPICS.filter(t => t.id === filterArea)

  const emptyAreas = filterArea === 'all' ? DNA_TOPICS.filter(t => !byTopic[t.id]?.length) : []

  const activeProjects = projects.filter(p => p.status !== 'done').length
  const pendingTasks   = tasks.filter(t => t.status !== 'Done').length
  const doneTasks      = tasks.filter(t => t.status === 'Done').length

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card">
          <p className="text-xs text-muted uppercase tracking-wider mb-1">Projekty</p>
          <p className="text-2xl font-bold font-mono text-white">{activeProjects}</p>
        </div>
        <div className="card">
          <p className="text-xs text-muted uppercase tracking-wider mb-1">Nedokončeno</p>
          <p className="text-2xl font-bold font-mono text-yellow-400">{pendingTasks}</p>
        </div>
        <div className="card">
          <p className="text-xs text-muted uppercase tracking-wider mb-1">Hotovo</p>
          <p className="text-2xl font-bold font-mono text-success">{doneTasks}</p>
        </div>
      </div>

      {/* Filtry */}
      <div className="space-y-2">
        <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {[{ id: 'all', label: 'Vše', dot: 'bg-white/30' }, ...DNA_TOPICS].map(t => (
            <button key={t.id} type="button" onClick={() => setFilterArea(t.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors border whitespace-nowrap shrink-0 ${
                filterArea === t.id ? 'bg-accent/10 border-accent/40 text-accent' : 'border-border/40 text-muted hover:text-white hover:border-white/20'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${t.dot}`} />
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {[['active', 'Aktivní'], ['all', 'Vše'], ['done', 'Hotovo']].map(([v, l]) => (
            <button key={v} type="button" onClick={() => setFilterStatus(v)}
              className={`px-2.5 py-1 rounded-lg text-xs border transition-colors ${filterStatus === v ? 'bg-white/10 border-white/20 text-white' : 'border-border/40 text-muted hover:text-white'}`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Skupiny projektů */}
      <div className="space-y-6">
        {visibleAreas.length === 0 && (
          <div className="card text-center py-10">
            <p className="text-muted text-sm">Žádné projekty.</p>
          </div>
        )}

        {visibleAreas.map(topic => {
          const topicThoughts = thoughtsByTopic[topic.id] ?? []
          const topicProjects = byTopic[topic.id] ?? []
          const thoughtsOpen  = openThoughtTopics.has(topic.id)
          return (
          <div key={topic.id} className="space-y-2">
            <div className="flex items-center gap-2 px-1">
              <span className={`w-2 h-2 rounded-full ${topic.dot}`} />
              <span className="text-sm font-semibold text-white">{topic.label}</span>
              {topicThoughts.length > 0 && (
                <button
                  type="button"
                  onClick={() => toggleThoughts(topic.id)}
                  className={`flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full border transition-colors ${
                    thoughtsOpen
                      ? 'bg-yellow-400/20 border-yellow-400/40 text-yellow-400'
                      : 'bg-yellow-400/10 border-yellow-400/20 text-yellow-400/70 hover:text-yellow-400 hover:bg-yellow-400/15'
                  }`}
                >
                  {topicThoughts.length} 💡
                </button>
              )}
            </div>
            {thoughtsOpen && topicThoughts.length > 0 && (
              <ThoughtsSection
                thoughts={topicThoughts}
                projects={topicProjects}
                onPromote={promoteToTask}
              />
            )}
            {topicProjects.map(p => (
              <ProjectCard
                key={p.id}
                project={p}
                tasks={(tasksByProject[p.id] ?? []).sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''))}
                isOpen={openProjects.has(p.id)}
                onToggle={() => toggleProject(p.id)}
                onSaveProj={saveProj}
                onDeleteProj={delProj}
                onSaveTask={saveTask}
                onDeleteTask={delTask}
                onAddTask={addNewTask}
              />
            ))}
            <button type="button" onClick={() => addNewProject(topic.id)}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-border/30 text-muted hover:text-white hover:border-white/20 text-xs transition-colors"
            >
              <Plus size={11} /> Přidat projekt do {topic.label}
            </button>
          </div>
          )
        })}

        {emptyAreas.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {emptyAreas.map(t => (
              <button key={t.id} type="button" onClick={() => addNewProject(t.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/30 text-muted hover:text-white hover:border-white/20 text-xs transition-colors"
              >
                <span className={`w-1.5 h-1.5 rounded-full ${t.dot}`} />
                {t.label} <Plus size={10} />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
