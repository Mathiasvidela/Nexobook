import React from 'react';
import Modal from './Modal.jsx';
import { AlertTriangle } from 'lucide-react';

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirmar acción',
  message = '¿Estás seguro de que deseas eliminar este elemento? Esta acción no se puede deshacer.',
  confirmText = 'Eliminar',
  cancelText = 'Cancelar'
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="480px">
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div style={{ background: 'var(--danger-bg)', color: 'var(--danger-color)', padding: '0.75rem', borderRadius: '50%' }}>
          <AlertTriangle size={24} />
        </div>
        <div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>{message}</p>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
        <button className="btn btn-secondary" onClick={onClose}>
          {cancelText}
        </button>
        <button
          className="btn btn-danger"
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          {confirmText}
        </button>
      </div>
    </Modal>
  );
}
