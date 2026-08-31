import React, { useEffect, useMemo, useState } from 'react';
import { Award, CalendarDays, CheckCircle2, Clock3, Edit3, Filter, GraduationCap, Plus, Trash2, TrendingUp } from 'lucide-react';
import { usePeriod } from '../../context/PeriodContext.jsx';
import { api } from '../../services/api.js';
import LoadingSpinner from '../common/LoadingSpinner.jsx';
import EmptyState from '../common/EmptyState.jsx';
import ConfirmModal from '../common/ConfirmModal.jsx';

const STATUS_LABELS = { todos: 'Todos los estados', pendiente: 'Pendientes', rendido: 'Rendidas', aprobado: 'Aprobadas' };
const TYPE_LABELS = { parcial: 'Parcial', final: 'Final', tp: 'Trabajo práctico', entrega: 'Entrega', recuperatorio: 'Recuperatorio' };
const isPast = date => date && new Date(`${date}T23:59:59`) < new Date();
const formatDate = date => date ? new Date(`${date}T12:00:00`).toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' }) : 'Sin fecha';

export default function EvaluacionesView({ addToast, onOpenEvaluation, onChanged, refreshKey }) {
  const { periodoSeleccionado } = usePeriod();
  const [materias, setMaterias] = useState([]);
  const [evaluaciones, setEvaluaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('todos');
  const [materiaId, setMateriaId] = useState('todas');
  const [tipo, setTipo] = useState('todos');
  const [deleting, setDeleting] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      const [subjects, exams] = await Promise.all([api.getMaterias(periodoSeleccionado ? { periodoId: periodoSeleccionado.id } : {}), api.getEvaluaciones()]);
      const ids = new Set((subjects || []).map(item => item.id));
      setMaterias(subjects || []); setEvaluaciones((exams || []).filter(item => ids.has(item.materiaId)));
    } catch (err) { addToast?.(err.message || 'No se pudieron cargar las evaluaciones.', 'error'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [periodoSeleccionado, refreshKey]);

  const filtered = useMemo(() => evaluaciones.filter(exam => {
    if (status !== 'todos' && exam.estado !== status) return false;
    if (materiaId !== 'todas' && exam.materiaId !== materiaId) return false;
    return tipo === 'todos' || exam.tipo === tipo;
  }).sort((a, b) => new Date(a.fecha || '2999-12-31') - new Date(b.fecha || '2999-12-31')), [evaluaciones, status, materiaId, tipo]);

  const stats = useMemo(() => {
    const pending = evaluaciones.filter(item => item.estado === 'pendiente');
    const notes = evaluaciones.map(item => Number(item.nota)).filter(note => Number.isFinite(note) && note > 0);
    const now = new Date();
    const thisMonth = evaluaciones.filter(item => {
      if (!item.fecha) return false;
      const date = new Date(`${item.fecha}T12:00:00`);
      return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
    });
    return {
      pending: pending.length,
      thisMonth: thisMonth.length,
      completed: evaluaciones.filter(item => ['rendido', 'aprobado', 'completada'].includes(item.estado)).length,
      average: notes.length ? (notes.reduce((sum, note) => sum + note, 0) / notes.length).toFixed(1) : '—'
    };
  }, [evaluaciones]);

  const updateStatus = async exam => {
    try {
      const updated = await api.updateEvaluacion(exam.id, { estado: 'rendido' });
      setEvaluaciones(current => current.map(item => item.id === exam.id ? { ...item, ...updated } : item));
      addToast?.('Evaluación marcada como rendida.', 'success'); onChanged?.();
    } catch (err) { addToast?.(err.message || 'No se pudo actualizar.', 'error'); }
  };
  const remove = async () => {
    if (!deleting) return;
    try {
      await api.deleteEvaluacion(deleting.id);
      setEvaluaciones(current => current.filter(item => item.id !== deleting.id));
      addToast?.('Evaluación eliminada.', 'success'); onChanged?.();
    } catch (err) { addToast?.(err.message || 'No se pudo eliminar.', 'error'); }
    finally { setDeleting(null); }
  };

  if (loading) return <LoadingSpinner message="Preparando tus evaluaciones…" />;
  return <div className="evaluations-page">
    <header className="evaluations-head"><div><span className="eyebrow">Vista global</span><h1>Evaluaciones</h1><p>Fechas, resultados y pendientes de todas tus materias.</p></div><button className="btn btn-primary" onClick={() => onOpenEvaluation?.(null)}><Plus size={16} /> Nueva evaluación</button></header>
    <section className="evaluation-stats">
      <article><span className="eval-stat-icon blue"><Clock3 size={18} /></span><div><small>Pendientes</small><strong>{stats.pending}</strong></div></article>
      <article><span className="eval-stat-icon red"><CalendarDays size={18} /></span><div><small>Este mes</small><strong>{stats.thisMonth}</strong></div></article>
      <article><span className="eval-stat-icon green"><CheckCircle2 size={18} /></span><div><small>Rendidas</small><strong>{stats.completed}</strong></div></article>
      <article><span className="eval-stat-icon purple"><TrendingUp size={18} /></span><div><small>Promedio</small><strong>{stats.average}</strong></div></article>
    </section>
    <section className="evaluation-filterbar"><div><Filter size={15} /><span>Filtrar</span></div><select value={status} onChange={event => setStatus(event.target.value)}>{Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><select value={materiaId} onChange={event => setMateriaId(event.target.value)}><option value="todas">Todas las materias</option>{materias.map(item => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select><select value={tipo} onChange={event => setTipo(event.target.value)}><option value="todos">Todos los tipos</option>{Object.entries(TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></section>
    {!filtered.length ? <EmptyState icon={GraduationCap} title="No hay evaluaciones para mostrar" description="Cambiá los filtros o agregá una nueva evaluación." actionButton={<button className="btn btn-primary" onClick={() => onOpenEvaluation?.(null)}><Plus size={15} /> Nueva evaluación</button>} /> : <section className="evaluation-timeline">{filtered.map(exam => {
      const subject = materias.find(item => item.id === exam.materiaId);
      const overdue = exam.estado === 'pendiente' && isPast(exam.fecha);
      return <article className={`evaluation-row ${overdue ? 'overdue' : ''}`} key={exam.id}>
        <div className="evaluation-date"><span>{formatDate(exam.fecha)}</span><small>{overdue ? 'Atrasada' : exam.estado === 'pendiente' ? 'Próxima' : 'Registrada'}</small></div>
        <i style={{ background: subject?.color || 'var(--accent-primary)' }} />
        <div className="evaluation-main"><div><span className="evaluation-type">{TYPE_LABELS[exam.tipo] || exam.tipo}</span><h2>{exam.titulo}</h2></div><p>{subject?.nombre || 'Materia sin identificar'}</p></div>
        <div className="evaluation-result">{exam.nota !== '' && exam.nota != null ? <><small>Nota</small><strong>{exam.nota}</strong></> : <span className={`exam-status ${exam.estado || 'pendiente'}`}>{overdue ? 'Atrasada' : STATUS_LABELS[exam.estado]?.replace(/s$/, '') || exam.estado}</span>}</div>
        <div className="evaluation-actions"><button onClick={() => onOpenEvaluation?.(exam)} title="Editar"><Edit3 size={16} /></button>{exam.estado === 'pendiente' && <button className="complete" onClick={() => updateStatus(exam)} title="Marcar como rendida"><CheckCircle2 size={16} /></button>}<button className="danger" onClick={() => setDeleting(exam)} title="Eliminar"><Trash2 size={16} /></button></div>
      </article>;
    })}</section>}
    <ConfirmModal isOpen={Boolean(deleting)} onClose={() => setDeleting(null)} onConfirm={remove} title="Eliminar evaluación" message={`¿Querés eliminar “${deleting?.titulo || 'esta evaluación'}”? Esta acción no se puede deshacer.`} />
  </div>;
}
