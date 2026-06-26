import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { Lock, Mail } from 'lucide-react'

export default function Login() {
  const [mode, setMode]         = useState('login')   // 'login' | 'forgot'
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState(null)
  const [info, setInfo]         = useState(null)
  const [loading, setLoading]   = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true); setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError('Nesprávný email nebo heslo.')
    setLoading(false)
  }

  async function handleForgot(e) {
    e.preventDefault()
    setLoading(true); setError(null); setInfo(null)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    })
    setLoading(false)
    if (error) { setError('Nepodařilo se odeslat email. Zkus to znovu.'); return }
    setInfo('Email odeslán! Klikni na odkaz v emailu a nastaví si heslo.')
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="w-full max-w-sm space-y-6 px-4">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 mb-4">
            {mode === 'login' ? <Lock size={20} className="text-accent" /> : <Mail size={20} className="text-accent" />}
          </div>
          <h1 className="text-xl font-bold text-white">
            {mode === 'login' ? 'Přihlášení' : 'Zapomenuté heslo'}
          </h1>
          <p className="text-muted text-sm mt-1">
            {mode === 'login' ? 'Přístup jen pro oprávněné uživatele' : 'Pošleme ti odkaz pro nastavení hesla'}
          </p>
        </div>

        {mode === 'login' ? (
          <form onSubmit={handleLogin} className="card space-y-4">
            <div>
              <label className="label">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                required autoFocus autoComplete="email" placeholder="vas@email.cz" className="input" />
            </div>
            <div>
              <label className="label">Heslo</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                required autoComplete="current-password" placeholder="••••••••" className="input" />
            </div>
            {error && <p className="text-danger text-sm">{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Přihlašuji…' : 'Přihlásit se'}
            </button>
            <button type="button" onClick={() => { setMode('forgot'); setError(null) }}
              className="w-full text-center text-xs text-muted hover:text-white transition-colors">
              Zapomenuté heslo?
            </button>
          </form>
        ) : (
          <form onSubmit={handleForgot} className="card space-y-4">
            <div>
              <label className="label">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                required autoFocus autoComplete="email" placeholder="vas@email.cz" className="input" />
            </div>
            {error && <p className="text-danger text-sm">{error}</p>}
            {info  && <p className="text-success text-sm">{info}</p>}
            <button type="submit" disabled={loading || !!info} className="btn-primary w-full">
              {loading ? 'Odesílám…' : 'Poslat odkaz'}
            </button>
            <button type="button" onClick={() => { setMode('login'); setError(null); setInfo(null) }}
              className="w-full text-center text-xs text-muted hover:text-white transition-colors">
              ← Zpět na přihlášení
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
