import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function RutaProtegida({ rol, children }) {
  const { user, cargando } = useAuth()
  if (cargando) return <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white font-medium">Cargando PassFet...</div>
  if (!user) return <Navigate to="/login" replace />
  if (rol && user.rol?.toLowerCase() !== rol?.toLowerCase()) return <Navigate to="/" replace />
  return children
}