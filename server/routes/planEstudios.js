import express from 'express';
import { safeReadJson, safeSaveJson, ensureMateriaFolders } from '../utils/safeJsonStorage.js';

const router = express.Router();
const DEFAULT_ID = 'esp-istea';
const allowedStatus = ['completada', 'en_curso', 'pendiente'];

function slugify(text) {
  return text.toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]+/g, '').replace(/--+/g, '-');
}
function statusToMateria(status) { return status === 'completada' ? 'finalizada' : status === 'en_curso' ? 'en_curso' : 'proxima'; }
function planPeriodId(espacioId, anio, periodo) { return `p-${espacioId}-plan-${anio}-${periodo}`; }

function syncPlanPeriods(plan) {
  let periodos = safeReadJson('periodos.json') || [];
  const materias = safeReadJson('materias.json') || [];
  const expected = [];
  for (let anio = 1; anio <= plan.estructura.anios; anio += 1) {
    for (let periodo = 1; periodo <= plan.estructura.periodosPorAnio; periodo += 1) {
      const id = planPeriodId(plan.espacioId, anio, periodo);
      expected.push(id);
      const current = periodos.find(item => item.id === id);
      const data = {
        id, espacioId: plan.espacioId, anio, planAnio: anio, planPeriodo: periodo,
        cuatrimestre: `plan-${anio}-${periodo}`,
        nombre: `Año ${anio} · ${plan.estructura.nombrePeriodo} ${periodo}`,
        generadoDesdePlan: true,
        esActivo: current?.esActivo || false,
        fechaInicio: current?.fechaInicio || null,
        fechaFin: current?.fechaFin || null
      };
      if (current) Object.assign(current, data); else periodos.push(data);
    }
  }
  periodos = periodos.filter(item => !item.generadoDesdePlan || item.espacioId !== plan.espacioId || expected.includes(item.id));
  const spacePeriods = periodos.filter(item => item.espacioId === plan.espacioId);
  const legacyUnused = spacePeriods.filter(item => !item.generadoDesdePlan && !materias.some(materia => materia.periodoId === item.id));
  if (plan.espacioId !== DEFAULT_ID) periodos = periodos.filter(item => !legacyUnused.some(legacy => legacy.id === item.id));
  const generated = periodos.filter(item => item.espacioId === plan.espacioId && item.generadoDesdePlan);
  if (!periodos.some(item => item.espacioId === plan.espacioId && item.esActivo) && generated[0]) generated[0].esActivo = true;
  safeSaveJson('periodos.json', periodos);
}

