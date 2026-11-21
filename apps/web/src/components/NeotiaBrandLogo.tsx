import React from 'react';

export const NEOTIA_PALETTE = {
  neotiaOrange: '#F39200',
  neotiaGold: '#E68A00',
  neotiaChampagne: '#FFF8EE',
  bhagirathiBlue: '#0B4F8A',
  bhagirathiDeep: '#072A4D',
  bhagirathiMist: '#F0F6FC',
  emeraldClinical: '#0F766E',
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
 * cleanly unclipped and prominently sized on a pure white plinth.
 * Note: The source PNG is 200x200 with ~30% whitespace top/bottom and ~8% side padding.
 * Using explicit aspect container with object-contain and zero horizontal clipping
 * ensures the entire cross + "Neotia Bhagirathi Woman and Child Care Centre" is 100% legible.
 */
export const NeotiaBrandLogo: React.FC<{
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showTaglineBadge?: boolean;
}> = ({ size = 'md', className = '', showTaglineBadge = false }) => {
  const containerClass =
    size === 'sm'
      ? 'w-40 h-14'
      : size === 'lg'
      ? 'w-56 h-20'
      : size === 'xl'
      ? 'w-72 h-28'
      : 'w-48 h-16';

  return (
    <div className={`inline-flex flex-col ${className}`}>
      <div
        className={`relative overflow-hidden bg-white flex items-center justify-center ${containerClass}`}
      >
        <img
          src={`${import.meta.env.BASE_URL}neotia-logo.png`}
          alt="Neotia Bhagirathi Woman and Child Care Centre"
          className="w-full h-full object-contain scale-[1.22] select-none"
        />
      </div>
      {showTaglineBadge && (
        <div className="mt-1 flex items-center gap-2 text-[11px] font-medium text-slate-500 tracking-wide">
          <span className="h-[1px] w-4 bg-[#E68A00]" />
          <span>Ambuja Neotia Healthcare Venture Ltd.</span>
        </div>
      )}
    </div>
  );
};
