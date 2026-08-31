import express from 'express';
import fs from 'fs';
import { safeReadJson, safeSaveJson } from '../utils/safeJsonStorage.js';
import { validateSafePath } from '../utils/pathSecurity.js';

const router = express.Router();
const SOURCES = { materia: 'materias.json', archivo: 'archivos.json', evaluacion: 'evaluaciones.json' };
const RELATED_SOURCES = [
  { key: 'archivos', file: 'archivos.json' },
  { key: 'clases', file: 'clases.json' },
  { key: 'evaluaciones', file: 'evaluaciones.json' },
  { key: 'progreso', file: 'progreso.json' }
];

function read(file) { return safeReadJson(file) || []; }
function uniquePush(target, records) {
  records.forEach(record => { if (!target.some(item => item.id === record.id)) target.push(record); });
}
function removePhysicalFiles(item) {
  const records = item.tipo === 'archivo' ? [item.record] : (item.related?.archivos || []);
  records.forEach(record => {
    if (!record?.relativePath) return;
    try {
      const file = validateSafePath(record.relativePath);
      if (fs.existsSync(file)) fs.unlinkSync(file);
    } catch { /* La metadata sigue pudiendo eliminarse aunque el archivo ya no exista. */ }
  });
}
function restoreItem(item) {
  const sourceName = SOURCES[item.tipo];
  const source = read(sourceName);
  uniquePush(source, [item.record]);
  safeSaveJson(sourceName, source);
  if (item.tipo === 'materia' && item.related) {
    RELATED_SOURCES.forEach(({ key, file }) => {
      const records = item.related[key] || [];
      if (!records.length) return;
      const current = read(file);
      uniquePush(current, records);
      safeSaveJson(file, current);
    });
  }
}

router.get('/', (req, res, next) => {
  try {
    const espacioId = req.get('x-espacio-id');
    let items = read('papelera.json');
    if (espacioId) items = items.filter(item => (item.espacioId || 'esp-istea') === espacioId);
    res.json(items.sort((a, b) => new Date(b.eliminadoEn) - new Date(a.eliminadoEn)));
  } catch (err) { next(err); }
});

router.post('/mover/:tipo/:id', (req, res, next) => {
  try {
    const { tipo, id } = req.params;
    const sourceName = SOURCES[tipo];
    if (!sourceName) return res.status(400).json({ error: 'Tipo de elemento inválido.' });
    const source = read(sourceName);
    const index = source.findIndex(item => item.id === id);
    if (index < 0) return res.status(404).json({ error: 'Elemento no encontrado.' });

    const [record] = source.splice(index, 1);
    const related = {};
    if (tipo === 'materia') {
      RELATED_SOURCES.forEach(({ key, file }) => {
        const records = read(file);
        related[key] = records.filter(entry => entry.materiaId === id);
        safeSaveJson(file, records.filter(entry => entry.materiaId !== id));
      });
    }
    safeSaveJson(sourceName, source);

    const materias = read('materias.json');
    const materia = tipo === 'materia' ? record : materias.find(item => item.id === record.materiaId);
    const trash = read('papelera.json');
    const item = {
      id: `trash-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      tipo,
      originalId: id,
      espacioId: record.espacioId || materia?.espacioId || req.get('x-espacio-id') || 'esp-istea',
      materiaNombre: materia?.nombre || null,
      nombre: record.titulo || record.nombre || record.nombreOriginal || 'Sin título',
      eliminadoEn: new Date().toISOString(),
      record,
      ...(tipo === 'materia' ? { related } : {})
    };
    trash.push(item);
    safeSaveJson('papelera.json', trash);
    res.json(item);
  } catch (err) { next(err); }
});

router.post('/restaurar-todo', (req, res, next) => {
  try {
    const espacioId = req.get('x-espacio-id');
    const trash = read('papelera.json');
    const selected = trash.filter(item => !espacioId || (item.espacioId || 'esp-istea') === espacioId);
    selected.forEach(restoreItem);
    safeSaveJson('papelera.json', trash.filter(item => !selected.some(entry => entry.id === item.id)));
    res.json({ success: true, restored: selected.length });
  } catch (err) { next(err); }
});

router.post('/:id/restaurar', (req, res, next) => {
  try {
    const trash = read('papelera.json');
    const index = trash.findIndex(item => item.id === req.params.id);
    if (index < 0) return res.status(404).json({ error: 'Elemento no encontrado en la papelera.' });
    const item = trash[index];
    restoreItem(item);
    trash.splice(index, 1);
    safeSaveJson('papelera.json', trash);
    res.json(item.record);
  } catch (err) { next(err); }
});

router.delete('/', (req, res, next) => {
  try {
    const espacioId = req.get('x-espacio-id');
    const trash = read('papelera.json');
    const selected = trash.filter(item => !espacioId || (item.espacioId || 'esp-istea') === espacioId);
    selected.forEach(removePhysicalFiles);
    safeSaveJson('papelera.json', trash.filter(item => !selected.some(entry => entry.id === item.id)));
    res.json({ success: true, deleted: selected.length });
  } catch (err) { next(err); }
});

router.delete('/:id', (req, res, next) => {
  try {
    let trash = read('papelera.json');
    const item = trash.find(entry => entry.id === req.params.id);
    if (!item) return res.status(404).json({ error: 'Elemento no encontrado.' });
    removePhysicalFiles(item);
    trash = trash.filter(entry => entry.id !== req.params.id);
    safeSaveJson('papelera.json', trash);
    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
