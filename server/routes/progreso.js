import express from 'express';
import { safeReadJson, safeSaveJson } from '../utils/safeJsonStorage.js';

const router = express.Router();

// GET progress for all materias or a specific materia
router.get('/', (req, res, next) => {
  try {
    const { materiaId } = req.query;
    const progreso = safeReadJson('progreso.json') || [];

    if (materiaId) {
      const match = progreso.find(p => p.materiaId === materiaId);
      return res.json(match || { materiaId, temas: [] });
    }

    res.json(progreso);
  } catch (err) {
    next(err);
  }
});

// POST add topic to a materia
router.post('/tema', (req, res, next) => {
  try {
    const { materiaId, titulo, estado } = req.body;
    if (!materiaId || !titulo) {
      return res.status(400).json({ error: 'Materia y Título de tema son obligatorios.' });
    }

    let progreso = safeReadJson('progreso.json') || [];
    let matProg = progreso.find(p => p.materiaId === materiaId);

    if (!matProg) {
      matProg = { id: `prog-${materiaId}`, materiaId, temas: [] };
      progreso.push(matProg);
    }

    const newTema = {
      id: `t-${Date.now()}`,
      titulo,
      estado: estado || 'pendiente', // pendiente, estudiando, repasar, aprendido
      ultimaFechaEstudio: new Date().toISOString().split('T')[0]
    };

    matProg.temas.push(newTema);
    safeSaveJson('progreso.json', progreso);

    res.status(201).json(newTema);
  } catch (err) {
    next(err);
  }
});

// PUT update topic status / title
router.put('/tema/:temaId', (req, res, next) => {
  try {
    const { temaId } = req.params;
    const { materiaId, estado, titulo } = req.body;

    if (!materiaId) {
      return res.status(400).json({ error: 'materiaId es obligatorio.' });
    }

    let progreso = safeReadJson('progreso.json') || [];
    const matProg = progreso.find(p => p.materiaId === materiaId);

    if (!matProg) {
      return res.status(404).json({ error: 'Progreso de la materia no encontrado.' });
    }

    const temaIndex = matProg.temas.findIndex(t => t.id === temaId);
    if (temaIndex === -1) {
      return res.status(404).json({ error: 'Tema no encontrado.' });
    }

    matProg.temas[temaIndex] = {
      ...matProg.temas[temaIndex],
      estado: estado !== undefined ? estado : matProg.temas[temaIndex].estado,
      titulo: titulo !== undefined ? titulo : matProg.temas[temaIndex].titulo,
      ultimaFechaEstudio: new Date().toISOString().split('T')[0]
    };

    safeSaveJson('progreso.json', progreso);
    res.json(matProg.temas[temaIndex]);
  } catch (err) {
    next(err);
  }
});

// DELETE topic
router.delete('/tema/:temaId', (req, res, next) => {
  try {
    const { temaId } = req.params;
    const { materiaId } = req.query;

    if (!materiaId) {
      return res.status(400).json({ error: 'materiaId es obligatorio en query params.' });
    }

    let progreso = safeReadJson('progreso.json') || [];
    const matProg = progreso.find(p => p.materiaId === materiaId);

    if (matProg) {
      matProg.temas = matProg.temas.filter(t => t.id !== temaId);
      safeSaveJson('progreso.json', progreso);
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
