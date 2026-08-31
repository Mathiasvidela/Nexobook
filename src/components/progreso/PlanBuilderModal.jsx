import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Gift, Pencil, Plus, Save, Trash2 } from 'lucide-react';
import Modal from '../common/Modal.jsx';
import { api } from '../../services/api.js';

export default function PlanBuilderModal({ isOpen, onClose, plan, onChanged, onOpenMateria, addToast }) {
  const [config, setConfig] = useState({ carrera: '', anios: 1, periodosPorAnio: 2, nombrePeriodo: 'Cuatrimestre', mostrarCursosBonificados: false });
  const [bonusName, setBonusName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!plan || !isOpen) return;
    setConfig({ carrera: plan.carrera || '', anios: plan.estructura?.anios || 1, periodosPorAnio: plan.estructura?.periodosPorAnio || 2, nombrePeriodo: plan.estructura?.nombrePeriodo || 'Cuatrimestre', mostrarCursosBonificados: Boolean(plan.mostrarCursosBonificados) });
    setBonusName('');
  }, [plan, isOpen]);

  const ordered = useMemo(() => [...(plan?.materias || [])].sort((a, b) => (a.orden || 0) - (b.orden || 0)), [plan]);
  const refresh = async message => { await onChanged?.(); if (message) addToast?.(message, 'success'); };
  const saveConfig = async () => {
    try { setSaving(true); await api.configurePlanEstudios(config); await refresh('Estructura del plan actualizada.'); }
    catch (err) { addToast?.(err.message, 'error'); }
    finally { setSaving(false); }
  };
  const remove = async item => {
    if (!window.confirm(`¿Quitar “${item.nombre}” del plan? Esto no elimina una materia activa ni sus archivos.`)) return;
    try { await api.deletePlanMateria(item.id); await refresh('Materia quitada del plan.'); }
    catch (err) { addToast?.(err.message, 'error'); }
  };
  const move = async (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= ordered.length) return;
    const next = [...ordered]; [next[index], next[target]] = [next[target], next[index]];
    try { await api.reorderPlanMaterias(next.map(item => item.id)); await onChanged?.(); }
    catch (err) { addToast?.(err.message, 'error'); }
  };
  const addBonus = async event => {
    event.preventDefault(); if (!bonusName.trim()) return;
    try { await api.addCursoBonificado(bonusName); setBonusName(''); await refresh('Curso bonificado agregado.'); }
    catch (err) { addToast?.(err.message, 'error'); }
  };
  const removeBonus = async index => {
    try { await api.deleteCursoBonificado(index); await refresh('Curso bonificado quitado.'); }
    catch (err) { addToast?.(err.message, 'error'); }
  };

  return <Modal isOpen={isOpen} onClose={onClose} title="Editar plan de estudios" maxWidth="1040px">
    <div className="plan-builder">
      <section className="plan-builder-config"><div><span className="eyebrow">Estructura</span><h3>Organización del recorrido</h3><p>Definí la duración y después ubicá cada materia en su período.</p></div><div className="plan-config-grid"><label><span>Nombre del plan</span><input value={config.carrera} onChange={e => setConfig({ ...config, carrera: e.target.value })} /></label><label><span>Años</span><input type="number" min="1" max="12" value={config.anios} onChange={e => setConfig({ ...config, anios: Number(e.target.value) })} /></label><label><span>Períodos por año</span><input type="number" min="1" max="6" value={config.periodosPorAnio} onChange={e => setConfig({ ...config, periodosPorAnio: Number(e.target.value) })} /></label><label><span>Nombre de cada período</span><input value={config.nombrePeriodo} onChange={e => setConfig({ ...config, nombrePeriodo: e.target.value })} placeholder="Cuatrimestre, semestre, módulo…" /></label></div><label className="plan-switch"><input type="checkbox" checked={config.mostrarCursosBonificados} onChange={e => setConfig({ ...config, mostrarCursosBonificados: e.target.checked })} /><span>Este plan incluye cursos bonificados</span></label><button className="btn btn-secondary" onClick={saveConfig} disabled={saving}><Save size={15} /> Guardar estructura</button></section>

      <section className="plan-builder-subjects single"><div className="plan-builder-column"><div className="plan-builder-list-head"><div><span className="eyebrow">Materias</span><h3>{ordered.length} cargadas</h3></div><button className="btn btn-primary" onClick={() => { onClose(); onOpenMateria?.(null); }}><Plus size={15} /> Nueva materia</button></div><div className="plan-builder-list">{ordered.map((item, index) => <article key={item.id}><div className="plan-order-actions"><button disabled={index === 0} onClick={() => move(index, -1)} title="Subir"><ArrowUp size={13} /></button><button disabled={index === ordered.length - 1} onClick={() => move(index, 1)} title="Bajar"><ArrowDown size={13} /></button></div><div><strong>{item.nombre}</strong><span>Año {item.anio} · {config.nombrePeriodo} {item.cuatrimestre} · {item.duracion}</span></div><button onClick={() => { onClose(); onOpenMateria?.(item.materiaId); }} title="Editar"><Pencil size={14} /></button><button className="danger" onClick={() => remove(item)} title="Quitar"><Trash2 size={14} /></button></article>)}</div></div></section>

      {config.mostrarCursosBonificados && <section className="plan-builder-bonus"><div><Gift size={18} /><span><strong>Cursos bonificados</strong><small>Formación adicional incluida en este perfil.</small></span></div><form onSubmit={addBonus}><input value={bonusName} onChange={e => setBonusName(e.target.value)} placeholder="Nombre del curso" /><button className="btn btn-secondary"><Plus size={15} /> Agregar</button></form><div>{(plan?.cursosBonificados || []).map((course, index) => <span key={`${course}-${index}`}>{course}<button onClick={() => removeBonus(index)}><Trash2 size={12} /></button></span>)}</div></section>}
    </div>
  </Modal>;
}
