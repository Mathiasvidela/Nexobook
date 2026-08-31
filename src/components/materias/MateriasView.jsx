import React, { useState, useEffect } from 'react';
import { usePeriod } from '../../context/PeriodContext.jsx';
import { api } from '../../services/api.js';
import SubjectCard from './SubjectCard.jsx';
import LoadingSpinner from '../common/LoadingSpinner.jsx';
import EmptyState from '../common/EmptyState.jsx';
import ConfirmModal from '../common/ConfirmModal.jsx';
import { Plus, Edit2, Trash2 } from 'lucide-react';

export default function MateriasView({ onSelectMateria, onAddMateria, onEditMateria, addToast }) {
  const { periodoSeleccionado } = usePeriod();
  const [materias, setMaterias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingMateria, setDeletingMateria] = useState(null);

  const cargarMaterias = async () => {
    if (!periodoSeleccionado) return;
    try {
      setLoading(true);
      const res = await api.getMaterias({ periodoId: periodoSeleccionado.id });
      setMaterias(res || []);
    } catch (err) {
      addToast(err.message || 'Error al cargar materias.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarMaterias();
  }, [periodoSeleccionado]);

  const handleDelete = async () => {
    if (!deletingMateria) return;
    try {
      await api.deleteMateria(deletingMateria.id);
      addToast(`Materia "${deletingMateria.nombre}" eliminada correctamente.`, 'success');
      cargarMaterias();
    } catch (err) {
      addToast(err.message || 'Error al eliminar materia.', 'error');
    } finally {
      setDeletingMateria(null);
    }
  };

  if (loading) return <LoadingSpinner message="Cargando materias..." />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Materias Académicas</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Período seleccionado: {periodoSeleccionado ? periodoSeleccionado.nombre : ''}
          </p>
        </div>

        <button className="btn btn-primary" onClick={onAddMateria}>
          <Plus size={16} /> <span>Agregar Materia</span>
        </button>
      </div>

      {materias.length === 0 ? (
        <EmptyState
          title="No hay materias asociadas a este período"
          description="Crea una materia para organizar tus clases, PDFs y evaluaciones."
          actionButton={
            <button className="btn btn-primary" onClick={onAddMateria}>
              <Plus size={16} /> <span>Agregar Materia</span>
            </button>
          }
        />
      ) : (
        <div className="dashboard-grid">
          {materias.map((mat) => (
            <div key={mat.id} className="subject-card-wrap">
              <SubjectCard materia={mat} onClick={() => onSelectMateria(mat.id)} />
              <div
                style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  display: 'flex',
                  gap: '0.25rem',
                  zIndex: 10
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  className="btn btn-secondary btn-icon"
                  style={{ padding: '0.35rem' }}
                  onClick={() => onEditMateria(mat)}
                  title="Editar materia"
                >
                  <Edit2 size={14} />
                </button>
                <button
                  className="btn btn-secondary btn-icon"
                  style={{ padding: '0.35rem' }}
                  onClick={() => setDeletingMateria(mat)}
                  title="Eliminar materia"
                >
                  <Trash2 size={14} color="var(--danger-color)" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirmation modal */}
      <ConfirmModal
        isOpen={!!deletingMateria}
        onClose={() => setDeletingMateria(null)}
        onConfirm={handleDelete}
        title="Eliminar Materia"
        message={`¿Estás seguro de que deseas eliminar la materia "${deletingMateria?.nombre}"? Se perderán las asociaciones con clases y evaluaciones.`}
      />
    </div>
  );
}
