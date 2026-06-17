import { useNotifications, markNotificationRead, markAllNotificationsRead } from '../hooks/useWarehouse'
import { Spinner, Empty } from '../components/UI'

function fmtWhen(s) {
  if (!s) return ''
  try { return new Date(s).toLocaleString() } catch { return s }
}

export default function NotificationsPage() {
  const { notifications, loading, refetch } = useNotifications()

  async function readOne(id) { await markNotificationRead(id); refetch() }
  async function readAll() { await markAllNotificationsRead(); refetch() }

  const unread = notifications.filter(n => !n.read).length

  return (
    <div className="px-4 pb-24 pt-3">
      {unread > 0 && (
        <button onClick={readAll}
          className="w-full mb-3 text-xs text-blue-700 bg-blue-50 rounded-lg py-2 font-medium">
          Mark all as read ({unread})
        </button>
      )}

      {loading ? <Spinner /> : notifications.length === 0 ? (
        <Empty icon="🔔" message="No alerts yet" />
      ) : (
        <div className="space-y-2">
          {notifications.map(n => (
            <button key={n.id} onClick={() => !n.read && readOne(n.id)}
              className={`w-full text-left rounded-xl px-4 py-3 border ${n.read ? 'bg-white border-gray-100' : 'bg-amber-50 border-amber-200'}`}>
              <div className="flex items-start gap-2">
                <span className="text-lg">⚠️</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${n.read ? 'text-gray-700' : 'font-semibold text-gray-900'}`}>{n.title}</p>
                  {n.body && <p className="text-xs text-gray-500 mt-0.5">{n.body}</p>}
                  <p className="text-[11px] text-gray-400 mt-1">{fmtWhen(n.created_at)}</p>
                </div>
                {!n.read && <span className="w-2 h-2 bg-amber-500 rounded-full flex-shrink-0 mt-1.5" />}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
