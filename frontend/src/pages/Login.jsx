import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Login.css'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [verClave, setVerClave] = useState(false)
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!email || !password) return setError('Completa tu correo y contraseña.')
    setEnviando(true)
    try {
      const user = await login(email, password)
      navigate(user.rol === 'admin' ? '/admin/dashboard' : '/estudiante/pase')
    } catch (err) {
      if (!err.response) setError('No se pudo conectar con el servidor.')
      else if (err.response.status === 422) setError(Object.values(err.response.data.errors)[0][0])
      else setError(err.response.data.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="login">
      {/* Panel verde de marca */}
      <aside className="login-marca">
        <div className="login-logo">
          <span className="login-logo-icono">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="11" r="2.5"/><path d="M14 10h4M14 14h4M6 16c.8-1.5 2-2 3-2s2.2.5 3 2"/></svg>
          </span>
          PassFet
        </div>

        <div className="login-mensaje">
          <h1>Tu pase estudiantil, siempre contigo.</h1>
          <p>Accede a tu pase digital desde cualquier dispositivo, de forma rápida y segura.</p>
          <ul>
            <li><span>✓</span> Pase digital con código QR</li>
            <li><span>✓</span> Validación en segundos</li>
            <li><span>✓</span> Acceso seguro con tu cuenta</li>
          </ul>
        </div>

        <small>© 2026 PassFet · Ingeniería de Software</small>
      </aside>

      {/* Formulario */}
      <main className="login-panel">
        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <div className="login-logo login-logo-movil">
            <span className="login-logo-icono">P</span> PassFet
          </div>

          <div>
            <h2>Bienvenido de nuevo</h2>
            <p className="login-sub">Ingresa con tu correo institucional para continuar.</p>
          </div>

          {error && (
            <div className="login-error" role="alert">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
              {error}
            </div>
          )}

          <label className="campo">
            <span>Correo electrónico</span>
            <div className="campo-input">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>
              <input type="email" value={email} autoComplete="username"
                     onChange={(e) => setEmail(e.target.value)} placeholder="usuario@passfet.edu.co" />
            </div>
          </label>

          <label className="campo">
            <span>Contraseña</span>
            <div className="campo-input">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
              <input type={verClave ? 'text' : 'password'} value={password} autoComplete="current-password"
                     onChange={(e) => setPassword(e.target.value)} placeholder="Ingresa tu contraseña" />
              <button type="button" className="ver-clave" onClick={() => setVerClave(!verClave)}>
                {verClave ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
          </label>

          <button type="submit" className="login-boton" disabled={enviando}>
            {enviando ? <><span className="spinner" /> Ingresando...</> : 'Iniciar sesión'}
          </button>

          <p className="login-ayuda">¿Problemas para ingresar? Contacta al administrador.</p>
        </form>
      </main>
    </div>
  )
}