import React from 'react';

/**
 * Official vector crests and emblems for IOEF member federations, leagues, and clubs.
 * Zero emojis - pure institutional sports design inspired by FIFA / UEFA governance.
 */

interface EmblemProps {
  className?: string;
  size?: number | string;
}

// 1. Official Member Division Emblems
export const EnglandFederationEmblem: React.FC<EmblemProps> = ({ className = 'w-10 h-10' }) => (
  <div className={`relative flex items-center justify-center rounded-lg bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 border border-blue-500/40 p-1.5 shadow-md shadow-blue-950/40 ${className}`}>
    <svg viewBox="0 0 100 120" className="w-full h-full drop-shadow-md">
      <defs>
        <linearGradient id="eng-gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F59E0B" />
          <stop offset="50%" stopColor="#FDE68A" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
      </defs>
      {/* Heraldic Shield */}
      <path d="M10 15 Q50 5 90 15 L90 65 Q90 105 50 118 Q10 105 10 65 Z" fill="#0B132B" stroke="url(#eng-gold)" strokeWidth="4" />
      {/* Cross of St. George behind */}
      <path d="M44 20 H56 V100 H44 Z" fill="#DC2626" opacity="0.8" />
      <path d="M16 48 H84 V60 H16 Z" fill="#DC2626" opacity="0.8" />
      {/* Three Lions stylized */}
      <g fill="url(#eng-gold)">
        <path d="M35 34 C42 30 58 30 65 34 C63 39 37 39 35 34 Z" />
        <path d="M35 52 C42 48 58 48 65 52 C63 57 37 57 35 52 Z" />
        <path d="M35 70 C42 66 58 66 65 70 C63 75 37 75 35 70 Z" />
      </g>
      <text x="50" y="96" fill="#F8FAFC" fontSize="11" fontWeight="800" textAnchor="middle" letterSpacing="1">ENG</text>
    </svg>
  </div>
);

export const SpainFederationEmblem: React.FC<EmblemProps> = ({ className = 'w-10 h-10' }) => (
  <div className={`relative flex items-center justify-center rounded-lg bg-gradient-to-br from-red-950 via-slate-900 to-amber-950 border border-amber-500/40 p-1.5 shadow-md shadow-red-950/40 ${className}`}>
    <svg viewBox="0 0 100 120" className="w-full h-full drop-shadow-md">
      <defs>
        <linearGradient id="esp-gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
      </defs>
      <path d="M10 20 Q50 10 90 20 L90 70 Q90 108 50 118 Q10 108 10 70 Z" fill="#450A0A" stroke="url(#esp-gold)" strokeWidth="4" />
      {/* Spanish Flag Stripe */}
      <rect x="20" y="24" width="60" height="20" fill="#DC2626" rx="2" />
      <rect x="20" y="44" width="60" height="24" fill="#FBBF24" />
      <rect x="20" y="68" width="60" height="20" fill="#DC2626" rx="2" />
      {/* Crown */}
      <path d="M36 28 L40 18 L50 24 L60 18 L64 28 Z" fill="url(#esp-gold)" />
      <circle cx="50" cy="56" r="8" fill="#B91C1C" stroke="#FDE68A" strokeWidth="2" />
      <text x="50" y="104" fill="#F8FAFC" fontSize="11" fontWeight="800" textAnchor="middle" letterSpacing="1">ESP</text>
    </svg>
  </div>
);

export const ItalyFederationEmblem: React.FC<EmblemProps> = ({ className = 'w-10 h-10' }) => (
  <div className={`relative flex items-center justify-center rounded-lg bg-gradient-to-br from-blue-950 via-slate-900 to-blue-900 border border-blue-400/40 p-1.5 shadow-md shadow-blue-950/40 ${className}`}>
    <svg viewBox="0 0 100 120" className="w-full h-full drop-shadow-md">
      <path d="M12 18 Q50 8 88 18 L88 72 Q88 108 50 118 Q12 108 12 72 Z" fill="#003580" stroke="#F8FAFC" strokeWidth="3" />
      {/* Tricolore Stripes */}
      <path d="M22 28 H40 V72 H22 Z" fill="#009246" />
      <path d="M40 28 H60 V72 H40 Z" fill="#FFFFFF" />
      <path d="M60 28 H78 V72 H60 Z" fill="#CE2B37" />
      {/* 4 Stars for World Titles */}
      <g fill="#F59E0B">
        <polygon points="28,20 30,24 34,24 31,27 32,31 28,29 24,31 25,27 22,24 26,24" />
        <polygon points="42,16 44,20 48,20 45,23 46,27 42,25 38,27 39,23 36,20 40,20" />
        <polygon points="58,16 60,20 64,20 61,23 62,27 58,25 54,27 55,23 52,20 56,20" />
        <polygon points="72,20 74,24 78,24 75,27 76,31 72,29 68,31 69,27 66,24 70,24" />
      </g>
      <text x="50" y="98" fill="#F8FAFC" fontSize="12" fontWeight="900" textAnchor="middle" letterSpacing="1">FIGC</text>
    </svg>
  </div>
);

