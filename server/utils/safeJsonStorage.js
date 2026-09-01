import fs from 'fs';
import path from 'path';
import { validateSafePath, getStorageRoot } from './pathSecurity.js';

const DATA_DIR = path.resolve(getStorageRoot(), 'data');
const ARCHIVOS_DIR = path.resolve(getStorageRoot(), 'archivos');

// Initial default seed data
const DEFAULT_PERIODOS = [
  {
    id: 'p-2026-2',
    anio: 2026,
    cuatrimestre: 'segundo-cuatrimestre',
    nombre: '2026 - 2º Cuatrimestre',
    esActivo: true,
    fechaInicio: '2026-08-01',
    fechaFin: '2026-12-20'
  },
  {
    id: 'p-2026-1',
    anio: 2026,
    cuatrimestre: 'primer-cuatrimestre',
    nombre: '2026 - 1º Cuatrimestre',
    esActivo: false,
    fechaInicio: '2026-03-01',
    fechaFin: '2026-07-15'
  }
];

const DEFAULT_CONFIGURACION = {
  tema: 'dark',
  periodoActivoId: null,
  version: '1.0.0-alpha.2'
};

const DEFAULT_MATERIAS = [
  {
    id: 'mat-lab-web',
    periodoId: 'p-2026-2',
    anio: 2026,
    cuatrimestre: 'segundo-cuatrimestre',
    nombre: 'Laboratorio Web Servidor',
    alias: 'Web Servidor',
    icono: 'Server',
    color: '#3b82f6', // Blue
    profesor: 'Carlos Rodríguez',
    codigoCurso: 'LWS-2026',
    estado: 'en_curso',
    fechaInicio: '2026-08-10',
    fechaFin: '2026-12-15',
    folderSlug: 'laboratorio-web-servidor'
  },
  {
    id: 'mat-nosql',
    periodoId: 'p-2026-2',
    anio: 2026,
    cuatrimestre: 'segundo-cuatrimestre',
    nombre: 'Bases de Datos No Relacionales',
    alias: 'NoSQL',
    icono: 'Database',
    color: '#10b981', // Emerald
    profesor: 'María Fernández',
    codigoCurso: 'BDNR-2026',
    estado: 'en_curso',
    fechaInicio: '2026-08-11',
    fechaFin: '2026-12-16',
    folderSlug: 'bases-de-datos-no-relacionales'
  },
  {
    id: 'mat-pruebas',
    periodoId: 'p-2026-2',
    anio: 2026,
    cuatrimestre: 'segundo-cuatrimestre',
    nombre: 'Pruebas de Software',
    alias: 'Testing',
    icono: 'CheckSquare',
    color: '#8b5cf6', // Purple
    profesor: 'Alejandro Gómez',
    codigoCurso: 'PS-2026',
    estado: 'en_curso',
    fechaInicio: '2026-08-12',
    fechaFin: '2026-12-17',
    folderSlug: 'pruebas-de-software'
  },
  {
    id: 'mat-etica',
    periodoId: 'p-2026-2',
    anio: 2026,
    cuatrimestre: 'segundo-cuatrimestre',
    nombre: 'Ética General',
    alias: 'Ética',
    icono: 'BookOpen',
    color: '#f59e0b', // Amber
    profesor: 'Dra. Laura Rossi',
    codigoCurso: 'EG-2026',
    estado: 'en_curso',
    fechaInicio: '2026-08-13',
    fechaFin: '2026-12-18',
    folderSlug: 'etica-general'
  }
];

const DEFAULT_CLASES = [
  {
    id: 'cls-1',
    materiaId: 'mat-lab-web',
    numero: 1,
    titulo: 'Introducción a Node.js y Express',
    fecha: '2026-08-12',
    temasVistos: 'Arquitectura de servidores, HTTP, Express routing, Middlewares.',
    estado: 'completada',
    observaciones: 'Repasar estructura de rutas y middlewares.'
  },
  {
    id: 'cls-2',
    materiaId: 'mat-lab-web',
    numero: 2,
    titulo: 'REST APIs y Almacenamiento Seguro',
    fecha: '2026-08-19',
    temasVistos: 'Endpoints REST, operaciones CRUD, JSON atómico en disco.',
    estado: 'completada',
    observaciones: 'Implementar sanitización de entradas.'
  },
  {
    id: 'cls-3',
    materiaId: 'mat-nosql',
    numero: 1,
    titulo: 'Fundamentos de Almacenamiento Orientado a Documentos',
    fecha: '2026-08-13',
    temasVistos: 'Teorema CAP, documentos JSON vs Tablas relacionales.',
    estado: 'completada',
    observaciones: 'Hacer ejercicios de esquemas flexibles.'
  }
];

