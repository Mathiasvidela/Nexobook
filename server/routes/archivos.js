import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { safeReadJson, safeSaveJson, ensureMateriaFolders } from '../utils/safeJsonStorage.js';
import { validateSafePath, getStorageRoot } from '../utils/pathSecurity.js';

const router = express.Router();

function fileHash(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function suggestPdfTitle(filename) {
  const base = path.basename(filename, path.extname(filename));
  const cleaned = base
    .replace(/[_\.]+/g, ' ')
    .replace(/\s*-\s*/g, ' ')
    .replace(/\b(?:copia|copy|nuevo|ultima|ultimo|definitivo|revisado|updated)\b/gi, ' ')
    .replace(/\b(?:ver(?:sion)?|v)\s*\d+(?:\.\d+)*\b/gi, ' ')
    .replace(/\s*\(\d+\)\s*$/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return 'Documento sin título';
  return cleaned.split(' ').map(word => {
    if (/^[A-ZÁÉÍÓÚÑ0-9]{2,}$/.test(word)) return word;
    return word.charAt(0).toLocaleUpperCase('es') + word.slice(1).toLocaleLowerCase('es');
  }).join(' ');
}

function walkPdfFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walkPdfFiles(fullPath);
    return entry.isFile() && path.extname(entry.name).toLowerCase() === '.pdf' ? [fullPath] : [];
  });
}

// Memory storage for Multer so we can process collision naming before saving to final destination
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB max limit
});

/**
 * Resolves non-colliding file name: e.g. test.pdf -> test (1).pdf
 */
function getIncrementalFilename(targetDir, originalName) {
  const ext = path.extname(originalName);
  const baseName = path.basename(originalName, ext);

  let candidate = originalName;
  let counter = 1;

  while (fs.existsSync(path.join(targetDir, candidate))) {
    candidate = `${baseName} (${counter})${ext}`;
    counter++;
  }

  return candidate;
}

// GET all files metadata
router.get('/', (req, res, next) => {
  try {
    const { materiaId, tipo, subtipo } = req.query;
    let archivos = safeReadJson('archivos.json') || [];

    if (materiaId) {
      archivos = archivos.filter(a => a.materiaId === materiaId);
    }
    if (tipo) {
      archivos = archivos.filter(a => a.tipo === tipo);
    }
    if (subtipo) {
      archivos = archivos.filter(a => a.subtipo === subtipo);
    }

    res.json(archivos);
  } catch (err) {
    next(err);
  }
});

