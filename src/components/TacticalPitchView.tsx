import React, { useState } from 'react';
import { Shield, Sparkles, User, Info, Check } from 'lucide-react';

interface TacticalPitchViewProps {
  formation?: string;
  squadRating?: number;
  identifiedPlayers?: string[];
  teamName?: string;
  teamShortName?: string;
  primaryColor?: string;
  secondaryColor?: string;
  interactive?: boolean;
}

interface PitchPlayer {
  id: string;
  name: string;
  pos: string;
  rating: number;
  x: number; // percentage from left (0 to 100)
  y: number; // percentage from top (0 to 100)
  stats?: { pace: number; shoot: number; pass: number; dribble: number; defense: number; physical: number };
}

export const TacticalPitchView: React.FC<TacticalPitchViewProps> = ({
  formation = '4-2-1-3',
  squadRating = 3240,
  identifiedPlayers = [],
  teamName = 'الفريق المعتمد'
}) => {
  const [selectedPlayer, setSelectedPlayer] = useState<PitchPlayer | null>(null);

  // Default tactical positions for 4-2-1-3
  const playersList: PitchPlayer[] = [
    { id: '1', name: 'Courtois', pos: 'GK', rating: 101, x: 50, y: 88, stats: { pace: 65, shoot: 40, pass: 78, dribble: 60, defense: 99, physical: 94 } },
    { id: '2', name: 'R. Hernández', pos: 'LB', rating: 100, x: 18, y: 72, stats: { pace: 98, shoot: 75, pass: 84, dribble: 86, defense: 89, physical: 90 } },
    { id: '3', name: 'V. van Dijk', pos: 'CB', rating: 102, x: 38, y: 74, stats: { pace: 85, shoot: 62, pass: 82, dribble: 77, defense: 102, physical: 98 } },
    { id: '4', name: 'W. Saliba', pos: 'CB', rating: 101, x: 62, y: 74, stats: { pace: 89, shoot: 55, pass: 80, dribble: 81, defense: 101, physical: 96 } },
    { id: '5', name: 'K. Walker', pos: 'RB', rating: 99, x: 82, y: 72, stats: { pace: 99, shoot: 68, pass: 80, dribble: 82, defense: 92, physical: 93 } },
    { id: '6', name: 'Rodri', pos: 'DMF', rating: 103, x: 35, y: 52, stats: { pace: 82, shoot: 85, pass: 96, dribble: 88, defense: 99, physical: 97 } },
    { id: '7', name: 'F. Valverde', pos: 'CMF', rating: 101, x: 65, y: 52, stats: { pace: 93, shoot: 89, pass: 92, dribble: 90, defense: 91, physical: 95 } },
    { id: '8', name: 'K. De Bruyne', pos: 'AMF', rating: 104, x: 50, y: 34, stats: { pace: 86, shoot: 94, pass: 102, dribble: 93, defense: 75, physical: 87 } },
    { id: '9', name: 'Vinícius Jr', pos: 'LWF', rating: 103, x: 18, y: 18, stats: { pace: 102, shoot: 91, pass: 86, dribble: 101, defense: 48, physical: 84 } },
    { id: '10', name: 'K. Mbappé', pos: 'CF', rating: 105, x: 50, y: 14, stats: { pace: 104, shoot: 101, pass: 88, dribble: 102, defense: 45, physical: 89 } },
    { id: '11', name: 'L. Messi', pos: 'RWF', rating: 104, x: 82, y: 18, stats: { pace: 94, shoot: 102, pass: 104, dribble: 103, defense: 42, physical: 80 } },
  ];

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl space-y-4">
      {/* Tactical Bar Header */}
      <div className="px-5 py-3.5 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-amber-400" />
          <span className="font-bold text-white">{teamName}</span>
          <span className="text-slate-500">·</span>
          <span className="font-mono text-amber-400 font-semibold">{formation}</span>
        </div>
        <div className="flex items-center gap-3 font-mono text-[11px] text-slate-400">
          <span>قوة الفريق: <strong className="text-amber-400 font-bold">{squadRating}</strong></span>
          <span className="text-slate-600">|</span>
          <span>الكيمياء التكتيكية: <strong className="text-emerald-400">100/100</strong></span>
        </div>
      </div>

      {/* The Football Pitch Canvas */}
      <div className="p-4 sm:p-6">
        <div className="relative w-full aspect-[4/3] sm:aspect-[16/10] bg-gradient-to-b from-emerald-950/80 via-emerald-950/60 to-emerald-950/90 rounded-2xl border-2 border-emerald-500/20 overflow-hidden shadow-inner select-none">
          
          {/* Pitch lines */}
          <div className="absolute inset-3 border border-emerald-500/30 rounded-xl pointer-events-none">
            {/* Center line */}
            <div className="absolute top-1/2 left-0 right-0 h-px bg-emerald-500/30"></div>
            {/* Center circle */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 rounded-full border border-emerald-500/30"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-emerald-500/40"></div>
            
            {/* Top Penalty Box */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-20 border-b border-x border-emerald-500/30 rounded-b-lg"></div>
            {/* Top 6-yard box */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-8 border-b border-x border-emerald-500/30"></div>

            {/* Bottom Penalty Box */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-48 h-20 border-t border-x border-emerald-500/30 rounded-t-lg"></div>
            {/* Bottom 6-yard box */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-24 h-8 border-t border-x border-emerald-500/30"></div>
          </div>

          {/* Tactical Vector Glow Lines Connecting Attackers, Midfielders, Defenders */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            <line x1="50%" y1="88%" x2="38%" y2="74%" stroke="rgba(16, 185, 129, 0.25)" strokeWidth="1.5" strokeDasharray="3 3" />
            <line x1="50%" y1="88%" x2="62%" y2="74%" stroke="rgba(16, 185, 129, 0.25)" strokeWidth="1.5" strokeDasharray="3 3" />
            <line x1="38%" y1="74%" x2="18%" y2="72%" stroke="rgba(16, 185, 129, 0.25)" strokeWidth="1.5" />
            <line x1="38%" y1="74%" x2="62%" y2="74%" stroke="rgba(16, 185, 129, 0.25)" strokeWidth="1.5" />
            <line x1="62%" y1="74%" x2="82%" y2="72%" stroke="rgba(16, 185, 129, 0.25)" strokeWidth="1.5" />
            <line x1="38%" y1="74%" x2="35%" y2="52%" stroke="rgba(245, 158, 11, 0.25)" strokeWidth="1.5" />
            <line x1="62%" y1="74%" x2="65%" y2="52%" stroke="rgba(245, 158, 11, 0.25)" strokeWidth="1.5" />
            <line x1="35%" y1="52%" x2="50%" y2="34%" stroke="rgba(245, 158, 11, 0.35)" strokeWidth="1.5" />
            <line x1="65%" y1="52%" x2="50%" y2="34%" stroke="rgba(245, 158, 11, 0.35)" strokeWidth="1.5" />
            <line x1="50%" y1="34%" x2="18%" y2="18%" stroke="rgba(245, 158, 11, 0.35)" strokeWidth="1.5" />
            <line x1="50%" y1="34%" x2="50%" y2="14%" stroke="rgba(245, 158, 11, 0.4)" strokeWidth="1.5" />
            <line x1="50%" y1="34%" x2="82%" y2="18%" stroke="rgba(245, 158, 11, 0.35)" strokeWidth="1.5" />
          </svg>

          {/* Player Nodes */}
          {playersList.map(p => {
            const isSelected = selectedPlayer?.id === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedPlayer(p)}
                style={{ top: `${p.y}%`, left: `${p.x}%` }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 group flex flex-col items-center transition-transform hover:scale-110 focus:outline-none z-10`}
              >
                {/* Node Token */}
                <div className={`relative w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-mono font-bold text-xs shadow-lg transition-all ${
                  isSelected
                    ? 'bg-amber-400 text-slate-950 ring-4 ring-amber-400/40 scale-110'
                    : 'bg-slate-900 border-2 border-emerald-400/70 text-white hover:border-amber-400'
                }`}>
                  <span className="text-[10px] sm:text-xs font-black">{p.pos}</span>
                  {/* Rating Tag */}
                  <span className="absolute -top-2 -right-1 text-[9px] font-mono px-1 rounded-sm bg-amber-500 text-slate-950 font-black shadow">
                    {p.rating}
                  </span>
                </div>

                {/* Name Label */}
                <span className="mt-1 px-1.5 py-0.5 rounded bg-slate-950/80 backdrop-blur-sm text-[10px] sm:text-[11px] font-bold text-white whitespace-nowrap shadow border border-slate-800/60 font-sans">
                  {p.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Player Inspector Card */}
      {selectedPlayer && (
        <div className="mx-4 sm:mx-6 mb-4 p-4 bg-slate-900 border border-slate-800 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 font-black text-sm flex items-center justify-center">
              {selectedPlayer.pos}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">{selectedPlayer.name}</span>
                <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 font-mono font-bold">
                  تقييم الكارت: {selectedPlayer.rating}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                المركز الميداني: <strong className="text-white font-mono">{selectedPlayer.pos}</strong> · التوافق التكتيكي: 99%
              </div>
            </div>
          </div>

          {/* Stats Bar */}
          {selectedPlayer.stats && (
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center font-mono text-[10px] w-full sm:w-auto">
              <div className="p-1.5 bg-slate-950 rounded border border-slate-800">
                <div className="text-slate-500">PAC</div>
                <div className="font-bold text-white">{selectedPlayer.stats.pace}</div>
              </div>
              <div className="p-1.5 bg-slate-950 rounded border border-slate-800">
                <div className="text-slate-500">SHO</div>
                <div className="font-bold text-white">{selectedPlayer.stats.shoot}</div>
              </div>
              <div className="p-1.5 bg-slate-950 rounded border border-slate-800">
                <div className="text-slate-500">PAS</div>
                <div className="font-bold text-white">{selectedPlayer.stats.pass}</div>
              </div>
              <div className="p-1.5 bg-slate-950 rounded border border-slate-800">
                <div className="text-slate-500">DRI</div>
                <div className="font-bold text-white">{selectedPlayer.stats.dribble}</div>
              </div>
              <div className="p-1.5 bg-slate-950 rounded border border-slate-800">
                <div className="text-slate-500">DEF</div>
                <div className="font-bold text-white">{selectedPlayer.stats.defense}</div>
              </div>
              <div className="p-1.5 bg-slate-950 rounded border border-slate-800">
                <div className="text-slate-500">PHY</div>
                <div className="font-bold text-white">{selectedPlayer.stats.physical}</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer Info */}
      <div className="px-5 py-3 bg-slate-950/80 border-t border-slate-800/80 text-[11px] text-slate-500 flex items-center justify-between">
        <span>انقر على أي كارت لاعب في الملعب لعرض بطاقة الإحصائيات الفردية.</span>
        <span className="text-amber-400 font-medium">IOEF Smart Tactical Vision 2026/2027</span>
      </div>
    </div>
  );
};
