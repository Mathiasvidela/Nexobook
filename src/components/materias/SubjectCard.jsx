import React from 'react';
import { BookOpen, Calendar } from 'lucide-react';
import { SUBJECT_ICON_MAP } from './subjectIcons.js';

export default function SubjectCard({ materia, onClick }) {
  const IconComponent = SUBJECT_ICON_MAP[materia.icono] || BookOpen;
  const cardColor = materia.color || '#3b82f6';

  return (
    <div className="subject-card" onClick={onClick} style={{ '--subject-color': cardColor }}>

      <div className="subject-header">
        <div className="subject-icon-box">
          <IconComponent size={22} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 className="subject-title">
            {materia.nombre}
          </h3>
          <div className="subject-subtitle">
            {materia.profesor ? `Prof. ${materia.profesor}` : 'Profesor no asignado'}
            {materia.codigoCurso && ` • ${materia.codigoCurso}`}
          </div>
        </div>
      </div>

      <div className="subject-stats">
        <div>
          <strong>{materia.cantidadClases || 0}</strong> Clases
        </div>
        <div>
          <strong>{materia.cantidadPdfs || 0}</strong> PDFs
        </div>
        <div className="subject-status">
          <span className={`badge ${materia.estado === 'en_curso' ? 'badge-success' : 'badge-info'}`}>
            {materia.estado === 'en_curso' ? 'En Curso' : materia.estado}
          </span>
        </div>
      </div>

      {materia.proximaEvaluacion && (
        <div className="subject-next">
          <Calendar size={12} />
          <span>Próx: {materia.proximaEvaluacion.titulo} ({materia.proximaEvaluacion.fecha})</span>
        </div>
      )}

    </div>
  );
}
