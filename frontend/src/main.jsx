import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ErrorBoundary from './components/ErrorBoundary'
import App from './App'
import './index.css'

// Protección global contra mutaciones del DOM externas (Google Translate, extensiones de traducción, Grammarly, etc.)
// Evita el error crítico: "NotFoundError: Failed to execute 'insertBefore' on 'Node'"
if (typeof window !== 'undefined' && typeof Node !== 'undefined') {
  const originalInsertBefore = Node.prototype.insertBefore
  Node.prototype.insertBefore = function (newNode, referenceNode) {
    if (referenceNode && referenceNode.parentNode !== this) {
      return originalInsertBefore.call(this, newNode, null)
    }
    return originalInsertBefore.call(this, newNode, referenceNode)
  }

  const originalRemoveChild = Node.prototype.removeChild
  Node.prototype.removeChild = function (child) {
    if (child && child.parentNode !== this) {
      return child
    }
    return originalRemoveChild.call(this, child)
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>
)