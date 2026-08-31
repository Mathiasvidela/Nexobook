import React, { useEffect, useState } from 'react';
import { usePeriod } from '../../context/PeriodContext.jsx';
import { api } from '../../services/api.js';
import Modal from '../common/Modal.jsx';
import ConfirmModal from '../common/ConfirmModal.jsx';
import { Settings, Calendar, Plus, Download, Upload, CheckCircle, AlertTriangle, Trash2, Edit2, ShieldCheck, RefreshCw } from 'lucide-react';

export default function ConfiguracionView({ addToast }) {
  const { periodos, periodoActivo, cargarPeriodos, activarPeriodo } = usePeriod();

  // Period modal states
  const [isPeriodModalOpen, setIsPeriodModalOpen] = useState(false);
  const [editingPeriodo, setEditingPeriodo] = useState(null);
  const [deletingPeriodo, setDeletingPeriodo] = useState(null);
  const [periodoForm, setPeriodoForm] = useState({
    anio: 2026,
    cuatrimestre: 'segundo-cuatrimestre',
    nombre: '',
    esActivo: false
  });

  // Backup states
  const [backupFile, setBackupFile] = useState(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [backupStatus, setBackupStatus] = useState(null);
  const [creatingAuto, setCreatingAuto] = useState(false);

  const loadBackupStatus = () => api.getBackupStatus().then(setBackupStatus).catch(() => {});
  useEffect(() => { loadBackupStatus(); }, []);

  const createAutoBackup = async () => {
    try { setCreatingAuto(true); await api.createAutomaticBackup(); await loadBackupStatus(); addToast('Copia local creada.', 'success'); }
    catch (err) { addToast(err.message || 'No se pudo crear la copia.', 'error'); }
    finally { setCreatingAuto(false); }
  };

  const handleOpenPeriodModal = (p = null) => {
    if (p) {
      setEditingPeriodo(p);
      setPeriodoForm({
        anio: p.anio,
        cuatrimestre: p.cuatrimestre,
        nombre: p.nombre,
        esActivo: p.esActivo
      });
    } else {
      setEditingPeriodo(null);
      setPeriodoForm({
        anio: 2026,
        cuatrimestre: 'segundo-cuatrimestre',
        nombre: '2026 - 2º Cuatrimestre',
        esActivo: false
      });
    }
    setIsPeriodModalOpen(true);
  };

  const handlePeriodSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingPeriodo) {
        await api.updatePeriodo(editingPeriodo.id, periodoForm);
        addToast('Período académico actualizado.', 'success');
      } else {
        await api.createPeriodo(periodoForm);
        addToast('Nuevo período académico creado.', 'success');
      }
      cargarPeriodos();
      setIsPeriodModalOpen(false);
    } catch (err) {
      addToast(err.message || 'Error al guardar período.', 'error');
    }
  };

  const handleDeletePeriodo = async () => {
    if (!deletingPeriodo) return;
    try {
      await api.deletePeriodo(deletingPeriodo.id);
      addToast('Período eliminado.', 'success');
      cargarPeriodos();
    } catch (err) {
      addToast(err.message || 'Error al eliminar período.', 'error');
    } finally {
      setDeletingPeriodo(null);
    }
  };

  const handleExportBackup = () => {
    window.location.href = api.exportBackupUrl();
    addToast('Descargando copia de seguridad ZIP...', 'info');
  };

  const handleImportBackup = async () => {
    if (!backupFile) {
      addToast('Selecciona un archivo ZIP de respaldo.', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('backup', backupFile);

    try {
      setIsRestoring(true);
      await api.importBackup(formData);
      addToast('Copia de seguridad restaurada exitosamente.', 'success');
      setBackupFile(null);
      setConfirmRestore(false);
      window.location.reload();
    } catch (err) {
      addToast(err.message || 'Error al restaurar respaldo.', 'error');
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Configuración y Copias de Seguridad</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Gestión de períodos académicos, copias de respaldo ZIP y restauración.
        </p>
      </div>

      {/* 1. Academic Periods Section */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Períodos Académicos (Años y Cuatrimestres)</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
              Crea nuevos cuatrimestres e indica cuál es el período activo actual.
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => handleOpenPeriodModal()}>
            <Plus size={16} /> <span>Crear Período</span>
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {periodos.map((p) => (
            <div
              key={p.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1rem',
                background: 'var(--bg-tertiary)',
                borderRadius: 'var(--border-radius-sm)',
                border: p.esActivo ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Calendar size={20} color="var(--accent-primary)" />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.98rem' }}>
                    {p.nombre} {p.esActivo && <span className="badge period-active-badge" style={{ marginLeft: 8 }}><CheckCircle size={13} /> Activo</span>}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Año: {p.anio} • Cuatrimestre: {p.cuatrimestre}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {!p.esActivo && (
                  <button className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.82rem' }} onClick={() => activarPeriodo(p.id)}>
                    Establecer como Activo
                  </button>
                )}
                <button className="btn btn-secondary btn-icon" onClick={() => handleOpenPeriodModal(p)} title="Editar">
                  <Edit2 size={14} />
                </button>
                <button className="btn btn-secondary btn-icon" onClick={() => setDeletingPeriodo(p)} title="Eliminar">
                  <Trash2 size={14} color="var(--danger-color)" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Backups Section */}
      <div className="card">
        <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.4rem' }}>
          Copias de Seguridad (ZIP)
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '1.5rem' }}>
          Genera un archivo ZIP completo con todos los archivos JSON y documentos locales en `storage/` para respaldar o restaurar tu información.
        </p>

        <div className="auto-backup-status"><div className="auto-backup-icon"><ShieldCheck size={20} /></div><div><strong>Protección automática activa</strong><span>{backupStatus?.lastBackup ? `Última copia: ${new Date(backupStatus.lastBackup.createdAt).toLocaleString('es-AR')} · ${backupStatus.copies} guardadas` : 'La primera copia se creará automáticamente'}</span></div><button className="btn btn-secondary" onClick={createAutoBackup} disabled={creatingAuto}><RefreshCw size={15} className={creatingAuto ? 'is-spinning' : ''} /> Crear ahora</button></div>

        {backupStatus?.storagePath && <div className="storage-location"><div><strong>Ubicación de tus datos</strong><span>{backupStatus.portable ? 'Carpeta portátil personalizada' : 'Carpeta local de Nexobook'}</span></div><code title={backupStatus.storagePath}>{backupStatus.storagePath}</code></div>}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {/* Export card */}
          <div style={{ padding: '1.25rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--border-radius-sm)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.4rem' }}>Exportar Respaldo</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                Descarga un paquete ZIP seguro con todos tus datos académicos.
              </p>
            </div>
            <button className="btn btn-primary" onClick={handleExportBackup}>
              <Download size={16} /> <span>Descargar Respaldo ZIP</span>
            </button>
          </div>

          {/* Import card */}
          <div style={{ padding: '1.25rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--border-radius-sm)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.4rem' }}>Restaurar desde ZIP</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                Sube un archivo de respaldo previo. Se requiere confirmación antes de sobrescribir.
              </p>
              <input
                type="file"
                accept=".zip"
                className="form-control"
                style={{ fontSize: '0.82rem' }}
                onChange={(e) => setBackupFile(e.target.files[0] || null)}
              />
            </div>
            <button
              className="btn btn-secondary"
              style={{ marginTop: '1rem' }}
              disabled={!backupFile || isRestoring}
              onClick={() => setConfirmRestore(true)}
            >
              <Upload size={16} /> <span>Restaurar Copia</span>
            </button>
          </div>
        </div>
      </div>

      {/* Period Modal */}
      <Modal isOpen={isPeriodModalOpen} onClose={() => setIsPeriodModalOpen(false)} title={editingPeriodo ? 'Editar Período' : 'Crear Período Académico'}>
        <form onSubmit={handlePeriodSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Año Académico</label>
              <input
                type="number"
                className="form-control"
                value={periodoForm.anio}
                onChange={(e) => setPeriodoForm({ ...periodoForm, anio: Number(e.target.value) })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Cuatrimestre</label>
              <select
                className="form-control"
                value={periodoForm.cuatrimestre}
                onChange={(e) => setPeriodoForm({ ...periodoForm, cuatrimestre: e.target.value })}
              >
                <option value="primer-cuatrimestre">Primer Cuatrimestre</option>
                <option value="segundo-cuatrimestre">Segundo Cuatrimestre</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Nombre Descriptivo</label>
            <input
              type="text"
              className="form-control"
              placeholder="Ej: 2026 - 2º Cuatrimestre"
              value={periodoForm.nombre}
              onChange={(e) => setPeriodoForm({ ...periodoForm, nombre: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.2rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsPeriodModalOpen(false)}>Cancelar</button>
            <button type="submit" className="btn btn-primary">Guardar Período</button>
          </div>
        </form>
      </Modal>

      {/* Confirmation Modal for Restore */}
      <ConfirmModal
        isOpen={confirmRestore}
        onClose={() => setConfirmRestore(false)}
        onConfirm={handleImportBackup}
        title="Confirmar Restauración de Respaldo"
        message="ADVERTENCIA: Esta operación reemplazará los datos y archivos actuales por el contenido del archivo ZIP. ¿Deseas continuar?"
        confirmText="Sí, Restaurar Todo"
      />

      <ConfirmModal
        isOpen={!!deletingPeriodo}
        onClose={() => setDeletingPeriodo(null)}
        onConfirm={handleDeletePeriodo}
        title="Eliminar Período"
        message={`¿Estás seguro de que deseas eliminar el período "${deletingPeriodo?.nombre}"?`}
      />
    </div>
  );
}
