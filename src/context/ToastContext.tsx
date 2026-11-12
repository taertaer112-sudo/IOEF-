import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, Trophy, AlertCircle, Sparkles, Bell, ArrowLeft, CheckCircle2, Video } from 'lucide-react';

export type ToastType = 'match_result' | 'breaking_news' | 'registration' | 'disciplinary' | 'system';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message: string;
  badge?: string;
  timestamp?: string;
  actionLabel?: string;
  actionTab?: string;
  duration?: number; // ms
}

interface ToastContextType {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, 'id'>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ 
  children: React.ReactNode; 
  onNavigateTab?: (tab: string) => void;
}> = ({ children, onNavigateTab }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((toast: Omit<ToastItem, 'id'>) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newToast: ToastItem = {
      ...toast,
      id,
      duration: toast.duration || 6000,
      timestamp: toast.timestamp || new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
    };

    setToasts(prev => [newToast, ...prev.slice(0, 4)]); // Keep max 4 on screen

    // Auto dismiss
    setTimeout(() => {
      removeToast(id);
    }, newToast.duration);
  }, [removeToast]);

  const getToastIcon = (type: ToastType) => {
    switch (type) {
      case 'match_result':
        return <Trophy className="w-5 h-5 text-amber-400 shrink-0" />;
      case 'breaking_news':
        return <Sparkles className="w-5 h-5 text-sky-400 shrink-0" />;
      case 'registration':
        return <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />;
      case 'disciplinary':
        return <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />;
      default:
        return <Bell className="w-5 h-5 text-amber-400 shrink-0" />;
    }
  };

  const getBorderColor = (type: ToastType) => {
    switch (type) {
      case 'match_result':
        return 'border-amber-500/50 shadow-amber-500/10';
      case 'breaking_news':
        return 'border-sky-500/50 shadow-sky-500/10';
      case 'registration':
        return 'border-emerald-500/50 shadow-emerald-500/10';
      case 'disciplinary':
        return 'border-rose-500/50 shadow-rose-500/10';
      default:
        return 'border-slate-700 shadow-slate-900/40';
    }
  };

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}

      {/* Interactive Toast Notifications Portal (Bottom-Left / Top-Left Floating) */}
      <div 
        dir="rtl"
        className="fixed top-20 left-4 z-[9999] flex flex-col gap-3 max-w-sm sm:max-w-md w-full pointer-events-none transition-all"
      >
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`pointer-events-auto relative rounded-2xl bg-slate-950/95 backdrop-blur-xl border ${getBorderColor(toast.type)} p-4 shadow-2xl transition-all duration-300 animate-slideInLeft text-right overflow-hidden`}
          >
            {/* Top row with badge and dismiss */}
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-lg bg-slate-900 border border-slate-800">
                  {getToastIcon(toast.type)}
                </div>
                <span className="text-[10px] font-black uppercase font-mono px-2 py-0.5 rounded-full bg-slate-900 text-amber-400 border border-amber-500/30">
                  {toast.badge || (
                    toast.type === 'match_result' ? 'تحديث نتيجة رسمية' :
                    toast.type === 'breaking_news' ? 'خبر عاجل' :
                    toast.type === 'registration' ? 'اعتماد قيد' : 'إشعار مباشر'
                  )}
                </span>
                {toast.timestamp && (
                  <span className="text-[10px] text-slate-500 font-mono">
                    {toast.timestamp}
                  </span>
                )}
              </div>

              <button
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-900 transition-colors"
                title="إغلاق التنبيه"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Title and Message */}
            <div className="space-y-1 pr-1">
              <h4 className="text-xs sm:text-sm font-black text-white leading-tight">
                {toast.title}
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                {toast.message}
              </p>
            </div>

            {/* Action link if available */}
            {toast.actionTab && onNavigateTab && (
              <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex justify-end">
                <button
                  onClick={() => {
                    if (toast.actionTab) onNavigateTab(toast.actionTab);
                    removeToast(toast.id);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors"
                >
                  <span>{toast.actionLabel || 'الانتقال للمعاينة المباشرة'}</span>
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Auto-dismiss progress bar animation */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-900 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-amber-500 to-amber-300 animate-progressBar"
                style={{ animationDuration: `${toast.duration || 6000}ms` }}
              />
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
