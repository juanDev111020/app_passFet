import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import RutaProtegida from './routes/RutaProtegida'
import Login from './pages/Login'
import PaseEstudiante from './pages/PaseEstudiante'
import DashboardAdmin from './pages/DashboardAdmin'

function Inicio() {
  const { user, cargando } = useAuth()
  if (cargando) return <p>Cargando...</p>
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={user.rol === 'admin' ? '/admin/dashboard' : '/estudiante/pase'} replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Inicio />} />
      <Route path="/login" element={<Login />} />
      <Route path="/estudiante/pase" element={
        <RutaProtegida rol="estudiante"><PaseEstudiante /></RutaProtegida>} />
      <Route path="/admin/dashboard" element={
        <RutaProtegida rol="admin"><DashboardAdmin /></RutaProtegida>} />
      <Route path="*" element={<h2 style={{ padding: 24 }}>404 - Página no encontrada</h2>} />
    </Routes>
  )
}