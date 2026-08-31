import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal.jsx';
import { api } from '../../services/api.js';
import { Search, BookOpen, FileText, CheckSquare, Layers, Calendar } from 'lucide-react';

export default function SearchResultsModal({
  isOpen,
  onClose,
  onSelectMateria,
  onOpenPdfViewer,
  onOpenEditor
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setResults(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const res = await api.searchGlobal(query);
        setResults(res);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  const handleSelectResult = (item) => {
    onClose();
    if (item.tipo === 'materia') {
      onSelectMateria(item.materiaId);
    } else if (item.tipo === 'pdf') {
      onOpenPdfViewer({ id: item.archivoId, titulo: item.titulo });
    } else if (item.tipo === 'resumen' || item.tipo === 'apunte') {
      onOpenEditor(item.tipo, { id: item.docId, titulo: item.titulo });
    } else if (item.materiaId) {
      onSelectMateria(item.materiaId);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Búsqueda General" maxWidth="680px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-control"
            style={{ paddingLeft: '2.4rem' }}
            placeholder="Buscar dentro de materias, PDFs, resúmenes y evaluaciones..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </div>

        {loading && <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', textAlign: 'center' }}>Buscando coincidencias...</p>}

        {results && results.totalResultados === 0 && (
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1.5rem 0' }}>
            No se encontraron coincidencias para "{query}".
          </p>
        )}

        {results && results.totalResultados > 0 && (
          <div style={{ maxHeight: '420px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {/* Materias */}
            {results.materias.map(item => (
              <div key={item.id} className="card" style={{ padding: '0.75rem', cursor: 'pointer' }} onClick={() => handleSelectResult(item)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <BookOpen size={18} color="var(--accent-primary)" />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{item.titulo}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{item.subtitulo}</div>
                  </div>
                </div>
              </div>
            ))}

            {/* PDFs */}
            {results.archivos.map(item => (
              <div key={item.id} className="card" style={{ padding: '0.75rem', cursor: 'pointer' }} onClick={() => handleSelectResult(item)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <FileText size={18} color="var(--accent-primary)" />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>[PDF] {item.titulo}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{item.subtitulo}</div>
                  </div>
                </div>
              </div>
            ))}

            {/* Markdown */}
            {results.resumenes.map(item => (
              <div key={item.id} className="card" style={{ padding: '0.75rem', cursor: 'pointer' }} onClick={() => handleSelectResult(item)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <FileText size={18} color="var(--warning-color)" />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>[{item.tipo.toUpperCase()}] {item.titulo}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{item.subtitulo}</div>
                  </div>
                </div>
              </div>
            ))}

            {/* Clases */}
            {results.clases.map(item => (
              <div key={item.id} className="card" style={{ padding: '0.75rem', cursor: 'pointer' }} onClick={() => handleSelectResult(item)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <Layers size={18} color="var(--success-color)" />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{item.titulo}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{item.subtitulo}</div>
                  </div>
                </div>
              </div>
            ))}

            {/* Evaluaciones */}
            {results.evaluaciones.map(item => (
              <div key={item.id} className="card" style={{ padding: '0.75rem', cursor: 'pointer' }} onClick={() => handleSelectResult(item)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <CheckSquare size={18} color="var(--danger-color)" />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{item.titulo}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{item.subtitulo}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
