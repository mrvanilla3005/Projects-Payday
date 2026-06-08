import { Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import Projekty from './pages/Projekty.jsx'
import Vyrovnani from './pages/Vyrovnani.jsx'
import Prodej from './pages/Prodej.jsx'

export default function App() {
  return (
    <div className="min-h-screen bg-bg flex">
      <Navbar />
      <main className="ml-56 flex-1 p-8 min-h-screen">
        <div className="max-w-6xl mx-auto">
          <Routes>
            <Route path="/" element={<Navigate to="/projekty" replace />} />
            <Route path="/projekty" element={<Projekty />} />
            <Route path="/vyrovnani" element={<Vyrovnani />} />
            <Route path="/prodej" element={<Prodej />} />
          </Routes>
        </div>
      </main>
    </div>
  )
}
