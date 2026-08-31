import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { safeReadJson, safeSaveJson, ensureMateriaFolders, initializeStorage } from '../server/utils/safeJsonStorage.js';
import { getStorageRoot } from '../server/utils/pathSecurity.js';

console.log('====================================================');
console.log('   HERRAMIENTA DE IMPORTACIÓN DE DOCUMENTOS PDF    ');
console.log('====================================================\n');

initializeStorage();

const WORKSPACE_ROOT = process.cwd();
const CANDIDATE_FOLDERS = [
  'laboratorio web servidor',
  'NoSQL',
  'pruebas de software',
  'Ing Software',
  'Derecho'
];

function calculateFileHash(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash('md5');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
}

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

function findOrCreateMateria(candidateName, materias, config) {
  const slug = slugify(candidateName);
  let materia = materias.find(m => slugify(m.nombre).includes(slug) || slug.includes(slugify(m.nombre)) || slugify(m.alias).includes(slug));

  if (!materia) {
    const anio = 2026;
    const cuatrimestre = 'segundo-cuatrimestre';
    const folderSlug = slug;
    const newId = `mat-${folderSlug}-${Date.now()}`;

    materia = {
      id: newId,
      periodoId: config.periodoActivoId || 'p-2026-2',
      anio,
      cuatrimestre,
      nombre: candidateName,
      alias: candidateName,
      icono: 'BookOpen',
      color: '#3b82f6',
      profesor: '',
      codigoCurso: '',
      estado: 'en_curso',
      fechaInicio: new Date().toISOString().split('T')[0],
      fechaFin: null,
      folderSlug
    };

    materias.push(materia);
    safeSaveJson('materias.json', materias);
    ensureMateriaFolders(anio, cuatrimestre, folderSlug);
    console.log(`[+] Creada nueva materia automática: "${candidateName}"`);
  }

  return materia;
}

async function runImport() {
  const materias = safeReadJson('materias.json') || [];
  const config = safeReadJson('configuracion.json') || {};
  let archivos = safeReadJson('archivos.json') || [];

  const existingHashes = new Set();
  archivos.forEach(a => {
    if (a.hash) existingHashes.add(a.hash);
    existingHashes.add(`${a.nombreOriginal}-${a.tamano}`);
  });

  let totalDiscovered = 0;
  let totalImported = 0;
  let totalSkipped = 0;

  for (const candidateFolder of CANDIDATE_FOLDERS) {
    const folderPath = path.join(WORKSPACE_ROOT, candidateFolder);

    if (!fs.existsSync(folderPath)) {
      console.log(`[i] Carpeta candidata no encontrada (omitiendo): "${candidateFolder}"`);
      continue;
    }

    console.log(`\n🔍 Escaneando carpeta: "${candidateFolder}"...`);
    const files = fs.readdirSync(folderPath);

    const pdfFiles = files.filter(f => f.toLowerCase().endsWith('.pdf'));
    totalDiscovered += pdfFiles.length;

    if (pdfFiles.length === 0) {
      console.log(`    No se encontraron archivos PDF en "${candidateFolder}".`);
      continue;
    }

    const targetMateria = findOrCreateMateria(candidateFolder, materias, config);
    const targetDir = path.join(
      getStorageRoot(),
      'archivos',
      String(targetMateria.anio),
      targetMateria.cuatrimestre,
      targetMateria.folderSlug,
      'pdfs'
    );

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    for (const pdfFile of pdfFiles) {
      const sourcePath = path.join(folderPath, pdfFile);
      const stat = fs.statSync(sourcePath);
      const hash = calculateFileHash(sourcePath);
      const duplicateKey = `${pdfFile}-${stat.size}`;

      if (existingHashes.has(hash) || existingHashes.has(duplicateKey)) {
        console.log(`  [x] Omitido por duplicado: "${pdfFile}"`);
        totalSkipped++;
        continue;
      }

      // Safe collision name
      let destFilename = pdfFile;
      let counter = 1;
      const ext = path.extname(pdfFile);
      const base = path.basename(pdfFile, ext);

      while (fs.existsSync(path.join(targetDir, destFilename))) {
        destFilename = `${base} (${counter})${ext}`;
        counter++;
      }

      const destPath = path.join(targetDir, destFilename);

      // Copy file without deleting original
      fs.copyFileSync(sourcePath, destPath);

      const relativePath = path.relative(getStorageRoot(), destPath).replace(/\\/g, '/');

      const record = {
        id: `arc-imp-${Date.now()}-${Math.floor(Math.random()*1000)}`,
        materiaId: targetMateria.id,
        anio: targetMateria.anio,
        cuatrimestre: targetMateria.cuatrimestre,
        claseId: null,
        unidad: 'Importado',
        titulo: base,
        nombreOriginal: pdfFile,
        nombreFisico: destFilename,
        relativePath: `storage/${relativePath}`,
        tipo: 'pdf',
        subtipo: 'pdfs',
        tamano: stat.size,
        hash,
        fechaCarga: new Date().toISOString(),
        estadoLectura: 'pendiente',
        paginaActual: 1,
        totalPaginas: 1,
        porcentajeLectura: 0
      };

      archivos.push(record);
      existingHashes.add(hash);
      existingHashes.add(duplicateKey);
      totalImported++;
      console.log(`  [✓] Importado exitosamente: "${pdfFile}" -> "${targetMateria.nombre}"`);
    }
  }

  safeSaveJson('archivos.json', archivos);

  console.log('\n====================================================');
  console.log(` RESUMEN DE IMPORTACIÓN:`);
  console.log(` - PDFs detectados: ${totalDiscovered}`);
  console.log(` - Importados con éxito: ${totalImported}`);
  console.log(` - Omitidos (duplicados): ${totalSkipped}`);
  console.log('====================================================\n');
}

runImport().catch(err => {
  console.error('Error al ejecutar la importación:', err);
});
