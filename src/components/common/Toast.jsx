import React from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

export default function Toast({ toasts, removeToast }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isError = toast.type === 'error';
        return (
          <div key={toast.id} className="toast">
            {isSuccess && <CheckCircle size={18} color="var(--success-color)" />}
            {isError && <AlertCircle size={18} color="var(--danger-color)" />}
            {!isSuccess && !isError && <Info size={18} color="var(--accent-primary)" />}

            <span style={{ flex: 1, fontSize: '0.88rem', fontWeight: 500 }}>{toast.message}</span>

            <button
              onClick={() => removeToast(toast.id)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
