import React from 'react';
import { FolderOpen } from 'lucide-react';

export default function EmptyState({
  title = 'No hay información registrada',
  description = 'No se encontraron elementos en esta sección.',
  icon: Icon = FolderOpen,
  actionButton = null
}) {
  return (
    <div className="empty-state card">
      <div className="empty-state-icon">
        <Icon size={44} />
      </div>
      <h3 className="empty-state-title">{title}</h3>
      <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: actionButton ? '1.25rem' : '0' }}>
        {description}
      </p>
      {actionButton}
    </div>
  );
}
