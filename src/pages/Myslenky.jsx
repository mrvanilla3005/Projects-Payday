import { useState, useEffect, useRef } from 'react'
import { Mic, MicOff, Save, Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import { loadThoughts, addThought, updateThought, deleteThought, DNA_TOPICS } from '../data/store.js'
import AttachmentPanel from '../components/AttachmentPanel.jsx'

export default function Myslenky() {
  const [thoughts, setThoughts]     = useState([])
  const [transcript, setTranscript] = useState('')
  const [interim, setInterim]       = useState('')
  const [listening, setListening]   = useState(false)
  const [projekt, setProjekt]       = useState('')
  const [priorita, setPriorita]     = useState(null)
  const [supported, setSupported]   = useState(true)
  const [open, setOpen]             = useState(() => new Set(DNA_TOPICS.map(t => t.id)))
  const recognitionRef = useRef(null)

  async function reload() {
    const t = await loadThoughts()
    setThoughts(t.sort((a, b) => (b.datum || '').localeCompare(a.datum || '')))
  }

  useEffect(() => {
    reload()
    if (!('SpeechRecognition' in window) && !('webkitSpeechRecognition' in window)) setSupported(false)
  }, [])

  function startListening() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return
    const recognition = new SR()
    recognition.lang = 'cs-CZ'
    recognition.continuous = false
    recognition.interimResults = true
    let finalText = ''
    recognition.onresult = (e) => {
      let final = '', inter = ''
      for (let i = 0; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript
        else inter += e.results[i][0].transcript
      }
      finalText = final
      setInterim(inter || final)
    }
    recognition.onend = () => {
      if (finalText) setTranscript(prev => prev + (prev ? ' ' : '') + finalText.trim())
      setInterim('')
      setListening(false)
    }
    recognition.onerror = () => { setListening(false); setInterim('') }
    recognition.start()
    recognitionRef.current = recognition
    setListening(true)
  }

  function stopListening() { recognitionRef.current?.stop() }

  async function save() {
    const text = (transcript + (interim ? ' ' + interim : '')).trim()
    if (!text) return
    stopListening()
    await addThought({
      datum: new Date().toISOString().slice(0, 10),
      text,
      projekt: projekt || null,
      priorita: priorita ?? null,
      attachments: [],
    })
    setTranscript('')
    setInterim('')
    setProjekt('')
    setPriorita(null)
    await reload()
  }

  async function del(id) {
    if (!confirm('Smazat myšlenku?')) return
    await deleteThought(id)
    await reload()
  }

  async function saveAttachments(thought, atts) {
    await updateThought(thought.id, { attachments: atts })
    await reload()
  }

  function toggleTopic(id) {
    setOpen(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  const grouped = {}
  thoughts.forEach(t => {
    const key = t.projekt && DNA_TOPICS.find(d => d.id === t.projekt) ? t.projekt : 'ostatni'
    ;(grouped[key] ??= []).push(t)
  })

  const visibleTopics = DNA_TOPICS.filter(t => grouped[t.id]?.length > 0)
  const hasText = (transcript + interim).trim().length > 0
  const fmtDate = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('cs-CZ', { day: '2-digit', month: '2-digit' }) : ''

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white">Myšlenky</h1>
        <p className="text-muted text-sm mt-0.5">Hlasové poznámky k projektům</p>
      </div>

      {/* Recorder */}
      <div className="card space-y-4">
        <div className="flex justify-center py-2">
          <button
            onClick={listening ? stopListening : startListening}
            disabled={!supported}
            className={`w-20 h-20 rounded-full flex items-center justify-center transition-all border-2 ${
              listening
                ? 'bg-danger/10 border-danger text-danger animate-pulse'
                : 'bg-accent/10 border-accent text-accent hover:bg-accent/20'
            } ${!supported ? 'opacity-40 cursor-not-allowed' : ''}`}
          >
            {listening ? <MicOff size={30} /> : <Mic size={30} />}
          </button>
        </div>

        {!supported && (
          <p className="text-center text-xs text-muted">Hlasové zadávání nepodporuje tento prohlížeč.</p>
        )}

        <textarea
          value={transcript + interim}
          onChange={e => { setTranscript(e.target.value); setInterim('') }}
          placeholder="Mluv nebo piš myšlenku…"
          rows={3}
          className="input w-full resize-none text-sm"
        />

        <div className="flex gap-3">
          <select value={projekt} onChange={e => setProjekt(e.target.value)} className="input flex-1 text-sm">
            <option value="">– Téma –</option>
            {DNA_TOPICS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>

          <div className="flex items-center gap-1 shrink-0">
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} onClick={() => setPriorita(priorita === n ? null : n)} title={`Priorita ${n}`}
                className={`w-7 h-7 rounded text-xs font-bold transition-colors ${priorita === n ? 'bg-accent text-bg' : 'bg-white/5 text-muted hover:text-white'}`}>
                {n}
              </button>
            ))}
          </div>
        </div>

        <button onClick={save} disabled={!hasText}
          className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
          <Save size={15} /> Uložit myšlenku
        </button>
      </div>

      {/* Grouped thoughts */}
      <div className="space-y-2">
        {visibleTopics.length === 0 && (
          <p className="text-center text-muted text-sm py-8">Zatím žádné myšlenky.</p>
        )}
        {visibleTopics.map(topic => {
          const items = grouped[topic.id] || []
          const isOpen = open.has(topic.id)
          return (
            <div key={topic.id} className="rounded-lg border border-border overflow-hidden">
              <button
                onClick={() => toggleTopic(topic.id)}
                className="w-full flex items-center gap-3 px-4 py-3 bg-surface hover:bg-white/5 cursor-pointer transition-colors text-left"
              >
                <span className="text-muted shrink-0">
                  {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </span>
                <span className={`w-2 h-2 rounded-full shrink-0 ${topic.dot}`} />
                <span className="text-white font-semibold text-sm">{topic.label}</span>
                <span className="flex-1" />
                <span className="text-xs text-muted font-mono shrink-0">{items.length}</span>
              </button>

              {isOpen && (
                <div className="border-t border-border/40 divide-y divide-border/20">
                  {items.map(t => (
                    <div key={t.id} className="px-4 py-3 flex gap-3 group hover:bg-white/[0.025]">
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm leading-relaxed">{t.text}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted font-mono">{fmtDate(t.datum)}</span>
                          {t.priorita && (
                            <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-white/5 text-muted">
                              P{t.priorita}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-start gap-1 shrink-0 mt-0.5">
                        <AttachmentPanel
                          attachments={t.attachments || []}
                          storagePath={`thought/${t.id}`}
                          onSave={atts => saveAttachments(t, atts)}
                        />
                        <button onClick={() => del(t.id)} className="text-muted hover:text-danger transition-colors p-1">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
