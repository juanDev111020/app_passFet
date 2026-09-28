import { useAuth } from '../context/AuthContext'

export default function DashboardAdmin() {
  const { user, logout } = useAuth()
  return (
    <div style={{ padding: 24 }}>
      <h1>Dashboard administrador</h1>
      <p>Bienvenido, {user.nombres}</p>
      <p>(Gestión de estudiantes — Sprint 2)</p>
      <button onClick={logout}>Cerrar sesión</button>
    </div>
  )
}