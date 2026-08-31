/**
  API Service for communicating with local Express Backend endpoints
 */

const API_BASE = '/api';
let activeEspacioId = '';

export function setApiEspacio(id) {
  activeEspacioId = id || '';
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const isFormData = options.body instanceof FormData;
  const config = {
    ...options,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(activeEspacioId ? { 'X-Espacio-Id': activeEspacioId } : {}),
      ...options.headers
    }
  };

  if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
    config.body = JSON.stringify(options.body);
  }

  let response;
  try {
    response = await fetch(url, config);
  } catch (error) {
    const offlineError = new Error('Nexobook no puede conectarse con el almacenamiento local. Comprobá que la aplicación siga abierta e intentá nuevamente.');
    offlineError.code = 'OFFLINE';
    offlineError.cause = error;
    throw offlineError;
  }

  if (!response.ok) {
    let errorMsg = 'Error en la petición al servidor';
    try {
      const errorData = await response.json();
      errorMsg = errorData.error || errorMsg;
    } catch (e) {
      // Fallback
    }
    throw new Error(errorMsg);
  }

  // Handle blob responses (e.g. ZIP download)
  if (config.responseType === 'blob') {
    return response.blob();
  }

  return response.json();
}

export const api = {
  // Espacios de estudio
  getEspacios: () => request('/espacios'),
  createEspacio: (data) => request('/espacios', { method: 'POST', body: data }),
  updateEspacio: (id, data) => request(`/espacios/${id}`, { method: 'PUT', body: data }),
  deleteEspacio: (id) => request(`/espacios/${id}`, { method: 'DELETE' }),
  // Periodos
  getPeriodos: () => request('/periodos'),
  createPeriodo: (data) => request('/periodos', { method: 'POST', body: data }),
  updatePeriodo: (id, data) => request(`/periodos/${id}`, { method: 'PUT', body: data }),
  activarPeriodo: (id) => request(`/periodos/${id}/activar`, { method: 'POST' }),
  deletePeriodo: (id) => request(`/periodos/${id}`, { method: 'DELETE' }),

  // Materias
  getMaterias: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/materias${query ? `?${query}` : ''}`);
  },
  getMateriaDetail: (id) => request(`/materias/${id}`),
  createMateria: (data) => request('/materias', { method: 'POST', body: data }),
  updateMateria: (id, data) => request(`/materias/${id}`, { method: 'PUT', body: data }),
  deleteMateria: (id) => request(`/papelera/mover/materia/${id}`, { method: 'POST' }),

  // Clases
  getClases: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/clases${query ? `?${query}` : ''}`);
  },
  createClase: (data) => request('/clases', { method: 'POST', body: data }),
  updateClase: (id, data) => request(`/clases/${id}`, { method: 'PUT', body: data }),
  deleteClase: (id) => request(`/clases/${id}`, { method: 'DELETE' }),

  // Archivos (PDFs)
  getArchivos: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/archivos${query ? `?${query}` : ''}`);
  },
  syncArchivos: () => request('/archivos/sync', { method: 'POST' }),
  uploadArchivo: (formData) => request('/archivos/upload', {
    method: 'POST',
    headers: {}, // Let browser set Content-Type with boundary for FormData
    body: formData
  }),
  updateArchivo: (id, data) => request(`/archivos/${id}`, { method: 'PUT', body: data }),
  moverArchivo: (id, nuevaMateriaId) => request(`/archivos/${id}/mover`, {
    method: 'POST',
    body: { nuevaMateriaId }
  }),
  deleteArchivo: (id) => request(`/papelera/mover/archivo/${id}`, { method: 'POST' }),

  // Resúmenes visuales & Apuntes
  getResumenes: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/resumenes${query ? `?${query}` : ''}`);
  },
  getResumenDetail: (id) => request(`/resumenes/${id}`),
  createResumen: (data) => request('/resumenes', { method: 'POST', body: data }),
  updateResumen: (id, data) => request(`/resumenes/${id}`, { method: 'PUT', body: data }),
  moverResumen: (id, materiaId) => request(`/resumenes/${id}/mover`, { method: 'POST', body: { materiaId } }),
  deleteResumen: (id) => request(`/papelera/mover/archivo/${id}`, { method: 'POST' }),
  getResumenExportUrl: (id) => `${API_BASE}/resumenes/${id}/export`,

  // Evaluaciones
  getEvaluaciones: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/evaluaciones${query ? `?${query}` : ''}`);
  },
  createEvaluacion: (data) => request('/evaluaciones', { method: 'POST', body: data }),
  updateEvaluacion: (id, data) => request(`/evaluaciones/${id}`, { method: 'PUT', body: data }),
  deleteEvaluacion: (id) => request(`/papelera/mover/evaluacion/${id}`, { method: 'POST' }),
  getPapelera: () => request('/papelera'),
  restaurarPapelera: (id) => request(`/papelera/${id}/restaurar`, { method: 'POST' }),
  eliminarPermanente: (id) => request(`/papelera/${id}`, { method: 'DELETE' }),
  restaurarTodaPapelera: () => request('/papelera/restaurar-todo', { method: 'POST' }),
  vaciarPapelera: () => request('/papelera', { method: 'DELETE' }),

  // Progreso
  getProgreso: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/progreso${query ? `?${query}` : ''}`);
  },
  addTema: (data) => request('/progreso/tema', { method: 'POST', body: data }),
  updateTema: (temaId, data) => request(`/progreso/tema/${temaId}`, { method: 'PUT', body: data }),
  deleteTema: (temaId, materiaId) => request(`/progreso/tema/${temaId}?materiaId=${materiaId}`, { method: 'DELETE' }),

  // Plan de estudios
  getPlanEstudios: () => request('/plan-estudios'),
  updatePlanMateria: (id, estado) => request(`/plan-estudios/materias/${id}`, { method: 'PUT', body: { estado } }),
  configurePlanEstudios: (data) => request('/plan-estudios/config', { method: 'PUT', body: data }),
  createPlanMateria: (data) => request('/plan-estudios/materias', { method: 'POST', body: data }),
  updatePlanMateriaCompleta: (id, data) => request(`/plan-estudios/materias/${id}`, { method: 'PUT', body: data }),
  deletePlanMateria: (id) => request(`/plan-estudios/materias/${id}`, { method: 'DELETE' }),
  reorderPlanMaterias: (ids) => request('/plan-estudios/materias/reordenar', { method: 'POST', body: { ids } }),
  addCursoBonificado: (nombre) => request('/plan-estudios/cursos-bonificados', { method: 'POST', body: { nombre } }),
  deleteCursoBonificado: (index) => request(`/plan-estudios/cursos-bonificados/${index}`, { method: 'DELETE' }),

  // Búsqueda
  searchGlobal: (query) => request(`/busqueda?q=${encodeURIComponent(query)}`),

  // Backups
  exportBackupUrl: () => `${API_BASE}/backups/export`,
  getBackupStatus: () => request('/backups/status'),
  createAutomaticBackup: () => request('/backups/auto', { method: 'POST' }),
  importBackup: (formData) => request('/backups/import', {
    method: 'POST',
    headers: {},
    body: formData
  })
};