export const GermanyFederationEmblem: React.FC<EmblemProps> = ({ className = 'w-10 h-10' }) => (
  <div className={`relative flex items-center justify-center rounded-lg bg-gradient-to-br from-slate-950 via-slate-900 to-zinc-900 border border-emerald-500/30 p-1.5 shadow-md shadow-slate-950/40 ${className}`}>
    <svg viewBox="0 0 100 120" className="w-full h-full drop-shadow-md">
      {/* Classic DFB Circle in shield */}
      <path d="M12 18 Q50 10 88 18 L88 70 Q88 108 50 118 Q12 108 12 70 Z" fill="#09090B" stroke="#10B981" strokeWidth="3" />
      <circle cx="50" cy="54" r="26" fill="#18181B" stroke="#FFFFFF" strokeWidth="2" />
      {/* German Eagle Silhouette */}
      <path d="M50 36 L56 46 L68 44 L60 54 L66 66 L50 60 L34 66 L40 54 L32 44 L44 46 Z" fill="#E4E4E7" />
      {/* 3 Colors base strip */}
      <rect x="25" y="86" width="50" height="4" fill="#000000" />
      <rect x="25" y="90" width="50" height="4" fill="#DD0000" />
      <rect x="25" y="94" width="50" height="4" fill="#FFCC00" />
      <text x="50" y="108" fill="#E4E4E7" fontSize="10" fontWeight="800" textAnchor="middle" letterSpacing="1">GERMANY</text>
    </svg>
  </div>
);

export const FranceFederationEmblem: React.FC<EmblemProps> = ({ className = 'w-10 h-10' }) => (
  <div className={`relative flex items-center justify-center rounded-lg bg-gradient-to-br from-blue-950 via-slate-900 to-indigo-950 border border-blue-400/40 p-1.5 shadow-md shadow-blue-950/40 ${className}`}>
    <svg viewBox="0 0 100 120" className="w-full h-full drop-shadow-md">
      <path d="M12 20 Q50 8 88 20 L88 70 Q88 108 50 118 Q12 108 12 70 Z" fill="#0F172A" stroke="#38BDF8" strokeWidth="3" />
      {/* Two World Stars */}
      <g fill="#F59E0B">
        <polygon points="40,20 42,24 46,24 43,27 44,31 40,29 36,31 37,27 34,24 38,24" />
        <polygon points="60,20 62,24 66,24 63,27 64,31 60,29 56,31 57,27 54,24 58,24" />
      </g>
      {/* Gallic Rooster Silhouette */}
      <path d="M48 40 C52 38 56 42 56 46 C60 48 64 52 62 58 C66 62 64 68 58 70 C56 74 54 82 50 86 C46 82 44 76 42 70 C38 66 38 58 42 52 C42 46 44 42 48 40 Z" fill="#F8FAFC" />
      <path d="M50 42 L52 36 L55 42 Z" fill="#EF4444" />
      <text x="50" y="104" fill="#38BDF8" fontSize="11" fontWeight="800" textAnchor="middle" letterSpacing="1">FFF</text>
    </svg>
  </div>
);

