import express from 'express';
import path from 'path';
import fs from 'fs';
import { safeReadJson, safeSaveJson, ensureMateriaFolders } from '../utils/safeJsonStorage.js';
import { validateSafePath, getStorageRoot } from '../utils/pathSecurity.js';

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

// GET all summaries / notes metadata
router.get('/', (req, res, next) => {
  try {
    const { materiaId, tipo } = req.query; // tipo: 'resumen' | 'apunte'
    const archivos = safeReadJson('archivos.json') || [];

    let filtered = archivos.filter(a => a.tipo === 'markdown' || a.tipo === 'richtext');
    if (materiaId) {
      filtered = filtered.filter(a => a.materiaId === materiaId);
    }
    if (tipo) {
      filtered = filtered.filter(a => a.subtipo === (tipo === 'resumen' ? 'resumenes' : 'apuntes'));
    }

    res.json(filtered);
  } catch (err) {
    next(err);
  }
});

// GET single Markdown document content
router.get('/:id', (req, res, next) => {
  try {
    const { id } = req.params;
    const archivos = safeReadJson('archivos.json') || [];
    const arc = archivos.find(a => a.id === id);

    if (!arc) {
      return res.status(404).json({ error: 'Resumen/Apunte no encontrado.' });
    }

    const fullPath = validateSafePath(arc.relativePath);
    let contenido = '';
    if (fs.existsSync(fullPath)) {
      contenido = fs.readFileSync(fullPath, 'utf8');
    }

    res.json({
      ...arc,
      contenido
    });
  } catch (err) {
    next(err);
  }
});

// POST create Markdown summary / note
router.post('/', (req, res, next) => {
  try {
    const { materiaId, titulo, tipo, claseId, pdfId, contenido, formato } = req.body;

    if (!materiaId || !titulo) {
      return res.status(400).json({ error: 'Materia y Título son obligatorios.' });
    }

    const materias = safeReadJson('materias.json') || [];
    const materia = materias.find(m => m.id === materiaId);
    if (!materia) {
      return res.status(404).json({ error: 'Materia no encontrada.' });
    }

    const isApunte = (tipo === 'apunte');
    const folderSub = isApunte ? 'apuntes' : 'resumenes';
    const materiaFolderPath = ensureMateriaFolders(materia.anio, materia.cuatrimestre, materia.folderSlug);
    const targetDir = path.join(materiaFolderPath, folderSub);

    const filenameSlug = slugify(titulo) || `documento-${Date.now()}`;
    const isRichText = formato === 'html';
    const extension = isRichText ? '.html' : '.md';
    let filename = `${filenameSlug}${extension}`;
    let counter = 1;
    while (fs.existsSync(path.join(targetDir, filename))) {
      filename = `${filenameSlug}-${counter}${extension}`;
      counter++;
    }

    const fullPath = path.join(targetDir, filename);
    const fileContent = contenido || `# ${titulo}\n\nEscribe tus notas aquí...\n`;
    fs.writeFileSync(fullPath, fileContent, 'utf8');

    const relativePath = path.relative(getStorageRoot(), fullPath).replace(/\\/g, '/');

    const newDoc = {
      id: `doc-${Date.now()}`,
      materiaId,
      anio: materia.anio,
      cuatrimestre: materia.cuatrimestre,
      claseId: claseId || null,
      pdfId: pdfId || null,
      titulo,
      nombreOriginal: filename,
      nombreFisico: filename,
      relativePath: `storage/${relativePath}`,
      tipo: isRichText ? 'richtext' : 'markdown',
      formato: isRichText ? 'html' : 'markdown',
      subtipo: folderSub,
      tamano: Buffer.byteLength(fileContent, 'utf8'),
      fechaCarga: new Date().toISOString(),
      fechaModificacion: new Date().toISOString()
    };

    const archivos = safeReadJson('archivos.json') || [];
    archivos.push(newDoc);
    safeSaveJson('archivos.json', archivos);

    res.status(201).json({
      ...newDoc,
      contenido: fileContent
    });
  } catch (err) {
    next(err);
  }
});

