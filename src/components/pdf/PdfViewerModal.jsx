import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as pdfjs from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import Modal from '../common/Modal.jsx';
import { api } from '../../services/api.js';
import { ArrowLeft, Bookmark, BookmarkCheck, ChevronLeft, ChevronRight, Download, ExternalLink, FileSearch, Heart, LoaderCircle, Maximize2, PanelLeft, PanelRight, Search, ZoomIn, ZoomOut } from 'lucide-react';

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

function PageThumbnail({ document, page, active, bookmarked, onSelect }) {
  const canvasRef = useRef(null);
  const rootRef = useRef(null);
  const [visible, setVisible] = useState(active);
  useEffect(() => {
    if (active) setVisible(true);
    const observer = new IntersectionObserver(entries => { if (entries[0]?.isIntersecting) { setVisible(true); observer.disconnect(); } }, { rootMargin: '180px' });
    if (rootRef.current) observer.observe(rootRef.current);
    return () => observer.disconnect();
  }, [active]);
  useEffect(() => {
    if (!visible) return;
    let cancelled = false; let task;
    document.getPage(page).then(pdfPage => {
      if (cancelled || !canvasRef.current) return;
      const viewport = pdfPage.getViewport({ scale: 0.2 });
      const canvas = canvasRef.current;
      canvas.width = viewport.width; canvas.height = viewport.height;
      task = pdfPage.render({ canvasContext: canvas.getContext('2d'), viewport });
      return task.promise;
    }).catch(() => {});
    return () => { cancelled = true; task?.cancel?.(); };
  }, [document, page, visible]);
  return <button ref={rootRef} className={`pdf-thumb ${active ? 'active' : ''}`} onClick={() => onSelect(page)} title={`Página ${page}`}>
    <span>{page}</span><canvas ref={canvasRef} />{bookmarked && <BookmarkCheck size={13} />}
  </button>;
}