const DEFAULT_EVALUACIONES = [
  {
    id: 'eval-1',
    materiaId: 'mat-lab-web',
    titulo: 'Primer Parcial - Servidores Express & APIs',
    tipo: 'parcial',
    fecha: '2026-09-25',
    prioridad: 'alta',
    estado: 'pendiente',
    temasIncluidos: 'Express, Routing, Middlewares, Streaming y JSON Storage.',
    nota: null,
    observaciones: 'Revisar prácticas de la unidad 1 y 2.'
  },
  {
    id: 'eval-2',
    materiaId: 'mat-nosql',
    titulo: 'Trabajo Práctico 1 - Diseño de Esquema Documental',
    tipo: 'tp',
    fecha: '2026-09-18',
    prioridad: 'media',
    estado: 'pendiente',
    temasIncluidos: 'Modelado NoSQL, indexación y agregaciones.',
    nota: null,
    observaciones: 'Entrega grupal en PDF.'
  },
  {
    id: 'eval-3',
    materiaId: 'mat-pruebas',
    titulo: 'Evaluación Corta - Pruebas Unitarias',
    tipo: 'parcial',
    fecha: '2026-09-10',
    prioridad: 'alta',
    estado: 'pendiente',
    temasIncluidos: 'TDD, Assertions, Mocking y Cobertura.',
    nota: null,
    observaciones: 'Repasar framework de tests nativo.'
  }
];

const DEFAULT_PROGRESO = [
  {
    id: 'prog-lab-web',
    materiaId: 'mat-lab-web',
    temas: [
      { id: 't1', titulo: 'Arquitectura Cliente-Servidor', estado: 'aprendido', ultimaFechaEstudio: '2026-08-14' },
      { id: 't2', titulo: 'Express Router & Custom Middlewares', estado: 'estudiando', ultimaFechaEstudio: '2026-08-20' },
      { id: 't3', titulo: 'Servidores de archivos estáticos y Range requests', estado: 'repasar', ultimaFechaEstudio: '2026-08-22' },
      { id: 't4', titulo: 'Seguridad en API local y Path Traversal', estado: 'estudiando', ultimaFechaEstudio: '2026-08-24' }
    ]
  },
  {
    id: 'prog-nosql',
    materiaId: 'mat-nosql',
    temas: [
      { id: 't1', titulo: 'Modelado NoSQL de Documentos', estado: 'aprendido', ultimaFechaEstudio: '2026-08-15' },
      { id: 't2', titulo: 'Indexación B-Tree y Hash', estado: 'pendiente', ultimaFechaEstudio: null },
      { id: 't3', titulo: 'Pipelines de Agregación', estado: 'repasar', ultimaFechaEstudio: '2026-08-21' }
    ]
  },
  {
    id: 'prog-pruebas',
    materiaId: 'mat-pruebas',
    temas: [
      { id: 't1', titulo: 'Principios de Testing Unitario', estado: 'aprendido', ultimaFechaEstudio: '2026-08-16' },
      { id: 't2', titulo: 'Integración Continua y Cobertura', estado: 'estudiando', ultimaFechaEstudio: '2026-08-23' }
    ]
  },
  {
    id: 'prog-etica',
    materiaId: 'mat-etica',
    temas: [
      { id: 't1', titulo: 'Ética profesional en la Ingeniería de Software', estado: 'aprendido', ultimaFechaEstudio: '2026-08-17' },
      { id: 't2', titulo: 'Privacidad de Datos y Almacenamiento Local', estado: 'estudiando', ultimaFechaEstudio: '2026-08-24' }
    ]
  }
];

const DEFAULT_ARCHIVOS = [
  {
    id: 'arc-sample-1',
    materiaId: 'mat-lab-web',
    anio: 2026,
    cuatrimestre: 'segundo-cuatrimestre',
    claseId: 'cls-1',
    unidad: 'Unidad 1',
    titulo: 'Guía de Express y Node.js',
    nombreOriginal: 'Guia-Express-Server.pdf',
    nombreFisico: 'Guia-Express-Server.pdf',
    relativePath: 'storage/archivos/2026/segundo-cuatrimestre/laboratorio-web-servidor/pdfs/Guia-Express-Server.pdf',
    tipo: 'pdf',
    subtipo: 'pdfs', // pdfs, resumenes, apuntes, otros
    tamano: 1048576, // 1MB
    fechaCarga: '2026-08-15T10:00:00.000Z',
    estadoLectura: 'leyendo', // pendiente, leyendo, leido
    paginaActual: 3,
    totalPaginas: 15,
    porcentajeLectura: 20
  }
];

/**
 * Ensures a physical directory for a materia exists on disk
 */
