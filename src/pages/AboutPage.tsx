import React from 'react';
import { Shield, Award, Users, Globe, CheckCircle, Scale, Target, Trophy } from 'lucide-react';
import { DIVISION_EMBLEMS } from '../components/OfficialEmblems';

export const AboutPage: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
      
      {/* Header Banner */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 text-xs font-semibold text-amber-400 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full">
          <Shield className="w-3.5 h-3.5" />
          <span>الهيئة الدولية المستقلة للرياضات الإلكترونية</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white">
          عن الاتحاد الدولي للرياضات الإلكترونية عبر الإنترنت (IOEF)
        </h1>
        <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
          تأسس الاتحاد كمنظمة دولية غير ربحية تهدف إلى إرساء قواعد تنظيمية احترافية للمنافسات الرقمية في كرة القدم الإلكترونية eFootball، وتمكين اللاعبين والفرق من التنافس في بيئة تسودها النزاهة والمساواة والشفافية التقنية.
        </p>
      </div>

      {/* Vision, Mission, Values */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Target className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-white">رؤية الاتحاد</h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            الريادة العالمية في مأسسة الرياضات الإلكترونية عبر الإنترنت وربط الأقسام القارية بنظام بطولات هرمي مستدام يكافئ المهارة ويحمي حقوق المتنافسين.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Globe className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-white">رسالتنا</h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            توفير منصة تكنولوجية متقدمة لإدارة الجداول، النتائج، وتدقيق التشكيلات بقوة الذكاء الاصطناعي لمنع التلاعب وتوسيع قاعدة الممارسين في 6 دول رئيسية.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Scale className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-white">النزاهة والعدالة</h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            تطبيق لوائح صارمة لمنع التلاعب بسرعة الاتصال، حصر تعديل التشكيلات بمرة واحدة موثقة، وإخضاع أي تجاوز للجان انضباط مستقلة.
          </p>
        </div>
      </div>

      {/* Organizational Structure */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 space-y-6">
        <div>
          <div className="text-xs text-amber-400 font-semibold mb-1">الهيكل الإداري الرسمي</div>
          <h2 className="text-2xl font-bold text-white">الهيئة التنفيذية ولجان المسابقات</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-5 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
            <div className="text-xs font-semibold text-amber-400">الرئاسة العامة</div>
            <div className="text-base font-bold text-white">مكتب رئيس الاتحاد</div>
            <p className="text-xs text-slate-400 leading-relaxed">
              الإشراف العام على الاستراتيجية الدولية، العلاقات المؤسسية والاعتمادات الرسمية والشراكات الكبرى.
            </p>
          </div>

          <div className="p-5 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
            <div className="text-xs font-semibold text-amber-400">الإدارة التنفيذية</div>
            <div className="text-base font-bold text-white">مدير عام الاتحاد</div>
            <p className="text-xs text-slate-400 leading-relaxed">
              الإدارة التشغيلية للمنصة، شؤون اللاعبين، إدارة طلبات التسجيل، وتراخيص تعديل التشكيلات الاستثنائية.
            </p>
          </div>

          <div className="p-5 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
            <div className="text-xs font-semibold text-amber-400">اللجان الفنية</div>
            <div className="text-base font-bold text-white">لجنة المسابقات والانضباط</div>
            <p className="text-xs text-slate-400 leading-relaxed">
              جدولة الجولات، تثبيت نتائج المباريات، مراقبة النزاهة والتحكيم وإصدار العقوبات والغرامات المعتمدة.
            </p>
          </div>
        </div>
      </div>

      {/* Member Divisions Standards */}
      <div className="space-y-6">
        <div>
          <div className="text-xs text-amber-400 font-bold mb-1">الاتحادات الوطنية المعتمدة</div>
          <h2 className="text-2xl font-black text-white">معايير المسابقات في الاتحادات الستة</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { id: 'div_ksa', country: 'المملكة العربية السعودية', code: 'KSA', tier1: 'دوري روشن للمحترفين (3220+)', tier2: 'دوري يلو للدرجة الأولى (3150+)' },
            { id: 'div_eng', country: 'إنجلترا', code: 'ENG', tier1: 'الدوري الممتاز (Premier League 3220+)', tier2: 'دوري التشامبيونشيب (3150+)' },
            { id: 'div_esp', country: 'إسبانيا', code: 'ESP', tier1: 'الليغا الإسبانية (La Liga 3220+)', tier2: 'دوري هايبرموشن (3150+)' },
            { id: 'div_ita', country: 'إيطاليا', code: 'ITA', tier1: 'الدوري الإيطالي (Serie A 3220+)', tier2: 'دوري الدرجة الثانية (Serie B 3150+)' },
            { id: 'div_ger', country: 'ألمانيا', code: 'GER', tier1: 'الدوري الألماني (Bundesliga 3220+)', tier2: 'بوندسليغا 2 (3150+)' },
            { id: 'div_fra', country: 'فرنسا', code: 'FRA', tier1: 'الدوري الفرنسي (Ligue 1 3220+)', tier2: 'ليغ 2 (3150+)' },
          ].map((item, idx) => {
            const EmblemComponent = DIVISION_EMBLEMS[item.id];
            return (
              <div key={idx} className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3 shadow-lg">
                <div className="flex items-center justify-between">
                  {EmblemComponent ? (
                    <EmblemComponent className="w-10 h-10 shadow-md" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-slate-800 font-bold text-amber-400 flex items-center justify-center">
                      {item.code}
                    </div>
                  )}
                  <span className="text-xs font-mono font-bold text-amber-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                    {item.code}
                  </span>
                </div>
                <div className="font-black text-white text-sm">{item.country}</div>
                <div className="text-xs text-slate-300 space-y-1.5 pt-2 border-t border-slate-800">
                  <div className="flex justify-between">
                    <span className="text-slate-400">الدرجة الأولى:</span>
                    <span className="text-amber-400 font-mono font-bold">3220+</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">الدرجة الثانية:</span>
                    <span className="text-sky-400 font-mono font-bold">3150+</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
