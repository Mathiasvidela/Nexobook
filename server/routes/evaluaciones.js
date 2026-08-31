import express from 'express';
import { safeReadJson, safeSaveJson } from '../utils/safeJsonStorage.js';

const router = express.Router();

// GET evaluations
router.get('/', (req, res, next) => {
  try {
    const { materiaId, estado } = req.query;
    let evaluaciones = safeReadJson('evaluaciones.json') || [];

    if (materiaId) {
      evaluaciones = evaluaciones.filter(e => e.materiaId === materiaId);
    }
    if (estado) {
      evaluaciones = evaluaciones.filter(e => e.estado === estado);
    }

    // Sort by date ascending
    evaluaciones.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

    res.json(evaluaciones);
  } catch (err) {
    next(err);
  }
});

// POST create evaluation
router.post('/', (req, res, next) => {
  try {
    const { materiaId, titulo, tipo, fecha, prioridad, estado, temasIncluidos, nota, observaciones } = req.body;

    if (!materiaId || !titulo || !fecha) {
      return res.status(400).json({ error: 'Materia, Título y Fecha son obligatorios.' });
    }

    const evaluaciones = safeReadJson('evaluaciones.json') || [];
    const newEval = {
      id: `eval-${Date.now()}`,
      materiaId,
      titulo,
      tipo: tipo || 'parcial',
      fecha,
      prioridad: prioridad || 'media',
      estado: estado || 'pendiente',
      temasIncluidos: temasIncluidos || '',
      nota: nota !== undefined && nota !== '' ? Number(nota) : null,
      observaciones: observaciones || ''
    };

    evaluaciones.push(newEval);
    safeSaveJson('evaluaciones.json', evaluaciones);

    res.status(201).json(newEval);
  } catch (err) {
    next(err);
  }
});

// PUT edit evaluation
router.put('/:id', (req, res, next) => {
  try {
    const { id } = req.params;
    let evaluaciones = safeReadJson('evaluaciones.json') || [];
    const index = evaluaciones.findIndex(e => e.id === id);

    if (index === -1) {
      return res.status(404).json({ error: 'Evaluación no encontrada.' });
    }

    evaluaciones[index] = {
      ...evaluaciones[index],
      ...req.body,
      nota: req.body.nota !== undefined && req.body.nota !== '' ? Number(req.body.nota) : evaluaciones[index].nota
    };

    safeSaveJson('evaluaciones.json', evaluaciones);
    res.json(evaluaciones[index]);
  } catch (err) {
    next(err);
  }
});

// DELETE evaluation
router.delete('/:id', (req, res, next) => {
  try {
    const { id } = req.params;
    let evaluaciones = safeReadJson('evaluaciones.json') || [];
    evaluaciones = evaluaciones.filter(e => e.id !== id);
    safeSaveJson('evaluaciones.json', evaluaciones);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