export function ensureMateriaFolders(anio, cuatrimestre, folderSlug) {
  const baseMateriaPath = path.join(ARCHIVOS_DIR, String(anio), cuatrimestre, folderSlug);
  const subfolders = ['pdfs', 'resumenes', 'apuntes', 'otros'];

  subfolders.forEach((sub) => {
    const fullSubPath = path.join(baseMateriaPath, sub);
    if (!fs.existsSync(fullSubPath)) {
      fs.mkdirSync(fullSubPath, { recursive: true });
    }
  });

  return baseMateriaPath;
}

/**
 * Initializes missing data directory & JSON files with defaults
 */
export function initializeStorage() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(ARCHIVOS_DIR)) {
    fs.mkdirSync(ARCHIVOS_DIR, { recursive: true });
  }

  const includeSampleData = process.env.NEXOBOOK_SEED_SAMPLE === 'true';
  const initialFiles = {
    'configuracion.json': DEFAULT_CONFIGURACION,
    'espacios.json': [],
    'periodos.json': includeSampleData ? DEFAULT_PERIODOS : [],
    'materias.json': includeSampleData ? DEFAULT_MATERIAS : [],
    'clases.json': includeSampleData ? DEFAULT_CLASES : [],
    'evaluaciones.json': includeSampleData ? DEFAULT_EVALUACIONES : [],
    'progreso.json': includeSampleData ? DEFAULT_PROGRESO : [],
    'archivos.json': includeSampleData ? DEFAULT_ARCHIVOS : []
  };

  Object.entries(initialFiles).forEach(([fileName, defaultData]) => {
    const filePath = path.join(DATA_DIR, fileName);
    if (!fs.existsSync(filePath)) {
      safeSaveJson(filePath, defaultData);
    }
  });

  // Ensure default subject folders exist in storage/archivos
  (includeSampleData ? DEFAULT_MATERIAS : []).forEach((mat) => {
    ensureMateriaFolders(mat.anio, mat.cuatrimestre, mat.folderSlug);
  });
}

/**
 * Reads and parses a JSON file safely
 */
export function resolveJsonPath(fileNameOrPath) {
  const isBareJsonFile = fileNameOrPath.endsWith('.json')
    && !path.isAbsolute(fileNameOrPath)
    && !fileNameOrPath.includes('/')
    && !fileNameOrPath.includes('\\');

  return isBareJsonFile ? path.join(DATA_DIR, fileNameOrPath) : fileNameOrPath;
}

export function safeReadJson(fileNameOrPath) {
  let targetPath = resolveJsonPath(fileNameOrPath);

  targetPath = validateSafePath(targetPath);

  if (!fs.existsSync(targetPath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(targetPath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`[SafeStorage] Error al leer JSON en ${targetPath}:`, error.message);
    // If original fails, check if backup exists
    const bakPath = `${targetPath}.bak`;
    if (fs.existsSync(bakPath)) {
      try {
        const bakContent = fs.readFileSync(bakPath, 'utf8');
        return JSON.parse(bakContent);
      } catch (e) {
        console.error(`[SafeStorage] Backup falló también para ${bakPath}:`, e.message);
      }
    }
    throw error;
  }
}

/**
 * Writes data to a JSON file atomically with tmp file validation and backup creation.
 * 1. Write to tmp file
 * 2. Validate JSON parseability
 * 3. Copy existing file to .bak
 * 4. Rename tmp to target
 */
export function safeSaveJson(fileNameOrPath, data) {
  let targetPath = resolveJsonPath(fileNameOrPath);

  targetPath = validateSafePath(targetPath);

  const dirName = path.dirname(targetPath);
  if (!fs.existsSync(dirName)) {
    fs.mkdirSync(dirName, { recursive: true });
  }

  const tmpPath = `${targetPath}.tmp`;
  const bakPath = `${targetPath}.bak`;
  const jsonString = JSON.stringify(data, null, 2);

  // Step 1: Write to temporary file
  fs.writeFileSync(tmpPath, jsonString, 'utf8');

  // Step 2: Validate written temporary file
  try {
    const readBack = fs.readFileSync(tmpPath, 'utf8');
    JSON.parse(readBack);
  } catch (err) {
    if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    throw new Error(`[SafeStorage] Error de validación al generar JSON temporal: ${err.message}`);
  }

  // Step 3: Create backup if target file already exists
  if (fs.existsSync(targetPath)) {
    try {
      fs.copyFileSync(targetPath, bakPath);
    } catch (err) {
      console.warn(`[SafeStorage] Advertencia: No se pudo crear copia de seguridad .bak: ${err.message}`);
    }
  }

  // Step 4: Atomic rename tmp to original target
  fs.renameSync(tmpPath, targetPath);
  return true;
}
