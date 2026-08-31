import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import LoadingSpinner from '../common/LoadingSpinner.jsx';
import ResumenGeneralTab from './tabs/ResumenGeneralTab.jsx';
import PdfsTab from './tabs/PdfsTab.jsx';
import ResumenesTab from './tabs/ResumenesTab.jsx';
import EvaluacionesTab from './tabs/EvaluacionesTab.jsx';
import { ArrowLeft, Edit2, LayoutDashboard, FileText, NotebookPen, CalendarDays } from 'lucide-react';

export default function MateriaDetailView({
  materiaId,
  onBack,
  onOpenMateriaModal,
  onUploadDocument,
  onOpenPdfViewer,
  onOpenEditor,
  addToast,
  materiasList = []
}) {
  const [activeTab, setActiveTab] = useState('resumen');
  const [materiaData, setMateriaData] = useState(null);
  const [loading, setLoading] = useState(true);

  const cargarMateria = async () => {
    try {
      setLoading(true);
      const res = await api.getMateriaDetail(materiaId);
      setMateriaData(res);
    } catch (err) {
      addToast(err.message || 'Error al cargar detalles de la materia.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (materiaId) cargarMateria();
  }, [materiaId]);

  if (loading) return <LoadingSpinner message="Cargando materia..." />;
  if (!materiaData) return <div>Materia no encontrada</div>;

  const cardColor = materiaData.color || '#3b82f6';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Navigation & Header */}
      <div>
        <button
          className="btn btn-secondary"
          onClick={onBack}
          style={{ marginBottom: '1rem', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
        >
          <ArrowLeft size={16} /> <span>Volver a Materias</span>
        </button>

        <div
          className="card"
          style={{
            position: 'relative',
            overflow: 'hidden',
            borderLeft: `6px solid ${cardColor}`
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
                <h1 style={{ fontSize: '1.6rem', fontWeight: 700 }}>{materiaData.nombre}</h1>
                <span className={`badge ${materiaData.estado === 'en_curso' ? 'badge-success' : 'badge-info'}`}>
                  {materiaData.estado}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                {materiaData.profesor && <span>Profesor: <strong>{materiaData.profesor}</strong></span>}
                {materiaData.codigoCurso && <span>Curso: <strong>{materiaData.codigoCurso}</strong></span>}
                <span>Período: <strong>{materiaData.anio} ({materiaData.cuatrimestre})</strong></span>
              </div>
            </div>

            <button className="btn btn-secondary btn-icon" onClick={() => onOpenMateriaModal(materiaData)} title="Editar materia">
              <Edit2 size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Tabs Header */}
      <div className="tabs-header">
        <button className={`tab-btn ${activeTab === 'resumen' ? 'active' : ''}`} onClick={() => setActiveTab('resumen')}>
          <LayoutDashboard size={16} /> General
        </button>
        <button className={`tab-btn ${activeTab === 'pdfs' ? 'active' : ''}`} onClick={() => setActiveTab('pdfs')}>
          <FileText size={16} /> PDFs <span>{materiaData.archivos ? materiaData.archivos.filter(a => a.tipo === 'pdf').length : 0}</span>
        </button>
        <button className={`tab-btn ${activeTab === 'resumenes' ? 'active' : ''}`} onClick={() => setActiveTab('resumenes')}>
          <NotebookPen size={16} /> Resúmenes <span>{materiaData.archivos ? materiaData.archivos.filter(a => a.subtipo === 'resumenes').length : 0}</span>
        </button>
        <button className={`tab-btn ${activeTab === 'evaluaciones' ? 'active' : ''}`} onClick={() => setActiveTab('evaluaciones')}>
          <CalendarDays size={16} /> Evaluaciones <span>{materiaData.evaluaciones ? materiaData.evaluaciones.length : 0}</span>
        </button>
      </div>

      {/* Active Tab Content */}
      {activeTab === 'resumen' && (
        <ResumenGeneralTab materiaData={materiaData} onNavigateTab={(tab) => setActiveTab(tab)} />
      )}
      {activeTab === 'pdfs' && (
        <PdfsTab
          materia={materiaData}
          archivos={materiaData.archivos}
          onUploadDocument={onUploadDocument}
          onOpenPdfViewer={onOpenPdfViewer}
          onRefresh={cargarMateria}
          addToast={addToast}
          materiasList={materiasList}
        />
      )}
      {activeTab === 'resumenes' && (
        <ResumenesTab
          materiaId={materiaId}
          materia={materiaData}
          onOpenEditor={onOpenEditor}
          onRefresh={cargarMateria}
          addToast={addToast}
        />
      )}
      {activeTab === 'evaluaciones' && (
        <EvaluacionesTab
          materiaId={materiaId}
          evaluaciones={materiaData.evaluaciones}
          onRefresh={cargarMateria}
          addToast={addToast}
        />
      )}
    </div>
  );
}