export const SaudiFederationEmblem: React.FC<EmblemProps> = ({ className = 'w-10 h-10' }) => (
  <div className={`relative flex items-center justify-center rounded-lg bg-gradient-to-br from-emerald-950 via-slate-900 to-green-950 border border-emerald-500/50 p-1.5 shadow-md shadow-emerald-950/40 ${className}`}>
    <svg viewBox="0 0 100 120" className="w-full h-full drop-shadow-md">
      <defs>
        <linearGradient id="ksa-gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F59E0B" />
          <stop offset="50%" stopColor="#FDE68A" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
      </defs>
      <path d="M10 20 Q50 6 90 20 L90 70 Q90 108 50 118 Q10 108 10 70 Z" fill="#064E3B" stroke="url(#ksa-gold)" strokeWidth="3.5" />
      {/* Palm Tree */}
      <path d="M48 54 H52 V78 H48 Z" fill="url(#ksa-gold)" />
      <path d="M50 54 Q38 46 30 52 Q40 40 50 48 Q60 40 70 52 Q62 46 50 54 Z" fill="url(#ksa-gold)" />
      <path d="M50 48 Q42 34 36 38 Q44 30 50 38 Q56 30 64 38 Q58 34 50 48 Z" fill="url(#ksa-gold)" />
      {/* Crossed Swords */}
      <path d="M30 76 L70 88 M30 88 L70 76" stroke="url(#ksa-gold)" strokeWidth="3" strokeLinecap="round" />
      <text x="50" y="106" fill="#F8FAFC" fontSize="10" fontWeight="900" textAnchor="middle" letterSpacing="1">SAUDI</text>
    </svg>
  </div>
);

// Map of division emblems
export const DIVISION_EMBLEMS: Record<string, React.FC<EmblemProps>> = {
  div_eng: EnglandFederationEmblem,
  div_esp: SpainFederationEmblem,
  div_ita: ItalyFederationEmblem,
  div_ger: GermanyFederationEmblem,
  div_fra: FranceFederationEmblem,
  div_ksa: SaudiFederationEmblem,
};

// 2. Official League Logos & Badges
export const LeagueBadge: React.FC<{
  divisionId?: string;
  tier?: 1 | 2;
  category?: string;
  name?: string;
  className?: string;
}> = ({ divisionId, tier = 1, category, name, className = 'w-9 h-9' }) => {
  // Check international categories first
  if (category === 'champions_league') {
    return (
      <div className={`relative flex items-center justify-center rounded-lg bg-gradient-to-br from-indigo-950 via-slate-900 to-blue-950 border border-blue-400/50 p-1 ${className}`}>
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <circle cx="50" cy="50" r="45" fill="#0A0F24" stroke="#60A5FA" strokeWidth="3" />
          {/* Champions League Starball pattern */}
          <g fill="#93C5FD">
            <polygon points="50,15 54,26 66,26 56,33 60,44 50,37 40,44 44,33 34,26 46,26" />
            <polygon points="22,40 26,51 38,51 28,58 32,69 22,62 12,69 16,58 6,51 18,51" transform="scale(0.8) translate(8, 12)" />
            <polygon points="78,40 82,51 94,51 84,58 88,69 78,62 68,69 72,58 62,51 74,51" transform="scale(0.8) translate(18, 12)" />
          </g>
          <text x="50" y="78" fill="#F8FAFC" fontSize="13" fontWeight="900" textAnchor="middle">UCL</text>
        </svg>
      </div>
    );
  }

  if (category === 'europa_league') {
    return (
      <div className={`relative flex items-center justify-center rounded-lg bg-gradient-to-br from-amber-950 via-slate-900 to-orange-950 border border-amber-500/50 p-1 ${className}`}>
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <circle cx="50" cy="50" r="45" fill="#1C1004" stroke="#F97316" strokeWidth="3" />
          <path d="M35 30 L65 30 L58 65 L42 65 Z" fill="#F59E0B" />
          <text x="50" y="80" fill="#F8FAFC" fontSize="13" fontWeight="900" textAnchor="middle">UEL</text>
        </svg>
      </div>
    );
  }

  if (category === 'international_super_cup') {
    return (
      <div className={`relative flex items-center justify-center rounded-lg bg-gradient-to-br from-amber-900 via-slate-900 to-yellow-950 border border-amber-300 p-1 ${className}`}>
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <circle cx="50" cy="50" r="45" fill="#171203" stroke="#FDE047" strokeWidth="3" />
          <path d="M40 25 H60 V35 H54 V65 H46 V35 H40 Z" fill="#FACC15" />
          <text x="50" y="82" fill="#F8FAFC" fontSize="11" fontWeight="900" textAnchor="middle">SUPER</text>
        </svg>
      </div>
    );
  }

  // League titles by Division & Tier
  let leagueTitle = 'D1';
  let badgeColor = 'from-blue-900 to-slate-900 border-blue-500/40';
  let text = 'PRO';

  if (divisionId === 'div_eng') {
    leagueTitle = tier === 1 ? 'EPL' : 'CHA';
    text = tier === 1 ? 'PREMIER' : 'CHAMP';
    badgeColor = tier === 1 ? 'from-purple-950 via-slate-900 to-purple-900 border-purple-500/50' : 'from-slate-900 to-zinc-900 border-amber-500/40';
  } else if (divisionId === 'div_esp') {
    leagueTitle = tier === 1 ? 'LALIGA' : 'HYPER';
    text = tier === 1 ? 'EA SPORTS' : 'HYPER';
    badgeColor = 'from-red-950 via-slate-900 to-amber-950 border-amber-500/40';
  } else if (divisionId === 'div_ita') {
    leagueTitle = tier === 1 ? 'SERIE A' : 'SERIE B';
    text = tier === 1 ? 'TIM' : 'KT';
    badgeColor = 'from-blue-950 via-slate-900 to-cyan-950 border-blue-400/50';
  } else if (divisionId === 'div_ger') {
    leagueTitle = tier === 1 ? 'BL' : '2.BL';
    text = tier === 1 ? 'BUNDES' : '2.BUNDES';
    badgeColor = 'from-zinc-950 via-slate-900 to-red-950 border-red-500/40';
  } else if (divisionId === 'div_fra') {
    leagueTitle = tier === 1 ? 'L1' : 'L2';
    text = tier === 1 ? 'LIGUE 1' : 'LIGUE 2';
    badgeColor = 'from-blue-950 via-slate-900 to-indigo-950 border-blue-400/40';
  } else if (divisionId === 'div_ksa') {
    leagueTitle = tier === 1 ? 'ROSHN' : 'YELO';
    text = tier === 1 ? 'RSL' : 'YELO';
    badgeColor = 'from-emerald-950 via-slate-900 to-green-950 border-emerald-500/50';
  }

  return (
    <div className={`relative flex flex-col items-center justify-center rounded-lg bg-gradient-to-br ${badgeColor} border p-1 shadow-md shrink-0 ${className}`}>
      <span className="text-[10px] font-black tracking-wider text-amber-400 leading-none">{leagueTitle}</span>
      <span className="text-[8px] font-bold text-slate-300 leading-none mt-0.5">{text}</span>
    </div>
  );
};

