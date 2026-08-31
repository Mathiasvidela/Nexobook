import React, { useState } from 'react';
import { api } from '../../../services/api.js';
import Modal from '../../common/Modal.jsx';
import EmptyState from '../../common/EmptyState.jsx';
import ConfirmModal from '../../common/ConfirmModal.jsx';
import { Plus, Edit2, Trash2, Calendar, BookOpen, FileText } from 'lucide-react';

export default function ClasesTab({ materiaId, clases = [], onRefresh, addToast }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClase, setEditingClase] = useState(null);
  const [deletingClase, setDeletingClase] = useState(null);

  const [formData, setFormData] = useState({
    numero: '',
    titulo: '',
    fecha: '',
    temasVistos: '',
    estado: 'completada',
    observaciones: ''
  });

  const handleOpenModal = (clase = null) => {
    if (clase) {
      setEditingClase(clase);
      setFormData({
        numero: clase.numero,
        titulo: clase.titulo,
        fecha: clase.fecha || '',
        temasVistos: clase.temasVistos || '',
        estado: clase.estado || 'completada',
        observaciones: clase.observaciones || ''
      });
    } else {
      setEditingClase(null);
      setFormData({
        numero: clases.length + 1,
        titulo: '',
        fecha: new Date().toISOString().split('T')[0],
        temasVistos: '',
        estado: 'completada',
        observaciones: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.titulo.trim()) {
      addToast('El título de la clase es obligatorio.', 'error');
      return;
    }

    try {
      if (editingClase) {
        await api.updateClase(editingClase.id, formData);
        addToast('Clase actualizada con éxito.', 'success');
      } else {
        await api.createClase({ ...formData, materiaId });
        addToast('Clase registrada correctamente.', 'success');
      }
      onRefresh();
      setIsModalOpen(false);
    } catch (err) {
      addToast(err.message || 'Error al guardar la clase.', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deletingClase) return;
    try {
      await api.deleteClase(deletingClase.id);
      addToast('Clase eliminada.', 'success');
      onRefresh();
    } catch (err) {
      addToast(err.message || 'Error al eliminar clase.', 'error');
    } finally {
      setDeletingClase(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Registro de Clases</h3>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          <Plus size={16} /> <span>Registrar Clase</span>
        </button>
      </div>

      {clases.length === 0 ? (
        <EmptyState
          title="No hay clases registradas"
          description="Agrega las clases dictadas para vincular temas, apuntes y PDFs."
          actionButton={
            <button className="btn btn-primary" onClick={() => handleOpenModal()}>
              <Plus size={16} /> <span>Registrar Clase</span>
            </button>
          }
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {clases.map((cls) => (
            <div key={cls.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
                  <span className="badge badge-info">Clase #{cls.numero}</span>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 600 }}>{cls.titulo}</h4>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                    <Calendar size={12} /> {cls.fecha}
                  </span>
                </div>

                {cls.temasVistos && (
                  <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>
                    <strong>Temas vistos:</strong> {cls.temasVistos}
                  </p>
                )}

                {cls.observaciones && (
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.3rem', italic: true }}>
                    Observaciones: {cls.observaciones}
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button className="btn btn-secondary btn-icon" onClick={() => handleOpenModal(cls)}>
                  <Edit2 size={15} />
                </button>
                <button className="btn btn-secondary btn-icon" onClick={() => setDeletingClase(cls)}>
                  <Trash2 size={15} color="var(--danger-color)" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal for adding/editing class */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingClase ? 'Editar Clase' : 'Registrar Nueva Clase'}
      >
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Número de Clase</label>
              <input
                type="number"
                className="form-control"
                value={formData.numero}
                onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Título de la Clase *</label>
              <input
                type="text"
                className="form-control"
                placeholder="Ej: Servidores Express y Middlewares"
                value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Fecha</label>
              <input
                type="date"
                className="form-control"
                value={formData.fecha}
                onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Estado</label>
              <select
                className="form-control"
                value={formData.estado}
                onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
              >
                <option value="completada">Completada</option>
                <option value="pendiente">Pendiente</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Temas Vistos</label>
            <textarea
              className="form-control"
              rows={3}
              placeholder="Resume los temas dados en la clase..."
              value={formData.temasVistos}
              onChange={(e) => setFormData({ ...formData, temasVistos: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Observaciones</label>
            <input
              type="text"
              className="form-control"
              placeholder="Notas adicionales o dudas a repasar..."
              value={formData.observaciones}
              onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              Guardar Clase
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={!!deletingClase}
        onClose={() => setDeletingClase(null)}
        onConfirm={handleDelete}
        title="Eliminar Clase"
        message={`¿Estás seguro de que deseas eliminar la Clase #${deletingClase?.numero}: "${deletingClase?.titulo}"?`}
      />
    </div>
  );
}
