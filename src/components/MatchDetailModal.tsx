import React from 'react';
import { X, Calendar, Clock, Shield, Sparkles, Trophy, Users, Image as ImageIcon, CheckCircle2, Activity } from 'lucide-react';
import { MatchFixture, Team, Tournament } from '../types';
import { ClubCrestBadge } from './OfficialEmblems';

interface MatchDetailModalProps {
  fixture: MatchFixture | null;
  onClose: () => void;
  teams: Team[];
  tournaments: Tournament[];
  onOpenClub?: (club: Team) => void;
  onOpenSimulator?: (fixture: MatchFixture) => void;
}

export const MatchDetailModal: React.FC<MatchDetailModalProps> = ({
  fixture,
  onClose,
  teams,
  tournaments,
  onOpenClub,
  onOpenSimulator,
}) => {
  if (!fixture) return null;

  const homeTeam = teams.find((t) => t.id === fixture.homeTeamId);
  const awayTeam = teams.find((t) => t.id === fixture.awayTeamId);
  const tournament = tournaments.find((t) => t.id === fixture.tournamentId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full p-5 sm:p-7 space-y-6 shadow-2xl relative max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 left-4 text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors"
          aria-label="إغلاق"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Match Header */}
        <div className="space-y-1.5 border-b border-slate-800 pb-4">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold">
              <Trophy className="w-3.5 h-3.5" />
              <span>{tournament?.nameAr || 'بطولة رسمية IOEF'}</span>
            </span>
            <span className="text-slate-400 font-mono">{fixture.season || '2026/2027'}</span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-300 font-bold">{fixture.roundName}</span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400 pt-1">
            <span className="inline-flex items-center gap-1 font-mono">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              <span>{fixture.matchDate}</span>
            </span>
            <span className="inline-flex items-center gap-1 font-mono">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>{fixture.matchTime} GMT</span>
            </span>
            {fixture.assignedReferee && (
              <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
                <Shield className="w-3.5 h-3.5" />
                <span>المراقب / الحكم المعتمد: {fixture.assignedReferee}</span>
              </span>
            )}
          </div>
        </div>

        {/* Scoreboard */}
        <div className="grid grid-cols-11 items-center gap-3 p-5 rounded-2xl bg-slate-950 border border-slate-800 shadow-inner">
          <button
            onClick={() => homeTeam && onOpenClub?.(homeTeam)}
            className="col-span-4 flex flex-col items-center text-center gap-2 hover:opacity-90 transition-opacity"
          >
            <ClubCrestBadge
              shortName={homeTeam?.shortName || 'HOM'}
              name={homeTeam?.name || 'الفريق المستضيف'}
              primaryColor={homeTeam?.color}
              secondaryColor={homeTeam?.secondaryColor}
              size="lg"
            />
            <span className="text-xs sm:text-sm font-black text-white hover:text-amber-400 transition-colors">
              {homeTeam?.name || fixture.homeTeamId}
            </span>
            <span className="text-[10px] text-slate-400">{homeTeam?.managerName || 'القائد غير محدد'}</span>
          </button>

          <div className="col-span-3 text-center space-y-1.5">
            {fixture.status === 'finished' ? (
              <>
                <div className="text-3xl sm:text-4xl font-black font-mono text-white tracking-wider">
                  {fixture.homeScore ?? 0} <span className="text-slate-600">-</span> {fixture.awayScore ?? 0}
                </div>
                <span className="inline-block px-2.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                  نتيجة نهائية معتمدة
                </span>
              </>
            ) : (
              <>
                <div className="text-xl font-black font-mono text-amber-400">VS</div>
                <span className="inline-block px-2.5 py-0.5 rounded bg-blue-500/15 text-sky-400 border border-blue-500/30 text-[10px] font-bold">
                  {fixture.status === 'live' ? 'مباشر الآن' : 'مباراة مجدولة'}
                </span>
              </>
            )}
          </div>

          <button
            onClick={() => awayTeam && onOpenClub?.(awayTeam)}
            className="col-span-4 flex flex-col items-center text-center gap-2 hover:opacity-90 transition-opacity"
          >
            <ClubCrestBadge
              shortName={awayTeam?.shortName || 'AWY'}
              name={awayTeam?.name || 'الفريق الضيف'}
              primaryColor={awayTeam?.color}
              secondaryColor={awayTeam?.secondaryColor}
              size="lg"
            />
            <span className="text-xs sm:text-sm font-black text-white hover:text-amber-400 transition-colors">
              {awayTeam?.name || fixture.awayTeamId}
            </span>
            <span className="text-[10px] text-slate-400">{awayTeam?.managerName || 'القائد غير محدد'}</span>
          </button>
        </div>

        {/* Match Stats */}
        {fixture.stats && (
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <h4 className="text-xs font-black text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-amber-400" />
              <span>الإحصائيات الرسمية للمباراة</span>
            </h4>
            <div className="grid grid-cols-3 gap-3 text-center text-xs">
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                <div className="text-[10px] text-slate-400 mb-1">الاستحواذ</div>
                <div className="font-mono font-bold text-white">
                  {fixture.stats.homePossession ?? 50}% — {fixture.stats.awayPossession ?? 50}%
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                <div className="text-[10px] text-slate-400 mb-1">التسديدات</div>
                <div className="font-mono font-bold text-white">
                  {fixture.stats.homeShots ?? 0} — {fixture.stats.awayShots ?? 0}
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                <div className="text-[10px] text-slate-400 mb-1">على المرمى</div>
                <div className="font-mono font-bold text-white">
                  {fixture.stats.homeShotsOnTarget ?? 0} — {fixture.stats.awayShotsOnTarget ?? 0}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Match Events */}
        {fixture.events && fixture.events.length > 0 && (
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <h4 className="text-xs font-black text-white">أحداث المباراة</h4>
            <div className="space-y-1.5">
              {fixture.events.map((ev, i) => (
                <div key={i} className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-900 border border-slate-800/80">
                  <span className="font-mono text-amber-400">{ev.minute}&apos;</span>
                  <span className="font-bold text-white">{ev.player}</span>
                  <span className="text-[11px] text-slate-400">
                    {ev.type === 'goal' ? 'هدف' : ev.type === 'yellow_card' ? 'بطاقة صفراء' : 'بطاقة حمراء'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Result Verification Audit & Screenshot */}
        {fixture.aiResultAudit && (
          <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 text-xs space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>توثيق الذكاء الاصطناعي لصورة النتيجة (ثقة {fixture.aiResultAudit.confidence}%)</span>
            </div>
            <p className="text-slate-300">{fixture.aiResultAudit.remarks}</p>
          </div>
        )}

        {fixture.resultScreenshotUrl && (
          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
              <span>لقطة النتيجة الرسمية المرفقة</span>
            </div>
            <img
              src={fixture.resultScreenshotUrl}
              alt="لقطة النتيجة"
              className="w-full max-h-60 object-contain rounded-xl border border-slate-800 bg-slate-950"
            />
          </div>
        )}

        {/* Lineups Preview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="font-bold text-white flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-amber-400" />
              <span>قائمة {homeTeam?.name || 'المستضيف'}</span>
            </div>
            {homeTeam?.roster?.length ? (
              <div className="space-y-1 max-h-36 overflow-y-auto">
                {homeTeam.roster.slice(0, 11).map((p) => (
                  <div key={p.id} className="flex justify-between text-[11px] text-slate-300">
                    <span>
                      <span className="font-mono text-sky-400 ml-1.5">{p.position}</span>
                      {p.name}
                    </span>
                    <span className="font-mono text-amber-400">{p.rating}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-slate-500">لم يتم تسجيل قائمة اللاعبين بعد.</p>
            )}
          </div>

          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="font-bold text-white flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-sky-400" />
              <span>قائمة {awayTeam?.name || 'الضيف'}</span>
            </div>
            {awayTeam?.roster?.length ? (
              <div className="space-y-1 max-h-36 overflow-y-auto">
                {awayTeam.roster.slice(0, 11).map((p) => (
                  <div key={p.id} className="flex justify-between text-[11px] text-slate-300">
                    <span>
                      <span className="font-mono text-sky-400 ml-1.5">{p.position}</span>
                      {p.name}
                    </span>
                    <span className="font-mono text-amber-400">{p.rating}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-slate-500">لم يتم تسجيل قائمة اللاعبين بعد.</p>
            )}
          </div>
        </div>

        {/* AI Simulator Trigger */}
        {onOpenSimulator && (
          <div className="pt-2 flex justify-end">
            <button
              onClick={() => {
                onClose();
                onOpenSimulator(fixture);
              }}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-amber-500/40 text-amber-400 text-xs font-bold flex items-center gap-2 transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              <span>فتح محاكي الذكاء الاصطناعي لهذه المواجهة</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
