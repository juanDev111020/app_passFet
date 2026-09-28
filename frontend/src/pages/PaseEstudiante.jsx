import { useAuth } from '../context/AuthContext'

export default function PaseEstudiante() {
  const { user, logout } = useAuth()
  return (
    <div style={{ padding: 24 }}>
      <h1>Mi pase</h1>
      <p>Bienvenido/a, {user.nombres} {user.apellidos}</p>
      <p>(Vista del pase con QR — Sprint 2)</p>
      <button onClick={logout}>Cerrar sesión</button>
    </div>
  )
}