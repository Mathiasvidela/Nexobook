import path from 'path';

const STORAGE_ROOT = path.resolve(process.env.NEXOBOOK_DATA_DIR || path.join(process.cwd(), 'storage'));

/**
 * Normalizes and checks if a given relative or absolute path is strictly inside the storage directory.
 * @param {string} targetPath Relative path or subpath inside storage
 * @returns {string} Fully resolved safe absolute path
 * @throws {Error} If path attempts to escape storage directory
 */
export function validateSafePath(targetPath) {
  if (!targetPath) {
    throw new Error('Ruta no provista.');
  }

  // Metadata historically stores paths as "storage/archivos/..." while this
  // helper already resolves relative paths from STORAGE_ROOT. Strip that
  // harmless prefix so it does not become "storage/storage/archivos/...".
  const normalizedInput = path.normalize(targetPath);
  const storagePrefix = `storage${path.sep}`;
  const relativeInput = !path.isAbsolute(normalizedInput) && normalizedInput.startsWith(storagePrefix)
    ? normalizedInput.slice(storagePrefix.length)
    : normalizedInput;

  let fullPath = path.isAbsolute(relativeInput)
    ? relativeInput
    : path.resolve(STORAGE_ROOT, relativeInput);

  // Normalize path to strip any ../ or ./
  fullPath = path.normalize(fullPath);

  const relativeToRoot = path.relative(STORAGE_ROOT, fullPath);
  if (relativeToRoot.startsWith('..') || path.isAbsolute(relativeToRoot)) {
    const error = new Error('Acceso denegado: intento de navegación fuera de storage.');
    error.statusCode = 403;
    throw error;
  }

  return fullPath;
}

export function getStorageRoot() {
  return STORAGE_ROOT;
}
