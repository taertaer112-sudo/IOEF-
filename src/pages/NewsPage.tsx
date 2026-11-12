import React, { useState } from 'react';
import { Division, NewsItem } from '../types';
import { Search, ArrowLeft } from 'lucide-react';

interface NewsPageProps {
  news: NewsItem[];
  divisions?: Division[];
  activeFederationId?: string | null;
}

export const NewsPage: React.FC<NewsPageProps> = ({ news, activeFederationId }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeNewsModal, setActiveNewsModal] = useState<NewsItem | null>(null);

  const filteredNews = news.filter((item) => {
    if (activeFederationId && item.divisionId && item.divisionId !== activeFederationId) return false;
    if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return item.title.toLowerCase().includes(q) || item.content.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-1">
            المركز الإعلامي والبيانات الرسمية
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">أخبار وإعلانات الاتحاد الدولي (IOEF)</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            التعاميم الرسمية، قرارات اللجان الفنية، تغطيات البطولات الكبرى، ومواعيد فتح التسجيل.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-lg text-xs font-medium">
          {[
            { id: 'all', label: 'كافة الأخبار' },
            { id: 'announcement', label: 'إعلانات رسمية' },
            { id: 'tournament', label: 'تغطيات البطولات' },
            { id: 'technical', label: 'لوائح فنية' },
            { id: 'press_release', label: 'بيانات صحفية' },
          ].map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                selectedCategory === c.id ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Search bar */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="ابحث في البيانات والأخبار..."
          className="w-full bg-slate-900 border border-slate-800 rounded-xl pr-10 pl-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
        />
      </div>

      {/* News Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {filteredNews.map((item) => (
          <article
            key={item.id}
            className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700 transition-all flex flex-col justify-between group cursor-pointer"
            onClick={() => setActiveNewsModal(item)}
          >
            <div>
              <div className="relative h-48 overflow-hidden bg-slate-950">
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                {item.isImportant && (
                  <span className="absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500 text-white shadow-md">
                    عاجل وهام
                  </span>
                )}
              </div>

              <div className="p-5 space-y-2">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="text-amber-400 font-semibold">
                    {item.category === 'announcement' ? 'إعلان رسمي' : item.category === 'technical' ? 'لائحة فنية' : 'بيان صحفي'}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">{item.publishedAt}</span>
                </div>

                <h3 className="text-base font-bold text-white group-hover:text-amber-400 transition-colors line-clamp-2 leading-snug">
                  {item.title}
                </h3>

                <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">{item.summary || item.content}</p>
              </div>
            </div>

            <div className="p-5 pt-0 flex items-center justify-between text-xs text-slate-500 border-t border-slate-800/80 mt-4">
              <span>المصدر: {item.author}</span>
              <span className="text-amber-400 font-medium flex items-center gap-1 group-hover:underline">
                <span>قراءة التفاصيل</span>
                <ArrowLeft className="w-3 h-3" />
              </span>
            </div>
          </article>
        ))}
      </div>

      {activeNewsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 sm:p-8 space-y-6 shadow-2xl relative">
            <button
              onClick={() => setActiveNewsModal(null)}
              className="absolute top-5 left-5 text-slate-400 hover:text-white text-xs px-2.5 py-1 bg-slate-800 rounded-md"
            >
              إغلاق
            </button>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs text-amber-400 font-semibold">
                <span>{activeNewsModal.category}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono text-slate-400">{activeNewsModal.publishedAt}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white leading-tight">{activeNewsModal.title}</h2>
              <div className="text-xs text-slate-500">المصدر: {activeNewsModal.author}</div>
            </div>

            <img
              src={activeNewsModal.imageUrl}
              alt={activeNewsModal.title}
              referrerPolicy="no-referrer"
              className="w-full h-64 object-cover rounded-xl border border-slate-800"
            />

            <div className="text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-wrap space-y-4">
              {activeNewsModal.content}
            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-between items-center text-xs text-slate-400">
              <span>المكتب الإعلامي للاتحاد الدولي IOEF</span>
              <button
                onClick={() => setActiveNewsModal(null)}
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg"
              >
                تم الاطلاع
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