// PUT update Markdown summary / note
router.put('/:id', (req, res, next) => {
  try {
    const { id } = req.params;
    const { titulo, contenido, claseId, pdfId, formato, ultimaApertura, favorito } = req.body;

    let archivos = safeReadJson('archivos.json') || [];
    const index = archivos.findIndex(a => a.id === id);

    if (index === -1) {
      return res.status(404).json({ error: 'Documento no encontrado.' });
    }

    const current = archivos[index];
    const fullPath = validateSafePath(current.relativePath);

    if (contenido !== undefined) {
      fs.writeFileSync(fullPath, contenido, 'utf8');
      current.tamano = Buffer.byteLength(contenido, 'utf8');
    }

    if (titulo !== undefined) {
      current.titulo = titulo;
    }
    if (formato === 'html') {
      current.tipo = 'richtext';
      current.formato = 'html';
    }
    if (claseId !== undefined) current.claseId = claseId;
    if (pdfId !== undefined) current.pdfId = pdfId;
    if (ultimaApertura !== undefined) current.ultimaApertura = ultimaApertura;
    if (favorito !== undefined) current.favorito = Boolean(favorito);

    current.fechaModificacion = new Date().toISOString();

    archivos[index] = current;
    safeSaveJson('archivos.json', archivos);

    res.json({
      ...current,
      contenido: contenido !== undefined ? contenido : (fs.existsSync(fullPath) ? fs.readFileSync(fullPath, 'utf8') : '')
    });
  } catch (err) {
    next(err);
  }
});

// POST move a summary/note to another subject, including its local file.
router.post('/:id/mover', (req, res, next) => {
  try {
    const { materiaId } = req.body;
    const archivos = safeReadJson('archivos.json') || [];
    const index = archivos.findIndex(item => item.id === req.params.id && (item.tipo === 'markdown' || item.tipo === 'richtext'));
    if (index < 0) return res.status(404).json({ error: 'Documento no encontrado.' });
    const materias = safeReadJson('materias.json') || [];
    const materia = materias.find(item => item.id === materiaId);
    if (!materia) return res.status(404).json({ error: 'Materia destino no encontrada.' });

    const current = archivos[index];
    const source = validateSafePath(current.relativePath);
    const targetRoot = ensureMateriaFolders(materia.anio, materia.cuatrimestre, materia.folderSlug);
    const targetFolder = path.join(targetRoot, current.subtipo === 'apuntes' ? 'apuntes' : 'resumenes');
    const extension = path.extname(current.nombreFisico || source) || (current.formato === 'html' ? '.html' : '.md');
    const base = path.basename(current.nombreFisico || `documento${extension}`, extension);
    let filename = `${base}${extension}`; let counter = 1;
    while (fs.existsSync(path.join(targetFolder, filename))) filename = `${base}-${counter++}${extension}`;
    const target = path.join(targetFolder, filename);
    if (fs.existsSync(source)) fs.renameSync(source, target);

    const relativePath = path.relative(getStorageRoot(), target).replace(/\\/g, '/');
    archivos[index] = { ...current, materiaId: materia.id, anio: materia.anio, cuatrimestre: materia.cuatrimestre, nombreFisico: filename, relativePath: `storage/${relativePath}`, fechaModificacion: new Date().toISOString() };
    safeSaveJson('archivos.json', archivos);
    res.json(archivos[index]);
  } catch (err) { next(err); }
});

// DELETE Markdown summary / note
router.delete('/:id', (req, res, next) => {
  try {
    const { id } = req.params;
    let archivos = safeReadJson('archivos.json') || [];
    const target = archivos.find(a => a.id === id);

    if (target) {
      try {
        const fullPath = validateSafePath(target.relativePath);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      } catch (e) {
        console.warn(`[Resumenes] No se pudo borrar archivo físico: ${e.message}`);
      }

      archivos = archivos.filter(a => a.id !== id);
      safeSaveJson('archivos.json', archivos);
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// GET export / download Markdown file
router.get('/:id/export', (req, res, next) => {
  try {
    const { id } = req.params;
    const archivos = safeReadJson('archivos.json') || [];
    const arc = archivos.find(a => a.id === id);

    if (!arc) {
      return res.status(404).json({ error: 'Documento no encontrado.' });
    }

    const fullPath = validateSafePath(arc.relativePath);
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'Archivo físico no encontrado.' });
    }

    const extension = arc.formato === 'html' || arc.tipo === 'richtext' ? 'html' : 'md';
    res.download(fullPath, `${slugify(arc.titulo)}.${extension}`);
  } catch (err) {
    next(err);
  }
});

export default router;
