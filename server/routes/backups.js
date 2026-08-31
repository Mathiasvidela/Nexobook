import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import AdmZip from 'adm-zip';
import { getStorageRoot, validateSafePath } from '../utils/pathSecurity.js';
import { safeReadJson } from '../utils/safeJsonStorage.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });
const AUTO_INTERVAL = 24 * 60 * 60 * 1000;

function getBackupDir() {
  return path.join(path.dirname(getStorageRoot()), 'backups');
}

function listAutomaticBackups() {
  const dir = getBackupDir();
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(name => name.startsWith('nexobook-auto-') && name.endsWith('.zip')).map(name => {
    const fullPath = path.join(dir, name); const stat = fs.statSync(fullPath);
    return { name, fullPath, createdAt: stat.mtime.toISOString(), size: stat.size };
  }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function createAutomaticBackup(force = false) {
  const existing = listAutomaticBackups();
  if (!force && existing[0] && Date.now() - new Date(existing[0].createdAt).getTime() < AUTO_INTERVAL) return existing[0];
  const dir = getBackupDir(); fs.mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fullPath = path.join(dir, `nexobook-auto-${stamp}.zip`);
  const zip = new AdmZip();
  zip.addLocalFolder(getStorageRoot(), 'storage');
  zip.addFile('nexobook-backup.json', Buffer.from(JSON.stringify({ app: 'Nexobook', formatVersion: 1, createdAt: new Date().toISOString() }, null, 2)));
  zip.writeZip(fullPath);
  listAutomaticBackups().slice(7).forEach(item => fs.unlinkSync(item.fullPath));
  return { name: path.basename(fullPath), fullPath, createdAt: new Date().toISOString(), size: fs.statSync(fullPath).size };
}

router.get('/status', (req, res, next) => {
  try { const backups = listAutomaticBackups(); res.json({ enabled: true, intervalHours: 24, lastBackup: backups[0] || null, copies: backups.length, storagePath: getStorageRoot(), portable: Boolean(process.env.NEXOBOOK_DATA_DIR) }); }
  catch (err) { next(err); }
});

router.post('/auto', (req, res, next) => {
  try { res.status(201).json(createAutomaticBackup(true)); } catch (err) { next(err); }
});

// GET export backup as ZIP file
router.get('/export', (req, res, next) => {
  try {
    const storageDir = getStorageRoot();

    if (!fs.existsSync(storageDir)) {
      return res.status(404).json({ error: 'El directorio storage no existe.' });
    }

    const zip = new AdmZip();
    zip.addLocalFolder(storageDir, 'storage');
    zip.addFile('nexobook-backup.json', Buffer.from(JSON.stringify({ app: 'Nexobook', formatVersion: 1, createdAt: new Date().toISOString() }, null, 2)));

    const zipBuffer = zip.toBuffer();
    const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `respaldo-estudios-${dateStr}.zip`;

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(zipBuffer);
  } catch (err) {
    next(err);
  }
});

// POST import / restore backup from ZIP file
router.post('/import', upload.single('backup'), (req, res, next) => {
  let stagingDir = null;
  let rollbackDir = null;
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se ha subido ningún archivo ZIP de respaldo.' });
    }

    const zip = new AdmZip(req.file.buffer);
    const entries = zip.getEntries();

    let hasDataFolder = false;
    let hasMateriasJson = false;
    entries.forEach(entry => {
      const entryName = entry.entryName.replace(/\\/g, '/');
      if (entryName.startsWith('/') || entryName.split('/').includes('..')) {
        const error = new Error('El ZIP contiene rutas inseguras y fue rechazado.');
        error.statusCode = 400;
        throw error;
      }
      if (entryName.startsWith('storage/data/')) hasDataFolder = true;
      if (entryName === 'storage/data/materias.json') hasMateriasJson = true;
      if (!entry.isDirectory && entryName.startsWith('storage/data/') && entryName.endsWith('.json') && !entryName.endsWith('.json.bak')) {
        try { JSON.parse(entry.getData().toString('utf8')); }
        catch { const error = new Error(`El respaldo contiene datos dañados: ${path.basename(entryName)}.`); error.statusCode = 400; throw error; }
      }
    });

    if (!hasDataFolder || !hasMateriasJson) {
      return res.status(400).json({
        error: 'El archivo ZIP no contiene una estructura válida de respaldo de estudios (debe contener la carpeta data/ y materias.json).'
      });
    }

    const storageRoot = getStorageRoot();
    const parentDir = path.dirname(storageRoot);
    const token = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    stagingDir = path.join(parentDir, `.nexobook-restore-${token}`);
    rollbackDir = path.join(parentDir, `.nexobook-rollback-${token}`);
    fs.mkdirSync(stagingDir, { recursive: true });
    zip.extractAllTo(stagingDir, true);
    const restoredStorage = path.join(stagingDir, 'storage');
    if (!fs.existsSync(restoredStorage)) return res.status(400).json({ error: 'El respaldo no contiene la carpeta storage esperada.' });

    // Siempre conservar una copia recuperable del estado anterior antes de reemplazarlo.
    createAutomaticBackup(true);
    if (fs.existsSync(storageRoot)) fs.renameSync(storageRoot, rollbackDir);
    try {
      fs.renameSync(restoredStorage, storageRoot);
      if (fs.existsSync(rollbackDir)) fs.rmSync(rollbackDir, { recursive: true, force: true });
    } catch (restoreError) {
      if (fs.existsSync(storageRoot)) fs.rmSync(storageRoot, { recursive: true, force: true });
      if (fs.existsSync(rollbackDir)) fs.renameSync(rollbackDir, storageRoot);
      throw restoreError;
    }
    if (fs.existsSync(stagingDir)) fs.rmSync(stagingDir, { recursive: true, force: true });

    res.json({
      success: true,
      mensaje: 'Respaldo restaurado con éxito. Se creó una copia automática del estado anterior.'
    });
  } catch (err) {
    if (stagingDir && fs.existsSync(stagingDir)) fs.rmSync(stagingDir, { recursive: true, force: true });
    if (rollbackDir && fs.existsSync(rollbackDir) && !fs.existsSync(getStorageRoot())) fs.renameSync(rollbackDir, getStorageRoot());
    next(err);
  }
});

export default router;

setTimeout(() => { try { createAutomaticBackup(false); } catch (err) { console.warn('[Backup automático]', err.message); } }, 1500).unref();
setInterval(() => { try { createAutomaticBackup(false); } catch (err) { console.warn('[Backup automático]', err.message); } }, 60 * 60 * 1000).unref();
