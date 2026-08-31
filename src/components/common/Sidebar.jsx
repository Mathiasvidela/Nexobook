import React from 'react';
import {
  LayoutDashboard,
  BookOpen,
  Calendar,
  GraduationCap,
  Folder,
  FileText,
  TrendingUp,
  Settings,
  Sparkles,
  ChevronLeft,
  ChevronRight
  ,Trash2
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext.jsx';
import NexobookMark from './NexobookMark.jsx';

export default function Sidebar({ currentPage, setCurrentPage, sidebarOpen, collapsed, onToggle }) {
  const { espacioActual } = useWorkspace();
  const navItems = [
    { id: 'dashboard', label: 'Inicio', icon: LayoutDashboard },
    { id: 'materias', label: 'Materias', icon: BookOpen },
    { id: 'calendario', label: 'Calendario', icon: Calendar },
    { id: 'evaluaciones', label: 'Evaluaciones', icon: GraduationCap },
    { id: 'archivos', label: 'Archivos', icon: Folder },
    { id: 'resumenes', label: 'Resúmenes', icon: FileText },
    { id: 'progreso', label: 'Progreso', icon: TrendingUp },
    { id: 'papelera', label: 'Papelera', icon: Trash2 },
    { id: 'configuracion', label: 'Configuración', icon: Settings },
  ];

  return (
    <aside className={`app-sidebar ${sidebarOpen ? 'open' : ''} ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-logo">
        <div className="brand-mark nexobook-mark"><NexobookMark size={19} tone="white" /></div>
        <div className="brand-copy">
          <strong>Nexobook</strong>
          <span>{espacioActual?.nombre || 'Tu espacio de estudio'}</span>
        </div>
      </div>
      <button className="sidebar-collapse-toggle" onClick={onToggle} title={collapsed ? 'Mostrar menú' : 'Ocultar menú'} aria-label={collapsed ? 'Mostrar menú' : 'Ocultar menú'}>{collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}</button>

      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id || (currentPage.startsWith('materia-') && item.id === 'materias');
          return (
            <button
              key={item.id}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setCurrentPage(item.id)}
              title={collapsed ? item.label : undefined}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <Sparkles size={15} />
        <span>Todo al día</span>
      </div>
    </aside>
  );
}
