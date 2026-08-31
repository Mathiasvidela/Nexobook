import React from 'react';
import iconBlack from '../../assets/brand/icono-black.svg';
import iconWhite from '../../assets/brand/icono-white.svg';
import logoBlack from '../../assets/brand/logo-black.svg';
import logoWhite from '../../assets/brand/logo-white.svg';

export default function NexobookMark({ size = 22, className = '', variant = 'icon', tone = 'auto', label = 'Nexobook' }) {
  const isLogo = variant === 'logo';
  const blackAsset = isLogo ? logoBlack : iconBlack;
  const whiteAsset = isLogo ? logoWhite : iconWhite;

  return (
    <span
      className={`nexobook-asset nexobook-asset-${variant} tone-${tone} ${className}`.trim()}
      style={{ width: size, aspectRatio: isLogo ? '600.36 / 373.16' : '350.07 / 448.7' }}
      role="img"
      aria-label={label}
    >
      <img className="nexobook-asset-black" src={blackAsset} alt="" />
      <img className="nexobook-asset-white" src={whiteAsset} alt="" />
    </span>
  );
}
