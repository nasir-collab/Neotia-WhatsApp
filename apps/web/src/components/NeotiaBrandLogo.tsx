import React from 'react';

export const NEOTIA_PALETTE = {
  neotiaOrange: '#F39200',
  neotiaOrangeDark: '#DC8300',
  neotiaOrangeLight: '#FFF7EB',
  bhagirathiBlue: '#0B4F8A',
  bhagirathiRoyal: '#1565A8',
  bhagirathiNavy: '#073966',
  bhagirathiSky: '#EFF6FC',
  whatsappEmerald: '#059669',
};

/**
 * Vector emblem of the Neotia Bhagirathi folded medical cross
 */
export const NeotiaCrossEmblem: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 64 64" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <rect x="22" y="4" width="20" height="18" fill="#0D68AF" />
    <rect x="22" y="42" width="20" height="18" fill="#094585" />
    <rect x="4" y="22" width="18" height="20" fill="#F39200" />
    <rect x="42" y="22" width="18" height="20" fill="#F39200" />
    <polygon points="22,22 22,42 42,42" fill="#F39200" />
    <polygon points="22,22 42,22 42,42" fill="#0D68AF" />
  </svg>
);

/**
 * Renders the official Neotia Bhagirathi Woman and Child Care Centre logo
 * at full unclipped clarity using object-contain on a seamless white surface.
 * Because the source PNG is square with top/bottom whitespace, we use a clean
 * negative vertical trim so the full horizontal lockup is large, sharp, and prominent.
 */
export const NeotiaBrandLogo: React.FC<{
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showTaglineBadge?: boolean;
}> = ({ size = 'md', className = '', showTaglineBadge = false }) => {
  const widthClass =
    size === 'sm'
      ? 'w-36'
      : size === 'lg'
      ? 'w-56'
      : size === 'xl'
      ? 'w-64'
      : 'w-48';

  const heightClass =
    size === 'sm'
      ? 'h-12'
      : size === 'lg'
      ? 'h-20'
      : size === 'xl'
      ? 'h-24'
      : 'h-16';

  return (
    <div className={`inline-flex flex-col ${className}`}>
      <div
        className={`relative overflow-hidden bg-white rounded-lg flex items-center justify-center ${widthClass} ${heightClass}`}
      >
        <img
          src={`${import.meta.env.BASE_URL}neotia-logo.png`}
          alt="Neotia Bhagirathi Woman and Child Care Centre"
          className="w-full h-auto max-w-none object-contain scale-[1.12] select-none"
        />
      </div>
      {showTaglineBadge && (
        <span className="mt-1 text-[11px] font-medium text-slate-500 tracking-tight">
          Ambuja Neotia Healthcare Venture Ltd.
        </span>
      )}
    </div>
  );
};
