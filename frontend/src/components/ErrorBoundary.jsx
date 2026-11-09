import React from 'react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary capturó un error:', error, errorInfo)
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null })
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#f4f7f5] flex items-center justify-center p-4 font-sans">
          <div className="max-w-md w-full bg-white border border-[#dfe6e1] rounded-3xl p-6 sm:p-8 text-center shadow-lg space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-[#e8f8ea] text-[#08940c] flex items-center justify-center text-2xl font-bold shadow-inner">
              FET
            </div>
            <h2 className="text-xl font-extrabold text-[#14201a]">
              Ocurrió un inconveniente visual
            </h2>
            <p className="text-sm text-[#5f6b64] leading-relaxed">
              La interfaz detectó un conflicto de renderizado (frecuentemente causado por extensiones de traducción automática del navegador).
            </p>
            <div className="pt-2">
              <button
                onClick={this.handleReload}
                className="w-full py-2.5 px-4 rounded-xl bg-[#08940c] hover:bg-[#067a0a] text-white text-sm font-bold shadow-md shadow-[#08940c]/25 transition-all cursor-pointer"
              >
                Recargar Aplicación
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
