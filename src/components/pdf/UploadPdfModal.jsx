import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal.jsx';
import { usePeriod } from '../../context/PeriodContext.jsx';
import { api } from '../../services/api.js';

export default function UploadPdfModal({ isOpen, onClose, onUploaded, addToast }) {
  const { periodos, periodoSeleccionado } = usePeriod();
  const [materias, setMaterias] = useState([]);

  const [formData, setFormData] = useState({
    periodoId: '',
    materiaId: '',
    unidad: '',
    titulo: '',
    subtipo: 'pdfs'
  });
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (periodoSeleccionado) {
      setFormData(prev => ({ ...prev, periodoId: periodoSeleccionado.id }));
      cargarMaterias(periodoSeleccionado.id);
    }
  }, [periodoSeleccionado, isOpen]);

  const cargarMaterias = async (pId) => {
    try {
      const res = await api.getMaterias({ periodoId: pId });
      setMaterias(res || []);
      if (res && res.length > 0) {
        setFormData(prev => ({ ...prev, materiaId: res[0].id }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handlePeriodoChange = (pId) => {
    setFormData(prev => ({ ...prev, periodoId: pId }));
    cargarMaterias(pId);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      addToast('Por favor selecciona un archivo PDF.', 'error');
      return;
    }
    if (!formData.materiaId) {
      addToast('Debes seleccionar una materia.', 'error');
      return;
    }

    const selectedPeriodo = periodos.find(p => p.id === formData.periodoId) || periodoSeleccionado;
    if (!selectedPeriodo) return;

    const data = new FormData();
    data.append('archivo', file);
    data.append('materiaId', formData.materiaId);
    data.append('anio', selectedPeriodo.anio);
    data.append('cuatrimestre', selectedPeriodo.cuatrimestre);
    data.append('unidad', formData.unidad || 'Unidad General');
    data.append('titulo', formData.titulo || file.name);
    data.append('subtipo', formData.subtipo);

    try {
      setUploading(true);
      await api.uploadArchivo(data);
      addToast('Documento PDF cargado exitosamente.', 'success');
      onUploaded();
      onClose();
    } catch (err) {
      addToast(err.message || 'Error al cargar PDF.', 'error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Cargar Documento PDF Académico">
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Período Académico</label>
            <select
              className="form-control"
              value={formData.periodoId}
              onChange={(e) => handlePeriodoChange(e.target.value)}
            >
              {periodos.map(p => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Materia *</label>
            <select
              className="form-control"
              value={formData.materiaId}
              onChange={(e) => setFormData({ ...formData, materiaId: e.target.value })}
              required
            >
              {materias.length === 0 && <option value="">No hay materias en este período</option>}
              {materias.map(m => (
                <option key={m.id} value={m.id}>{m.nombre}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Unidad / Clase / Tema</label>
            <input
              type="text"
              className="form-control"
              placeholder="Ej: Unidad 2 o Clase 3"
              value={formData.unidad}
              onChange={(e) => setFormData({ ...formData, unidad: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Título Opcional</label>
            <input
              type="text"
              className="form-control"
              placeholder="Ej: Apunte Guía de Servidores"
              value={formData.titulo}
              onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Archivo PDF *</label>
          <input
            type="file"
            accept=".pdf,application/pdf"
            className="form-control"
            onChange={(e) => setFile(e.target.files[0] || null)}
            required
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={uploading}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={uploading}>
            {uploading ? 'Subiendo PDF...' : 'Subir PDF'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
