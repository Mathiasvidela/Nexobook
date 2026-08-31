import React, { useState, useEffect } from 'react';
import { usePeriod } from '../../context/PeriodContext.jsx';
import { api } from '../../services/api.js';
import LoadingSpinner from '../common/LoadingSpinner.jsx';
import SubjectCard from '../materias/SubjectCard.jsx';
import EmptyState from '../common/EmptyState.jsx';
import {
  BookOpen,
  Calendar,
  FileText,
  TrendingUp,
  Clock,
  Plus,
  Upload,
  CheckSquare,
  RefreshCw,
  ArrowRight,
  Pencil,
  Eye
} from 'lucide-react';

export default function DashboardView({
  onSelectMateria,
  onAddMateria,
  onUploadDocument,
  onOpenEvalModal,
  onOpenPdfViewer,
  onOpenEditor,
  onOpenLibrary,
  onContinue,
  refreshKey
}) {
  const { periodoSeleccionado } = usePeriod();
  const [materias, setMaterias] = useState([]);
  const [evaluaciones, setEvaluaciones] = useState([]);
  const [archivos, setArchivos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');

  const cargarDatos = async () => {
    if (!periodoSeleccionado) return;
    try {
      setLoading(true);
      const [matsRes, evalsRes, archsRes] = await Promise.all([
        api.getMaterias({ periodoId: periodoSeleccionado.id }),
        api.getEvaluaciones(),
        api.getArchivos()
      ]);

      const currentMaterias = matsRes || [];
      const materiaIds = new Set(currentMaterias.map(m => m.id));
      setMaterias(currentMaterias);
      setEvaluaciones((evalsRes || []).filter(item => materiaIds.has(item.materiaId)));
      setArchivos((archsRes || []).filter(item => materiaIds.has(item.materiaId)));
    } catch (err) {
      console.error('Error al cargar datos del dashboard:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [periodoSeleccionado, refreshKey]);

  const sincronizarBiblioteca = async () => {
    try {
      setSyncing(true);
      setSyncMessage('');
      const result = await api.syncArchivos();
      await cargarDatos();
      const parts = [];
      if (result.added > 0) parts.push(`${result.added} PDF${result.added === 1 ? '' : 's'} agregado${result.added === 1 ? '' : 's'}`);
      if (result.cleanedTitles > 0) parts.push(`${result.cleanedTitles} nombre${result.cleanedTitles === 1 ? '' : 's'} mejorado${result.cleanedTitles === 1 ? '' : 's'}`);
      if (result.duplicates > 0) parts.push(`${result.duplicates} duplicado${result.duplicates === 1 ? '' : 's'} omitido${result.duplicates === 1 ? '' : 's'}`);
      setSyncMessage(parts.length ? parts.join(' · ') : 'La biblioteca ya está actualizada');
    } catch (err) {
      setSyncMessage(err.message || 'No se pudo actualizar la biblioteca');
    } finally {
      setSyncing(false);
    }
  };

  if (loading) return <LoadingSpinner message="Cargando panel de control..." />;

  // Filter metrics for current period
  const activeMaterias = materias.filter(m => m.estado === 'en_curso' || m.estado === 'proxima');
  const dayKeys = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
  const todayKey = dayKeys[new Date().getDay()];
  const classesToday = materias.flatMap(materia => (materia.horarios || []).filter(item => item.dia === todayKey).map(item => ({ ...item, materia })));

  // Next upcoming evaluation
  const upcomingEval = evaluaciones
    .filter(e => e.estado === 'pendiente')
    .sort((a, b) => new Date(a.fecha) - new Date(b.fecha))[0];
  const upcomingMateria = upcomingEval ? materias.find(materia => materia.id === upcomingEval.materiaId) : null;
  const upcomingDate = upcomingEval?.fecha
    ? new Date(`${upcomingEval.fecha}T12:00:00`).toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })
    : '';

  // Global progress calculation
  const overdueEvaluations = evaluaciones.filter(item => item.estado === 'pendiente' && item.fecha && new Date(`${item.fecha}T23:59:59`) < new Date());
  const recentSummary = archivos.filter(item => item.tipo === 'richtext' || item.tipo === 'markdown').sort((a, b) => new Date(b.fechaModificacion || b.fechaCarga) - new Date(a.fechaModificacion || a.fechaCarga))[0];

  // Recent files added
  const ultimosArchivos = [...archivos]
    .sort((a, b) => new Date(b.ultimaApertura || b.fechaModificacion || b.fechaCarga) - new Date(a.ultimaApertura || a.fechaModificacion || a.fechaCarga))
    .slice(0, 4);
  const continuar = archivos.filter(item => item.ultimaApertura || (item.tipo === 'pdf' && item.estadoLectura === 'leyendo')).sort((a, b) => new Date(b.ultimaApertura || b.fechaModificacion || b.fechaCarga) - new Date(a.ultimaApertura || a.fechaModificacion || a.fechaCarga))[0];

  const tiempoRelativo = value => {
    const date = new Date(value);
    const diff = Date.now() - date.getTime();
    const minutes = Math.max(0, Math.floor(diff / 60000));
    if (minutes < 2) return 'Ahora';
    if (minutes < 60) return `Hace ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Hace ${hours} h`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Ayer';
    if (days < 7) return `Hace ${days} días`;
    return date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
  };

  const abrirArchivo = arc => arc.tipo === 'pdf'
    ? onOpenPdfViewer(arc)
    : onOpenEditor(arc.subtipo === 'apuntes' ? 'apunte' : 'resumen', arc, arc.materiaId);

  const renombrarArchivo = async arc => {
    const nextTitle = window.prompt('Nombre del documento', arc.titulo || arc.nombreOriginal || '');
    if (!nextTitle?.trim() || nextTitle.trim() === arc.titulo) return;
    try {
      if (arc.tipo === 'pdf') await api.updateArchivo(arc.id, { titulo: nextTitle.trim() });
      else await api.updateResumen(arc.id, { titulo: nextTitle.trim() });
      await cargarDatos();
    } catch (err) { console.error(err); }
  };

  const fechaHoy = new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());

  return (
    <div className="dashboard-page">
      <section className="dashboard-hero">
        <div>
          <p className="eyebrow">{fechaHoy}</p>
          <h1>Tu espacio de estudio.</h1>
          <p>{periodoSeleccionado ? periodoSeleccionado.nombre : 'Período actual'} · Todo lo importante, sin distracciones.</p>
        </div>
        <div className="hero-actions">
          {syncMessage && <span className="sync-message">{syncMessage}</span>}
          <button className="btn btn-secondary btn-icon sync-button" onClick={sincronizarBiblioteca} disabled={syncing} title="Buscar PDFs nuevos en las carpetas">
            <RefreshCw size={17} className={syncing ? 'is-spinning' : ''} />
          </button>
          <button className="btn btn-secondary hero-action" onClick={onOpenEvalModal}><CheckSquare size={16} /><span>Nueva evaluación</span></button>
          <button className="btn btn-primary hero-action" onClick={onUploadDocument}><Upload size={16} /><span>Agregar PDF</span></button>
        </div>
      </section>

      <section className="metrics-surface">
        <div className="metric-card">
          <div>
            <span className="metric-lbl">Clases de hoy</span>
            <div className="metric-val">{classesToday.length}</div>
            <span className="metric-detail">{classesToday[0] ? `${classesToday[0].desde} · ${classesToday[0].materia.nombre}` : 'Día libre'}</span>
          </div>
          <div className="metric-icon-wrapper">
            <Clock size={24} />
          </div>
        </div>

        <div className="metric-card featured-metric">
          <div className="evaluation-metric-copy">
            <span className="metric-lbl">Próxima Evaluación</span>
            {upcomingMateria && <span className="evaluation-subject" style={{ '--evaluation-color': upcomingMateria.color }}>{upcomingMateria.nombre}</span>}
            <div className="metric-val metric-event" title={upcomingEval?.titulo}>
              {upcomingEval ? upcomingEval.titulo : 'Sin evaluaciones'}
            </div>
            {upcomingEval && (
              <span className="evaluation-date">
                <Clock size={12} /> {upcomingDate}
              </span>
            )}
          </div>
          <div className="metric-icon-wrapper" style={{ background: 'var(--warning-bg)', color: 'var(--warning-color)' }}>
            <Calendar size={24} />
          </div>
        </div>

        <div className="metric-card">
          <div>
            <span className="metric-lbl">Evaluaciones atrasadas</span>
            <div className="metric-val">{overdueEvaluations.length}</div>
            <span className="metric-detail">{overdueEvaluations[0]?.titulo || 'Todo al día'}</span>
          </div>
          <div className="metric-icon-wrapper" style={{ background: 'var(--danger-bg)', color: 'var(--danger-color)' }}>
            <CheckSquare size={24} />
          </div>
        </div>

        <div className="metric-card">
          <div>
            <span className="metric-lbl">Último resumen</span>
            <div className="metric-val metric-event">{recentSummary?.titulo || 'Sin resúmenes'}</div>
            <span className="metric-detail">{recentSummary ? materias.find(item => item.id === recentSummary.materiaId)?.nombre : 'Creá tu primer documento'}</span>
          </div>
          <div className="metric-icon-wrapper" style={{ background: 'var(--success-bg)', color: 'var(--success-color)' }}>
            <TrendingUp size={24} />
          </div>
        </div>
      </section>

      {continuar && <section className="continue-study" style={{ '--continue-color': materias.find(m => m.id === continuar.materiaId)?.color || 'var(--accent-primary)' }}>
        <div className="continue-symbol"><BookOpen size={21} /></div>
        <div className="continue-copy"><span className="eyebrow">Continuar estudiando</span><strong>{continuar.titulo || continuar.nombreOriginal}</strong><small>{materias.find(m => m.id === continuar.materiaId)?.nombre || 'Tu biblioteca'}{continuar.tipo === 'pdf' ? ` · Página ${continuar.paginaActual || 1}` : ' · Resumen'}</small></div>
        {continuar.tipo === 'pdf' && <div className="continue-progress"><span>{continuar.porcentajeLectura || 0}%</span><i><b style={{ width: `${continuar.porcentajeLectura || 0}%` }} /></i></div>}
        <button onClick={() => onContinue(continuar)}>Continuar <ArrowRight size={15} /></button>
      </section>}

      {/* Active Subjects Grid */}
      <section className="dashboard-section">
        <div className="section-heading">
          <div><p className="eyebrow">En curso</p><h2>Tus materias</h2></div>
          <button className="btn btn-secondary" onClick={onAddMateria}>
            <Plus size={16} /> <span>Agregar Materia</span>
          </button>
        </div>

        {materias.length === 0 ? (
          <EmptyState
            title="No hay materias registradas en este período"
            description="Crea tu primera materia académica para comenzar a asociar PDFs, clases y evaluaciones."
            actionButton={
              <button className="btn btn-primary" onClick={onAddMateria}>
                <Plus size={16} /> <span>Agregar Materia</span>
              </button>
            }
          />
        ) : (
          <div className="subjects-grid">
            {materias.map((mat) => (
              <SubjectCard key={mat.id} materia={mat} onClick={() => onSelectMateria(mat.id)} />
            ))}
          </div>
        )}
      </section>

      <section className="recent-panel activity-panel">
        <div className="section-heading"><div><p className="eyebrow">Tu biblioteca</p><h2>Actividad reciente</h2></div><button className="activity-library-link" onClick={onOpenLibrary}>Ver biblioteca <ArrowRight size={14} /></button></div>
        {ultimosArchivos.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Aún no se han subido archivos.</p>
        ) : (
          <div className="activity-list">
            {ultimosArchivos.map(arc => {
              const materia = materias.find(item => item.id === arc.materiaId);
              const type = arc.tipo === 'pdf' ? 'PDF' : arc.subtipo === 'apuntes' ? 'Apunte' : 'Resumen';
              return <article className="activity-row" key={arc.id}>
                <div className="activity-file-icon" style={{ '--file-color': materia?.color || 'var(--accent-primary)' }}><FileText size={18} /></div>
                <div className="activity-context"><strong>{materia?.nombre || 'Sin materia'}</strong><span><b>{type}</b> · {arc.titulo || arc.nombreOriginal}</span></div>
                <time>{tiempoRelativo(arc.fechaModificacion || arc.fechaCarga)}</time>
                <div className="activity-actions"><button onClick={() => renombrarArchivo(arc)} title="Renombrar"><Pencil size={14} /></button><button className="open" onClick={() => abrirArchivo(arc)}><Eye size={14} /> Abrir</button></div>
              </article>;
            })}
          </div>
        )}
      </section>
    </div>
  );
}
