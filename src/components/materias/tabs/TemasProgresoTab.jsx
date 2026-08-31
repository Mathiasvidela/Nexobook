import React, { useState } from 'react';
import { api } from '../../../services/api.js';
import Modal from '../../common/Modal.jsx';
import EmptyState from '../../common/EmptyState.jsx';
import ConfirmModal from '../../common/ConfirmModal.jsx';
import { Plus, CheckCircle, Clock, RotateCcw, AlertCircle, Trash2 } from 'lucide-react';

export default function TemasProgresoTab({ materiaId, progreso = { temas: [] }, onRefresh, addToast }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nuevoTemaTitulo, setNuevoTemaTitulo] = useState('');
  const [nuevoTemaEstado, setNuevoTemaEstado] = useState('pendiente');
  const [deletingTema, setDeletingTema] = useState(null);

  const temas = progreso.temas || [];
  const aprendidos = temas.filter(t => t.estado === 'aprendido').length;
  const estudiando = temas.filter(t => t.estado === 'estudiando').length;
  const repasar = temas.filter(t => t.estado === 'repasar').length;
  const pendientes = temas.filter(t => t.estado === 'pendiente').length;

  const pct = temas.length > 0 ? Math.round((aprendidos / temas.length) * 100) : 0;

  const handleAddTema = async (e) => {
    e.preventDefault();
    if (!nuevoTemaTitulo.trim()) return;
    try {
      await api.addTema({ materiaId, titulo: nuevoTemaTitulo, estado: nuevoTemaEstado });
      addToast('Tema agregado al plan de estudio.', 'success');
      setNuevoTemaTitulo('');
      setIsModalOpen(false);
      onRefresh();
    } catch (err) {
      addToast(err.message || 'Error al agregar tema.', 'error');
    }
  };

  const handleUpdateEstado = async (temaId, nuevoEstado) => {
    try {
      await api.updateTema(temaId, { materiaId, estado: nuevoEstado });
      onRefresh();
    } catch (err) {
      addToast(err.message || 'Error al actualizar tema.', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deletingTema) return;
    try {
      await api.deleteTema(deletingTema.id, materiaId);
      addToast('Tema eliminado.', 'success');
      onRefresh();
    } catch (err) {
      addToast(err.message || 'Error al eliminar.', 'error');
    } finally {
      setDeletingTema(null);
    }
  };

  const getStatusBadge = (estado) => {
    switch (estado) {
      case 'aprendido':
        return <span className="badge badge-success"><CheckCircle size={12} style={{ marginRight: 4 }} /> Aprendido</span>;
      case 'estudiando':
        return <span className="badge badge-info"><Clock size={12} style={{ marginRight: 4 }} /> Estudiando</span>;
      case 'repasar':
        return <span className="badge badge-warning"><RotateCcw size={12} style={{ marginRight: 4 }} /> Repasar</span>;
      default:
        return <span className="badge" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>Pendiente</span>;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Progress metrics card */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Progreso General del Temario</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
              {aprendidos} de {temas.length} temas aprendidos ({pct}%)
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={16} /> <span>Agregar Tema</span>
          </button>
        </div>

        <div className="progress-bar-container" style={{ height: '12px' }}>
          <div className="progress-bar-fill" style={{ width: `${pct}%`, background: 'var(--success-color)' }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginTop: '0.5rem' }}>
          <div style={{ padding: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--border-radius-sm)', textAlign: 'center' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Aprendidos</span>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--success-color)' }}>{aprendidos}</div>
          </div>
          <div style={{ padding: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--border-radius-sm)', textAlign: 'center' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Estudiando</span>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-primary)' }}>{estudiando}</div>
          </div>
          <div style={{ padding: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--border-radius-sm)', textAlign: 'center' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Repasar</span>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--warning-color)' }}>{repasar}</div>
          </div>
          <div style={{ padding: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--border-radius-sm)', textAlign: 'center' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Pendientes</span>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-muted)' }}>{pendientes}</div>
          </div>
        </div>
      </div>

      {/* Topics list */}
      {temas.length === 0 ? (
        <EmptyState
          title="No se han registrado temas"
          description="Agrega las unidades o temas del programa académico."
          actionButton={
            <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
              <Plus size={16} /> <span>Agregar Tema</span>
            </button>
          }
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {temas.map((t) => (
            <div key={t.id} className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.2rem' }}>{t.titulo}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  {getStatusBadge(t.estado)}
                  {t.ultimaFechaEstudio && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Último estudio: {t.ultimaFechaEstudio}
                    </span>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <select
                  className="form-control"
                  style={{ width: '130px', padding: '0.35rem 0.6rem', fontSize: '0.82rem' }}
                  value={t.estado}
                  onChange={(e) => handleUpdateEstado(t.id, e.target.value)}
                >
                  <option value="pendiente">Pendiente</option>
                  <option value="estudiando">Estudiando</option>
                  <option value="repasar">Repasar</option>
                  <option value="aprendido">Aprendido</option>
                </select>

                <button className="btn btn-secondary btn-icon" onClick={() => setDeletingTema(t)} title="Eliminar tema">
                  <Trash2 size={15} color="var(--danger-color)" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Topic Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Agregar Tema de Estudio">
        <form onSubmit={handleAddTema}>
          <div className="form-group">
            <label className="form-label">Título del Tema *</label>
            <input
              type="text"
              className="form-control"
              placeholder="Ej: Middlewares avanzados y manejo de errores"
              value={nuevoTemaTitulo}
              onChange={(e) => setNuevoTemaTitulo(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Estado Inicial</label>
            <select className="form-control" value={nuevoTemaEstado} onChange={(e) => setNuevoTemaEstado(e.target.value)}>
              <option value="pendiente">Pendiente</option>
              <option value="estudiando">Estudiando</option>
              <option value="repasar">Repasar</option>
              <option value="aprendido">Aprendido</option>
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.2rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
            <button type="submit" className="btn btn-primary">Agregar Tema</button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={!!deletingTema}
        onClose={() => setDeletingTema(null)}
        onConfirm={handleDelete}
        title="Eliminar Tema"
        message={`¿Estás seguro de que deseas eliminar el tema "${deletingTema?.titulo}"?`}
      />
    </div>
  );
}
