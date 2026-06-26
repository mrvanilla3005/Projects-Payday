import { useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/auth.jsx'
import Navbar from './components/Navbar.jsx'
import Login from './pages/Login.jsx'
import SetPassword from './pages/SetPassword.jsx'
import AmazonPoukazy from './pages/AmazonPoukazy.jsx'
import Myslenky from './pages/Myslenky.jsx'
import Projekty from './pages/Projekty.jsx'
import Vyrovnani from './pages/Vyrovnani.jsx'
import Prodej from './pages/Prodej.jsx'
import PridatZaznam from './pages/PridatZaznam.jsx'
import Zaznamy from './pages/Zaznamy.jsx'

function ProtectedApp() {
  const { session, needsPasswordReset, clearPasswordReset } = useAuth()
  const [navOpen, setNavOpen] = useState(() => window.innerWidth >= 768)

  if (session === undefined) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-muted text-sm">Načítám…</div>
      </div>
    )
  }

  if (!session) return <Login />
  if (needsPasswordReset) return <SetPassword onDone={clearPasswordReset} />

  return (
    <div className="min-h-screen bg-bg flex">
      <Navbar isOpen={navOpen} onToggle={() => setNavOpen(o => !o)} />
      <main
        className={`flex-1 p-4 md:p-8 min-h-screen transition-all duration-200 ${navOpen ? 'md:ml-56' : ''}`}
      >
        <div className="max-w-6xl mx-auto">
          <Routes>
            <Route path="/" element={<Navigate to="/projekty" replace />} />
            <Route path="/projekty"  element={<Projekty />} />
            <Route path="/vyrovnani" element={<Vyrovnani />} />
            <Route path="/prodej"          element={<Prodej />} />
            <Route path="/amazon-poukazy"  element={<AmazonPoukazy />} />
            <Route path="/myslenky"        element={<Myslenky />} />
            <Route path="/pridat"          element={<PridatZaznam />} />
            <Route path="/zaznamy"   element={<Zaznamy />} />
          </Routes>
        </div>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <ProtectedApp />
    </AuthProvider>
  )
}
