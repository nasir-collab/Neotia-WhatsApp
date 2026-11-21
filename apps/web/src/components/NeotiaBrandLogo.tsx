import React from 'react';

export const NEOTIA_PALETTE = {
  neotiaOrange: '#F39200',
  neotiaOrangeDark: '#D97E00',
  neotiaOrangeLight: '#FFF4E5',
  bhagirathiBlue: '#0B4F8A',
  bhagirathiRoyal: '#0D68AF',
  bhagirathiNavy: '#062646',
  bhagirathiSky: '#EBF4FC',
  whatsappEmerald: '#10B981',
};

/**
 * Vector recreation of the Neotia Bhagirathi medical cross emblem
 * (Orange horizontal bar with diagonal fold + Royal/Navy vertical bar)
 */
export const NeotiaCrossEmblem: React.FC<{ className?: string }> = ({ className = 'w-7 h-7' }) => (
  <svg viewBox="0 0 64 64" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    {/* Top vertical royal blue arm */}
    <rect x="22" y="4" width="20" height="18" fill="#0D68AF" />
    {/* Bottom vertical deep navy blue arm */}
    <rect x="22" y="42" width="20" height="18" fill="#094585" />
    {/* Left horizontal Neotia orange arm */}
    <rect x="4" y="22" width="18" height="20" fill="#F39200" />
    {/* Right horizontal Neotia orange arm */}
    <rect x="42" y="22" width="18" height="20" fill="#F39200" />
    {/* Center square split diagonally: bottom-left orange triangle, top-right royal blue triangle */}
    <polygon points="22,22 22,42 42,42" fill="#F39200" />
    <polygon points="22,22 42,22 42,42" fill="#0D68AF" />
  </svg>
);

/**
 * Renders the official uploaded Neotia Bhagirathi Woman and Child Care Centre logo
 * cropped cleanly to its horizontal lockup inside a crisp white surface container.
 */
export const NeotiaBrandLogo: React.FC<{
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showTaglineBadge?: boolean;
}> = ({ size = 'md', className = '', showTaglineBadge = false }) => {
  const dimensions =
    size === 'sm'
      ? 'w-40 h-11'
      : size === 'lg'
      ? 'w-60 h-16'
      : 'w-52 h-14';

  return (
    <div className={`inline-flex flex-col ${className}`}>
      <div
        className={`relative overflow-hidden rounded-xl bg-white shadow-sm border border-slate-200/90 flex items-center justify-center px-2 ${dimensions}`}
        style={{
          borderTop: '3px solid #F39200',
          borderBottom: '2px solid #0B4F8A',
        }}
      >
        <img
          src="/neotia-logo.png"
          alt="Neotia Bhagirathi Woman and Child Care Centre"
          className="w-full h-[185%] object-cover object-center select-none pointer-events-none"
        />
      </div>
      {showTaglineBadge && (
        <div className="mt-1.5 flex items-center gap-1.5 text-[10px] font-semibold tracking-wide text-[#F39200]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#F39200]" />
          <span>Ambuja Neotia Healthcare Venture Ltd.</span>
        </div>
      )}
    </div>
  );
};