function syncPlanSubjects(plan) {
  const materias = safeReadJson('materias.json') || [];
  const progreso = safeReadJson('progreso.json') || [];
  let changed = false;
  plan.materias.forEach(item => {
    let materia = materias.find(entry => entry.id === item.materiaId || entry.planMateriaId === item.id);
    if (!materia) materia = materias.find(entry => entry.espacioId === plan.espacioId && slugify(entry.nombre) === slugify(item.nombre));
    if (!materia) {
      const folderSlug = slugify(item.nombre) || `materia-${Date.now()}`;
      materia = {
        id: `mat-${plan.espacioId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        espacioId: plan.espacioId,
        planMateriaId: item.id,
        periodoId: planPeriodId(plan.espacioId, item.anio, item.cuatrimestre),
        anio: item.anio,
        planAnio: item.anio,
        planPeriodo: item.cuatrimestre,
        cuatrimestre: `plan-${item.anio}-${item.cuatrimestre}`,
        nombre: item.nombre,
        alias: item.nombre,
        icono: item.icono || 'BookOpen', color: item.color || '#3b82f6', profesor: '', codigoCurso: '',
        estado: statusToMateria(item.estado), fechaInicio: null, fechaFin: null, folderSlug,
        generadoDesdePlan: true
      };
      materias.push(materia);
      progreso.push({ id: `prog-${materia.id}`, materiaId: materia.id, temas: [] });
      ensureMateriaFolders(materia.anio, materia.cuatrimestre, folderSlug);
      changed = true;
    }
    if (!item.icono) { item.icono = materia.icono || 'BookOpen'; changed = true; }
    if (!item.color) { item.color = materia.color || '#3b82f6'; changed = true; }
    if (materia.generadoDesdePlan) {
      const next = {
        nombre: item.nombre,
        estado: statusToMateria(item.estado),
        planAnio: item.anio,
        planPeriodo: item.cuatrimestre,
        periodoId: planPeriodId(plan.espacioId, item.anio, item.cuatrimestre),
        anio: item.anio,
        cuatrimestre: `plan-${item.anio}-${item.cuatrimestre}`,
        icono: item.icono,
        color: item.color
      };
      Object.entries(next).forEach(([key, value]) => { if (materia[key] !== value) { materia[key] = value; changed = true; } });
    }
    if (item.materiaId !== materia.id || materia.planMateriaId !== item.id) {
      item.materiaId = materia.id; materia.planMateriaId = item.id; changed = true;
    }
  });
  if (changed) { safeSaveJson('materias.json', materias); safeSaveJson('progreso.json', progreso); }
  return changed;
}

function normalizePlan(plan, espacioId = DEFAULT_ID) {
  const materias = Array.isArray(plan?.materias) ? plan.materias.map((item, index) => ({ ...item, orden: Number(item.orden) || index + 1 })) : [];
  return {
    id: plan?.id || `plan-${espacioId}`,
    espacioId: plan?.espacioId || espacioId,
    carrera: plan?.carrera || 'Mi plan de estudios',
    estructura: {
      anios: Math.max(1, Number(plan?.estructura?.anios) || Math.max(1, ...materias.map(item => Number(item.anio) || 1))),
      periodosPorAnio: Math.max(1, Number(plan?.estructura?.periodosPorAnio) || 2),
      nombrePeriodo: plan?.estructura?.nombrePeriodo || 'Cuatrimestre'
    },
    materias,
    mostrarCursosBonificados: plan?.mostrarCursosBonificados ?? Boolean(plan?.cursosBonificados?.length),
    cursosBonificados: Array.isArray(plan?.cursosBonificados) ? plan.cursosBonificados : []
  };
}

function readPlans() {
  const stored = safeReadJson('plan-estudios.json');
  if (Array.isArray(stored)) return stored.map(plan => normalizePlan(plan, plan.espacioId));
  const migrated = [normalizePlan(stored || {}, DEFAULT_ID)];
  safeSaveJson('plan-estudios.json', migrated);
  return migrated;
}

function createPlanForSpace(espacioId) {
  const espacios = safeReadJson('espacios.json') || [];
  const espacio = espacios.find(item => item.id === espacioId);
  const materias = (safeReadJson('materias.json') || []).filter(item => item.espacioId === espacioId).map((item, index) => ({
    id: item.id,
    nombre: item.nombre,
    anio: Number(item.planAnio) || 1,
    cuatrimestre: Number(item.planPeriodo) || (item.cuatrimestre?.includes('segundo') ? 2 : 1),
    duracion: item.duracion || 'Cuatrimestral',
    estado: item.estado === 'finalizada' ? 'completada' : item.estado === 'en_curso' ? 'en_curso' : 'pendiente',
    orden: index + 1
  }));
  return normalizePlan({
    espacioId,
    carrera: espacio?.descripcion || espacio?.nombre || 'Mi plan de estudios',
    estructura: { anios: espacio?.duracionAnios || 1, periodosPorAnio: espacio?.periodosPorAnio || 2, nombrePeriodo: espacio?.tipo === 'bootcamp' ? 'Módulo' : 'Cuatrimestre' },
    mostrarCursosBonificados: Boolean(espacio?.tieneCursosBonificados),
    cursosBonificados: [],
    materias
  }, espacioId);
}

function getPlan(espacioId) {
  const plans = readPlans();
  let plan = plans.find(item => item.espacioId === espacioId);
  if (!plan) { plan = createPlanForSpace(espacioId); plans.push(plan); safeSaveJson('plan-estudios.json', plans); }
  syncPlanPeriods(plan);
  if (syncPlanSubjects(plan)) safeSaveJson('plan-estudios.json', plans);
  return { plans, plan };
}

router.get('/', (req, res, next) => {
  try { res.json(getPlan(req.get('x-espacio-id') || DEFAULT_ID).plan); }
  catch (err) { next(err); }
});

router.put('/config', (req, res, next) => {
  try {
    const espacioId = req.get('x-espacio-id') || DEFAULT_ID;
    const { plans, plan } = getPlan(espacioId);
    const { carrera, anios, periodosPorAnio, nombrePeriodo, mostrarCursosBonificados } = req.body;
    if (carrera !== undefined) plan.carrera = String(carrera).trim() || plan.carrera;
    if (anios !== undefined) plan.estructura.anios = Math.min(12, Math.max(1, Number(anios) || 1));
    if (periodosPorAnio !== undefined) plan.estructura.periodosPorAnio = Math.min(6, Math.max(1, Number(periodosPorAnio) || 1));
    if (nombrePeriodo !== undefined) plan.estructura.nombrePeriodo = String(nombrePeriodo).trim() || 'Período';
    if (mostrarCursosBonificados !== undefined) plan.mostrarCursosBonificados = Boolean(mostrarCursosBonificados);
    plan.materias.forEach(item => {
      item.anio = Math.min(plan.estructura.anios, Math.max(1, Number(item.anio) || 1));
      item.cuatrimestre = Math.min(plan.estructura.periodosPorAnio, Math.max(1, Number(item.cuatrimestre) || 1));
    });
    syncPlanPeriods(plan);
    syncPlanSubjects(plan);
    safeSaveJson('plan-estudios.json', plans);
    res.json(plan);
  } catch (err) { next(err); }
});

router.post('/materias', (req, res, next) => {
  try {
    const espacioId = req.get('x-espacio-id') || DEFAULT_ID;
    const { plans, plan } = getPlan(espacioId);
    const { nombre, anio, cuatrimestre, duracion, estado, icono, color } = req.body;
    if (!nombre?.trim()) return res.status(400).json({ error: 'El nombre de la materia es obligatorio.' });
    const materia = {
      id: `plan-mat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      nombre: nombre.trim(),
      anio: Math.min(plan.estructura.anios, Math.max(1, Number(anio) || 1)),
      cuatrimestre: Math.min(plan.estructura.periodosPorAnio, Math.max(1, Number(cuatrimestre) || 1)),
      duracion: String(duracion || 'Cuatrimestral').trim(),
      estado: allowedStatus.includes(estado) ? estado : 'pendiente',
      icono: icono || 'BookOpen',
      color: color || '#3b82f6',
      orden: plan.materias.length + 1
    };
    plan.materias.push(materia);
    syncPlanPeriods(plan);
    syncPlanSubjects(plan);
    safeSaveJson('plan-estudios.json', plans);
    res.status(201).json(materia);
  } catch (err) { next(err); }
});

router.post('/materias/reordenar', (req, res, next) => {
  try {
    const espacioId = req.get('x-espacio-id') || DEFAULT_ID;
    const { plans, plan } = getPlan(espacioId);
    const ids = Array.isArray(req.body.ids) ? req.body.ids : [];
    const positions = new Map(ids.map((id, index) => [id, index + 1]));
    plan.materias.forEach((item, index) => { item.orden = positions.get(item.id) || ids.length + index + 1; });
    plan.materias.sort((a, b) => a.orden - b.orden);
    safeSaveJson('plan-estudios.json', plans);
    res.json(plan.materias);
  } catch (err) { next(err); }
});

router.put('/materias/:id', (req, res, next) => {
  try {
    const espacioId = req.get('x-espacio-id') || DEFAULT_ID;
    const { plans, plan } = getPlan(espacioId);
    const materia = plan.materias.find(item => item.id === req.params.id);
    if (!materia) return res.status(404).json({ error: 'Materia no encontrada en el plan.' });
    const { nombre, anio, cuatrimestre, duracion, estado, icono, color } = req.body;
    if (nombre !== undefined) materia.nombre = String(nombre).trim() || materia.nombre;
    if (anio !== undefined) materia.anio = Math.min(plan.estructura.anios, Math.max(1, Number(anio) || 1));
    if (cuatrimestre !== undefined) materia.cuatrimestre = Math.min(plan.estructura.periodosPorAnio, Math.max(1, Number(cuatrimestre) || 1));
    if (duracion !== undefined) materia.duracion = String(duracion).trim() || materia.duracion;
    if (icono !== undefined) materia.icono = String(icono) || 'BookOpen';
    if (color !== undefined) materia.color = String(color) || '#3b82f6';
    if (estado !== undefined) {
      if (!allowedStatus.includes(estado)) return res.status(400).json({ error: 'Estado académico inválido.' });
      materia.estado = estado;
    }
    const linked = (safeReadJson('materias.json') || []).find(item => item.id === materia.materiaId);
    if (linked) {
      linked.nombre = materia.nombre; linked.alias = linked.alias || materia.nombre;
      linked.estado = statusToMateria(materia.estado);
      linked.planAnio = materia.anio; linked.planPeriodo = materia.cuatrimestre;
      linked.periodoId = planPeriodId(plan.espacioId, materia.anio, materia.cuatrimestre);
      linked.anio = materia.anio; linked.cuatrimestre = `plan-${materia.anio}-${materia.cuatrimestre}`;
      linked.icono = materia.icono || linked.icono || 'BookOpen'; linked.color = materia.color || linked.color || '#3b82f6';
      safeSaveJson('materias.json', (safeReadJson('materias.json') || []).map(item => item.id === linked.id ? linked : item));
    }
    safeSaveJson('plan-estudios.json', plans);
    res.json(materia);
  } catch (err) { next(err); }
});

router.delete('/materias/:id', (req, res, next) => {
  try {
    const espacioId = req.get('x-espacio-id') || DEFAULT_ID;
    const { plans, plan } = getPlan(espacioId);
    const before = plan.materias.length;
    plan.materias = plan.materias.filter(item => item.id !== req.params.id).map((item, index) => ({ ...item, orden: index + 1 }));
    if (plan.materias.length === before) return res.status(404).json({ error: 'Materia no encontrada en el plan.' });
    safeSaveJson('plan-estudios.json', plans);
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.post('/cursos-bonificados', (req, res, next) => {
  try {
    const espacioId = req.get('x-espacio-id') || DEFAULT_ID;
    const { plans, plan } = getPlan(espacioId);
    const nombre = req.body.nombre?.trim();
    if (!nombre) return res.status(400).json({ error: 'El nombre del curso es obligatorio.' });
    plan.cursosBonificados.push(nombre); plan.mostrarCursosBonificados = true;
    safeSaveJson('plan-estudios.json', plans);
    res.status(201).json(plan);
  } catch (err) { next(err); }
});

router.delete('/cursos-bonificados/:index', (req, res, next) => {
  try {
    const espacioId = req.get('x-espacio-id') || DEFAULT_ID;
    const { plans, plan } = getPlan(espacioId);
    const index = Number(req.params.index);
    if (!Number.isInteger(index) || index < 0 || index >= plan.cursosBonificados.length) return res.status(404).json({ error: 'Curso bonificado no encontrado.' });
    plan.cursosBonificados.splice(index, 1);
    safeSaveJson('plan-estudios.json', plans);
    res.json(plan);
  } catch (err) { next(err); }
});

export default router;
