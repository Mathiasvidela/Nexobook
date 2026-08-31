import React from 'react';
import { usePeriod } from '../../context/PeriodContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import { Search, Plus, Upload, Sun, Moon, Calendar, Command, Home } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext.jsx';

export default function Header({
  onOpenSearch,
  onAddMateria,
  onUploadDocument,
  toggleSidebar
}) {
  const { periodos, periodoSeleccionado, seleccionarPeriodo } = usePeriod();
  const { theme, toggleTheme } = useTheme();
  const { salirDelEspacio } = useWorkspace();

  return (
    <header className="app-header">
      <div className="header-leading">
        <button className="header-workspace header-home" onClick={salirDelEspacio} title="Volver al inicio">
          <Home size={16} />
          <span>Home</span>
        </button>
        {/* Period Selector */}
        <div className="header-period-badge">
          <Calendar size={18} />
          <select
            value={periodoSeleccionado ? periodoSeleccionado.id : ''}
            onChange={(e) => seleccionarPeriodo(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'inherit',
              fontWeight: 600,
              fontSize: '0.88rem',
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            {periodos.map((p) => (
              <option key={p.id} value={p.id} style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                {p.nombre}
              </option>
            ))}
          </select>
        </div>

        {/* Search trigger */}
        <div className="header-search" onClick={onOpenSearch}>
          <Search size={16} />
          <span>Buscar en tu espacio</span>
          <kbd><Command size={11} /> K</kbd>
        </div>
      </div>

      <div className="header-actions">
        <button className="btn btn-secondary" onClick={onUploadDocument}>
          <Upload size={16} />
          <span>Importar</span>
        </button>

        <button className="btn btn-primary" onClick={onAddMateria}>
          <Plus size={16} />
          <span>Nueva materia</span>
        </button>

        <button
          className="btn btn-secondary btn-icon"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
    </header>
  );
}
