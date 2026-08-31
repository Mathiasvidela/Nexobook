import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../../services/api.js';
import LoadingSpinner from '../common/LoadingSpinner.jsx';
import { Check, Clock3, Circle, GraduationCap, Gift, ChevronDown, Settings2 } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext.jsx';
import PlanBuilderModal from './PlanBuilderModal.jsx';

const STATUS = {
  completada: { label: 'Completada', icon: Check },
  en_curso: { label: 'En curso', icon: Clock3 },
  pendiente: { label: 'Por cursar', icon: Circle }
};

export default function ProgresoView({ addToast, onOpenMateriaModal }) {
  const { espacioActual } = useWorkspace();
  const [plan, setPlan] = useState(null);
  const [clases, setClases] = useState([]);
  const [materias, setMaterias] = useState([]);
  const [mode, setMode] = useState('materias');
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('todas');
  const [updating, setUpdating] = useState(null);
  const [builderOpen, setBuilderOpen] = useState(false);

  const loadPlan = async () => {
    try {
      const [planData, subjects, lessons] = await Promise.all([api.getPlanEstudios(), api.getMaterias(), api.getClases()]);
      const ids = new Set((subjects || []).map(item => item.id));
      setPlan(planData); setMaterias(subjects || []); setClases((lessons || []).filter(item => ids.has(item.materiaId)));
      if (espacioActual?.tipo === 'bootcamp' || espacioActual?.tipo === 'curso') setMode('clases');
    }
    finally { setLoading(false); }
  };

  useEffect(() => { loadPlan(); }, [espacioActual?.id]);

  const updateStatus = async (id, estado) => {
    try {
      setUpdating(id);
      const updated = await api.updatePlanMateria(id, estado);
      setPlan(prev => ({ ...prev, materias: prev.materias.map(m => m.id === id ? updated : m) }));
    } finally { setUpdating(null); }
  };

  const updateClassStatus = async (id, estado) => {
    try {
      setUpdating(id);
      const updated = await api.updateClase(id, { estado: estado === 'completada' ? 'completada' : 'pendiente' });
      setClases(prev => prev.map(item => item.id === id ? updated : item));
    } finally { setUpdating(null); }
  };

  const metrics = useMemo(() => {
    const all = mode === 'clases' ? clases.map(item => ({ ...item, estado: item.estado === 'completada' ? 'completada' : 'pendiente' })) : (plan?.materias || []);
    const completed = all.filter(m => m.estado === 'completada').length;
    const current = all.filter(m => m.estado === 'en_curso').length;
    const pending = all.filter(m => m.estado === 'pendiente').length;
    return { total: all.length, completed, current, pending, pct: all.length ? Math.round((completed / all.length) * 100) : 0 };
  }, [plan, clases, mode]);

  if (loading) return <LoadingSpinner message="Organizando tu plan de estudios..." />;

  const years = [...new Set((plan.materias || []).map(item => item.anio))].sort((a, b) => a - b);
  const periodCount = plan.estructura?.periodosPorAnio || 2;
  const periodName = plan.estructura?.nombrePeriodo || 'Cuatrimestre';
  const groups = years.map(anio => ({
    anio,
    terms: Array.from({ length: periodCount }, (_, index) => index + 1).map(cuatrimestre => ({
      cuatrimestre,
      materias: (plan.materias || []).filter(m => m.anio === anio && m.cuatrimestre === cuatrimestre && (filter === 'todas' || m.estado === filter))
    }))
  }));

  return (
    <div className="curriculum-page">
      <header className="curriculum-hero">
        <div>
          <p className="eyebrow">Tu recorrido académico</p>
          <h1>Plan de estudios</h1>
          <p>{plan.carrera} · Progreso por {mode === 'clases' ? 'clases' : 'materias'}</p>
        </div>
        <div className="curriculum-score"><strong>{metrics.pct}%</strong><span>completado</span></div>
      </header>

      <section className="curriculum-summary">
        <div className="curriculum-ring" style={{ '--progress': `${metrics.pct * 3.6}deg` }}><div><strong>{metrics.completed}</strong><span>de {metrics.total}</span></div></div>
        <div className="curriculum-summary-copy">
          <span className="eyebrow">Progreso de la carrera</span>
          <h2>{metrics.pct === 100 ? 'Recorrido completado.' : 'Tu avance, siempre visible.'}</h2>
          <p>Completaste {metrics.completed} {mode === 'clases' ? 'clases' : 'materias'}. Te quedan {metrics.pending + metrics.current} para finalizar el recorrido.</p>
          <div className="curriculum-legend"><span><i className="done" />{metrics.completed} completadas</span><span><i className="active" />{metrics.current} en curso</span><span><i />{metrics.pending} por cursar</span></div>
        </div>
        <div className="next-subjects">
          <span className="eyebrow">Lo que falta</span>
          {(mode === 'clases' ? clases.filter(item => item.estado !== 'completada').map(item => ({ ...item, nombre: item.titulo, duracion: materias.find(m => m.id === item.materiaId)?.nombre || 'Clase' })) : (plan.materias || []).filter(m => m.estado !== 'completada')).slice(0, 5).map(m => <div key={m.id}><span>{m.nombre}</span><small>{m.duracion || `Clase ${m.numero}`}</small></div>)}
        </div>
      </section>

      <div className="curriculum-controls">
        <div><h2>Recorrido completo</h2><p>Elegí cómo querés medir este espacio.</p><div className="progress-mode"><button className={mode === 'materias' ? 'active' : ''} onClick={() => setMode('materias')}>Materias</button><button className={mode === 'clases' ? 'active' : ''} onClick={() => setMode('clases')}>Clases</button></div></div>
        <button className="btn btn-primary curriculum-edit" onClick={() => setBuilderOpen(true)}><Settings2 size={15} /> Editar plan</button>
        <div className="segment-control">
          {[['todas','Todas'],['completada','Completadas'],['pendiente','Por cursar']].map(([id,label]) => <button key={id} className={filter === id ? 'active' : ''} onClick={() => setFilter(id)}>{label}</button>)}
        </div>
      </div>

      {mode === 'materias' ? <div className="curriculum-years">
        {groups.map(group => (
          <section className="curriculum-year" key={group.anio}>
            <div className="year-marker"><span>{group.anio}</span><small>Año {group.anio}</small></div>
            <div className="year-terms">
              {group.terms.map(term => term.materias.length > 0 && (
                <div className="term-block" key={term.cuatrimestre}>
                  <h3>{periodName} {term.cuatrimestre}</h3>
                  <div className="curriculum-list">
                    {term.materias.map(materia => {
                      const ItemIcon = STATUS[materia.estado].icon;
                      return <div className={`curriculum-item ${materia.estado}`} key={materia.id}>
                        <span className="curriculum-status-icon"><ItemIcon size={15} /></span>
                        <div className="curriculum-name"><strong>{materia.nombre}</strong><small>{materia.duracion}</small></div>
                        <label className="curriculum-select">
                          <select value={materia.estado} disabled={updating === materia.id} onChange={e => updateStatus(materia.id, e.target.value)}>
                            <option value="completada">Completada</option>
                            <option value="en_curso">En curso</option>
                            <option value="pendiente">Por cursar</option>
                          </select>
                          <ChevronDown size={13} />
                        </label>
                      </div>;
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div> : <div className="class-progress-groups">{materias.map(subject => { const items = clases.filter(item => item.materiaId === subject.id && (filter === 'todas' || (filter === 'completada' ? item.estado === 'completada' : item.estado !== 'completada'))); return items.length ? <section key={subject.id}><h3>{subject.nombre}</h3><div className="curriculum-list">{items.map(item => <div className={`curriculum-item ${item.estado === 'completada' ? 'completada' : 'pendiente'}`} key={item.id}><span className="curriculum-status-icon">{item.estado === 'completada' ? <Check size={15} /> : <Circle size={15} />}</span><div className="curriculum-name"><strong>{item.titulo}</strong><small>Clase {item.numero} · {item.fecha || 'Sin fecha'}</small></div><label className="curriculum-select"><select value={item.estado === 'completada' ? 'completada' : 'pendiente'} disabled={updating === item.id} onChange={e => updateClassStatus(item.id, e.target.value)}><option value="completada">Completada</option><option value="pendiente">Pendiente</option></select><ChevronDown size={13} /></label></div>)}</div></section> : null; })}</div>}

      {mode === 'materias' && plan.mostrarCursosBonificados && plan.cursosBonificados?.length > 0 && <section className="bonus-courses">
        <div className="bonus-heading"><div className="bonus-icon"><Gift size={20} /></div><div><span className="eyebrow">Formación adicional</span><h2>Cursos bonificados</h2></div></div>
        <div className="bonus-grid">{plan.cursosBonificados.map(course => <div key={course}><GraduationCap size={17} /><span>{course}</span></div>)}</div>
      </section>}
      <PlanBuilderModal isOpen={builderOpen} onClose={() => setBuilderOpen(false)} plan={plan} onChanged={loadPlan} onOpenMateria={(materiaId) => onOpenMateriaModal?.(materiaId, loadPlan)} addToast={addToast} />
    </div>
  );
}
