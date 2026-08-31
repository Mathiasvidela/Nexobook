import React, { useEffect, useState } from 'react';
import { FileText, GraduationCap, RotateCcw, Trash2 } from 'lucide-react';
import { api } from '../../services/api.js';
import LoadingSpinner from '../common/LoadingSpinner.jsx';
import EmptyState from '../common/EmptyState.jsx';
import ConfirmModal from '../common/ConfirmModal.jsx';

const LABELS = { materia: 'Materia', archivo: 'Documento', evaluacion: 'Evaluación' };

export default function PapeleraView({ addToast }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const [bulkAction, setBulkAction] = useState(null);

  const load = async () => {
    try { setLoading(true); setItems(await api.getPapelera()); }
    catch (err) { addToast?.(err.message, 'error'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const restore = async item => {
    try {
      await api.restaurarPapelera(item.id);
      setItems(current => current.filter(entry => entry.id !== item.id));
      addToast?.(item.tipo === 'materia' ? 'Materia y contenido restaurados.' : 'Elemento restaurado.', 'success');
    } catch (err) { addToast?.(err.message, 'error'); }
  };
  const remove = async () => {
    if (!deleting) return;
    try {
      await api.eliminarPermanente(deleting.id);
      setItems(current => current.filter(entry => entry.id !== deleting.id));
      addToast?.('Elemento eliminado definitivamente.', 'success');
    } catch (err) { addToast?.(err.message, 'error'); }
    finally { setDeleting(null); }
  };
  const runBulkAction = async () => {
    try {
      if (bulkAction === 'restore') {
        await api.restaurarTodaPapelera();
        addToast?.(`${items.length} elementos restaurados.`, 'success');
      } else {
        await api.vaciarPapelera();
        addToast?.('Papelera vaciada definitivamente.', 'success');
      }
      setItems([]);
    } catch (err) { addToast?.(err.message, 'error'); }
    finally { setBulkAction(null); }
  };

  if (loading) return <LoadingSpinner message="Abriendo papelera…" />;
  return <div className="trash-page">
    <header className="trash-head">
      <div><span className="eyebrow">Recuperación</span><h1>Papelera</h1><p>Podés recuperar lo eliminado o borrarlo definitivamente cuando estés seguro.</p></div>
      {!!items.length && <div className="trash-head-actions"><button onClick={() => setBulkAction('restore')}><RotateCcw size={15} /> Restaurar todo</button><button className="danger" onClick={() => setBulkAction('empty')}><Trash2 size={15} /> Vaciar papelera</button></div>}
    </header>
    {!items.length ? <EmptyState icon={Trash2} title="La papelera está vacía" description="Los documentos, materias y evaluaciones que elimines aparecerán aquí." /> : <div className="trash-list">{items.map(item => {
      const relatedCount = Object.values(item.related || {}).reduce((total, records) => total + (records?.length || 0), 0);
      return <article key={item.id}>
        <div className={`trash-icon ${item.tipo}`}>{item.tipo === 'materia' ? <GraduationCap size={18} /> : <FileText size={18} />}</div>
        <div><strong>{item.nombre}</strong><span>{LABELS[item.tipo]}{item.tipo !== 'materia' && item.materiaNombre ? ` · ${item.materiaNombre}` : ''}{relatedCount ? ` · ${relatedCount} elementos vinculados` : ''} · Eliminado {new Date(item.eliminadoEn).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span></div>
        <button onClick={() => restore(item)}><RotateCcw size={15} /> Restaurar</button>
        <button className="danger" title="Eliminar definitivamente" onClick={() => setDeleting(item)}><Trash2 size={15} /></button>
      </article>;
    })}</div>}
    <ConfirmModal isOpen={Boolean(deleting)} onClose={() => setDeleting(null)} onConfirm={remove} title="Eliminar definitivamente" message={`“${deleting?.nombre || 'Este elemento'}” y su contenido asociado ya no podrán recuperarse.`} confirmText="Eliminar definitivamente" />
    <ConfirmModal isOpen={Boolean(bulkAction)} onClose={() => setBulkAction(null)} onConfirm={runBulkAction} title={bulkAction === 'restore' ? 'Restaurar todo' : 'Vaciar papelera'} message={bulkAction === 'restore' ? `Se restaurarán los ${items.length} elementos de este espacio.` : `Se eliminarán definitivamente los ${items.length} elementos y sus archivos. Esta acción no se puede deshacer.`} confirmText={bulkAction === 'restore' ? 'Restaurar todo' : 'Vaciar definitivamente'} />
  </div>;
}
