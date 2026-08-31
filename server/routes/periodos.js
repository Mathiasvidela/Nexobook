import express from 'express';
import { safeReadJson, safeSaveJson } from '../utils/safeJsonStorage.js';

const router = express.Router();

// GET all periods & active config
router.get('/', (req, res, next) => {
  try {
    let periodos = safeReadJson('periodos.json') || [];
    const espacioId = req.get('x-espacio-id');
    if (espacioId) periodos = periodos.filter(p => (p.espacioId || 'esp-istea') === espacioId);
    periodos.sort((a, b) => (Number(a.planAnio || a.anio) - Number(b.planAnio || b.anio)) || (Number(a.planPeriodo || 0) - Number(b.planPeriodo || 0)));
    const localActive = periodos.find(item => item.esActivo) || periodos[0];
    res.json({ periodos, periodoActivoId: localActive?.id || null });
  } catch (err) {
    next(err);
  }
});

// POST create period
router.post('/', (req, res, next) => {
  try {
    const { anio, cuatrimestre, nombre, esActivo } = req.body;
    const espacioId = req.get('x-espacio-id') || 'esp-istea';
    if (!anio || !cuatrimestre) {
      return res.status(400).json({ error: 'Año y cuatrimestre son obligatorios.' });
    }

    const periodos = safeReadJson('periodos.json') || [];
    const config = safeReadJson('configuracion.json') || {};

    const slugCuatri = cuatrimestre.toLowerCase().includes('primer') 
      ? 'primer-cuatrimestre' 
      : 'segundo-cuatrimestre';

    const id = `p-${espacioId}-${anio}-${slugCuatri === 'primer-cuatrimestre' ? 1 : 2}`;

    if (periodos.find(p => p.id === id)) {
      return res.status(400).json({ error: 'Este período académico ya existe.' });
    }

    const newPeriodo = {
      id,
      espacioId,
      anio: Number(anio),
      cuatrimestre: slugCuatri,
      nombre: nombre || `${anio} - ${slugCuatri === 'primer-cuatrimestre' ? '1º' : '2º'} Cuatrimestre`,
      esActivo: !!esActivo,
      fechaInicio: req.body.fechaInicio || null,
      fechaFin: req.body.fechaFin || null
    };

    if (esActivo) {
      periodos.forEach(p => p.esActivo = false);
      config.periodoActivoId = id;
      safeSaveJson('configuracion.json', config);
    }

    periodos.push(newPeriodo);
    safeSaveJson('periodos.json', periodos);

    res.status(201).json(newPeriodo);
  } catch (err) {
    next(err);
  }
});

// PUT edit period
router.put('/:id', (req, res, next) => {
  try {
    const { id } = req.params;
    const { nombre, esActivo, fechaInicio, fechaFin } = req.body;
    let periodos = safeReadJson('periodos.json') || [];
    const config = safeReadJson('configuracion.json') || {};

    const index = periodos.findIndex(p => p.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Período no encontrado.' });
    }

    periodos[index] = {
      ...periodos[index],
      nombre: nombre !== undefined ? nombre : periodos[index].nombre,
      fechaInicio: fechaInicio !== undefined ? fechaInicio : periodos[index].fechaInicio,
      fechaFin: fechaFin !== undefined ? fechaFin : periodos[index].fechaFin,
      esActivo: esActivo !== undefined ? !!esActivo : periodos[index].esActivo
    };

    if (esActivo) {
      periodos.forEach(p => {
        if (p.id !== id) p.esActivo = false;
      });
      config.periodoActivoId = id;
      safeSaveJson('configuracion.json', config);
    }

    safeSaveJson('periodos.json', periodos);
    res.json(periodos[index]);
  } catch (err) {
    next(err);
  }
});

// POST set active period
router.post('/:id/activar', (req, res, next) => {
  try {
    const { id } = req.params;
    let periodos = safeReadJson('periodos.json') || [];
    const config = safeReadJson('configuracion.json') || {};

    const target = periodos.find(p => p.id === id);
    if (!target) {
      return res.status(404).json({ error: 'Período no encontrado.' });
    }

    periodos.forEach(p => {
      if ((p.espacioId || 'esp-istea') === (target.espacioId || 'esp-istea')) p.esActivo = (p.id === id);
    });

    config.periodoActivoId = id;
    safeSaveJson('configuracion.json', config);
    safeSaveJson('periodos.json', periodos);

    res.json({ success: true, periodoActivoId: id });
  } catch (err) {
    next(err);
  }
});

// DELETE period
router.delete('/:id', (req, res, next) => {
  try {
    const { id } = req.params;
    let periodos = safeReadJson('periodos.json') || [];
    periodos = periodos.filter(p => p.id !== id);
    safeSaveJson('periodos.json', periodos);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
