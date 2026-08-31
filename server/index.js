import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeStorage } from './utils/safeJsonStorage.js';
import { validateSafePath, getStorageRoot } from './utils/pathSecurity.js';

import periodosRoutes from './routes/periodos.js';
import materiasRoutes from './routes/materias.js';
import clasesRoutes from './routes/clases.js';
import archivosRoutes from './routes/archivos.js';
import resumenesRoutes from './routes/resumenes.js';
import evaluacionesRoutes from './routes/evaluaciones.js';
import progresoRoutes from './routes/progreso.js';
import busquedaRoutes from './routes/busqueda.js';
import backupsRoutes from './routes/backups.js';
import planEstudiosRoutes from './routes/planEstudios.js';
import espaciosRoutes from './routes/espacios.js';
import papeleraRoutes from './routes/papelera.js';

export function createApp() {
  const app = express();

  // Initialize safe directory and JSON storage on startup
  initializeStorage();

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Safe static server for storage files with path traversal security check
  app.use('/storage', (req, res, next) => {
    try {
      const rawPath = path.join(getStorageRoot(), req.path);
      const safePath = validateSafePath(rawPath);
      res.sendFile(safePath);
    } catch (err) {
      next(err);
    }
  });

// API Routes
  app.use('/api/periodos', periodosRoutes);
  app.use('/api/materias', materiasRoutes);
  app.use('/api/clases', clasesRoutes);
  app.use('/api/archivos', archivosRoutes);
  app.use('/api/resumenes', resumenesRoutes);
  app.use('/api/evaluaciones', evaluacionesRoutes);
  app.use('/api/progreso', progresoRoutes);
  app.use('/api/busqueda', busquedaRoutes);
  app.use('/api/backups', backupsRoutes);
  app.use('/api/plan-estudios', planEstudiosRoutes);
  app.use('/api/espacios', espaciosRoutes);
  app.use('/api/papelera', papeleraRoutes);

  app.use('/api', (req, res) => {
    res.status(404).json({ error: 'La función solicitada no existe o ya no está disponible.' });
  });

  // In the packaged desktop app Express also serves the compiled React client.
  const rendererDir = process.env.NEXOBOOK_RENDERER_DIR;
  if (rendererDir && fs.existsSync(rendererDir)) {
    app.use(express.static(rendererDir));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/') || req.path.startsWith('/storage/')) return next();
      res.sendFile(path.join(rendererDir, 'index.html'));
    });
  }

// Global Error Handler
  app.use((err, req, res, next) => {
    console.error('[ServerError]', err.stack || err.message);
    const status = err.statusCode || err.status || 500;
    res.status(status).json({
      error: err.message || 'Error interno del servidor.'
    });
  });

  return app;
}

export function startServer({ port = Number(process.env.PORT) || 3001, host = '127.0.0.1' } = {}) {
  const app = createApp();
  return new Promise((resolve, reject) => {
    const server = app.listen(port, host, () => {
      const address = server.address();
      const actualPort = typeof address === 'object' && address ? address.port : port;
      console.log(`[Servidor Local] Escuchando en http://${host}:${actualPort}`);
      console.log(`[Storage Root] ${getStorageRoot()}`);
      resolve({ app, server, port: actualPort, url: `http://${host}:${actualPort}` });
    });
    server.once('error', reject);
  });
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  startServer().catch(error => {
    console.error('[Servidor Local] No pudo iniciarse:', error);
    process.exitCode = 1;
  });
}
