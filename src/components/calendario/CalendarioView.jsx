import React, { useEffect, useMemo, useState } from 'react';
import { usePeriod } from '../../context/PeriodContext.jsx';
import { api } from '../../services/api.js';
import LoadingSpinner from '../common/LoadingSpinner.jsx';
import ConfirmModal from '../common/ConfirmModal.jsx';
import { CalendarDays, CheckCircle2, Clock3, Edit3, MapPin, Plus, Trash2, X, GraduationCap } from 'lucide-react';

const DAYS = [
  ['lunes', 'Lunes'], ['martes', 'Martes'], ['miercoles', 'Miércoles'],
  ['jueves', 'Jueves'], ['viernes', 'Viernes'], ['sabado', 'Sábado'], ['domingo', 'Domingo']
];
const EMPTY_FORM = { materiaId: '', dia: 'lunes', desde: '18:00', hasta: '22:00', lugar: '' };

function prettyDate(value) {
  if (!value) return { day: '—', month: '', full: 'Sin fecha' };
  const date = new Date(`${value}T12:00:00`);
  return {
    day: date.toLocaleDateString('es-AR', { day: '2-digit' }),
    month: date.toLocaleDateString('es-AR', { month: 'short' }).replace('.', ''),
    full: date.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
  };
}

export default function CalendarioView({ addToast, onAddEvaluation, onEvaluationChanged, refreshKey }) {
  const { periodoSeleccionado } = usePeriod();
  const [materias, setMaterias] = useState([]);
  const [evaluaciones, setEvaluaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingEvaluation, setDeletingEvaluation] = useState(null);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [mats, evals] = await Promise.all([
        api.getMaterias(periodoSeleccionado ? { periodoId: periodoSeleccionado.id } : {}),
        api.getEvaluaciones()
      ]);
      setMaterias(mats || []);
      const ids = new Set((mats || []).map(m => m.id));
      setEvaluaciones((evals || []).filter(e => ids.has(e.materiaId)));
      setForm(current => ({ ...current, materiaId: current.materiaId || mats?.[0]?.id || '' }));
    } catch (err) { addToast?.(err.message || 'No se pudo cargar el calendario.', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { cargarDatos(); }, [periodoSeleccionado, refreshKey]);

  const horarios = useMemo(() => materias.flatMap(materia => (materia.horarios || []).map((horario, index) => ({ ...horario, index, materia }))), [materias]);
  const parciales = useMemo(() => [...evaluaciones].sort((a, b) => new Date(a.fecha) - new Date(b.fecha)), [evaluaciones]);

  const guardarHorario = async event => {
    event.preventDefault();
    const materia = materias.find(m => m.id === form.materiaId);
    if (!materia) return;
    try {
      setSaving(true);
      const next = [...(materia.horarios || []), { dia: form.dia, desde: form.desde, hasta: form.hasta, lugar: form.lugar.trim() }];
      const updated = await api.updateMateria(materia.id, { horarios: next });
      setMaterias(prev => prev.map(m => m.id === materia.id ? { ...m, ...updated } : m));
      setEditing(false); setForm(current => ({ ...EMPTY_FORM, materiaId: current.materiaId }));
      addToast?.('Horario agregado.', 'success');
    } catch (err) { addToast?.(err.message || 'No se pudo guardar el horario.', 'error'); }
    finally { setSaving(false); }
  };

  const eliminarHorario = async ({ materia, index }) => {
    try {
      const next = (materia.horarios || []).filter((_, itemIndex) => itemIndex !== index);
      const updated = await api.updateMateria(materia.id, { horarios: next });
      setMaterias(prev => prev.map(m => m.id === materia.id ? { ...m, ...updated } : m));
      addToast?.('Horario eliminado.', 'success');
    } catch (err) { addToast?.(err.message || 'No se pudo eliminar el horario.', 'error'); }
  };

  const marcarComoRendida = async exam => {
    try {
      const updated = await api.updateEvaluacion(exam.id, { estado: 'rendido' });
      setEvaluaciones(current => current.map(item => item.id === exam.id ? { ...item, ...updated } : item));
      addToast?.('Evaluación marcada como rendida.', 'success');
      onEvaluationChanged?.();
    } catch (err) { addToast?.(err.message || 'No se pudo actualizar la evaluación.', 'error'); }
  };

  const eliminarEvaluacion = async () => {
    if (!deletingEvaluation) return;
    try {
      await api.deleteEvaluacion(deletingEvaluation.id);
      setEvaluaciones(current => current.filter(item => item.id !== deletingEvaluation.id));
      addToast?.('Evaluación eliminada.', 'success');
      onEvaluationChanged?.();
    } catch (err) { addToast?.(err.message || 'No se pudo eliminar la evaluación.', 'error'); }
    finally { setDeletingEvaluation(null); }
  };

  const estadoLabel = estado => ({ pendiente: 'Pendiente', rendido: 'Rendida', aprobado: 'Aprobada', completada: 'Completada' }[estado] || estado || 'Pendiente');

  if (loading) return <LoadingSpinner message="Cargando calendario..." />;

  return (
    <div className="simple-calendar">
      <header className="simple-calendar-head">
        <div><span className="eyebrow">Tu semana</span><h1>Calendario</h1><p>Una vista simple de tus cursadas y próximas fechas importantes.</p></div>
      </header>

      {editing && <form className="schedule-form" onSubmit={guardarHorario}>
        <div className="schedule-form-title"><div><strong>Nuevo horario</strong><span>Agregalo a tu semana</span></div><button type="button" onClick={() => setEditing(false)}><X size={17} /></button></div>
        <label><span>Materia</span><select value={form.materiaId} onChange={e => setForm({ ...form, materiaId: e.target.value })}>{materias.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}</select></label>
        <label><span>Día</span><select value={form.dia} onChange={e => setForm({ ...form, dia: e.target.value })}>{DAYS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label><span>Desde</span><input type="time" value={form.desde} onChange={e => setForm({ ...form, desde: e.target.value })} required /></label>
        <label><span>Hasta</span><input type="time" value={form.hasta} onChange={e => setForm({ ...form, hasta: e.target.value })} required /></label>
        <label><span>Aula o enlace <small>(opcional)</small></span><input value={form.lugar} onChange={e => setForm({ ...form, lugar: e.target.value })} placeholder="Aula 3 o Meet" /></label>
        <button className="btn btn-primary" disabled={saving || !form.materiaId}>{saving ? 'Guardando…' : 'Guardar'}</button>
      </form>}

      <section className="week-section">
        <div className="section-heading calendar-section-heading"><div className="calendar-heading-copy"><div className="section-heading-icon"><CalendarDays size={19} /></div><div><h2>Semana de cursada</h2><p>Tus horarios habituales, de lunes a domingo.</p></div></div><button className="btn btn-primary" onClick={() => setEditing(true)}><Plus size={16} /> Agregar horario</button></div>
        <div className="week-grid">
          {DAYS.map(([value, label]) => {
            const dayItems = horarios.filter(h => h.dia === value).sort((a, b) => a.desde.localeCompare(b.desde));
            return <article className={`week-day ${dayItems.length ? 'has-classes' : ''}`} key={value}>
              <h3>{label}</h3>
              <div className="day-content">{dayItems.length ? dayItems.map(item => <div className="schedule-card" key={`${item.materia.id}-${item.index}`} style={{ '--subject-color': item.materia.color }}>
                <div className="schedule-card-top"><span>{item.desde} – {item.hasta}</span><button onClick={() => eliminarHorario(item)} title="Quitar horario"><Trash2 size={13} /></button></div>
                <strong>{item.materia.nombre}</strong>
                {item.lugar && <small><MapPin size={12} /> {item.lugar}</small>}
              </div>) : <span className="free-day">Sin cursada</span>}</div>
            </article>;
          })}
        </div>
      </section>

      <section className="exams-section">
        <div className="section-heading evaluation-heading"><div className="calendar-heading-copy"><div className="section-heading-icon warm"><GraduationCap size={19} /></div><div><h2>Evaluaciones</h2><p>Parciales, finales, entregas y trabajos prácticos.</p></div></div><button className="btn btn-primary" onClick={() => onAddEvaluation?.(null)}><Plus size={15} /> Nueva evaluación</button></div>
        {parciales.length ? <div className="exam-list">{parciales.map(exam => {
          const materia = materias.find(m => m.id === exam.materiaId);
          const date = prettyDate(exam.fecha);
          return <article className="exam-row" key={exam.id}>
            <div className="exam-date"><strong>{date.day}</strong><span>{date.month}</span></div>
            <i style={{ background: materia?.color || 'var(--accent-primary)' }} />
            <div className="exam-copy"><strong>{exam.titulo}</strong><span><b>{exam.tipo}</b> · {materia?.nombre || 'Materia'} · {date.full}</span></div>
            <span className={`exam-status ${exam.estado || 'pendiente'}`}>{estadoLabel(exam.estado)}</span>
            <div className="exam-actions">
              <button type="button" onClick={() => onAddEvaluation?.(exam)} title="Editar evaluación" aria-label={`Editar ${exam.titulo}`}><Edit3 size={15} /></button>
              {!['rendido', 'aprobado', 'completada'].includes(exam.estado) && <button type="button" className="complete" onClick={() => marcarComoRendida(exam)} title="Marcar como rendida" aria-label={`Marcar ${exam.titulo} como rendida`}><CheckCircle2 size={15} /></button>}
              <button type="button" className="danger" onClick={() => setDeletingEvaluation(exam)} title="Eliminar evaluación" aria-label={`Eliminar ${exam.titulo}`}><Trash2 size={15} /></button>
            </div>
          </article>;
        })}</div> : <div className="calendar-empty"><Clock3 size={20} /><span>Todavía no hay evaluaciones con fecha establecida.</span><button className="btn btn-primary" onClick={() => onAddEvaluation?.(null)}><Plus size={15} /> Agregar evaluación</button></div>}
      </section>

      <ConfirmModal
        isOpen={Boolean(deletingEvaluation)}
        onClose={() => setDeletingEvaluation(null)}
        onConfirm={eliminarEvaluacion}
        title="Eliminar evaluación"
        message={`¿Querés eliminar “${deletingEvaluation?.titulo || 'esta evaluación'}”? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
      />
    </div>
  );
}