export default function PdfViewerModal({ isOpen, onClose, pdf, onProgressUpdated, addToast, inline = false }) {
  const canvasRef = useRef(null);
  const stageRef = useRef(null);
  const renderTaskRef = useRef(null);
  const noteTimerRef = useRef(null);
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [zoom, setZoom] = useState(1.15);
  const [estado, setEstado] = useState('leyendo');
  const [bookmarks, setBookmarks] = useState([]);
  const [favorite, setFavorite] = useState(false);
  const [pageNotes, setPageNotes] = useState({});
  const [noteStatus, setNoteStatus] = useState('saved');
  const [thumbsOpen, setThumbsOpen] = useState(true);
  const [notesOpen, setNotesOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState([]);

  useEffect(() => {
    if (!isOpen || !pdf) return;
    let cancelled = false;
    setLoading(true); setError(''); setDocument(null); setResults([]); setQuery('');
    setCurrentPage(Math.max(1, pdf.paginaActual || 1)); setEstado(pdf.estadoLectura || 'leyendo'); setZoom(pdf.zoomLectura || 1.15);
    setBookmarks(Array.isArray(pdf.marcadores) ? pdf.marcadores : []);
    setFavorite(Boolean(pdf.favorito)); setPageNotes(pdf.notasPorPagina || {});
    const task = pdfjs.getDocument(`/api/archivos/serve/${pdf.id}`);
    task.promise.then(doc => {
      if (cancelled) return doc.destroy();
      setDocument(doc); setTotalPages(doc.numPages);
      setCurrentPage(page => Math.min(Math.max(1, page), doc.numPages)); setLoading(false);
      if (pdf.totalPaginas !== doc.numPages) api.updateArchivo(pdf.id, { totalPaginas: doc.numPages }).catch(() => {});
    }).catch(err => { if (!cancelled) { setError(err.message || 'No se pudo abrir el PDF.'); setLoading(false); } });
    return () => { cancelled = true; clearTimeout(noteTimerRef.current); renderTaskRef.current?.cancel?.(); task.destroy?.(); };
  }, [isOpen, pdf?.id]);

  useEffect(() => {
    if (!document || !canvasRef.current) return;
    let cancelled = false;
    document.getPage(currentPage).then(page => {
      if (cancelled || !canvasRef.current) return;
      renderTaskRef.current?.cancel?.();
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      const viewport = page.getViewport({ scale: zoom * pixelRatio });
      const displayViewport = page.getViewport({ scale: zoom });
      const canvas = canvasRef.current;
      canvas.width = viewport.width; canvas.height = viewport.height;
      canvas.style.width = `${displayViewport.width}px`; canvas.style.height = `${displayViewport.height}px`;
      renderTaskRef.current = page.render({ canvasContext: canvas.getContext('2d'), viewport });
      return renderTaskRef.current.promise;
    }).catch(err => { if (err?.name !== 'RenderingCancelledException') setError('No se pudo renderizar esta página.'); });
    return () => { cancelled = true; renderTaskRef.current?.cancel?.(); };
  }, [document, currentPage, zoom]);

  const saveMetadata = async patch => {
    try { await api.updateArchivo(pdf.id, patch); onProgressUpdated?.(); }
    catch { addToast?.('No se pudo guardar el cambio en el PDF.', 'error'); }
  };
  const goToPage = page => {
    const next = Math.min(totalPages || 1, Math.max(1, Number(page) || 1));
    setCurrentPage(next); saveMetadata({ paginaActual: next, totalPaginas: totalPages, estadoLectura: estado });
  };
  const toggleBookmark = () => {
    const next = bookmarks.includes(currentPage) ? bookmarks.filter(page => page !== currentPage) : [...bookmarks, currentPage].sort((a, b) => a - b);
    setBookmarks(next); saveMetadata({ marcadores: next });
  };
  const toggleFavorite = () => { const next = !favorite; setFavorite(next); saveMetadata({ favorito: next }); };
  const updateZoom = next => { const value = Math.min(2.5, Math.max(.4, next)); setZoom(value); saveMetadata({ zoomLectura: value }); };
  const fitWidth = async () => {
    if (!document || !stageRef.current) return;
    try {
      const page = await document.getPage(currentPage);
      const base = page.getViewport({ scale: 1 });
      updateZoom((stageRef.current.clientWidth - 48) / base.width);
    } catch { addToast?.('No se pudo ajustar el ancho.', 'error'); }
  };
  const updateNote = value => {
    const next = { ...pageNotes, [currentPage]: value };
    if (!value.trim()) delete next[currentPage];
    setPageNotes(next); setNoteStatus('saving'); clearTimeout(noteTimerRef.current);
    noteTimerRef.current = setTimeout(() => saveMetadata({ notasPorPagina: next }).then(() => setNoteStatus('saved')), 650);
  };
  const runSearch = async event => {
    event?.preventDefault();
    const term = query.trim().toLocaleLowerCase('es');
    if (!document || !term) return setResults([]);
    setSearching(true);
    try {
      const matches = [];
      for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
        const page = await document.getPage(pageNumber);
        const text = (await page.getTextContent()).items.map(item => item.str).join(' ');
        const index = text.toLocaleLowerCase('es').indexOf(term);
        if (index >= 0) matches.push({ page: pageNumber, excerpt: text.slice(Math.max(0, index - 45), index + term.length + 75) });
      }
      setResults(matches);
    } catch { addToast?.('No se pudo buscar dentro del documento.', 'error'); }
    finally { setSearching(false); }
  };

  const progress = useMemo(() => totalPages ? Math.round(currentPage / totalPages * 100) : 0, [currentPage, totalPages]);
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = event => {
      if (['INPUT', 'TEXTAREA'].includes(event.target?.tagName)) return;
      if (event.key === 'ArrowLeft' || event.key === 'PageUp') { event.preventDefault(); goToPage(currentPage - 1); }
      if (event.key === 'ArrowRight' || event.key === 'PageDown') { event.preventDefault(); goToPage(currentPage + 1); }
      if (event.key === '+' || event.key === '=') updateZoom(zoom + .15);
      if (event.key === '-') updateZoom(zoom - .15);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, currentPage, totalPages, zoom, estado]);
  if (!isOpen || !pdf) return null;

  const reader = <div className={`nexo-pdf-reader ${inline ? 'inline' : ''}`}>
      <header className="pdf-reader-toolbar">
        <div className="pdf-toolbar-group">
          <button onClick={() => setThumbsOpen(value => !value)} className={thumbsOpen ? 'active' : ''} title="Miniaturas"><PanelLeft size={17} /></button>
          <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage <= 1}><ChevronLeft size={17} /></button>
          <label><input type="number" min="1" max={totalPages || 1} value={currentPage} onChange={event => goToPage(event.target.value)} /> <span>de {totalPages || '—'}</span></label>
          <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage >= totalPages}><ChevronRight size={17} /></button>
        </div>
        <div className="pdf-toolbar-group pdf-progress"><span>{progress}% leído</span><i><b style={{ width: `${progress}%` }} /></i></div>
        <div className="pdf-toolbar-group">
          <button onClick={() => updateZoom(zoom - .15)} title="Alejar"><ZoomOut size={17} /></button><span>{Math.round(zoom * 100)}%</span><button onClick={() => updateZoom(zoom + .15)} title="Acercar"><ZoomIn size={17} /></button><button onClick={fitWidth} title="Ajustar al ancho"><Maximize2 size={17} /></button>
          <button onClick={toggleBookmark} className={bookmarks.includes(currentPage) ? 'active' : ''} title="Marcar página">{bookmarks.includes(currentPage) ? <BookmarkCheck size={17} /> : <Bookmark size={17} />}</button>
          <button onClick={toggleFavorite} className={favorite ? 'favorite active' : ''} title="Documento favorito"><Heart size={17} fill={favorite ? 'currentColor' : 'none'} /></button>
          <button onClick={() => setNotesOpen(value => !value)} className={notesOpen ? 'active' : ''} title="Notas por página"><PanelRight size={17} /></button>
          <a href={`/api/archivos/serve/${pdf.id}`} target="_blank" rel="noreferrer" title="Abrir aparte"><ExternalLink size={17} /></a><a href={`/api/archivos/serve/${pdf.id}`} download title="Descargar"><Download size={17} /></a>
        </div>
      </header>
      <form className="pdf-searchbar" onSubmit={runSearch}><Search size={16} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar dentro del documento…" /><button disabled={searching}>{searching ? <LoaderCircle className="spin" size={15} /> : 'Buscar'}</button></form>
      {query && results.length > 0 && <div className="pdf-search-results">{results.map(result => <button key={result.page} onClick={() => goToPage(result.page)}><b>Pág. {result.page}</b><span>…{result.excerpt}…</span></button>)}</div>}
      {query && !searching && results.length === 0 && <div className="pdf-search-empty">Sin coincidencias para “{query}”.</div>}
      <div className={`pdf-reader-body ${thumbsOpen ? 'with-thumbs' : ''} ${notesOpen ? 'with-notes' : ''}`}>
        {thumbsOpen && <aside className="pdf-thumbnails">{document && Array.from({ length: totalPages }, (_, index) => <PageThumbnail key={index + 1} document={document} page={index + 1} active={currentPage === index + 1} bookmarked={bookmarks.includes(index + 1)} onSelect={goToPage} />)}</aside>}
        <main ref={stageRef} className="pdf-canvas-stage">{loading && <div className="pdf-reader-state"><LoaderCircle className="spin" /><span>Preparando documento…</span></div>}{error && <div className="pdf-reader-state error"><FileSearch /><span>{error}</span><button onClick={() => window.open(`/api/archivos/serve/${pdf.id}`, '_blank')}>Abrir archivo original</button></div>}<canvas ref={canvasRef} /></main>
        {notesOpen && <aside className="pdf-page-notes"><header><div><small>NOTA DE PÁGINA</small><strong>Página {currentPage}</strong></div><span>{noteStatus === 'saving' ? 'Guardando…' : 'Guardado'}</span></header><textarea value={pageNotes[currentPage] || ''} onChange={event => updateNote(event.target.value)} placeholder="Anotá una idea, una duda o algo para repasar…" /><div className="pdf-bookmark-list"><strong>Marcadores</strong>{bookmarks.length ? bookmarks.map(page => <button key={page} onClick={() => goToPage(page)}><BookmarkCheck size={14} /> Página {page}</button>) : <span>Todavía no marcaste páginas.</span>}</div></aside>}
      </div>
    </div>;
  if (inline) return <div className="pdf-page-view"><header><button onClick={onClose}><ArrowLeft size={17} /> Volver</button><div><span className="eyebrow">Lector PDF</span><strong>{pdf.titulo || pdf.nombreOriginal}</strong></div><span>Modo lectura</span></header>{reader}</div>;
  return <Modal isOpen={isOpen} onClose={onClose} title={pdf.titulo || pdf.nombreOriginal} maxWidth="98vw">{reader}</Modal>;
}
