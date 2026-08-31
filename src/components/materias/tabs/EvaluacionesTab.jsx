import React, { useState } from 'react';
import { api } from '../../../services/api.js';
import Modal from '../../common/Modal.jsx';
import EmptyState from '../../common/EmptyState.jsx';
import ConfirmModal from '../../common/ConfirmModal.jsx';
import { Plus, Calendar, Edit2, Trash2, CheckCircle, Clock } from 'lucide-react';

export default function EvaluacionesTab({ materiaId, evaluaciones = [], onRefresh, addToast }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEval, setEditingEval] = useState(null);
  const [deletingEval, setDeletingEval] = useState(null);

  const [formData, setFormData] = useState({
    titulo: '',
    tipo: 'parcial',
    fecha: '',
    prioridad: 'media',
    estado: 'pendiente',
    temasIncluidos: '',
    nota: '',
    observaciones: ''
  });

  const handleOpenModal = (ev = null) => {
    if (ev) {
      setEditingEval(ev);
      setFormData({
        titulo: ev.titulo,
        tipo: ev.tipo || 'parcial',
        fecha: ev.fecha || '',
        prioridad: ev.prioridad || 'media',
        estado: ev.estado || 'pendiente',
        temasIncluidos: ev.temasIncluidos || '',
        nota: ev.nota !== null && ev.nota !== undefined ? ev.nota : '',
        observaciones: ev.observaciones || ''
      });
    } else {
      setEditingEval(null);
      setFormData({
        titulo: '',
        tipo: 'parcial',
        fecha: new Date().toISOString().split('T')[0],
        prioridad: 'media',
        estado: 'pendiente',
        temasIncluidos: '',
        nota: '',
        observaciones: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.titulo.trim() || !formData.fecha) {
      addToast('Título y Fecha son obligatorios.', 'error');
      return;
    }

    try {
      if (editingEval) {
        await api.updateEvaluacion(editingEval.id, formData);
        addToast('Evaluación actualizada.', 'success');
      } else {
        await api.createEvaluacion({ ...formData, materiaId });
        addToast('Evaluación registrada.', 'success');
      }
      onRefresh();
      setIsModalOpen(false);
    } catch (err) {
      addToast(err.message || 'Error al guardar.', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deletingEval) return;
    try {
      await api.deleteEvaluacion(deletingEval.id);
      addToast('Evaluación eliminada.', 'success');
      onRefresh();
    } catch (err) {
      addToast(err.message || 'Error al eliminar.', 'error');
    } finally {
      setDeletingEval(null);
    }
  };

  const getPriorityBadge = (p) => {
    switch (p) {
      case 'alta': return <span className="badge badge-danger">Prioridad Alta</span>;
      case 'media': return <span className="badge badge-warning">Prioridad Media</span>;
      default: return <span className="badge badge-info">Prioridad Baja</span>;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Evaluaciones y Entregas</h3>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          <Plus size={16} /> <span>Registrar Evaluación</span>
        </button>
      </div>

      {evaluaciones.length === 0 ? (
        <EmptyState
          title="No hay evaluaciones programadas"
          description="Registra parciales, finales, TPs y entregas de la materia."
          actionButton={
            <button className="btn btn-primary" onClick={() => handleOpenModal()}>
              <Plus size={16} /> <span>Registrar Evaluación</span>
            </button>
          }
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {evaluaciones.map((ev) => (
            <div key={ev.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
                  <span className="badge badge-info" style={{ textTransform: 'uppercase' }}>{ev.tipo}</span>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 600 }}>{ev.titulo}</h4>
                  {getPriorityBadge(ev.prioridad)}
                </div>

                <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', display: 'flex', gap: '1rem', marginTop: '0.4rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Calendar size={14} /> Fecha: {ev.fecha}
                  </span>
                  <span>Estado: {ev.estado}</span>
                  {ev.nota !== null && ev.nota !== undefined && (
                    <span style={{ fontWeight: 700, color: ev.nota >= 6 ? 'var(--success-color)' : 'var(--danger-color)' }}>
                      Nota: {ev.nota}
                    </span>
                  )}
                </div>

                {ev.temasIncluidos && (
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                    Temas incluidos: {ev.temasIncluidos}
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button className="btn btn-secondary btn-icon" onClick={() => handleOpenModal(ev)}>
                  <Edit2 size={15} />
                </button>
                <button className="btn btn-secondary btn-icon" onClick={() => setDeletingEval(ev)}>
                  <Trash2 size={15} color="var(--danger-color)" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingEval ? 'Editar Evaluación' : 'Registrar Evaluación'}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Título de la Evaluación *</label>
            <input
              type="text"
              className="form-control"
              placeholder="Ej: Primer Parcial - Unidades 1 a 3"
              value={formData.titulo}
              onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Tipo de Evaluación</label>
              <select className="form-control" value={formData.tipo} onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}>
                <option value="parcial">Parcial</option>
                <option value="final">Final</option>
                <option value="tp">Trabajo Práctico</option>
                <option value="entrega">Entrega</option>
                <option value="recuperatorio">Recuperatorio</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Fecha *</label>
              <input type="date" className="form-control" value={formData.fecha} onChange={(e) => setFormData({ ...formData, fecha: e.target.value })} required />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Prioridad</label>
              <select className="form-control" value={formData.prioridad} onChange={(e) => setFormData({ ...formData, prioridad: e.target.value })}>
                <option value="baja">Baja</option>
                <option value="media">Media</option>
                <option value="alta">Alta</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Estado</label>
              <select className="form-control" value={formData.estado} onChange={(e) => setFormData({ ...formData, estado: e.target.value })}>
                <option value="pendiente">Pendiente</option>
                <option value="rendido">Rendido</option>
                <option value="aprobado">Aprobado</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Nota Obtenida</label>
              <input type="number" step="0.1" min="1" max="10" className="form-control" placeholder="Ej: 8.5" value={formData.nota} onChange={(e) => setFormData({ ...formData, nota: e.target.value })} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Temas Incluidos</label>
            <textarea className="form-control" rows={2} placeholder="Indica los temas o capítulos del examen..." value={formData.temasIncluidos} onChange={(e) => setFormData({ ...formData, temasIncluidos: e.target.value })} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.2rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
            <button type="submit" className="btn btn-primary">Guardar Evaluación</button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={!!deletingEval}
        onClose={() => setDeletingEval(null)}
        onConfirm={handleDelete}
        title="Eliminar Evaluación"
        message={`¿Estás seguro de que deseas eliminar la evaluación "${deletingEval?.titulo}"?`}
      />
    </div>
  );
}
