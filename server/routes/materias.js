import express from 'express';
import { safeReadJson, safeSaveJson, ensureMateriaFolders } from '../utils/safeJsonStorage.js';

const router = express.Router();

function slugify(text) {
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
}

// GET materias with computed metrics
router.get('/', (req, res, next) => {
  try {
    const { periodoId, anio, cuatrimestre } = req.query;
    const espacioId = req.get('x-espacio-id');
    let materias = safeReadJson('materias.json') || [];
    if (espacioId) materias = materias.filter(m => (m.espacioId || 'esp-istea') === espacioId);
    const clases = safeReadJson('clases.json') || [];
    const archivos = safeReadJson('archivos.json') || [];
    const evaluaciones = safeReadJson('evaluaciones.json') || [];
    const progreso = safeReadJson('progreso.json') || [];

    if (periodoId) {
      materias = materias.filter(m => m.periodoId === periodoId);
    } else if (anio && cuatrimestre) {
      materias = materias.filter(m => Number(m.anio) === Number(anio) && m.cuatrimestre === cuatrimestre);
    }

    // Attach enriched metrics
    const enriched = materias.map(mat => {
      const matClases = clases.filter(c => c.materiaId === mat.id);
      const matPdfs = archivos.filter(a => a.materiaId === mat.id && a.tipo === 'pdf');
      
      const matEvals = evaluaciones
        .filter(e => e.materiaId === mat.id && e.estado === 'pendiente')
        .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
      const proximaEvaluacion = matEvals[0] || null;

      const matProg = progreso.find(p => p.materiaId === mat.id);
      let porcentajeProgreso = 0;
      if (matProg && matProg.temas && matProg.temas.length > 0) {
        const aprendidos = matProg.temas.filter(t => t.estado === 'aprendido').length;
        porcentajeProgreso = Math.round((aprendidos / matProg.temas.length) * 100);
      }

      return {
        ...mat,
        cantidadClases: matClases.length,
        cantidadPdfs: matPdfs.length,
        proximaEvaluacion,
        porcentajeProgreso
      };
    });

    res.json(enriched);
  } catch (err) {
    next(err);
  }
});

// GET single materia details
router.get('/:id', (req, res, next) => {
  try {
    const { id } = req.params;
    const materias = safeReadJson('materias.json') || [];
    const mat = materias.find(m => m.id === id);

    if (!mat) {
      return res.status(404).json({ error: 'Materia no encontrada.' });
    }

    const clases = (safeReadJson('clases.json') || []).filter(c => c.materiaId === id);
    const archivos = (safeReadJson('archivos.json') || []).filter(a => a.materiaId === id);
    const evaluaciones = (safeReadJson('evaluaciones.json') || []).filter(e => e.materiaId === id);
    const progData = (safeReadJson('progreso.json') || []).find(p => p.materiaId === id);

    res.json({
      ...mat,
      clases,
      archivos,
      evaluaciones,
      progreso: progData || { materiaId: id, temas: [] }
    });
  } catch (err) {
    next(err);
  }
});

