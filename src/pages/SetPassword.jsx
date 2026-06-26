import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { KeyRound } from 'lucide-react'

export default function SetPassword({ onDone }) {
  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [error, setError]         = useState(null)
  const [loading, setLoading]     = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (password.length < 6)          { setError('Heslo musí mít alespoň 6 znaků.'); return }
    if (password !== confirm)          { setError('Hesla se neshodují.'); return }
    setLoading(true); setError(null)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) { setError('Nepodařilo se nastavit heslo. Zkus to znovu.'); return }
    onDone()
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="w-full max-w-sm space-y-6 px-4">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 mb-4">
            <KeyRound size={20} className="text-accent" />
          </div>
          <h1 className="text-xl font-bold text-white">Nastav si heslo</h1>
          <p className="text-muted text-sm mt-1">Zvol heslo pro přihlašování do aplikace</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4">
          <div>
            <label className="label">Nové heslo</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              required autoFocus autoComplete="new-password" placeholder="min. 6 znaků" className="input" />
          </div>
          <div>
            <label className="label">Potvrzení hesla</label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
              required autoComplete="new-password" placeholder="zopakuj heslo" className="input" />
          </div>
          {error && <p className="text-danger text-sm">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Ukládám…' : 'Nastavit heslo a přihlásit se'}
          </button>
        </form>
      </div>
    </div>
  )
}
