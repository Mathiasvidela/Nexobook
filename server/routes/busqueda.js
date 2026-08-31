import express from 'express';
import fs from 'fs';
import { safeReadJson } from '../utils/safeJsonStorage.js';
import { validateSafePath } from '../utils/pathSecurity.js';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

const router = express.Router();
const pdfTextCache = new Map();

async function readPdfText(file) {
  const fullPath = validateSafePath(file.relativePath);
  if (!fs.existsSync(fullPath)) return '';
  const stat = fs.statSync(fullPath);
  const cacheKey = `${file.id}:${stat.mtimeMs}`;
  if (pdfTextCache.has(cacheKey)) return pdfTextCache.get(cacheKey);
  const document = await getDocument({ data: new Uint8Array(fs.readFileSync(fullPath)), disableWorker: true }).promise;
  const chunks = [];
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    chunks.push(content.items.map(item => item.str).join(' '));
  }
  const text = chunks.join('\n');
  pdfTextCache.set(cacheKey, text);
  if (pdfTextCache.size > 30) pdfTextCache.delete(pdfTextCache.keys().next().value);
  return text;
}

// GET global search endpoint
router.get('/', async (req, res, next) => {
  try {
    const query = (req.query.q || '').trim().toLowerCase();

    if (!query || query.length < 2) {
      return res.json({
        materias: [],
        clases: [],
        archivos: [],
        resumenes: [],
        evaluaciones: [],
        temas: []
      });
    }

    const espacioId = req.get('x-espacio-id');
    let materias = safeReadJson('materias.json') || [];
    if (espacioId) materias = materias.filter(m => (m.espacioId || 'esp-istea') === espacioId);
    const clases = safeReadJson('clases.json') || [];
    const archivos = safeReadJson('archivos.json') || [];
    const evaluaciones = safeReadJson('evaluaciones.json') || [];
    const progreso = safeReadJson('progreso.json') || [];

    // Helper map for subject lookup
    const materiaMap = new Map(materias.map(m => [m.id, m]));

    // 1. Materias
    const matchMaterias = materias.filter(m =>
      m.nombre.toLowerCase().includes(query) ||
      m.alias.toLowerCase().includes(query) ||
      m.profesor.toLowerCase().includes(query) ||
      m.codigoCurso.toLowerCase().includes(query)
    ).map(m => ({
      tipo: 'materia',
      id: m.id,
      titulo: m.nombre,
      subtitulo: `Prof: ${m.profesor || 'N/A'} - Código: ${m.codigoCurso || 'N/A'}`,
      materiaId: m.id,
      color: m.color
    }));

    // 2. Clases
    const matchClases = clases.filter(c => materiaMap.has(c.materiaId) && (
      c.titulo.toLowerCase().includes(query) ||
      c.temasVistos.toLowerCase().includes(query) ||
      (c.observaciones && c.observaciones.toLowerCase().includes(query))
    )).map(c => {
      const mat = materiaMap.get(c.materiaId);
      return {
        tipo: 'clase',
        id: c.id,
        titulo: `Clase ${c.numero}: ${c.titulo}`,
        subtitulo: `${mat ? mat.nombre : 'Materia'} - ${c.fecha}`,
        materiaId: c.materiaId,
        claseId: c.id
      };
    });

    // 3. Archivos (PDFs)
    const matchArchivos = [];
    for (const a of archivos.filter(item => materiaMap.has(item.materiaId) && item.tipo === 'pdf')) {
      let contentMatch = false;
      let snippet = '';
      try {
        const text = await readPdfText(a);
        const index = text.toLowerCase().indexOf(query);
        if (index >= 0) { contentMatch = true; snippet = text.slice(Math.max(0, index - 45), index + query.length + 65).replace(/\s+/g, ' '); }
      } catch { /* PDFs escaneados o dañados siguen siendo buscables por nombre. */ }
      if (!`${a.titulo || ''} ${a.nombreOriginal || ''} ${a.unidad || ''}`.toLowerCase().includes(query) && !contentMatch) continue;
      const mat = materiaMap.get(a.materiaId);
      matchArchivos.push({
        tipo: 'pdf',
        id: a.id,
        titulo: a.titulo || a.nombreOriginal,
        subtitulo: `${mat ? mat.nombre : 'Materia'}${snippet ? ` · …${snippet}…` : ` · ${a.unidad || 'Sin unidad'}`}`,
        materiaId: a.materiaId,
        archivoId: a.id
      });
    }

    // 4. Resúmenes y Apuntes (including text content search in Markdown files)
    const markdownDocs = archivos.filter(a => materiaMap.has(a.materiaId) && (a.tipo === 'markdown' || a.tipo === 'richtext'));
    const matchResumenes = [];

    for (const doc of markdownDocs) {
      let matchesContent = false;
      let snippet = '';

      const matchesTitle = doc.titulo.toLowerCase().includes(query) ||
                           doc.nombreOriginal.toLowerCase().includes(query);

      try {
        const fullPath = validateSafePath(doc.relativePath);
        if (fs.existsSync(fullPath)) {
          const content = fs.readFileSync(fullPath, 'utf8');
          const lowerContent = content.toLowerCase();
          const matchIndex = lowerContent.indexOf(query);

          if (matchIndex !== -1) {
            matchesContent = true;
            const start = Math.max(0, matchIndex - 40);
            const end = Math.min(content.length, matchIndex + query.length + 40);
            snippet = `...${content.slice(start, end).replace(/\n/g, ' ')}...`;
          }
        }
      } catch (e) {
        // Safe fail if file missing
      }

      if (matchesTitle || matchesContent) {
        const mat = materiaMap.get(doc.materiaId);
        matchResumenes.push({
          tipo: doc.subtipo === 'apuntes' ? 'apunte' : 'resumen',
          id: doc.id,
          titulo: doc.titulo,
          subtitulo: `${mat ? mat.nombre : 'Materia'} ${snippet ? `- "${snippet}"` : ''}`,
          materiaId: doc.materiaId,
          docId: doc.id
        });
      }
    }

    // 5. Evaluaciones
    const matchEvaluaciones = evaluaciones.filter(e => materiaMap.has(e.materiaId) && (
      e.titulo.toLowerCase().includes(query) ||
      e.tipo.toLowerCase().includes(query) ||
      e.temasIncluidos.toLowerCase().includes(query)
    )).map(e => {
      const mat = materiaMap.get(e.materiaId);
      return {
        tipo: 'evaluacion',
        id: e.id,
        titulo: e.titulo,
        subtitulo: `${mat ? mat.nombre : 'Materia'} - ${e.tipo.toUpperCase()} (${e.fecha})`,
        materiaId: e.materiaId
      };
    });

    // 6. Temas
    const matchTemas = [];
    progreso.filter(p => materiaMap.has(p.materiaId)).forEach(p => {
      const mat = materiaMap.get(p.materiaId);
      p.temas.forEach(t => {
        if (t.titulo.toLowerCase().includes(query)) {
          matchTemas.push({
            tipo: 'tema',
            id: t.id,
            titulo: t.titulo,
            subtitulo: `${mat ? mat.nombre : 'Materia'} - Estado: ${t.estado.toUpperCase()}`,
            materiaId: p.materiaId
          });
        }
      });
    });

    res.json({
      materias: matchMaterias,
      clases: matchClases,
      archivos: matchArchivos,
      resumenes: matchResumenes,
      evaluaciones: matchEvaluaciones,
      temas: matchTemas,
      totalResultados: matchMaterias.length + matchClases.length + matchArchivos.length + matchResumenes.length + matchEvaluaciones.length + matchTemas.length
    });
  } catch (err) {
    next(err);
  }
});

export default router;