// POST create materia
router.post('/', (req, res, next) => {
  try {
    const {
      nombre, alias, icono, color, profesor, codigoCurso,
      fechaInicio, fechaFin, estado, periodoId, anio, cuatrimestre, planAnio, planPeriodo
    } = req.body;
    const espacioId = req.get('x-espacio-id') || 'esp-istea';

    if (!nombre || !anio || !cuatrimestre) {
      return res.status(400).json({ error: 'Nombre, año y cuatrimestre son obligatorios.' });
    }

    const materias = safeReadJson('materias.json') || [];
    const folderSlug = slugify(alias || nombre);
    const id = `mat-${folderSlug}-${Date.now()}`;

    // Automatically create local folder structure
    ensureMateriaFolders(anio, cuatrimestre, folderSlug);

    const newMateria = {
      id,
      espacioId,
      periodoId: periodoId || `p-${anio}-${cuatrimestre.includes('primer') ? 1 : 2}`,
      anio: Number(anio),
      planAnio: Number(planAnio) || undefined,
      planPeriodo: Number(planPeriodo) || undefined,
      cuatrimestre,
      nombre,
      alias: alias || nombre,
      icono: icono || 'BookOpen',
      color: color || '#3b82f6',
      profesor: profesor || '',
      codigoCurso: codigoCurso || '',
      estado: estado || 'en_curso',
      fechaInicio: fechaInicio || null,
      fechaFin: fechaFin || null,
      folderSlug
    };

    materias.push(newMateria);
    safeSaveJson('materias.json', materias);

    // Initialize progress entry
    const progreso = safeReadJson('progreso.json') || [];
    progreso.push({ id: `prog-${id}`, materiaId: id, temas: [] });
    safeSaveJson('progreso.json', progreso);

    // Una materia creada desde la biblioteca también se incorpora al plan del espacio.
    const storedPlans = safeReadJson('plan-estudios.json');
    const plans = Array.isArray(storedPlans) ? storedPlans : (storedPlans && espacioId === 'esp-istea' ? [{ ...storedPlans, id: 'plan-esp-istea', espacioId: 'esp-istea' }] : []);
    const plan = plans.find(item => item.espacioId === espacioId);
    if (plan) {
      const periodos = safeReadJson('periodos.json') || [];
      const periodo = periodos.find(item => item.id === newMateria.periodoId);
      const existing = (plan.materias || []).find(item => item.materiaId === id || slugify(item.nombre) === slugify(newMateria.nombre));
      if (existing) { existing.materiaId = id; newMateria.planMateriaId = existing.id; }
      else {
        const planItem = {
          id: `plan-mat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          materiaId: id,
          nombre: newMateria.nombre,
          anio: Number(periodo?.planAnio) || 1,
          cuatrimestre: Number(periodo?.planPeriodo) || 1,
          duracion: 'Cuatrimestral',
          estado: newMateria.estado === 'finalizada' ? 'completada' : newMateria.estado === 'en_curso' ? 'en_curso' : 'pendiente',
          icono: newMateria.icono,
          color: newMateria.color,
          orden: (plan.materias || []).length + 1
        };
        plan.materias = [...(plan.materias || []), planItem];
        newMateria.planMateriaId = planItem.id;
      }
      safeSaveJson('materias.json', materias);
      safeSaveJson('plan-estudios.json', plans);
    }

    res.status(201).json(newMateria);
  } catch (err) {
    next(err);
  }
});

// PUT edit materia
router.put('/:id', (req, res, next) => {
  try {
    const { id } = req.params;
    let materias = safeReadJson('materias.json') || [];
    const index = materias.findIndex(m => m.id === id);

    if (index === -1) {
      return res.status(404).json({ error: 'Materia no encontrada.' });
    }

    const current = materias[index];
    materias[index] = {
      ...current,
      ...req.body,
      anio: req.body.anio ? Number(req.body.anio) : current.anio
    };

    safeSaveJson('materias.json', materias);
    const storedPlans = safeReadJson('plan-estudios.json');
    if (Array.isArray(storedPlans)) {
      const plan = storedPlans.find(item => item.espacioId === materias[index].espacioId);
      const planItem = plan?.materias?.find(item => item.id === materias[index].planMateriaId || item.materiaId === id);
      if (planItem) {
        planItem.nombre = materias[index].nombre;
        planItem.icono = materias[index].icono || 'BookOpen';
        planItem.color = materias[index].color || '#3b82f6';
        planItem.estado = materias[index].estado === 'finalizada' ? 'completada' : materias[index].estado === 'en_curso' ? 'en_curso' : 'pendiente';
        safeSaveJson('plan-estudios.json', storedPlans);
      }
    }
    res.json(materias[index]);
  } catch (err) {
    next(err);
  }
});

// DELETE materia
router.delete('/:id', (req, res, next) => {
  try {
    const { id } = req.params;
    let materias = safeReadJson('materias.json') || [];
    materias = materias.filter(m => m.id !== id);
    safeSaveJson('materias.json', materias);

    // Also cleanup linked entries
    let clases = safeReadJson('clases.json') || [];
    clases = clases.filter(c => c.materiaId !== id);
    safeSaveJson('clases.json', clases);

    let evaluaciones = safeReadJson('evaluaciones.json') || [];
    evaluaciones = evaluaciones.filter(e => e.materiaId !== id);
    safeSaveJson('evaluaciones.json', evaluaciones);

    let progreso = safeReadJson('progreso.json') || [];
    progreso = progreso.filter(p => p.materiaId !== id);
    safeSaveJson('progreso.json', progreso);

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
