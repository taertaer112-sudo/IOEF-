import React from 'react';
import { Scale } from 'lucide-react';
import { RegulationArticle } from '../types';

interface RulesPageProps {
  articles?: RegulationArticle[];
}

export const RulesPage: React.FC<RulesPageProps> = ({ articles = [] }) => {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      <div className="text-center space-y-3 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-1.5 text-xs text-amber-400 font-semibold px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full">
          <Scale className="w-3.5 h-3.5" />
          <span>الدستور واللوائح المنظمة لمسابقات IOEF</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">القوانين واللوائح التنظيمية للاتحاد الدولي</h1>
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
          تم وضع هذه اللوائح لضمان منافسات عادلة ومتكافئة بين جميع اللاعبين والأندية في مسابقات eFootball Mobile لموسم 2026/2027، وتخضع للتحديث المستمر من إدارة الاتحاد.
        </p>
      </div>

      {/* Dynamic Database Articles */}
      <div className="space-y-6">
        {articles.map((art, index) => (
          <div key={art.id} className="p-6 sm:p-8 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-400 font-mono font-bold flex items-center justify-center text-sm border border-amber-500/20">
                  {String(index + 1).padStart(2, '0')}
                </div>
                <div>
                  <div className="text-[11px] font-mono text-amber-400 font-bold">{art.chapterNumber}</div>
                  <h2 className="text-lg font-bold text-white">{art.titleAr}</h2>
                  {art.subtitleAr && <div className="text-xs text-slate-400 mt-0.5">{art.subtitleAr}</div>}
                </div>
              </div>
              <span className="text-[10px] font-mono text-slate-500">آخر تحديث: {art.updatedAt}</span>
            </div>

            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-200 leading-relaxed whitespace-pre-line">
              {art.content}
            </div>
          </div>
        ))}
      </div>

      {/* Disciplinary Sanctions Reference Table */}
      <div className="p-6 sm:p-8 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
          <div className="w-9 h-9 rounded-lg bg-rose-500/10 text-rose-400 font-mono font-bold flex items-center justify-center text-sm border border-rose-500/20">
            INV
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">جدول العقوبات والانضباط المعتمد</h2>
            <div className="text-xs text-slate-400">الجزاءات التلقائية المطبقة من لجنة الانضباط</div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-950 text-slate-400 font-mono text-[11px] border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">نوع المخالفة</th>
                <th className="py-2.5 px-3">العقوبة الأولى</th>
                <th className="py-2.5 px-3">العقوبة في حال التكرار</th>
                <th className="py-2.5 px-3 text-center">التأثير على الترتيب</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              <tr>
                <td className="py-3 px-3 font-semibold text-white">التأخر أو الغياب عن موعد المباراة</td>
                <td className="py-3 px-3 text-slate-300">خسارة المباراة (3-0) وإنذار</td>
                <td className="py-3 px-3 text-rose-400 font-semibold">خصم نقطة من جدول الترتيب</td>
                <td className="py-3 px-3 text-center font-mono text-rose-400">-1 نقطة</td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-semibold text-white">اللعب بتشكيلة غير مطابقة للتقييم</td>
                <td className="py-3 px-3 text-slate-300">إلغاء النتيجة واعتبار الخصم فائزاً</td>
                <td className="py-3 px-3 text-rose-400 font-semibold">إيقاف اللاعب لمباراتين رسميتين</td>
                <td className="py-3 px-3 text-center font-mono text-rose-400">إلغاء نقاط الفوز</td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-semibold text-white">السلوك غير الرياضي أو الإساءة</td>
                <td className="py-3 px-3 text-slate-300">إنذار رسمي</td>
                <td className="py-3 px-3 text-rose-400 font-semibold">إيقاف 3 مباريات</td>
                <td className="py-3 px-3 text-center font-mono text-slate-500">حسب التكرار</td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-semibold text-white">التلاعب بالاتصال أو الحسابات المتعددة</td>
                <td className="py-3 px-3 text-rose-400 font-bold">شطب فوري من المسابقة</td>
                <td className="py-3 px-3 text-rose-500 font-bold">حظر دائم وشامل من الاتحاد</td>
                <td className="py-3 px-3 text-center font-mono text-rose-500">حذف كافة النقاط</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
