import React from 'react';
import { X, Check, Bell, Calendar, Award, AlertTriangle, Info, CreditCard, QrCode, ArrowRightLeft, Clock } from 'lucide-react';
import { NotificationItem } from '../types';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onMarkRead: (id: string) => void;
  onNavigate?: (tab: string) => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkRead,
  onNavigate
}) => {
  if (!isOpen) return null;

  const getIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'registration_status':
        return <Award className="w-5 h-5 text-emerald-400" />;
      case 'match_fixture':
        return <Calendar className="w-5 h-5 text-sky-400" />;
      case 'penalty':
        return <AlertTriangle className="w-5 h-5 text-rose-400" />;
      case 'result_update':
        return <Award className="w-5 h-5 text-amber-400" />;
      case 'membership_issued':
      case 'card_updated':
        return <QrCode className="w-5 h-5 text-amber-400" />;
      case 'renewal_reminder':
        return <Clock className="w-5 h-5 text-amber-400" />;
      case 'payment_status':
      case 'membership_status':
        return <CreditCard className="w-5 h-5 text-emerald-400" />;
      case 'transfer_approved':
        return <ArrowRightLeft className="w-5 h-5 text-sky-400" />;
      default:
        return <Info className="w-5 h-5 text-indigo-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-white text-base">مركز الإشعارات والتنبيهات الرسمية</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1">
          {notifications.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              لا توجد إشعارات جديدة في الوقت الحالي.
            </div>
          ) : (
            notifications.map(notif => (
              <div
                key={notif.id}
                className={`p-3.5 rounded-lg border transition-all ${
                  notif.read
                    ? 'bg-slate-950/40 border-slate-800/60 opacity-80'
                    : 'bg-slate-800/60 border-slate-700 shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 p-1.5 rounded-md bg-slate-900 border border-slate-800">
                      {getIcon(notif.type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-white">{notif.title}</h4>
                        {!notif.read && (
                          <span className="text-[10px] text-amber-400 font-bold">جديد</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed">{notif.message}</p>
                      <div className="text-[11px] text-slate-500 mt-2 font-mono tabular-nums">
                        {new Date(notif.createdAt).toLocaleDateString('ar-SA', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  </div>

                  {!notif.read && (
                    <button
                      onClick={() => onMarkRead(notif.id)}
                      className="p-1 text-slate-400 hover:text-emerald-400 rounded hover:bg-slate-900"
                      title="تحديد كمقروء"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950 flex justify-between items-center text-xs text-slate-400">
          <span>نظام الإشعارات الفوري المرتبط بـ IOEF Core</span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-md transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
