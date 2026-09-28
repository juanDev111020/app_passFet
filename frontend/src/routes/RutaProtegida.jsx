import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function RutaProtegida({ rol, children }) {
  const { user, cargando } = useAuth()
  if (cargando) return <p>Cargando...</p>
  if (!user) return <Navigate to="/login" replace />
  if (rol && user.rol !== rol) return <Navigate to="/" replace />
  return children
}