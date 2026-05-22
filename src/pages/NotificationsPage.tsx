import { Bell } from 'lucide-react';
import { useEffect, useState } from 'react';
import BackButton from '../components/navigation/BackButton';
import EmptyState from '../components/ui/EmptyState';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { getMyNotifications, markAllNotificationsAsRead, markNotificationAsRead } from '../services/notificationsService';
import { Notification } from '../types/database';
import { Link } from 'react-router-dom';

type Filter = 'all' | 'unread' | 'read';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getMyNotifications()
      .then(setNotifications)
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load notifications.'))
      .finally(() => setLoading(false));
  }, []);

  const visible = notifications.filter((notification) => (
    filter === 'all' || (filter === 'read' ? notification.is_read : !notification.is_read)
  ));

  const markOne = async (notification: Notification) => {
    if (notification.is_read) return;
    const updated = await markNotificationAsRead(notification.id);
    setNotifications((current) => current.map((item) => item.id === updated.id ? updated : item));
  };

  const markAll = async () => {
    await markAllNotificationsAsRead();
    setNotifications((current) => current.map((item) => ({ ...item, is_read: true, read_at: item.read_at ?? new Date().toISOString() })));
  };

  return (
    <section className="space-y-6">
      <BackButton label="Back to dashboard" fallbackTo="/home" />
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-3xl font-bold text-elios-navy">Notifications</h1>
          <p className="mt-2 text-slate-600">Updates from questions, teachers, and course access.</p>
        </div>
        <button type="button" onClick={markAll} className="rounded-lg bg-elios-yellow px-4 py-3 text-sm font-bold text-elios-navy">Mark all as read</button>
      </div>
      <div className="flex flex-wrap gap-2">
        {(['all', 'unread', 'read'] as Filter[]).map((item) => (
          <button key={item} type="button" onClick={() => setFilter(item)} className={`rounded-lg px-4 py-2 text-sm font-bold capitalize ${filter === item ? 'bg-elios-navy text-white' : 'border border-slate-200 bg-white text-elios-blue'}`}>{item}</button>
        ))}
      </div>
      {error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      {loading ? <LoadingSpinner label="Loading notifications" /> : visible.length ? (
        <div className="space-y-3">
          {visible.map((notification) => (
            <article key={notification.id} className={`rounded-xl border p-4 shadow-sm ${notification.is_read ? 'border-slate-200 bg-white' : 'border-elios-yellow bg-yellow-50/60'}`}>
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <p className="font-bold text-elios-navy">{notification.title}</p>
                  {notification.message ? <p className="mt-1 text-sm text-slate-600">{notification.message}</p> : null}
                  <p className="mt-2 text-xs font-semibold text-slate-400">{new Date(notification.created_at).toLocaleString()}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {!notification.is_read ? <button type="button" onClick={() => markOne(notification)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-elios-blue">Mark read</button> : null}
                  {notification.target_url ? <Link to={notification.target_url} onClick={() => markOne(notification)} className="rounded-lg bg-elios-navy px-3 py-2 text-sm font-bold text-white">Open</Link> : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : <EmptyState icon={Bell} title="No notifications yet." message="New answers, course access changes, and teacher updates will appear here." />}
    </section>
  );
}
