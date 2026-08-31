import React, { lazy, Suspense, useState, useEffect } from 'react';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { PeriodProvider, usePeriod } from './context/PeriodContext.jsx';
import Sidebar from './components/common/Sidebar.jsx';
import Header from './components/common/Header.jsx';
import Toast from './components/common/Toast.jsx';

import DashboardView from './components/dashboard/DashboardView.jsx';
import MateriasView from './components/materias/MateriasView.jsx';
import MateriaDetailView from './components/materias/MateriaDetailView.jsx';
import MateriaModal from './components/materias/MateriaModal.jsx';
import CalendarioView from './components/calendario/CalendarioView.jsx';
import ArchivosView from './components/archivos/ArchivosView.jsx';
import ProgresoView from './components/progreso/ProgresoView.jsx';
import ConfiguracionView from './components/configuracion/ConfiguracionView.jsx';

import UploadPdfModal from './components/pdf/UploadPdfModal.jsx';
import SearchResultsModal from './components/busqueda/SearchResultsModal.jsx';
import { api } from './services/api.js';
import { WorkspaceProvider, useWorkspace } from './context/WorkspaceContext.jsx';
import WorkspacePicker from './components/workspaces/WorkspacePicker.jsx';
import QuickEvaluationModal from './components/evaluaciones/QuickEvaluationModal.jsx';
import EvaluacionesView from './components/evaluaciones/EvaluacionesView.jsx';
import ResumenesView from './components/resumenes/ResumenesView.jsx';
import PapeleraView from './components/papelera/PapeleraView.jsx';

const PdfViewerModal = lazy(() => import('./components/pdf/PdfViewerModal.jsx'));
const MarkdownEditorModal = lazy(() => import('./components/editor/MarkdownEditorModal.jsx'));

