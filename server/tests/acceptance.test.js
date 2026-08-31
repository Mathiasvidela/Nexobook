import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawn } from 'child_process';

const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'nexobook-acceptance-'));
const storageDir = path.join(sandbox, 'portable-data');
const port = 32000 + (process.pid % 1000);
const base = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['server/index.js'], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: String(port), NEXOBOOK_DATA_DIR: storageDir },
  stdio: ['ignore', 'pipe', 'pipe']
});

async function request(endpoint, options = {}) {
  const response = await fetch(`${base}${endpoint}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', 'X-Espacio-Id': 'esp-istea', ...options.headers },
    body: options.body && typeof options.body !== 'string' ? JSON.stringify(options.body) : options.body
  });
  const contentType = response.headers.get('content-type') || '';
  const body = contentType.includes('json') ? await response.json() : await response.arrayBuffer();
  return { response, body };
}

async function waitForServer() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try { const result = await request('/api/materias'); if (result.response.ok) return; } catch { /* iniciando */ }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('El servidor de prueba no inició a tiempo.');
}

try {
  console.log('--- PRUEBAS DE ACEPTACIÓN NEXOBOOK ---');
  await waitForServer();

  const created = await request('/api/materias', { method: 'POST', body: { nombre: 'Materia de aceptación', alias: 'Aceptación', icono: 'FlaskConical', anio: 2030, cuatrimestre: 'primer-cuatrimestre' } });
  assert.strictEqual(created.response.status, 201);
  const materia = created.body;

  const evaluation = await request('/api/evaluaciones', { method: 'POST', body: { materiaId: materia.id, titulo: 'Examen de aceptación', fecha: '2030-04-20' } });
  assert.strictEqual(evaluation.response.status, 201);
  const summary = await request('/api/resumenes', { method: 'POST', body: { materiaId: materia.id, titulo: 'Resumen de aceptación', tipo: 'resumen', contenido: '<h2>Contenido seguro</h2>', formato: 'html' } });
  assert.strictEqual(summary.response.status, 201);

  const trashed = await request(`/api/papelera/mover/materia/${materia.id}`, { method: 'POST' });
  assert.strictEqual(trashed.response.status, 200);
  assert.ok(trashed.body.related.evaluaciones.some(item => item.id === evaluation.body.id));
  assert.ok(trashed.body.related.archivos.some(item => item.id === summary.body.id));
  assert.ok(trashed.body.related.progreso.length === 1);
  assert.strictEqual((await request(`/api/materias/${materia.id}`)).response.status, 404);

  const restored = await request(`/api/papelera/${trashed.body.id}/restaurar`, { method: 'POST' });
  assert.strictEqual(restored.response.status, 200);
  assert.strictEqual((await request(`/api/materias/${materia.id}`)).response.status, 200);
  assert.ok((await request(`/api/evaluaciones?materiaId=${materia.id}`)).body.some(item => item.id === evaluation.body.id));
  assert.ok((await request(`/api/resumenes?materiaId=${materia.id}`)).body.some(item => item.id === summary.body.id));

  const backup = await request('/api/backups/auto', { method: 'POST' });
  assert.strictEqual(backup.response.status, 201);
  assert.ok(fs.existsSync(backup.body.fullPath));
  const backupStatus = await request('/api/backups/status');
  assert.strictEqual(backupStatus.body.storagePath, storageDir);
  assert.strictEqual(backupStatus.body.portable, true);

  const workspace = await request('/api/espacios', { method: 'POST', body: { nombre: 'Tecnicatura de prueba', plantilla: 'tecnicatura', descripcion: 'Plan configurable', duracionAnios: 3, periodosPorAnio: 2, tieneCursosBonificados: true } });
  assert.strictEqual(workspace.response.status, 201);
  const workspaceHeaders = { 'X-Espacio-Id': workspace.body.id };
  const emptyPlan = await request('/api/plan-estudios', { headers: workspaceHeaders });
  assert.strictEqual(emptyPlan.body.estructura.anios, 3);
  assert.strictEqual(emptyPlan.body.estructura.periodosPorAnio, 2);
  assert.strictEqual(emptyPlan.body.mostrarCursosBonificados, true);
  const firstPlanSubject = await request('/api/plan-estudios/materias', { method: 'POST', headers: workspaceHeaders, body: { nombre: 'Materia inicial', anio: 1, cuatrimestre: 1 } });
  const secondPlanSubject = await request('/api/plan-estudios/materias', { method: 'POST', headers: workspaceHeaders, body: { nombre: 'Materia final', anio: 3, cuatrimestre: 2, icono: 'FlaskConical', color: '#ec4899' } });
  assert.strictEqual(firstPlanSubject.response.status, 201);
  assert.strictEqual(secondPlanSubject.response.status, 201);
  await request('/api/plan-estudios/materias/reordenar', { method: 'POST', headers: workspaceHeaders, body: { ids: [secondPlanSubject.body.id, firstPlanSubject.body.id] } });
  await request('/api/plan-estudios/cursos-bonificados', { method: 'POST', headers: workspaceHeaders, body: { nombre: 'Curso adicional' } });
  const configuredPlan = await request('/api/plan-estudios', { headers: workspaceHeaders });
  assert.strictEqual(configuredPlan.body.materias[0].id, secondPlanSubject.body.id);
  assert.deepStrictEqual(configuredPlan.body.cursosBonificados, ['Curso adicional']);
  const generatedPeriods = await request('/api/periodos', { headers: workspaceHeaders });
  assert.strictEqual(generatedPeriods.body.periodos.length, 6);
  assert.ok(generatedPeriods.body.periodos.some(item => item.nombre === 'Año 3 · Cuatrimestre 2'));
  const linkedSubjects = await request(`/api/materias?periodoId=p-${workspace.body.id}-plan-3-2`, { headers: workspaceHeaders });
  const linkedPlanSubject = linkedSubjects.body.find(item => item.planMateriaId === secondPlanSubject.body.id);
  assert.strictEqual(linkedPlanSubject.icono, 'FlaskConical');
  assert.strictEqual(linkedPlanSubject.color, '#ec4899');
  await request(`/api/materias/${linkedPlanSubject.id}`, { method: 'PUT', headers: workspaceHeaders, body: { icono: 'Code2', color: '#10b981' } });
  const appearanceSyncedPlan = await request('/api/plan-estudios', { headers: workspaceHeaders });
  const appearanceSyncedItem = appearanceSyncedPlan.body.materias.find(item => item.id === secondPlanSubject.body.id);
  assert.strictEqual(appearanceSyncedItem.icono, 'Code2');
  assert.strictEqual(appearanceSyncedItem.color, '#10b981');
  const createdFromSubjects = await request('/api/materias', { method: 'POST', headers: workspaceHeaders, body: { nombre: 'Materia desde sección Materias', anio: 2, cuatrimestre: 'plan-2-1', periodoId: `p-${workspace.body.id}-plan-2-1`, estado: 'en_curso' } });
  assert.strictEqual(createdFromSubjects.response.status, 201);
  const planAfterReverseSync = await request('/api/plan-estudios', { headers: workspaceHeaders });
  assert.ok(planAfterReverseSync.body.materias.some(item => item.materiaId === createdFromSubjects.body.id));
  const renamedWorkspace = await request(`/api/espacios/${workspace.body.id}`, { method: 'PUT', body: { nombre: 'Tecnicatura renombrada' } });
  assert.strictEqual(renamedWorkspace.body.nombre, 'Tecnicatura renombrada');
  const archivedWorkspace = await request(`/api/espacios/${workspace.body.id}`, { method: 'DELETE' });
  assert.strictEqual(archivedWorkspace.body.espacio.archivado, true);
  const restoredWorkspace = await request(`/api/espacios/${workspace.body.id}`, { method: 'PUT', body: { archivado: false, archivadoEn: null } });
  assert.strictEqual(restoredWorkspace.body.archivado, false);

  const missing = await request('/api/funcion-inexistente');
  assert.strictEqual(missing.response.status, 404);
  assert.match(missing.body.error, /no existe/i);

  console.log('✓ Crear materia, evaluación y resumen');
  console.log('✓ Papelera restaura una materia con todo su contenido');
  console.log('✓ Backup funciona sobre almacenamiento portátil');
  console.log('✓ Plan, períodos y sección Materias permanecen sincronizados');
  console.log('✓ Espacios se renombran, archivan y restauran sin perder datos');
  console.log('✓ Errores de rutas desconocidas son claros');
  console.log('\n✅ FLUJO CRÍTICO APROBADO\n');
} catch (error) {
  console.error('\n❌ PRUEBA DE ACEPTACIÓN FALLIDA:', error.message);
  process.exitCode = 1;
} finally {
  server.kill('SIGTERM');
  fs.rmSync(sandbox, { recursive: true, force: true });
}
