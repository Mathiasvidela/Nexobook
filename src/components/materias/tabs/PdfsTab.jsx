import React, { useState } from 'react';
import { api } from '../../../services/api.js';
import EmptyState from '../../common/EmptyState.jsx';
import ConfirmModal from '../../common/ConfirmModal.jsx';
import Modal from '../../common/Modal.jsx';
import { Upload, Eye, Edit2, ArrowRightLeft, Trash2, FileText, CheckCircle, Clock } from 'lucide-react';

export default function PdfsTab({
  materia,
  archivos = [],
  onUploadDocument,
  onOpenPdfViewer,
  onRefresh,
  addToast,
  materiasList = []
}) {
  const pdfs = archivos.filter(a => a.tipo === 'pdf');

  const [renamingPdf, setRenamingPdf] = useState(null);
  const [newTitle, setNewTitle] = useState('');

  const [movingPdf, setMovingPdf] = useState(null);
  const [targetMateriaId, setTargetMateriaId] = useState('');

  const [deletingPdf, setDeletingPdf] = useState(null);

  const handleRename = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    try {
      await api.updateArchivo(renamingPdf.id, { titulo: newTitle });
      addToast('Título de PDF actualizado.', 'success');
      onRefresh();
      setRenamingPdf(null);
    } catch (err) {
      addToast(err.message || 'Error al renombrar.', 'error');
    }
  };

  const handleMove = async (e) => {
    e.preventDefault();
    if (!targetMateriaId) return;
    try {
      await api.moverArchivo(movingPdf.id, targetMateriaId);
      addToast('PDF movido a la nueva materia.', 'success');
      onRefresh();
      setMovingPdf(null);
    } catch (err) {
      addToast(err.message || 'Error al mover PDF.', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deletingPdf) return;
    try {
      await api.deleteArchivo(deletingPdf.id);
      addToast('Archivo PDF eliminado.', 'success');
      onRefresh();
    } catch (err) {
      addToast(err.message || 'Error al eliminar PDF.', 'error');
    } finally {
      setDeletingPdf(null);
    }
  };

  const formatSize = (bytes) => {
    if (!bytes) return '0 KB';
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Documentos PDF Originales</h3>
        <button className="btn btn-primary" onClick={onUploadDocument}>
          <Upload size={16} /> <span>Cargar PDF</span>
        </button>
      </div>

      {pdfs.length === 0 ? (
        <EmptyState
          title="No hay documentos PDF cargados"
          description="Sube guías, bibliografía o PDFs oficiales de la materia."
          actionButton={
            <button className="btn btn-primary" onClick={onUploadDocument}>
              <Upload size={16} /> <span>Cargar PDF</span>
            </button>
          }
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {pdfs.map((pdf) => (
            <div key={pdf.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyBetween: 'space-between', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div style={{ background: 'var(--accent-light)', color: 'var(--accent-primary)', padding: '0.6rem', borderRadius: '10px' }}>
                    <FileText size={24} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h4 style={{ fontWeight: 600, fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {pdf.titulo || pdf.nombreOriginal}
                    </h4>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      Unidad / Tema: {pdf.unidad || 'Sin unidad'}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                  <span>Tamaño: {formatSize(pdf.tamano)}</span>
                  <span>Estado: {pdf.estadoLectura || 'pendiente'}</span>
                </div>

                <div className="progress-bar-container">
                  <div className="progress-bar-fill" style={{ width: `${pdf.porcentajeLectura || 0}%`, background: 'var(--accent-primary)' }} />
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.2rem' }}>
                  Página {pdf.paginaActual || 1} de {pdf.totalPaginas || 1} ({pdf.porcentajeLectura || 0}%)
                </span>
              </div>

              <div style={{ display: 'flex', gap: '0.4rem', marginTop: '1.2rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
                <button className="btn btn-primary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.82rem', flex: 1 }} onClick={() => onOpenPdfViewer(pdf)}>
                  <Eye size={14} /> <span>Leer PDF</span>
                </button>
                <button className="btn btn-secondary btn-icon" onClick={() => { setRenamingPdf(pdf); setNewTitle(pdf.titulo); }} title="Renombrar">
                  <Edit2 size={14} />
                </button>
                <button className="btn btn-secondary btn-icon" onClick={() => { setMovingPdf(pdf); setTargetMateriaId(''); }} title="Mover materia">
                  <ArrowRightLeft size={14} />
                </button>
                <button className="btn btn-secondary btn-icon" onClick={() => setDeletingPdf(pdf)} title="Eliminar">
                  <Trash2 size={14} color="var(--danger-color)" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rename Modal */}
      <Modal isOpen={!!renamingPdf} onClose={() => setRenamingPdf(null)} title="Renombrar Documento PDF">
        <form onSubmit={handleRename}>
          <div className="form-group">
            <label className="form-label">Nuevo Título</label>
            <input
              type="text"
              className="form-control"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              required
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.2rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setRenamingPdf(null)}>Cancelar</button>
            <button type="submit" className="btn btn-primary">Guardar</button>
          </div>
        </form>
      </Modal>

      {/* Move Modal */}
      <Modal isOpen={!!movingPdf} onClose={() => setMovingPdf(null)} title="Mover PDF a otra Materia">
        <form onSubmit={handleMove}>
          <div className="form-group">
            <label className="form-label">Seleccionar Materia Destino</label>
            <select className="form-control" value={targetMateriaId} onChange={(e) => setTargetMateriaId(e.target.value)} required>
              <option value="">-- Seleccionar materia --</option>
              {materiasList.filter(m => m.id !== materia.id).map(m => (
                <option key={m.id} value={m.id}>{m.nombre} ({m.anio})</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.2rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setMovingPdf(null)}>Cancelar</button>
            <button type="submit" className="btn btn-primary">Mover Archivo</button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={!!deletingPdf}
        onClose={() => setDeletingPdf(null)}
        onConfirm={handleDelete}
        title="Eliminar PDF"
        message={`¿Estás seguro de que deseas eliminar el archivo "${deletingPdf?.titulo || deletingPdf?.nombreOriginal}"? El archivo físico se borrará permanentemente de tu equipo.`}
      />
    </div>
  );
}
