import { useApp } from "../store";
import { Icon, TopBar } from "../components/ui";
import { relativeTime } from "../utils/format";

// ============================================================================
// Notification screen — can be used both as a routed screen or overlay
// ============================================================================
export function NotificationPanel({ onClose }: { onClose?: () => void }) {
  const { notifications, markNotificationRead, back } = useApp();
  const unread = notifications.filter(n => !n.read).length;

  const handleBack = () => {
    if (onClose) {
      onClose();
    }
    back();
  };

  const typeIcon: Record<string, { icon: string; bg: string }> = {
    info: { icon: "info", bg: "bg-ocean-100 text-ocean-700" },
    success: { icon: "check_circle", bg: "bg-emerald-100 text-emerald-700" },
    warning: { icon: "warning", bg: "bg-amber-100 text-amber-700" },
    error: { icon: "x", bg: "bg-rose-100 text-rose-700" },
  };

  return (
    <div className="flex h-full flex-col bg-white">
      <TopBar
        title="Notifications"
        subtitle={`${unread} unread`}
        onBack={handleBack}
        trailing={
          <button
            onClick={() => notifications.forEach(n => markNotificationRead(n.id))}
            className="text-xs font-semibold text-ocean-700"
          >
            Mark all read
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto no-scrollbar pb-24">
        {notifications.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Icon name="bell" className="h-12 w-12 text-slate-300" />
            <p className="mt-3 text-sm font-medium text-slate-700">No notifications</p>
            <p className="mt-1 text-xs text-slate-500">You're all caught up.</p>
          </div>
        )}
        <div className="divide-y divide-slate-100">
          {notifications.map(n => {
            const info = typeIcon[n.type] || typeIcon.info;
            return (
              <button
                key={n.id}
                onClick={() => markNotificationRead(n.id)}
                className={`flex w-full items-start gap-3 p-4 text-left transition-colors ${!n.read ? "bg-ocean-50/40" : "bg-white"}`}
              >
                <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${info.bg}`}>
                  <Icon name={info.icon} className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-semibold ${!n.read ? "text-slate-900" : "text-slate-700"}`}>{n.title}</p>
                    {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-ocean-500" />}
                  </div>
                  <p className="mt-0.5 text-xs text-slate-600">{n.body}</p>
                  <p className="mt-1 text-xs text-slate-400">{relativeTime(n.createdAt)}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
