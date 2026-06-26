import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Paperclip, Link, Upload, X } from 'lucide-react'
import { uploadAttachment, getAttachmentUrl, deleteAttachment } from '../data/store.js'

const fmtSize = b => b < 1024 ? `${b}B` : b < 1048576 ? `${Math.round(b / 1024)}KB` : `${(b / 1048576).toFixed(1)}MB`

function fileIcon(mime = '', name = '') {
  if (mime.startsWith('image/')) return '🖼'
  if (mime === 'application/pdf') return '📄'
  if (mime.startsWith('video/')) return '🎬'
  if (mime.startsWith('audio/')) return '🎵'
  const ext = name.split('.').pop()?.toLowerCase()
  if (['xls', 'xlsx', 'csv'].includes(ext)) return '📊'
  if (['doc', 'docx'].includes(ext)) return '📝'
  if (['zip', 'rar', '7z'].includes(ext)) return '📦'
  return '📎'
}

const PANEL_W = 288
const MARGIN  = 8

export default function AttachmentPanel({ attachments = [], storagePath, onSave }) {
  const [open, setOpen]           = useState(false)
  const [tab, setTab]             = useState('files')
  const [urlInput, setUrlInput]   = useState('')
  const [urlTitle, setUrlTitle]   = useState('')
  const [uploading, setUploading] = useState(false)
  const [pos, setPos]             = useState({ top: 0, left: 0 })
  const btnRef  = useRef()
  const fileRef = useRef()

  useEffect(() => {
    if (!open) return
    function outside(e) {
      if (btnRef.current?.contains(e.target)) return
      const panel = document.getElementById('att-panel-portal')
      if (panel && panel.contains(e.target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', outside)
    document.addEventListener('touchstart', outside, { passive: true })
    return () => {
      document.removeEventListener('mousedown', outside)
      document.removeEventListener('touchstart', outside)
    }
  }, [open])

  function toggle() {
    if (!open && btnRef.current) {
      const r   = btnRef.current.getBoundingClientRect()
      const top = r.bottom + window.scrollY + 4

      let left
      if (window.innerWidth < 520) {
        // Na mobilu vycentrovat
        left = (window.innerWidth - PANEL_W) / 2
      } else {
        left = r.right + window.scrollX - PANEL_W
        left = Math.min(left, window.innerWidth - PANEL_W - MARGIN)
        left = Math.max(MARGIN, left)
      }

      setPos({ top, left })
    }
    setOpen(o => !o)
  }

  async function upload(files) {
    if (!files?.length) return
    setUploading(true)
    const next = [...attachments]
    for (const file of Array.from(files)) {
      const ext = file.name.includes('.') ? file.name.split('.').pop().toLowerCase() : 'bin'
      const path = `${storagePath}/${crypto.randomUUID()}.${ext}`
      const ok = await uploadAttachment(path, file)
      if (ok) next.push({ id: crypto.randomUUID(), type: 'file', name: file.name, path, size: file.size, mime: file.type || '' })
    }
    setUploading(false)
    onSave(next)
  }

  function addUrl(e) {
    e.preventDefault()
    const url = urlInput.trim()
    if (!url) return
    const title = urlTitle.trim() || url.replace(/^https?:\/\//, '').split('/')[0]
    onSave([...attachments, { id: crypto.randomUUID(), type: 'url', name: title, url }])
    setUrlInput('')
    setUrlTitle('')
  }

  async function remove(att) {
    if (att.type === 'file' && att.path) await deleteAttachment(att.path)
    onSave(attachments.filter(a => a.id !== att.id))
  }

  const count = attachments.length

  const dropdown = open && createPortal(
    <div
      id="att-panel-portal"
      style={{ position: 'absolute', top: pos.top, left: pos.left, zIndex: 9999, width: PANEL_W }}
      className="bg-surface border border-border rounded-xl shadow-2xl overflow-hidden"
    >
      {count > 0 && (
        <div className="p-3 space-y-2 border-b border-border/40">
          {attachments.map(a => (
            <div key={a.id} className="flex items-center gap-2 group">
              {a.type === 'file' && a.mime?.startsWith('image/') ? (
                <img src={getAttachmentUrl(a.path)} alt={a.name}
                  className="w-8 h-8 rounded object-cover shrink-0 border border-border/40" />
              ) : (
                <span className="text-base shrink-0 w-8 text-center">
                  {a.type === 'url' ? '🔗' : fileIcon(a.mime, a.name)}
                </span>
              )}
              <a href={a.type === 'url' ? a.url : getAttachmentUrl(a.path)}
                target="_blank" rel="noopener noreferrer"
                className="flex-1 min-w-0 text-xs text-white/80 hover:text-white truncate">
                {a.name}
              </a>
              {a.type === 'file' && a.size && (
                <span className="text-xs text-muted/60 font-mono shrink-0">{fmtSize(a.size)}</span>
              )}
              <button type="button" onClick={() => remove(a)}
                className="text-muted hover:text-danger transition-all shrink-0 p-1.5">
                <X size={11} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="p-3 space-y-2">
        <div className="flex gap-1">
          <button type="button" onClick={() => setTab('files')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs border transition-colors ${tab === 'files' ? 'bg-white/10 border-white/20 text-white' : 'border-border/30 text-muted hover:text-white'}`}>
            <Upload size={11} /> Soubor / obrázek
          </button>
          <button type="button" onClick={() => setTab('url')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs border transition-colors ${tab === 'url' ? 'bg-white/10 border-white/20 text-white' : 'border-border/30 text-muted hover:text-white'}`}>
            <Link size={11} /> URL odkaz
          </button>
        </div>

        {tab === 'files' && (
          <label
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); upload(e.dataTransfer.files) }}
            className="block border border-dashed border-border/40 rounded-lg py-5 px-3 text-center cursor-pointer hover:border-white/30 hover:bg-white/5 transition-colors"
          >
            {uploading
              ? <p className="text-xs text-muted">Nahrávám…</p>
              : <p className="text-xs text-muted">Přetáhni nebo klikni pro výběr souboru</p>}
            <input
              ref={fileRef}
              type="file"
              multiple
              style={{ position: 'absolute', opacity: 0, width: '1px', height: '1px', overflow: 'hidden' }}
              onChange={e => { upload(e.target.files); e.target.value = '' }}
            />
          </label>
        )}

        {tab === 'url' && (
          <form onSubmit={addUrl} className="space-y-1.5">
            <input value={urlInput} onChange={e => setUrlInput(e.target.value)}
              placeholder="https://…" className="input w-full text-xs py-1.5" />
            <input value={urlTitle} onChange={e => setUrlTitle(e.target.value)}
              placeholder="Popisek (volitelný)" className="input w-full text-xs py-1.5" />
            <button type="submit" className="btn-primary w-full text-xs py-1.5">Přidat odkaz</button>
          </form>
        )}
      </div>
    </div>,
    document.body
  )

  return (
    <div className="shrink-0">
      <button ref={btnRef} type="button" onClick={toggle} title="Přílohy a odkazy"
        className={`flex items-center gap-1 p-0.5 transition-colors ${count > 0 ? 'text-accent' : 'text-muted hover:text-white'}`}>
        <Paperclip size={12} />
        {count > 0 && <span className="text-xs font-mono">{count}</span>}
      </button>
      {dropdown}
    </div>
  )
}
