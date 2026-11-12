import React from 'react';
import { Shield, Globe, Mail, Phone, ExternalLink } from 'lucide-react';
import { DIVISION_EMBLEMS } from './OfficialEmblems';

interface FooterProps {
  setCurrentTab: (tab: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ setCurrentTab }) => {
  return (
    <footer className="bg-slate-950 border-t border-slate-800 text-slate-400 text-sm mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Col 1: Federation Identity */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-slate-950 font-black text-xs shadow-lg">
                IOEF
              </div>
              <span className="font-black text-white text-base">
                International Online Esports Federation
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              الهيئة الدولية الرسمية المتخصصة في تطوير وتنظيم الرياضات الإلكترونية عبر الإنترنت ومسابقات eFootball حول العالم بضوابط تقنية وتحكيمية نزيهة بمعايير الاتحاد الدولي.
            </p>
            <div className="text-xs text-slate-500 font-mono">
              المقر التنسيقي الدولي · الرياض · لندن · مدريد
            </div>
          </div>

          {/* Col 2: Local Divisions */}
          <div className="space-y-3">
            <h4 className="font-bold text-white text-xs uppercase tracking-wider">
              الاتحادات الوطنية المعتمدة
            </h4>
            <ul className="space-y-2 text-xs">
              <li className="flex items-center gap-2">
                <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono text-amber-400 font-bold">KSA</span>
                <span>الاتحاد السعودي (Roshn League & Yelo)</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono text-amber-400 font-bold">ENG</span>
                <span>الاتحاد الإنجليزي (Premier League)</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono text-amber-400 font-bold">ESP</span>
                <span>الاتحاد الإسباني (La Liga EA Sports)</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono text-amber-400 font-bold">ITA</span>
                <span>الاتحاد الإيطالي (Serie A & Serie B)</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono text-amber-400 font-bold">GER</span>
                <span>الاتحاد الألماني (Bundesliga)</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono text-amber-400 font-bold">FRA</span>
                <span>الاتحاد الفرنسي (Ligue 1 & Ligue 2)</span>
              </li>
            </ul>
          </div>

          {/* Col 3: Competitions & System */}
          <div className="space-y-3">
            <h4 className="font-bold text-white text-xs uppercase tracking-wider">
              المسابقات واللوائح
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button onClick={() => setCurrentTab('divisions')} className="hover:text-amber-400 transition-colors">
                  دوريات الدرجة الأولى (معيار 3220+)
                </button>
              </li>
              <li>
                <button onClick={() => setCurrentTab('divisions')} className="hover:text-amber-400 transition-colors">
                  دوريات الدرجة الثانية والصعود (معيار 3150+)
                </button>
              </li>
              <li>
                <button onClick={() => setCurrentTab('divisions')} className="hover:text-amber-400 transition-colors">
                  دوري أبطال أوروبا والسوبر الدولي
                </button>
              </li>
              <li>
                <button onClick={() => setCurrentTab('rules')} className="hover:text-amber-400 transition-colors">
                  اللائحة الفنية وجدول العقوبات
                </button>
              </li>
              <li>
                <button onClick={() => setCurrentTab('register')} className="hover:text-amber-400 transition-colors">
                  بوابة التسجيل وقفل الحساب
                </button>
              </li>
            </ul>
          </div>

          {/* Col 4: Institutional Links */}
          <div className="space-y-3">
            <h4 className="font-bold text-white text-xs uppercase tracking-wider">
              التواصل والأمانة العامة
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-amber-500" />
                <span className="font-mono text-slate-300">competitions@ioef.org</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-amber-500" />
                <span className="font-mono text-slate-300" dir="ltr">+966 50 847 2901</span>
              </div>
              <div className="pt-2">
                <button
                  onClick={() => setCurrentTab('support')}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-xs text-white border border-slate-800 transition-colors"
                >
                  تقديم استئناف أو تذكرة دعم
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            جميع الحقوق محفوظة © 2026/2027 للاتحاد الدولي للرياضات الإلكترونية عبر الإنترنت (IOEF).
          </div>
          <div className="flex items-center gap-6">
            <button onClick={() => setCurrentTab('rules')} className="hover:text-slate-400">
              ميثاق الأخلاقيات الرياضية
            </button>
            <button onClick={() => setCurrentTab('rules')} className="hover:text-slate-400">
              سياسة الخصوصية وتكافؤ الفرص
            </button>
            <button onClick={() => setCurrentTab('admin')} className="text-amber-500/80 hover:text-amber-400 font-bold">
              بوابة المسؤولين (RBAC)
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
