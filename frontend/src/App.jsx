import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import RutaProtegida from './routes/RutaProtegida'
import Login from './pages/Login'
import PaseEstudiante from './pages/PaseEstudiante'
import PerfilEstudiante from './pages/PerfilEstudiante'
import DashboardAdmin from './pages/DashboardAdmin'
import DashboardEmpresario from './pages/DashboardEmpresario'

function Inicio() {
  const { user, cargando } = useAuth()
  if (cargando) return <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white font-medium">Cargando PassFet...</div>
  if (!user) return <Navigate to="/login" replace />
  const rol = user.rol?.toLowerCase()
  if (rol === 'admin') return <Navigate to="/admin/dashboard" replace />
  if (rol === 'empresario') return <Navigate to="/empresario/dashboard" replace />
  return <Navigate to="/estudiante/pase" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Inicio />} />
      <Route path="/login" element={<Login />} />
      <Route path="/estudiante/pase" element={
        <RutaProtegida rol="estudiante"><PaseEstudiante /></RutaProtegida>} />
      <Route path="/estudiante/perfil" element={
        <RutaProtegida rol="estudiante"><PerfilEstudiante /></RutaProtegida>} />
      <Route path="/empresario/dashboard" element={
        <RutaProtegida rol="empresario"><DashboardEmpresario /></RutaProtegida>} />
      <Route path="/admin/dashboard" element={
        <RutaProtegida rol="admin"><DashboardAdmin /></RutaProtegida>} />
      <Route path="*" element={<h2 style={{ padding: 24 }}>404 - Página no encontrada</h2>} />
    </Routes>
  )
}