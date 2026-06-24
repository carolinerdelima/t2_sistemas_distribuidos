import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom'
import GuidedFlow from './pages/GuidedFlow'
import Home from './pages/Home'
import Buy from './pages/Buy'
import Orders from './pages/Orders'
import Academic from './pages/Academic'
import Plataforma from './pages/Plataforma'
import { ConceptProvider } from './context/ConceptContext'

function Nav() {
  const link = ({ isActive }) =>
    `px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
      isActive
        ? 'bg-brand-100 text-brand-500'
        : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
    }`

  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-gray-900">TicketLab</span>
          <span className="text-xs text-gray-400 hidden sm:block">· Sistemas Distribuídos</span>
        </div>
        <nav className="flex items-center gap-1">
          <NavLink to="/" end className={link}>Guiado</NavLink>
          <NavLink to="/demo" className={link}>Demo Livre</NavLink>
          <NavLink to="/orders" className={link}>Pedidos</NavLink>
          <NavLink to="/plataforma" className={link}>Plataforma SD</NavLink>
          <NavLink to="/academic" className={link}>Experimentos</NavLink>
        </nav>
      </div>
    </header>
  )
}

function AppContent() {
  const { pathname } = useLocation()
  const isGuided = pathname === '/'

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />
      {isGuided ? (
        <Routes>
          <Route path="/" element={<GuidedFlow />} />
        </Routes>
      ) : (
        <main className="max-w-6xl mx-auto px-6 py-8">
          <Routes>
            <Route path="/demo" element={<Home />} />
            <Route path="/buy/:eventId" element={<Buy />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/plataforma" element={<Plataforma />} />
            <Route path="/academic" element={<Academic />} />
          </Routes>
        </main>
      )}
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ConceptProvider>
        <AppContent />
      </ConceptProvider>
    </BrowserRouter>
  )
}
