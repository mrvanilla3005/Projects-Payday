import { useState, useEffect } from 'react'
import {
  loadProjects, addProject, updateProject, deleteProject,
  loadTasks, addTask, updateTask, deleteTask,
  PROJECT_STATUSES, STATUS_COLORS,
} from '../data/store.js'
import { Plus, Trash2, Pencil, Check, X, ChevronDown, ChevronRight } from 'lucide-react'

function cycleStatus(current) {
  const idx = PROJECT_STATUSES.indexOf(current)
  return PROJECT_STATUSES[(idx + 1) % PROJECT_STATUSES.length]
}

function StatusBadge({ status, onClick }) {
  return (
    <button
      onClick={onClick}
      title="Kliknutím změníš status"
      className={`badge cursor-pointer hover:opacity-75 transition-opacity shrink-0 ${STATUS_COLORS[status] || 'bg-border text-muted'}`}
    >
      {status}
    </button>
  )
}

function TaskRow({ task, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(task.nazev)

  function save() {
    if (val.trim()) onUpdate(task.id, { nazev: val.trim() })
    setEditing(false)
  }

  return (
    <div className="flex items-center gap-2 py-1.5 group">
      <StatusBadge
        status={task.status}
        onClick={() => onUpdate(task.id, { status: cycleStatus(task.status) })}
      />
      {editing ? (
        <>
          <input
            autoFocus
            value={val}
            onChange={e => setVal(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false) }}
            onBlur={save}
            className="flex-1 bg-bg border border-accent rounded px-2 py-0.5 text-sm text-white outline-none"
          />
          <button onClick={save} className="text-success hover:opacity-75 shrink-0"><Check size={13} /></button>
          <button onClick={() => setEditing(false)} className="text-muted hover:text-white shrink-0"><X size={13} /></button>
        </>
      ) : (
        <>
          <span className={`flex-1 text-sm ${task.status === 'Hotovo' ? 'line-through text-muted' : 'text-white'}`}>
            {task.nazev}
          </span>
          <div className="hidden group-hover:flex items-center gap-1 shrink-0">
            <button onClick={() => { setVal(task.nazev); setEditing(true) }} className="text-muted hover:text-accent transition-colors">
              <Pencil size={12} />
            </button>
            <button onClick={() => onDelete(task.id)} className="text-muted hover:text-danger transition-colors">
              <Trash2 size={12} />
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function ProjectCard({ project, tasks, onUpdateProject, onDeleteProject, onAddTask, onUpdateTask, onDeleteTask }) {
  const [expanded, setExpanded] = useState(true)
  const [editingName, setEditingName] = useState(false)
  const [nameVal, setNameVal] = useState(project.nazev)
  const [newTask, setNewTask] = useState('')

  const projectTasks = tasks.filter(t => t.projektId === project.id)
  const doneCount = projectTasks.filter(t => t.status === 'Hotovo').length

  function saveName() {
    if (nameVal.trim()) onUpdateProject(project.id, { nazev: nameVal.trim() })
    setEditingName(false)
  }

  function handleAddTask(e) {
    e.preventDefault()
    if (!newTask.trim()) return
    onAddTask({ projektId: project.id, nazev: newTask.trim(), status: 'Nezahájeno' })
    setNewTask('')
  }

  return (
    <div className="card">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setExpanded(e => !e)}
          className="text-muted hover:text-white transition-colors shrink-0"
        >
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>

        {editingName ? (
          <input
            autoFocus
            value={nameVal}
            onChange={e => setNameVal(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false) }}
            onBlur={saveName}
            className="flex-1 bg-bg border border-accent rounded px-2 py-0.5 text-sm font-semibold text-white outline-none"
          />
        ) : (
          <span
            className="flex-1 font-semibold text-white cursor-pointer hover:text-accent transition-colors"
            onDoubleClick={() => { setNameVal(project.nazev); setEditingName(true) }}
          >
            {project.nazev}
          </span>
        )}

        <StatusBadge
          status={project.status}
          onClick={() => onUpdateProject(project.id, { status: cycleStatus(project.status) })}
        />

        {projectTasks.length > 0 && (
          <span className="text-xs text-muted font-mono shrink-0">
            {doneCount}/{projectTasks.length}
          </span>
        )}

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => { setNameVal(project.nazev); setEditingName(true) }}
            className="text-muted hover:text-accent transition-colors"
          >
            <Pencil size={13} />
          </button>
          <button
            onClick={() => onDeleteProject(project.id)}
            className="text-muted hover:text-danger transition-colors"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 pl-7 border-l border-border ml-2">
          {projectTasks.length === 0 && (
            <p className="text-xs text-muted mb-2 pl-2">Žádné úkoly</p>
          )}
          <div className="space-y-0.5 pl-2">
            {projectTasks.map(t => (
              <TaskRow
                key={t.id}
                task={t}
                onUpdate={onUpdateTask}
                onDelete={onDeleteTask}
              />
            ))}
          </div>
          <form onSubmit={handleAddTask} className="flex gap-2 mt-3 pl-2">
            <input
              value={newTask}
              onChange={e => setNewTask(e.target.value)}
              placeholder="Přidat úkol..."
              className="flex-1 bg-bg border border-border rounded-lg px-3 py-1.5 text-xs text-white placeholder-muted focus:outline-none focus:border-accent transition-colors"
            />
            <button
              type="submit"
              className="text-muted hover:text-accent transition-colors px-2 shrink-0"
              title="Přidat úkol"
            >
              <Plus size={14} />
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

export default function Projekty() {
  const [projects, setProjects] = useState([])
  const [tasks, setTasks] = useState([])
  const [filterStatus, setFilterStatus] = useState('')
  const [newProjectName, setNewProjectName] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)

  function reload() {
    setProjects(loadProjects())
    setTasks(loadTasks())
  }

  useEffect(() => { reload() }, [])

  const counts = PROJECT_STATUSES.reduce((acc, s) => {
    acc[s] = projects.filter(p => p.status === s).length
    return acc
  }, {})

  const visible = filterStatus
    ? projects.filter(p => p.status === filterStatus)
    : projects

  function handleAddProject(e) {
    e.preventDefault()
    if (!newProjectName.trim()) return
    addProject({ nazev: newProjectName.trim(), status: 'Nezahájeno' })
    setNewProjectName('')
    setShowAddForm(false)
    reload()
  }

  function handleUpdateProject(id, data) {
    updateProject(id, data)
    reload()
  }

  function handleDeleteProject(id) {
    if (!confirm('Smazat projekt i všechny jeho úkoly?')) return
    deleteProject(id)
    reload()
  }

  function handleAddTask(data) {
    addTask(data)
    reload()
  }

  function handleUpdateTask(id, data) {
    updateTask(id, data)
    reload()
  }

  function handleDeleteTask(id) {
    deleteTask(id)
    reload()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Projekty & Úkoly</h1>
          <p className="text-muted text-sm mt-1">{projects.length} projektů</p>
        </div>
        <button
          onClick={() => setShowAddForm(s => !s)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={14} />
          Přidat projekt
        </button>
      </div>

      {/* Status filtry */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilterStatus('')}
          className={`badge cursor-pointer transition-colors ${!filterStatus ? 'bg-white/10 text-white' : 'bg-border text-muted hover:text-white'}`}
        >
          Vše ({projects.length})
        </button>
        {PROJECT_STATUSES.map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(filterStatus === s ? '' : s)}
            className={`badge cursor-pointer transition-colors ${filterStatus === s ? STATUS_COLORS[s] : 'bg-border text-muted hover:text-white'}`}
          >
            {s} ({counts[s] || 0})
          </button>
        ))}
      </div>

      {/* Formulář nového projektu */}
      {showAddForm && (
        <form onSubmit={handleAddProject} className="card flex gap-3 items-center">
          <input
            autoFocus
            value={newProjectName}
            onChange={e => setNewProjectName(e.target.value)}
            placeholder="Název projektu..."
            className="input flex-1"
          />
          <button type="submit" className="btn-primary shrink-0">Přidat</button>
          <button type="button" onClick={() => setShowAddForm(false)} className="btn-ghost shrink-0">Zrušit</button>
        </form>
      )}

      {/* Seznam projektů */}
      {visible.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-muted text-sm">
            {filterStatus
              ? `Žádné projekty se statusem "${filterStatus}"`
              : 'Zatím žádné projekty. Klikni na "Přidat projekt"!'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map(p => (
            <ProjectCard
              key={p.id}
              project={p}
              tasks={tasks}
              onUpdateProject={handleUpdateProject}
              onDeleteProject={handleDeleteProject}
              onAddTask={handleAddTask}
              onUpdateTask={handleUpdateTask}
              onDeleteTask={handleDeleteTask}
            />
          ))}
        </div>
      )}
    </div>
  )
}
