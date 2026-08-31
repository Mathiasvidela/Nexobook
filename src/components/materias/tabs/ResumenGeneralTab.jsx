import React from 'react';
import { User, Calendar, Code, CheckCircle, FileText, BookOpen } from 'lucide-react';

export default function ResumenGeneralTab({ materiaData, onNavigateTab }) {
  const { clases = [], archivos = [], evaluaciones = [], progreso = { temas: [] } } = materiaData;

  const pdfs = archivos.filter(a => a.tipo === 'pdf');
  const resumenes = archivos.filter(a => a.subtipo === 'resumenes');
  const apuntes = archivos.filter(a => a.subtipo === 'apuntes');

  const aprendidos = progreso.temas ? progreso.temas.filter(t => t.estado === 'aprendido').length : 0;
  const totalTemas = progreso.temas ? progreso.temas.length : 0;
  const progPct = totalTemas > 0 ? Math.round((aprendidos / totalTemas) * 100) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Overview Specs */}
      <div className="card" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
        <div>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Profesor a cargo</span>
          <div style={{ fontWeight: 600, fontSize: '1rem', marginTop: '0.2rem' }}>
            {materiaData.profesor || 'No asignado'}
          </div>
        </div>

        <div>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Código de Curso</span>
          <div style={{ fontWeight: 600, fontSize: '1rem', marginTop: '0.2rem' }}>
            {materiaData.codigoCurso || 'N/A'}
          </div>
        </div>

        <div>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Período</span>
          <div style={{ fontWeight: 600, fontSize: '1rem', marginTop: '0.2rem' }}>
            {materiaData.anio} - {materiaData.cuatrimestre}
          </div>
        </div>

        <div>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Estado</span>
          <div>
            <span className={`badge ${materiaData.estado === 'en_curso' ? 'badge-success' : 'badge-info'}`}>
              {materiaData.estado}
            </span>
          </div>
        </div>
      </div>

      {/* Metrics breakdown */}
      <div className="dashboard-grid">
        <div className="card" style={{ cursor: 'pointer' }} onClick={() => onNavigateTab('clases')}>
          <h4 style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Total Clases</h4>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, margin: '0.4rem 0' }}>{clases.length}</div>
          <span style={{ fontSize: '0.8rem', color: 'var(--accent-primary)' }}>Ver clases →</span>
        </div>

        <div className="card" style={{ cursor: 'pointer' }} onClick={() => onNavigateTab('pdfs')}>
          <h4 style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>PDFs Cargados</h4>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, margin: '0.4rem 0' }}>{pdfs.length}</div>
          <span style={{ fontSize: '0.8rem', color: 'var(--accent-primary)' }}>Ver PDFs →</span>
        </div>

        <div className="card" style={{ cursor: 'pointer' }} onClick={() => onNavigateTab('resumenes')}>
          <h4 style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Resúmenes y Apuntes</h4>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, margin: '0.4rem 0' }}>{resumenes.length + apuntes.length}</div>
          <span style={{ fontSize: '0.8rem', color: 'var(--accent-primary)' }}>Ver notas →</span>
        </div>

        <div className="card" style={{ cursor: 'pointer' }} onClick={() => onNavigateTab('temas')}>
          <h4 style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Avance de Temas</h4>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, margin: '0.4rem 0' }}>{progPct}%</div>
          <div className="progress-bar-container">
            <div className="progress-bar-fill" style={{ width: `${progPct}%`, background: 'var(--success-color)' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
