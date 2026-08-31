import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import NexobookMark from './NexobookMark.jsx';

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error('[Nexobook UI]', error, info); }

  render() {
    if (!this.state.error) return this.props.children;
    return <main className="app-error-screen">
      <NexobookMark size={42} />
      <div className="app-error-icon"><AlertTriangle size={22} /></div>
      <span className="eyebrow">Algo interrumpió esta pantalla</span>
      <h1>Tus datos siguen guardados.</h1>
      <p>Nexobook encontró un problema visual. Recargá la interfaz para volver a abrirla; no se eliminará tu información.</p>
      <button onClick={() => window.location.reload()}><RefreshCw size={16} /> Recargar Nexobook</button>
      <details><summary>Detalle técnico</summary><code>{this.state.error.message}</code></details>
    </main>;
  }
}
