import React, { useState } from 'react';
import { api } from '../../../services/api.js';
import EmptyState from '../../common/EmptyState.jsx';
import ConfirmModal from '../../common/ConfirmModal.jsx';
import { Plus, Edit2, Download, Trash2, FileText } from 'lucide-react';

export default function ApuntesTab({ materiaId, archivos = [], onOpenEditor, onRefresh, addToast }) {
  const apuntes = archivos.filter(a => a.subtipo === 'apuntes');
  const [deletingDoc, setDeletingDoc] = useState(null);

  const handleDelete = async () => {
    if (!deletingDoc) return;
    try {
      await api.deleteResumen(deletingDoc.id);
      addToast('Apunte eliminado.', 'success');
      onRefresh();
    } catch (err) {
      addToast(err.message || 'Error al eliminar.', 'error');
    } finally {
      setDeletingDoc(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Apuntes Rápidos de Clase</h3>
        <button className="btn btn-primary" onClick={() => onOpenEditor('apunte', null, materiaId)}>
          <Plus size={16} /> <span>Crear Apunte</span>
        </button>
      </div>

      {apuntes.length === 0 ? (
        <EmptyState
          title="No hay apuntes registrados"
          description="Toma apuntes rápidos de las clases en formato Markdown."
          actionButton={
            <button className="btn btn-primary" onClick={() => onOpenEditor('apunte', null, materiaId)}>
              <Plus size={16} /> <span>Crear Apunte</span>
            </button>
          }
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
          {apuntes.map((doc) => (
            <div key={doc.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.6rem' }}>
                  <FileText size={22} color="var(--warning-color)" />
                  <h4 style={{ fontWeight: 600, fontSize: '1rem' }}>{doc.titulo}</h4>
                </div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Modificado: {new Date(doc.fechaModificacion || doc.fechaCarga).toLocaleDateString('es-ES')}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.2rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
                <button className="btn btn-secondary" style={{ flex: 1, fontSize: '0.82rem' }} onClick={() => onOpenEditor('apunte', doc, materiaId)}>
                  <Edit2 size={14} /> <span>Editar</span>
                </button>
                <a href={api.getResumenExportUrl(doc.id)} className="btn btn-secondary btn-icon" download title="Exportar .md">
                  <Download size={14} />
                </a>
                <button className="btn btn-secondary btn-icon" onClick={() => setDeletingDoc(doc)} title="Eliminar">
                  <Trash2 size={14} color="var(--danger-color)" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        isOpen={!!deletingDoc}
        onClose={() => setDeletingDoc(null)}
        onConfirm={handleDelete}
        title="Eliminar Apunte"
        message={`¿Estás seguro de que deseas eliminar el apunte "${deletingDoc?.titulo}"?`}
      />
    </div>
  );
}
