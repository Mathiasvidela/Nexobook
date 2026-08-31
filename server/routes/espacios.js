import express from 'express';
import { safeReadJson, safeSaveJson } from '../utils/safeJsonStorage.js';

const router = express.Router();
const DEFAULT_ID = 'esp-istea';
const TEMPLATES = {
  universidad: { tipo: 'universidad', anios: 5, periodos: 2, periodo: year => ({ anio: year, cuatrimestre: 'primer-cuatrimestre', nombre: `${year} · 1º Cuatrimestre` }), icono: 'graduation' },
  tecnicatura: { tipo: 'tecnicatura', anios: 2, periodos: 2, periodo: year => ({ anio: year, cuatrimestre: 'primer-cuatrimestre', nombre: `${year} · 1º Cuatrimestre` }), icono: 'graduation' },
  bootcamp: { tipo: 'bootcamp', anios: 1, periodos: 4, periodo: year => ({ anio: year, cuatrimestre: 'cohorte-actual', nombre: 'Cohorte actual' }), icono: 'code' },
  curso_corto: { tipo: 'curso', anios: 1, periodos: 1, periodo: year => ({ anio: year, cuatrimestre: 'curso-actual', nombre: 'Curso actual' }), icono: 'book' },
  autodidacta: { tipo: 'autodidacta', anios: 1, periodos: 1, periodo: year => ({ anio: year, cuatrimestre: 'ruta-actual', nombre: 'Ruta de aprendizaje' }), icono: 'compass' }
};

function ensureSpaces() {
  let espacios = safeReadJson('espacios.json');
  if (!Array.isArray(espacios)) {
    espacios = [];
    safeSaveJson('espacios.json', espacios);
  }
  let changedSpaces = false;
  espacios.forEach(item => {
    const template = TEMPLATES[item.plantilla] || Object.values(TEMPLATES).find(candidate => candidate.tipo === item.tipo) || TEMPLATES.curso_corto;
    if (!item.plantilla) { item.plantilla = Object.keys(TEMPLATES).find(key => TEMPLATES[key].tipo === item.tipo) || 'curso_corto'; changedSpaces = true; }
    if (!Number(item.duracionAnios)) { item.duracionAnios = template.anios; changedSpaces = true; }
    if (!Number(item.periodosPorAnio)) { item.periodosPorAnio = template.periodos; changedSpaces = true; }
    if (item.tieneCursosBonificados === undefined) { item.tieneCursosBonificados = item.id === DEFAULT_ID; changedSpaces = true; }
  });
  if (changedSpaces) safeSaveJson('espacios.json', espacios);
  const periodos = safeReadJson('periodos.json') || [];
  const materias = safeReadJson('materias.json') || [];
  let changedPeriods = false, changedSubjects = false;
  periodos.forEach(item => { if (!item.espacioId) { item.espacioId = DEFAULT_ID; changedPeriods = true; } });
  materias.forEach(item => { if (!item.espacioId) { item.espacioId = DEFAULT_ID; changedSubjects = true; } });
  if (changedPeriods) safeSaveJson('periodos.json', periodos);
  if (changedSubjects) safeSaveJson('materias.json', materias);
  return espacios;
}

router.get('/', (req, res, next) => {
  try { res.json(ensureSpaces()); } catch (err) { next(err); }
});

router.post('/', (req, res, next) => {
  try {
    const { nombre, tipo, plantilla, descripcion, color, duracionAnios, periodosPorAnio, tieneCursosBonificados } = req.body;
    if (!nombre?.trim()) return res.status(400).json({ error: 'El nombre del espacio es obligatorio.' });
    const espacios = ensureSpaces();
    const id = `esp-${Date.now()}`;
    const templateId = TEMPLATES[plantilla] ? plantilla : (TEMPLATES[tipo] ? tipo : 'curso_corto');
    const template = TEMPLATES[templateId];
    const nuevo = { id, nombre: nombre.trim(), tipo: template.tipo, plantilla: templateId, descripcion: descripcion?.trim() || 'Nuevo espacio de estudio', color: color || '#8b5cf6', icono: template.icono, duracionAnios: Math.min(12, Math.max(1, Number(duracionAnios) || template.anios)), periodosPorAnio: Math.min(6, Math.max(1, Number(periodosPorAnio) || template.periodos)), tieneCursosBonificados: Boolean(tieneCursosBonificados), fechaCreacion: new Date().toISOString() };
    espacios.push(nuevo); safeSaveJson('espacios.json', espacios);
    const year = new Date().getFullYear();
    const periodos = safeReadJson('periodos.json') || [];
    const initialPeriod = template.periodo(year);
    periodos.push({ id: `p-${id}-${year}`, espacioId: id, ...initialPeriod, esActivo: true, fechaInicio: new Date().toISOString().slice(0, 10), fechaFin: null });
    safeSaveJson('periodos.json', periodos);
    res.status(201).json(nuevo);
  } catch (err) { next(err); }
});

router.put('/:id', (req, res, next) => {
  try {
    const espacios = ensureSpaces(); const index = espacios.findIndex(e => e.id === req.params.id);
    if (index < 0) return res.status(404).json({ error: 'Espacio no encontrado.' });
    espacios[index] = { ...espacios[index], ...req.body, id: espacios[index].id };
    safeSaveJson('espacios.json', espacios); res.json(espacios[index]);
  } catch (err) { next(err); }
});

router.delete('/:id', (req, res, next) => {
  try {
    const espacios = ensureSpaces();
    const index = espacios.findIndex(item => item.id === req.params.id);
    if (index < 0) return res.status(404).json({ error: 'Espacio no encontrado.' });
    espacios[index] = { ...espacios[index], archivado: true, archivadoEn: new Date().toISOString() };
    safeSaveJson('espacios.json', espacios);
    res.json({ success: true, espacio: espacios[index] });
  } catch (err) { next(err); }
});

export default router;
