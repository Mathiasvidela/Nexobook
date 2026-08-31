import React from 'react';
import { SUBJECT_ICONS, SUBJECT_ICON_MAP } from './subjectIcons.js';

export const SUBJECT_COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4', '#f97316'];

export default function SubjectAppearanceFields({ icono = 'BookOpen', color = '#3b82f6', onChange, compact = false }) {
  const set = patch => onChange?.({ icono, color, ...patch });
  return <div className={`subject-appearance-fields ${compact ? 'compact' : ''}`}>
    <div className="subject-icon-field">
      <div className="subject-icon-label"><div><label className="form-label">Icono de la materia</label><span>Elegí el símbolo que mejor la representa.</span></div><div className="subject-icon-preview" style={{ '--subject-preview-color': color }}>{React.createElement(SUBJECT_ICON_MAP[icono] || SUBJECT_ICON_MAP.BookOpen, { size: 21 })}</div></div>
      <div className="subject-icon-picker">{SUBJECT_ICONS.map(([id, Icon, label]) => <button key={id} type="button" className={icono === id ? 'active' : ''} onClick={() => set({ icono: id })} title={label} aria-label={label}><Icon size={18} /><span>{label}</span></button>)}</div>
    </div>
    <div className="subject-color-field"><label className="form-label">Color distintivo</label><div>{SUBJECT_COLORS.map(item => <button key={item} type="button" className={color === item ? 'active' : ''} style={{ '--subject-color-option': item }} onClick={() => set({ color: item })} aria-label={`Elegir color ${item}`} />)}</div></div>
  </div>;
}
