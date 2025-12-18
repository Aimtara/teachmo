import { useCallback, useEffect, useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { NotificationsAPI } from '@/api/adapters';
import { cn } from '@/utils';

const severityStyles = {
  info: 'bg-blue-50 text-blue-700 border-blue-100',
  warning: 'bg-amber-50 text-amber-800 border-amber-100',
  critical: 'bg-red-50 text-red-700 border-red-100',
};

const linkLabels = {
  source: 'Directory source',
  preview: 'Import preview',
  job: 'Import job',
  run: 'Run details',
};

function formatWhen(timestamp) {
  if (!timestamp) return 'Just now';
  try {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  } catch {
    return timestamp;
  }
}

function NotificationLinks({ metadata }) {
  const links = metadata?.links && typeof metadata.links === 'object' ? metadata.links : {};
  const entries = Object.entries(links).filter(([, url]) => typeof url === 'string' && url);
  if (!entries.length) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {entries.map(([key, url]) => (
        <a
          key={key}
          href={String(url)}
          className="inline-flex items-center text-sm font-medium text-emerald-700 hover:text-emerald-800"
          target="_blank"
          rel="noreferrer"
        >
          {linkLabels[key] || 'Open'} →
        </a>
      ))}
    </div>
  );
}

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterUnread, setFilterUnread] = useState(false);
  const [marking, setMarking] = useState({});

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.read_at).length,
    [notifications]
  );

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const list = await NotificationsAPI.listNotifications({ limit: 50, unreadOnly: filterUnread });
      setNotifications(Array.isArray(list) ? list : []);
      setError('');
    } catch (err) {
      console.error(err);
      setError(err?.message ?? 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [filterUnread]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const markAsRead = async (id) => {
    if (!id) return;
    setMarking((prev) => ({ ...prev, [id]: true }));
    try {
      await NotificationsAPI.markAsRead(id);
      const now = new Date().toISOString();
      setNotifications((prev) => prev.map((item) => (item.id === id ? { ...item, read_at: now } : item)));
    } catch (err) {
      console.error(err);
      setError(err?.message ?? 'Unable to mark notification as read');
    } finally {
      setMarking((prev) => ({ ...prev, [id]: false }));
    }
  };

  return (
    <div className="p-6 space-y-4">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm text-gray-500">Stay on top of directory sync activity</p>
          <h1 className="text-3xl font-semibold text-gray-900">Notifications</h1>
          <p className="text-sm text-gray-600">
            Showing the latest alerts{filterUnread ? ' (unread only)' : ''}. Unread: {unreadCount}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setFilterUnread((value) => !value)}
            className={cn(
              'inline-flex items-center rounded-lg border px-3 py-2 text-sm font-medium shadow-sm transition-colors',
              filterUnread ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-gray-200 bg-white text-gray-800'
            )}
          >
            {filterUnread ? 'Show all notifications' : 'Filter unread'}
          </button>

          <button
            type="button"
            onClick={loadNotifications}
            className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-800 shadow-sm hover:bg-gray-50"
          >
            Refresh
          </button>
        </div>
      </header>

      {error && (
        <div className="rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-700" role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-gray-600">Loading notifications…</p>
      ) : notifications.length === 0 ? (
        <div className="rounded-lg border border-gray-100 bg-white p-6 shadow-sm">
          <p className="font-semibold text-gray-900">No notifications yet</p>
          <p className="text-sm text-gray-600">We will alert you here when directory syncs need attention.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {notifications.map((notification) => (
            <li
              key={notification.id}
              className={cn(
                'rounded-lg border bg-white p-4 shadow-sm transition-colors',
                notification.read_at ? 'border-gray-100' : 'border-emerald-100'
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold',
                      severityStyles[notification.severity] || severityStyles.info
                    )}
                  >
                    {notification.severity || 'info'}
                  </span>
                  <p className="text-sm text-gray-500">{formatWhen(notification.created_at)}</p>
                </div>

                <button
                  type="button"
                  disabled={!!notification.read_at || marking[notification.id]}
                  onClick={() => markAsRead(notification.id)}
                  className={cn(
                    'text-sm font-medium',
                    notification.read_at
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-emerald-700 hover:text-emerald-800'
                  )}
                >
                  {notification.read_at ? 'Read' : 'Mark as read'}
                </button>
              </div>

              <div className="mt-2 space-y-1">
                <h3 className="text-lg font-semibold text-gray-900">{notification.title}</h3>
                <p className="text-sm text-gray-700 whitespace-pre-line">{notification.body}</p>
                <NotificationLinks metadata={notification.metadata} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
