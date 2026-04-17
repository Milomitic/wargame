import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  useNotificationStore,
  type Notification,
} from "../../stores/notificationStore.js";

const TYPE_COLOR: Record<string, string> = {
  combat_victory: "var(--color-success)",
  combat_defeat: "var(--color-danger)",
  raid_incoming: "var(--color-danger)",
  troops_returned: "var(--color-info)",
  building_complete: "var(--color-construction-light)",
  troop_recruited: "var(--color-construction-light)",
  alliance_invite: "var(--color-info)",
  alliance_member: "var(--color-info)",
};

function routeForNotification(n: Notification): string | null {
  switch (n.type) {
    case "combat_victory":
    case "combat_defeat":
    case "raid_incoming":
    case "troops_returned":
      return "/army";
    case "building_complete":
    case "troop_recruited":
      return "/";
    case "alliance_invite":
    case "alliance_member":
      return "/diplomacy";
    default:
      return null;
  }
}

const TOAST_LIFETIME_MS = 6000;

interface ToastProps {
  notification: Notification;
  onDismiss: (id: string) => void;
  onClick: (n: Notification) => void;
}

function Toast({ notification, onDismiss, onClick }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(() => onDismiss(notification.id), TOAST_LIFETIME_MS);
    return () => clearTimeout(t);
  }, [notification.id, onDismiss]);

  const accent = TYPE_COLOR[notification.type] || "var(--color-gold)";

  return (
    <button
      type="button"
      onClick={() => onClick(notification)}
      className="notification-toast"
      style={{ borderLeftColor: accent }}
    >
      <span className="notification-toast__icon">{notification.icon || "📬"}</span>
      <div className="notification-toast__body">
        <div className="notification-toast__title" style={{ color: accent }}>
          {notification.title}
        </div>
        <div className="notification-toast__text">{notification.body}</div>
      </div>
      <span
        className="notification-toast__close"
        onClick={(e) => {
          e.stopPropagation();
          onDismiss(notification.id);
        }}
      >
        ✕
      </span>
    </button>
  );
}

export default function NotificationToastStack() {
  const navigate = useNavigate();
  const toasts = useNotificationStore((s) => s.toasts);
  const dismissToast = useNotificationStore((s) => s.dismissToast);
  const markRead = useNotificationStore((s) => s.markRead);

  function handleClick(n: Notification) {
    if (!n.isRead) markRead(n.id);
    const dest = routeForNotification(n);
    if (dest) navigate(dest);
    dismissToast(n.id);
  }

  if (toasts.length === 0) return null;

  return (
    <div className="notification-toast-stack">
      {toasts.map((t) => (
        <Toast
          key={t.id}
          notification={t}
          onDismiss={dismissToast}
          onClick={handleClick}
        />
      ))}
    </div>
  );
}
