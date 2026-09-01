import assert from 'assert';
import path from 'path';
import fs from 'fs';
import { safeSaveJson, safeReadJson, initializeStorage, resolveJsonPath } from '../utils/safeJsonStorage.js';
import { validateSafePath, getStorageRoot } from '../utils/pathSecurity.js';

console.log('--- RUNNING STORAGE & SECURITY TESTS ---');

try {
  // Initialize storage
  initializeStorage();

  // Test 1: Validate Path Security (Block Path Traversal)
  console.log('Test 1: Path Traversal Security check...');
  let caughtError = false;
  try {
    validateSafePath('../../etc/passwd');
  } catch (err) {
    caughtError = true;
    assert.strictEqual(err.statusCode, 403);
  }
  assert.strictEqual(caughtError, true, 'Debe bloquear navegación fuera de storage/');
  console.log('✓ Test 1 PASSED: Path traversal bloqueado correctamente.');

  // Test 1b: Paths persisted with the storage/ prefix resolve correctly.
  console.log('Test 1b: Storage-prefixed metadata path...');
  const prefixedPath = validateSafePath('storage/archivos/2026/archivo.pdf');
  assert.strictEqual(
    prefixedPath,
    path.join(getStorageRoot(), 'archivos', '2026', 'archivo.pdf'),
    'No debe duplicar el segmento storage/'
  );
  console.log('✓ Test 1b PASSED: La ruta storage/ se resuelve sin duplicarse.');

  // Test 1c: Windows absolute paths must not be treated as bare filenames.
  console.log('Test 1c: Windows absolute storage path...');
  const windowsAbsolutePath = 'C:\\Users\\mathi\\OneDrive\\Documents\\Nexobook\\storage\\data\\materias.json';
  assert.strictEqual(
    resolveJsonPath(windowsAbsolutePath),
    windowsAbsolutePath,
    'No debe anteponer DATA_DIR a una ruta absoluta de Windows'
  );
  console.log('✓ Test 1c PASSED: La ruta absoluta de Windows se conserva intacta.');

  // Test 2: Safe JSON Write & Read
  console.log('Test 2: Safe JSON Atomic Write & Read...');
  const testFilePath = path.join(getStorageRoot(), 'data', 'test_storage.json');
  const testData = { key: 'valor_prueba', num: 12345 };

  safeSaveJson(testFilePath, testData);
  const readData = safeReadJson(testFilePath);

  assert.deepStrictEqual(readData, testData, 'El contenido leído debe coincidir exactamente con el guardado');
  console.log('✓ Test 2 PASSED: JSON atómico guardado y leído exitosamente.');

  // Test 3: Backup Creation on Update
  console.log('Test 3: Backup .bak creation check...');
  const updatedData = { key: 'valor_actualizado', num: 99999 };
  safeSaveJson(testFilePath, updatedData);

  const bakPath = `${testFilePath}.bak`;
  assert.strictEqual(fs.existsSync(bakPath), true, 'El archivo de copia de seguridad .bak debe existir');

  const bakData = JSON.parse(fs.readFileSync(bakPath, 'utf8'));
  assert.deepStrictEqual(bakData, testData, 'El backup debe contener los datos anteriores');
  console.log('✓ Test 3 PASSED: Backup .bak creado y validado.');

  // Cleanup test files
  if (fs.existsSync(testFilePath)) fs.unlinkSync(testFilePath);
  if (fs.existsSync(bakPath)) fs.unlinkSync(bakPath);

  console.log('\n✅ TODAS LAS PRUEBAS DE ALMACENAMIENTO PASARON SATISFACTORIAMENTE.\n');
  process.exit(0);
} catch (err) {
  console.error('\n❌ PRUEBA FALLIDA:', err.message);
  console.error(err.stack);
  process.exit(1);
}
