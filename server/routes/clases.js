import express from 'express';
import { safeReadJson, safeSaveJson } from '../utils/safeJsonStorage.js';

const router = express.Router();

// GET classes
router.get('/', (req, res, next) => {
  try {
    const { materiaId } = req.query;
    let clases = safeReadJson('clases.json') || [];

    if (materiaId) {
      clases = clases.filter(c => c.materiaId === materiaId);
    }

    // Sort automatically by number ascending or date
    clases.sort((a, b) => {
      if (a.numero !== b.numero) return a.numero - b.numero;
      return new Date(a.fecha) - new Date(b.fecha);
    });

    res.json(clases);
  } catch (err) {
    next(err);
  }
});

// POST create class
router.post('/', (req, res, next) => {
  try {
    const { materiaId, numero, titulo, fecha, temasVistos, estado, observaciones } = req.body;

    if (!materiaId || !titulo) {
      return res.status(400).json({ error: 'Materia y Título son obligatorios.' });
    }

    const clases = safeReadJson('clases.json') || [];
    const newClass = {
      id: `cls-${Date.now()}`,
      materiaId,
      numero: Number(numero) || (clases.filter(c => c.materiaId === materiaId).length + 1),
      titulo,
      fecha: fecha || new Date().toISOString().split('T')[0],
      temasVistos: temasVistos || '',
      estado: estado || 'completada',
      observaciones: observaciones || ''
    };

    clases.push(newClass);
    safeSaveJson('clases.json', clases);

    res.status(201).json(newClass);
  } catch (err) {
    next(err);
  }
});

// PUT edit class
router.put('/:id', (req, res, next) => {
  try {
    const { id } = req.params;
    let clases = safeReadJson('clases.json') || [];
    const index = clases.findIndex(c => c.id === id);

    if (index === -1) {
      return res.status(404).json({ error: 'Clase no encontrada.' });
    }

    clases[index] = {
      ...clases[index],
      ...req.body,
      numero: req.body.numero !== undefined ? Number(req.body.numero) : clases[index].numero
    };

    safeSaveJson('clases.json', clases);
    res.json(clases[index]);
  } catch (err) {
    next(err);
  }
});

// DELETE class
router.delete('/:id', (req, res, next) => {
  try {
    const { id } = req.params;
    let clases = safeReadJson('clases.json') || [];
    clases = clases.filter(c => c.id !== id);
    safeSaveJson('clases.json', clases);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