// 3. Official Real Club Crest Component
export const ClubCrestBadge: React.FC<{
  shortName: string;
  name: string;
  primaryColor?: string;
  secondaryColor?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}> = ({
  shortName,
  name,
  primaryColor = '#1E3A8A',
  secondaryColor = '#F59E0B',
  size = 'md',
  className = ''
}) => {
  const sizeMap = {
    sm: 'w-7 h-7 text-[9px]',
    md: 'w-10 h-10 text-[11px]',
    lg: 'w-14 h-14 text-[14px]',
    xl: 'w-20 h-20 text-[18px]'
  };

  return (
    <div 
      className={`relative inline-flex items-center justify-center rounded-xl overflow-hidden shrink-0 shadow-md border border-slate-700/60 font-black tracking-tight select-none transition-transform hover:scale-105 ${sizeMap[size]} ${className}`}
      style={{
        background: `linear-gradient(135deg, ${primaryColor} 0%, #0F172A 100%)`,
      }}
      title={name}
    >
      {/* Heraldic angled diagonal ribbon */}
      <div 
        className="absolute inset-0 opacity-40 pointer-events-none"
        style={{
          background: `linear-gradient(45deg, transparent 40%, ${secondaryColor} 40%, ${secondaryColor} 60%, transparent 60%)`,
        }}
      />
      {/* Inner border ring */}
      <div className="absolute inset-0.5 rounded-[10px] border border-white/20 pointer-events-none" />
      {/* Club Acronym text */}
      <span 
        className="relative z-10 font-black text-white drop-shadow-md text-center"
        style={{
          textShadow: '0 1px 3px rgba(0,0,0,0.8)'
        }}
      >
        {shortName || name.slice(0, 3).toUpperCase()}
      </span>
    </div>
  );
};
