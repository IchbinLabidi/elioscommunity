import { Bell, BookOpen, CheckCheck, MessageSquare, Star, UserPlus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getMyNotifications, getUnreadNotificationCount, markAllNotificationsAsRead, markNotificationAsRead } from '../../services/notificationsService';
import { Notification, NotificationType } from '../../types/database';

const notificationIcons: Partial<Record<NotificationType, typeof Bell>> = {
  question_answered: MessageSquare,
  answer_replied: MessageSquare,
  best_answer_selected: CheckCheck,
  rating_received: Star,
  teacher_followed: UserPlus,
  teacher_new_course: BookOpen,
  course_enrollment_submitted: BookOpen,
  course_enrollment_approved: CheckCheck,
  course_enrollment_rejected: BookOpen,
};

function timeAgo(value: string) {
  const minutes = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function NotificationsBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [error, setError] = useState('');

  const refresh = async () => {
    try {
      const [items, count] = await Promise.all([getMyNotifications(6), getUnreadNotificationCount()]);
      setNotifications(items);
      setUnreadCount(count);
    } catch {
      setError('Unable to load notifications.');
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    if (open) void refresh();
  }, [open]);

  const openNotification = async (notification: Notification) => {
    if (!notification.is_read) {
      const updated = await markNotificationAsRead(notification.id);
      setNotifications((current) => current.map((item) => item.id === updated.id ? updated : item));
      setUnreadCount((current) => Math.max(0, current - 1));
    }
    setOpen(false);
    if (notification.target_url) navigate(notification.target_url);
  };

  const markAll = async () => {
    await markAllNotificationsAsRead();
    setUnreadCount(0);
    setNotifications((current) => current.map((item) => ({ ...item, is_read: true, read_at: item.read_at ?? new Date().toISOString() })));
  };

  return (
    <div className="relative">
      <button type="button" aria-label="Open notifications" onClick={() => setOpen((current) => !current)} className="relative grid h-10 w-10 place-items-center rounded-lg border border-slate-200 text-elios-navy hover:bg-slate-50">
        <Bell className="h-5 w-5" />
        {unreadCount ? <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-elios-yellow px-1 text-center text-xs font-black text-elios-navy">{unreadCount > 99 ? '99+' : unreadCount}</span> : null}
      </button>
      {open ? (
        <section className="absolute right-0 top-12 z-50 w-[min(380px,calc(100vw-24px))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-4">
            <h2 className="font-bold text-elios-navy">Notifications</h2>
            <button type="button" onClick={markAll} className="text-xs font-bold text-elios-blue">Mark all as read</button>
          </div>
          <div className="max-h-96 overflow-y-auto p-2">
            {error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
            {notifications.length ? notifications.map((notification) => {
              const Icon = notificationIcons[notification.type] ?? Bell;
              return (
                <button key={notification.id} type="button" onClick={() => openNotification(notification)} className={`flex w-full gap-3 rounded-lg p-3 text-left hover:bg-slate-50 ${notification.is_read ? '' : 'bg-yellow-50/70'}`}>
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-elios-sky text-elios-blue"><Icon className="h-4 w-4" /></span>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-elios-navy">{notification.title}</span>
                    {notification.message ? <span className="mt-1 line-clamp-2 block text-xs text-slate-600">{notification.message}</span> : null}
                    <span className="mt-1 block text-xs font-semibold text-slate-400">{timeAgo(notification.created_at)}</span>
                  </span>
                </button>
              );
            }) : <p className="p-6 text-center text-sm text-slate-500">No notifications yet.</p>}
          </div>
          <Link to="/notifications" onClick={() => setOpen(false)} className="block border-t border-slate-100 px-4 py-3 text-center text-sm font-bold text-elios-blue hover:bg-slate-50">View all notifications</Link>
        </section>
      ) : null}
    </div>
  );
}
