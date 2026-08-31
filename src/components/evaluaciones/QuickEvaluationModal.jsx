import React, { useEffect, useState } from 'react';
import Modal from '../common/Modal.jsx';
import { api } from '../../services/api.js';

export default function QuickEvaluationModal({ isOpen, onClose, materias, onSaved, addToast, evaluation }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ materiaId: '', titulo: '', tipo: 'parcial', fecha: '', prioridad: 'media', estado: 'pendiente', nota: '' });

  useEffect(() => {
    if (!isOpen) return;
    setForm(evaluation ? {
      materiaId: evaluation.materiaId || materias[0]?.id || '', titulo: evaluation.titulo || '', tipo: evaluation.tipo || 'parcial',
      fecha: evaluation.fecha || '', prioridad: evaluation.prioridad || 'media', estado: evaluation.estado || 'pendiente', nota: evaluation.nota ?? ''
    } : { materiaId: materias[0]?.id || '', titulo: '', tipo: 'parcial', fecha: new Date().toISOString().slice(0, 10), prioridad: 'media', estado: 'pendiente', nota: '' });
  }, [isOpen, materias, evaluation]);

  const submit = async event => {
    event.preventDefault();
    try {
      setSaving(true);
      if (evaluation) await api.updateEvaluacion(evaluation.id, form);
      else await api.createEvaluacion(form);
      addToast(evaluation ? 'Evaluación actualizada.' : 'Evaluación agregada al calendario.', 'success');
      await onSaved?.(); onClose();
    } catch (err) { addToast(err.message || 'No se pudo registrar la evaluación.', 'error'); }
    finally { setSaving(false); }
  };

  return <Modal isOpen={isOpen} onClose={onClose} title={evaluation ? 'Editar evaluación' : 'Nueva evaluación'}>
    <form onSubmit={submit}>
      <div className="form-group"><label className="form-label">Materia *</label><select className="form-control" value={form.materiaId} onChange={e => setForm({ ...form, materiaId: e.target.value })} required>{materias.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}</select></div>
      <div className="form-group"><label className="form-label">Nombre *</label><input className="form-control" value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} placeholder="Ej: Primer parcial" autoFocus required /></div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div className="form-group"><label className="form-label">Tipo</label><select className="form-control" value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}><option value="parcial">Parcial</option><option value="final">Final</option><option value="tp">Trabajo práctico</option><option value="entrega">Entrega</option><option value="recuperatorio">Recuperatorio</option></select></div>
        <div className="form-group"><label className="form-label">Fecha *</label><input type="date" className="form-control" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} required /></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}><div className="form-group"><label className="form-label">Estado</label><select className="form-control" value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })}><option value="pendiente">Pendiente</option><option value="rendido">Rendido</option><option value="aprobado">Aprobado</option></select></div><div className="form-group"><label className="form-label">Nota</label><input type="number" min="1" max="10" step="0.1" className="form-control" value={form.nota} onChange={e => setForm({ ...form, nota: e.target.value })} placeholder="Opcional" /></div></div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '.7rem', marginTop: '1.2rem' }}><button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button><button className="btn btn-primary" disabled={saving || !materias.length}>{saving ? 'Guardando…' : evaluation ? 'Guardar cambios' : 'Agregar evaluación'}</button></div>
    </form>
  </Modal>;
}
