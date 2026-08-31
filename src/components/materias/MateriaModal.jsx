import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal.jsx';
import { usePeriod } from '../../context/PeriodContext.jsx';
import { api } from '../../services/api.js';
import SubjectAppearanceFields from './SubjectAppearanceFields.jsx';

export default function MateriaModal({ isOpen, onClose, materia = null, onSaved, addToast }) {
  const { periodoSeleccionado, periodos } = usePeriod();
  const [selectedPeriodId, setSelectedPeriodId] = useState('');

  const [formData, setFormData] = useState({
    nombre: '',
    alias: '',
    icono: 'BookOpen',
    color: '#3b82f6',
    profesor: '',
    codigoCurso: '',
    estado: 'en_curso',
    fechaInicio: '',
    fechaFin: ''
  });

  useEffect(() => {
    setSelectedPeriodId(materia?.periodoId || periodoSeleccionado?.id || '');
    if (materia) {
      setFormData({
        nombre: materia.nombre || '',
        alias: materia.alias || '',
        icono: materia.icono || 'BookOpen',
        color: materia.color || '#3b82f6',
        profesor: materia.profesor || '',
        codigoCurso: materia.codigoCurso || '',
        estado: materia.estado || 'en_curso',
        fechaInicio: materia.fechaInicio || '',
        fechaFin: materia.fechaFin || ''
      });
    } else {
      setFormData({
        nombre: '',
        alias: '',
        icono: 'BookOpen',
        color: '#3b82f6',
        profesor: '',
        codigoCurso: '',
        estado: 'en_curso',
        fechaInicio: new Date().toISOString().split('T')[0],
        fechaFin: ''
      });
    }
  }, [materia, isOpen, periodoSeleccionado?.id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nombre.trim()) {
      addToast('El nombre de la materia es obligatorio.', 'error');
      return;
    }

    try {
      if (materia) {
        await api.updateMateria(materia.id, formData);
        addToast('Materia actualizada con éxito.', 'success');
      } else {
        const targetPeriod = periodos.find(item => item.id === selectedPeriodId) || periodoSeleccionado;
        if (!targetPeriod) {
          addToast('Debes seleccionar un período académico activo.', 'error');
          return;
        }
        await api.createMateria({
          ...formData,
          periodoId: targetPeriod.id,
          anio: targetPeriod.anio,
          cuatrimestre: targetPeriod.cuatrimestre,
          planAnio: targetPeriod.planAnio,
          planPeriodo: targetPeriod.planPeriodo
        });
        addToast('Materia creada con éxito y carpetas locales generadas.', 'success');
      }
      onSaved();
      onClose();
    } catch (err) {
      addToast(err.message || 'Error al guardar la materia.', 'error');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={materia ? 'Editar Materia' : 'Agregar Nueva Materia'}
      maxWidth="720px"
    >
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Nombre de la Materia *</label>
          <input
            type="text"
            className="form-control"
            placeholder="Ej: Laboratorio Web Servidor"
            value={formData.nombre}
            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
            required
          />
        </div>

        {!materia && periodos.length > 0 && <div className="form-group"><label className="form-label">Ubicación en el plan</label><select className="form-control" value={selectedPeriodId} onChange={event => setSelectedPeriodId(event.target.value)}>{periodos.map(period => <option key={period.id} value={period.id}>{period.nombre}</option>)}</select></div>}

        <SubjectAppearanceFields icono={formData.icono} color={formData.color} onChange={appearance => setFormData({ ...formData, ...appearance })} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Alias / Nombre corto</label>
            <input
              type="text"
              className="form-control"
              placeholder="Ej: Web Servidor"
              value={formData.alias}
              onChange={(e) => setFormData({ ...formData, alias: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Código de Curso</label>
            <input
              type="text"
              className="form-control"
              placeholder="Ej: LWS-2026"
              value={formData.codigoCurso}
              onChange={(e) => setFormData({ ...formData, codigoCurso: e.target.value })}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Profesor / Docente a cargo</label>
          <input
            type="text"
            className="form-control"
            placeholder="Ej: Ing. Carlos Rodríguez"
            value={formData.profesor}
            onChange={(e) => setFormData({ ...formData, profesor: e.target.value })}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Estado de la Materia</label>
            <select
              className="form-control"
              value={formData.estado}
              onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
            >
              <option value="proxima">Próxima</option>
              <option value="en_curso">En Curso</option>
              <option value="finalizada">Finalizada</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Fecha de Inicio</label>
            <input
              type="date"
              className="form-control"
              value={formData.fechaInicio}
              onChange={(e) => setFormData({ ...formData, fechaInicio: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Fecha de Finalización</label>
            <input
              type="date"
              className="form-control"
              value={formData.fechaFin}
              onChange={(e) => setFormData({ ...formData, fechaFin: e.target.value })}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary">
            {materia ? 'Guardar Cambios' : 'Crear Materia'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