// Scan every materia /pdfs folder and register files copied directly from Finder.
// This is intentionally additive: missing files are reported but never removed.
router.post('/sync', (req, res, next) => {
  try {
    const espacioId = req.get('x-espacio-id');
    let materias = safeReadJson('materias.json') || [];
    if (espacioId) materias = materias.filter(m => (m.espacioId || 'esp-istea') === espacioId);
    const archivos = safeReadJson('archivos.json') || [];
    const registeredPaths = new Set(archivos.map(a => a.relativePath));
    const discoveredPaths = new Set();
    const added = [];
    const duplicates = [];
    const hashes = new Map();

    for (const archivo of archivos.filter(item => item.tipo === 'pdf')) {
      try {
        const fullPath = validateSafePath(archivo.relativePath);
        if (fs.existsSync(fullPath)) hashes.set(fileHash(fullPath), archivo);
      } catch { /* Un archivo ausente no debe impedir el escaneo. */ }
    }

    for (const materia of materias) {
      const materiaRoot = ensureMateriaFolders(materia.anio, materia.cuatrimestre, materia.folderSlug);
      const pdfDir = path.join(materiaRoot, 'pdfs');

      for (const fullPath of walkPdfFiles(pdfDir)) {
        const relativeFromRoot = path.relative(getStorageRoot(), fullPath).replace(/\\/g, '/');
        const relativePath = `storage/${relativeFromRoot}`;
        discoveredPaths.add(relativePath);

        if (registeredPaths.has(relativePath)) continue;

        const stat = fs.statSync(fullPath);
        const filename = path.basename(fullPath);
        const title = suggestPdfTitle(filename);
        const hash = fileHash(fullPath);
        const sameContent = hashes.get(hash);
        if (sameContent) {
          duplicates.push({ nombre: filename, coincideCon: sameContent.nombreOriginal, materia: materia.nombre });
          continue;
        }
        const record = {
          id: `arc-sync-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          materiaId: materia.id,
          anio: materia.anio,
          cuatrimestre: materia.cuatrimestre,
          claseId: null,
          unidad: 'Sin clasificar',
          titulo: title,
          tituloSugerido: title,
          materiaDetectada: materia.nombre,
          importacionInteligente: true,
          hashContenido: hash,
          nombreOriginal: filename,
          nombreFisico: filename,
          relativePath,
          tipo: 'pdf',
          subtipo: 'pdfs',
          tamano: stat.size,
          fechaCarga: stat.birthtime?.toISOString?.() || new Date().toISOString(),
          estadoLectura: 'pendiente',
          paginaActual: 1,
          totalPaginas: 1,
          porcentajeLectura: 0
        };

        archivos.push(record);
        hashes.set(hash, record);
        registeredPaths.add(relativePath);
        added.push(record);
      }
    }

    const missing = archivos.filter(a => a.tipo === 'pdf' && !discoveredPaths.has(a.relativePath));
    if (added.length > 0) safeSaveJson('archivos.json', archivos);

    res.json({
      scanned: discoveredPaths.size,
      added: added.length,
      missing: missing.length,
      duplicates: duplicates.length,
      duplicateFiles: duplicates,
      cleanedTitles: added.filter(item => item.titulo !== path.basename(item.nombreOriginal, path.extname(item.nombreOriginal))).length,
      addedFiles: added.map(a => ({ original: a.nombreOriginal, titulo: a.titulo, materia: a.materiaDetectada }))
    });
  } catch (err) {
    next(err);
  }
});

// POST upload PDF file
router.post('/upload', upload.single('archivo'), (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se ha adjuntado ningún archivo.' });
    }

    const { materiaId, anio, cuatrimestre, unidad, claseId, titulo, subtipo } = req.body;

    if (!materiaId || !anio || !cuatrimestre) {
      return res.status(400).json({ error: 'Materia, año y cuatrimestre son obligatorios.' });
    }

    const materias = safeReadJson('materias.json') || [];
    const materia = materias.find(m => m.id === materiaId);
    if (!materia) {
      return res.status(404).json({ error: 'Materia no encontrada.' });
    }

    // Validate MIME type & Extension for PDFs
    const ext = path.extname(req.file.originalname).toLowerCase();
    const isPdf = ext === '.pdf' && (req.file.mimetype === 'application/pdf' || req.file.mimetype === 'application/octet-stream');

    if (!isPdf && subtipo === 'pdfs') {
      return res.status(400).json({ error: 'El archivo debe ser un documento PDF válido.' });
    }

    const folderSub = subtipo || 'pdfs';
    const materiaFolderPath = ensureMateriaFolders(anio, cuatrimestre, materia.folderSlug);
    const targetDir = path.join(materiaFolderPath, folderSub);

    const safeFilename = getIncrementalFilename(targetDir, req.file.originalname);
    const finalFilePath = path.join(targetDir, safeFilename);

    // Write file to disk
    fs.writeFileSync(finalFilePath, req.file.buffer);

    const relativePath = path.relative(getStorageRoot(), finalFilePath).replace(/\\/g, '/');

    const newArchivo = {
      id: `arc-${Date.now()}`,
      materiaId,
      anio: Number(anio),
      cuatrimestre,
      claseId: claseId || null,
      unidad: unidad || 'Sin unidad',
      titulo: titulo || req.file.originalname,
      nombreOriginal: req.file.originalname,
      nombreFisico: safeFilename,
      relativePath: `storage/${relativePath}`,
      tipo: isPdf ? 'pdf' : 'documento',
      subtipo: folderSub,
      tamano: req.file.size,
      fechaCarga: new Date().toISOString(),
      estadoLectura: 'pendiente', // pendiente, leyendo, leido
      paginaActual: 1,
      totalPaginas: 1,
      porcentajeLectura: 0
    };

    const archivos = safeReadJson('archivos.json') || [];
    archivos.push(newArchivo);
    safeSaveJson('archivos.json', archivos);

    res.status(201).json(newArchivo);
  } catch (err) {
    next(err);
  }
});

// PUT edit metadata / reading progress
router.put('/:id', (req, res, next) => {
  try {
    const { id } = req.params;
    let archivos = safeReadJson('archivos.json') || [];
    const index = archivos.findIndex(a => a.id === id);

    if (index === -1) {
      return res.status(404).json({ error: 'Archivo no encontrado.' });
    }

    const current = archivos[index];
    const updated = {
      ...current,
      ...req.body
    };

    if (req.body.paginaActual || req.body.totalPaginas) {
      const page = req.body.paginaActual || current.paginaActual || 1;
      const total = req.body.totalPaginas || current.totalPaginas || 1;
      updated.porcentajeLectura = Math.min(100, Math.round((page / total) * 100));

      if (updated.porcentajeLectura >= 100) {
        updated.estadoLectura = 'leido';
      } else if (updated.porcentajeLectura > 0 && updated.estadoLectura === 'pendiente') {
        updated.estadoLectura = 'leyendo';
      }
    }

    archivos[index] = updated;
    safeSaveJson('archivos.json', archivos);

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// POST move file to another materia
router.post('/:id/mover', (req, res, next) => {
  try {
    const { id } = req.params;
    const { nuevaMateriaId } = req.body;

    let archivos = safeReadJson('archivos.json') || [];
    const fileIndex = archivos.findIndex(a => a.id === id);

    if (fileIndex === -1) {
      return res.status(404).json({ error: 'Archivo no encontrado.' });
    }

    const materias = safeReadJson('materias.json') || [];
    const nuevaMat = materias.find(m => m.id === nuevaMateriaId);
    if (!nuevaMat) {
      return res.status(404).json({ error: 'Materia destino no encontrada.' });
    }

    const arc = archivos[fileIndex];
    const oldFullPath = validateSafePath(arc.relativePath);

    if (!fs.existsSync(oldFullPath)) {
      return res.status(404).json({ error: 'El archivo físico no existe en disco.' });
    }

    const newMateriaFolder = ensureMateriaFolders(nuevaMat.anio, nuevaMat.cuatrimestre, nuevaMat.folderSlug);
    const newTargetDir = path.join(newMateriaFolder, arc.subtipo || 'pdfs');
    const newSafeName = getIncrementalFilename(newTargetDir, arc.nombreOriginal);
    const newFullPath = path.join(newTargetDir, newSafeName);

    fs.renameSync(oldFullPath, newFullPath);

    const relativePath = path.relative(getStorageRoot(), newFullPath).replace(/\\/g, '/');

    archivos[fileIndex] = {
      ...arc,
      materiaId: nuevaMat.id,
      anio: nuevaMat.anio,
      cuatrimestre: nuevaMat.cuatrimestre,
      nombreFisico: newSafeName,
      relativePath: `storage/${relativePath}`
    };

    safeSaveJson('archivos.json', archivos);
    res.json(archivos[fileIndex]);
  } catch (err) {
    next(err);
  }
});

// DELETE file
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
        console.warn(`[Archivos] No se pudo borrar archivo físico: ${e.message}`);
      }

      archivos = archivos.filter(a => a.id !== id);
      safeSaveJson('archivos.json', archivos);
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// GET serve file securely with HTTP Range support for PDF streaming
router.get('/serve/:id', (req, res, next) => {
  try {
    const { id } = req.params;
    const archivos = safeReadJson('archivos.json') || [];
    const arc = archivos.find(a => a.id === id);

    if (!arc) {
      return res.status(404).json({ error: 'Archivo no encontrado.' });
    }

    const fullPath = validateSafePath(arc.relativePath);

    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'Archivo no existe en el disco local.' });
    }

    // Set appropriate content type
    const ext = path.extname(fullPath).toLowerCase();
    if (ext === '.pdf') {
      res.setHeader('Content-Type', 'application/pdf');
    } else if (ext === '.md') {
      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    }

    res.sendFile(fullPath);
  } catch (err) {
    next(err);
  }
});

export default router;