function MainAppContent() {
  const { espacioActual, loading: workspaceLoading } = useWorkspace();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem('nexobook-sidebar') === 'collapsed');
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [selectedMateriaId, setSelectedMateriaId] = useState(null);

  // Modals state
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMateriaModalOpen, setIsMateriaModalOpen] = useState(false);
  const [editingMateria, setEditingMateria] = useState(null);
  const [materiaSavedCallback, setMateriaSavedCallback] = useState(null);

  const [isUploadPdfOpen, setIsUploadPdfOpen] = useState(false);
  const [isPdfViewerOpen, setIsPdfViewerOpen] = useState(false);
  const [pdfReturnPage, setPdfReturnPage] = useState('archivos');
  const [selectedPdf, setSelectedPdf] = useState(null);
  const [isQuickEvalOpen, setIsQuickEvalOpen] = useState(false);
  const [editingEvaluation, setEditingEvaluation] = useState(null);
  const [dashboardRefresh, setDashboardRefresh] = useState(0);

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editorReturnPage, setEditorReturnPage] = useState('resumenes');
  const [editorDoc, setEditorDoc] = useState(null);
  const [editorTipo, setEditorTipo] = useState('resumen');
  const [editorMateriaId, setEditorMateriaId] = useState(null);

  // Materias list state for modals
  const [materiasList, setMateriasList] = useState([]);

  // Toast notifications state
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const cargarMateriasList = async () => {
    try {
      const res = await api.getMaterias();
      setMateriasList(res || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    cargarMateriasList();
  }, [currentPage]);

  const handleSelectMateria = (matId) => {
    setSelectedMateriaId(matId);
    setCurrentPage(`materia-detail`);
  };

  const handleOpenMateriaModal = (mat = null, afterSaved = null) => {
    setEditingMateria(mat);
    setMateriaSavedCallback(() => afterSaved);
    setIsMateriaModalOpen(true);
  };

  const handleOpenEditor = (tipo = 'resumen', doc = null, matId = null) => {
    if (doc?.id) api.updateResumen(doc.id, { ultimaApertura: new Date().toISOString() }).catch(() => {});
    setEditorTipo(tipo);
    setEditorDoc(doc);
    setEditorMateriaId(matId);
    setEditorReturnPage(currentPage === 'editor' ? 'resumenes' : currentPage);
    setIsEditorOpen(true);
    setCurrentPage('editor');
  };

  const handleOpenPdfViewer = (pdf) => {
    if (pdf?.id) api.updateArchivo(pdf.id, { ultimaApertura: new Date().toISOString() }).catch(() => {});
    setSelectedPdf(pdf);
    setPdfReturnPage(currentPage === 'pdf-reader' ? 'archivos' : currentPage);
    setIsPdfViewerOpen(true);
    setCurrentPage('pdf-reader');
  };

  if (workspaceLoading) return <div className="workspace-loading">Preparando tus espacios…</div>;
  if (!espacioActual) return <WorkspacePicker />;

  return (
    <div className={`app-container ${sidebarCollapsed ? 'sidebar-collapsed-layout' : ''} ${['editor', 'pdf-reader'].includes(currentPage) ? 'editor-focus-mode' : ''}`}>
      {!['editor', 'pdf-reader'].includes(currentPage) && <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(value => { const next = !value; localStorage.setItem('nexobook-sidebar', next ? 'collapsed' : 'expanded'); return next; })} />}

      <div className="main-wrapper">
        {!['editor', 'pdf-reader'].includes(currentPage) && <Header
          onOpenSearch={() => setIsSearchOpen(true)}
          onAddMateria={() => handleOpenMateriaModal(null)}
          onUploadDocument={() => setIsUploadPdfOpen(true)}
        />}

        <main className="main-content">
          {currentPage === 'editor' && <Suspense fallback={<div className="focus-loading">Preparando editor…</div>}><MarkdownEditorModal
            inline
            isOpen={isEditorOpen}
            onClose={() => { setIsEditorOpen(false); setCurrentPage(editorReturnPage); }}
            doc={editorDoc}
            tipo={editorTipo}
            materiaId={editorMateriaId}
            onSaved={async () => { await cargarMateriasList(); setDashboardRefresh(value => value + 1); }}
            addToast={addToast}
            materiasList={materiasList}
          /></Suspense>}
          {currentPage === 'pdf-reader' && <Suspense fallback={<div className="focus-loading">Preparando lector…</div>}><PdfViewerModal inline isOpen={isPdfViewerOpen} onClose={() => { setIsPdfViewerOpen(false); setCurrentPage(pdfReturnPage); }} pdf={selectedPdf} onProgressUpdated={cargarMateriasList} addToast={addToast} /></Suspense>}
          {currentPage === 'dashboard' && (
            <DashboardView
              onSelectMateria={handleSelectMateria}
              onAddMateria={() => handleOpenMateriaModal(null)}
              onUploadDocument={() => setIsUploadPdfOpen(true)}
              onOpenEvalModal={() => { setEditingEvaluation(null); setIsQuickEvalOpen(true); }}
              onOpenPdfViewer={handleOpenPdfViewer}
              onOpenEditor={handleOpenEditor}
              onOpenLibrary={() => setCurrentPage('archivos')}
              onContinue={(item) => item.tipo === 'pdf' ? handleOpenPdfViewer(item) : handleOpenEditor(item.subtipo === 'apuntes' ? 'apunte' : 'resumen', item, item.materiaId)}
              refreshKey={dashboardRefresh}
            />
          )}

          {currentPage === 'materias' && (
            <MateriasView
              onSelectMateria={handleSelectMateria}
              onAddMateria={() => handleOpenMateriaModal(null)}
              onEditMateria={handleOpenMateriaModal}
              addToast={addToast}
            />
          )}

          {currentPage === 'materia-detail' && selectedMateriaId && (
            <MateriaDetailView
              materiaId={selectedMateriaId}
              onBack={() => setCurrentPage('materias')}
              onOpenMateriaModal={handleOpenMateriaModal}
              onUploadDocument={() => setIsUploadPdfOpen(true)}
              onOpenPdfViewer={handleOpenPdfViewer}
              onOpenEditor={handleOpenEditor}
              addToast={addToast}
              materiasList={materiasList}
            />
          )}

          {currentPage === 'calendario' && <CalendarioView
            addToast={addToast}
            onAddEvaluation={(evaluation = null) => { setEditingEvaluation(evaluation); setIsQuickEvalOpen(true); }}
            onEvaluationChanged={() => setDashboardRefresh(value => value + 1)}
            refreshKey={dashboardRefresh}
          />}

          {currentPage === 'evaluaciones' && <EvaluacionesView
            addToast={addToast}
            onOpenEvaluation={(evaluation = null) => { setEditingEvaluation(evaluation); setIsQuickEvalOpen(true); }}
            onChanged={() => setDashboardRefresh(value => value + 1)}
            refreshKey={dashboardRefresh}
          />}

          {currentPage === 'archivos' && (
            <ArchivosView
              onUploadDocument={() => setIsUploadPdfOpen(true)}
              onOpenPdfViewer={handleOpenPdfViewer}
              onOpenEditor={handleOpenEditor}
              addToast={addToast}
            />
          )}

          {currentPage === 'resumenes' && (
            <ResumenesView
              onOpenEditor={handleOpenEditor}
              addToast={addToast}
              refreshKey={dashboardRefresh}
            />
          )}

          {currentPage === 'progreso' && <ProgresoView onSelectMateria={handleSelectMateria} addToast={addToast} onOpenMateriaModal={(materiaId, callback) => handleOpenMateriaModal(materiaId ? materiasList.find(item => item.id === materiaId) : null, callback)} />}

          {currentPage === 'papelera' && <PapeleraView addToast={addToast} />}

          {currentPage === 'configuracion' && <ConfiguracionView addToast={addToast} />}
        </main>
      </div>

      {/* Global Toast System */}
      <Toast toasts={toasts} removeToast={removeToast} />

      {/* Modals */}
      <SearchResultsModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectMateria={handleSelectMateria}
        onOpenPdfViewer={handleOpenPdfViewer}
        onOpenEditor={handleOpenEditor}
      />

      <MateriaModal
        isOpen={isMateriaModalOpen}
        onClose={() => { setIsMateriaModalOpen(false); setMateriaSavedCallback(null); }}
        materia={editingMateria}
        onSaved={async () => { await cargarMateriasList(); await materiaSavedCallback?.(); setMateriaSavedCallback(null); setDashboardRefresh(value => value + 1); }}
        addToast={addToast}
      />

      <UploadPdfModal
        isOpen={isUploadPdfOpen}
        onClose={() => setIsUploadPdfOpen(false)}
        onUploaded={cargarMateriasList}
        addToast={addToast}
      />

      <QuickEvaluationModal
        isOpen={isQuickEvalOpen}
        onClose={() => { setIsQuickEvalOpen(false); setEditingEvaluation(null); }}
        materias={materiasList}
        evaluation={editingEvaluation}
        onSaved={async () => { await cargarMateriasList(); setDashboardRefresh(value => value + 1); }}
        addToast={addToast}
      />

    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <WorkspaceProvider><PeriodProvider><MainAppContent /></PeriodProvider></WorkspaceProvider>
    </ThemeProvider>
  );
}
