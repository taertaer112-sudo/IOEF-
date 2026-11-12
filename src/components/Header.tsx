import React, { useState } from 'react';
import { Shield, Bell, Menu, X, User, Globe, ArrowRight, QrCode } from 'lucide-react';
import { Division, NotificationItem } from '../types';
import { DIVISION_EMBLEMS } from './OfficialEmblems';

interface HeaderProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  divisions: Division[];
  activeFederationId: string | null;
  onSelectFederation: (divisionId: string | null) => void;
  notifications: NotificationItem[];
  unreadNotifsCount: number;
  onOpenNotifications: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  setCurrentTab,
  divisions,
  activeFederationId,
  onSelectFederation,
  unreadNotifsCount,
  onOpenNotifications,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const activeFederation = activeFederationId ? divisions.find((d) => d.id === activeFederationId) : null;
  const ActiveEmblem = activeFederation ? DIVISION_EMBLEMS[activeFederation.id] : null;

  const navLinks = [
    { id: 'home', label: 'الرئيسية' },
    { id: 'about', label: 'عن الاتحاد' },
    { id: 'divisions', label: 'الاتحادات والبطولات' },
    { id: 'fixtures', label: 'المباريات والنتائج' },
    { id: 'standings', label: 'الترتيب' },
    { id: 'news', label: 'الأخبار' },
    { id: 'store', label: 'المتجر' },
    { id: 'rules', label: 'اللوائح' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-slate-950/95 backdrop-blur-md border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3 sm:gap-5">
        {/* Zone 1: Brand Mark */}
        <button
          onClick={() => {
            setCurrentTab('home');
            setMobileMenuOpen(false);
          }}
          className="flex items-center gap-2.5 text-right whitespace-nowrap shrink-0 text-white hover:opacity-90 transition-opacity"
        >
          {ActiveEmblem ? (
            <ActiveEmblem className="w-9 h-9" />
          ) : (
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 flex items-center justify-center text-slate-950 font-black text-sm shadow-md">
              IOEF
            </div>
          )}
          <div>
            <span className="hidden sm:inline text-sm sm:text-base font-black tracking-tight text-white block leading-tight">
              {activeFederation ? activeFederation.nameAr : 'الاتحاد الدولي للرياضات الإلكترونية'}
            </span>
            <span className="sm:hidden text-xs font-black tracking-tight text-white block leading-tight">
              {activeFederation ? activeFederation.code : 'IOEF Esports'}
            </span>
            <span className="text-[9px] font-mono text-amber-400 block tracking-wider uppercase">
              {activeFederation ? `${activeFederation.nameEn} Portal` : 'Official Federation 2026/2027'}
            </span>
          </div>
        </button>

        {/* Zone 2: Navigation links (Desktop) */}
        <nav className="hidden lg:flex items-center gap-4 text-xs font-bold text-slate-300">
          {navLinks.map((link) => {
            const isActive = currentTab === link.id;
            return (
              <button
                key={link.id}
                onClick={() => setCurrentTab(link.id)}
                className={`whitespace-nowrap shrink-0 py-1 transition-colors ${
                  isActive
                    ? 'text-amber-400 font-black border-b-2 border-amber-400'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {link.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Federation Selector & Access Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Independent Federation Selector (Desktop) */}
          <div className="hidden xl:flex items-center">
            <select
              value={activeFederationId || ''}
              onChange={(e) => onSelectFederation(e.target.value || null)}
              aria-label="اختيار بوابة الاتحاد الوطني"
              className="bg-slate-900 border border-slate-800 hover:border-amber-500/40 rounded-xl px-2.5 py-1.5 text-[11px] font-bold text-slate-200 focus:outline-none focus:border-amber-500"
            >
              <option value="">البوابة الدولية الشاملة (IOEF)</option>
              {divisions.map((d) => (
                <option key={d.id} value={d.id}>
                  بوابة {d.nameAr}
                </option>
              ))}
            </select>
          </div>

          {/* Notifications Button */}
          <button
            onClick={onOpenNotifications}
            className="relative p-2 text-slate-300 hover:text-white rounded-xl hover:bg-slate-900 transition-colors"
            title="الإشعارات والتنبيهات"
            aria-label="الإشعارات"
          >
            <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
            {unreadNotifsCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black flex items-center justify-center font-mono">
                {unreadNotifsCount}
              </span>
            )}
          </button>

          {/* QR Verification Link */}
          <button
            onClick={() => setCurrentTab('verify')}
            className={`hidden md:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap shrink-0 ${
              currentTab === 'verify'
                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40'
                : 'text-slate-300 hover:text-white hover:bg-slate-900 border border-slate-800'
            }`}
            title="التحقق من بطاقة العضوية عبر QR"
          >
            <QrCode className="w-3.5 h-3.5 text-emerald-400" />
            <span>تحقق QR</span>
          </button>

          {/* Quick Player Profile Access */}
          <button
            onClick={() => setCurrentTab('profile')}
            className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap shrink-0 ${
              currentTab === 'profile'
                ? 'bg-slate-800 text-amber-400 border border-amber-500/40 shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-900 border border-slate-800'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>ملف اللاعب</span>
          </button>

          {/* Admin Dashboard Entry */}
          <button
            onClick={() => setCurrentTab('admin')}
            className={`flex items-center gap-1 px-2.5 sm:px-3 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap shrink-0 ${
              currentTab === 'admin'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md'
                : 'bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden xs:inline sm:inline">لوحة الإدارة</span>
            <span className="xs:hidden sm:hidden">الإدارة</span>
          </button>

          {/* Primary CTA: Register Player */}
          <button
            onClick={() => setCurrentTab('register')}
            className="px-3 sm:px-4 py-1.5 text-xs font-black text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 rounded-xl hover:from-amber-300 hover:to-amber-400 transition-all shadow-md whitespace-nowrap shrink-0"
          >
            تسجيل لاعب
          </button>

          {/* Mobile hamburger toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 text-slate-300 hover:text-white rounded-xl hover:bg-slate-900 transition-colors"
            aria-label="القائمة"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Isolated National Federation Portal Banner */}
      {activeFederation && (
        <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-blue-950 border-t border-blue-500/30 px-3 sm:px-6 lg:px-8 py-1.5">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2 text-[11px]">
            <div className="flex items-center gap-2 text-sky-300 font-bold">
              <Globe className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>
                أنت تتصفح الآن بوابة <strong className="text-white">{activeFederation.nameAr}</strong> المستقلة — يتم تصفية الدوريات والأندية والمباريات والأخبار وفق هذا الاتحاد.
              </span>
            </div>
            <button
              onClick={() => onSelectFederation(null)}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-amber-400 font-bold border border-amber-500/30 transition-colors"
            >
              <ArrowRight className="w-3 h-3" />
              <span>العودة للبوابة الدولية IOEF</span>
            </button>
          </div>
        </div>
      )}

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-slate-950 border-b border-slate-800 px-4 py-4 space-y-2 animate-fadeIn shadow-2xl">
          <div>
            <label className="text-[10px] font-bold text-slate-400 block mb-1">اختر بوابة الاتحاد المستقل</label>
            <select
              value={activeFederationId || ''}
              onChange={(e) => {
                onSelectFederation(e.target.value || null);
                setMobileMenuOpen(false);
              }}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-200"
            >
              <option value="">البوابة الدولية الشاملة (IOEF)</option>
              {divisions.map((d) => (
                <option key={d.id} value={d.id}>
                  بوابة {d.nameAr}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-1.5 pb-3 border-b border-slate-800/80 mb-2">
            <button
              onClick={() => {
                setCurrentTab('profile');
                setMobileMenuOpen(false);
              }}
              className="p-2.5 rounded-xl bg-slate-900 text-xs font-bold text-slate-200 flex items-center justify-center gap-1.5 border border-slate-800"
            >
              <User className="w-3.5 h-3.5 text-amber-400" />
              <span>ملف اللاعب</span>
            </button>
            <button
              onClick={() => {
                setCurrentTab('verify');
                setMobileMenuOpen(false);
              }}
              className="p-2.5 rounded-xl bg-slate-900 text-xs font-bold text-emerald-300 flex items-center justify-center gap-1.5 border border-emerald-500/30"
            >
              <QrCode className="w-3.5 h-3.5 text-emerald-400" />
              <span>تحقق QR</span>
            </button>
            <button
              onClick={() => {
                setCurrentTab('admin');
                setMobileMenuOpen(false);
              }}
              className="p-2.5 rounded-xl bg-slate-900 text-xs font-bold text-slate-200 flex items-center justify-center gap-1.5 border border-slate-800"
            >
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              <span>الإدارة</span>
            </button>
          </div>

          {navLinks.map((link) => (
            <button
              key={link.id}
              onClick={() => {
                setCurrentTab(link.id);
                setMobileMenuOpen(false);
              }}
              className={`w-full text-right px-3.5 py-2.5 rounded-xl text-xs font-bold transition-colors flex items-center justify-between ${
                currentTab === link.id
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                  : 'text-slate-300 hover:bg-slate-900 hover:text-white'
              }`}
            >
              <span>{link.label}</span>
              {currentTab === link.id && <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>}
            </button>
          ))}
        </div>
      )}
    </header>
  );
};
